-- Test payments only. Existing operations retain their historical simulation.
begin;
-- Opt-in is server-owned. Keep PGlite/demo and existing projects unchanged until
-- credentials/function/return URL have been validated for the test project.
create table public.mp_test_settings (
 singleton boolean primary key default true check(singleton),
 enabled boolean not null default false
);
insert into public.mp_test_settings(singleton,enabled) values(true,false);
alter table public.mp_test_settings enable row level security;
revoke all on public.mp_test_settings from public,authenticated;
grant select,update on public.mp_test_settings to service_role;
do $$ begin if exists(select 1 from pg_roles where rolname='anon') then
 execute 'revoke all on public.mp_test_settings from anon';
end if; end $$;
alter table public.operations add column payment_mode text not null default 'legacy_simulated'
  check(payment_mode in ('legacy_simulated','mercado_pago_test'));
create function public.assign_test_payment_mode() returns trigger language plpgsql security definer set search_path=public as $$
begin
 new.payment_mode:=case when new.contract_currency='ARS' and exists(select 1 from public.mp_test_settings where singleton and enabled) then 'mercado_pago_test' else 'legacy_simulated' end;
 return new;
end $$;
create trigger operation_payment_mode before insert on public.operations for each row execute function public.assign_test_payment_mode();
create function public.preserve_operation_payment_mode() returns trigger language plpgsql set search_path=public as $$
begin
 if new.payment_mode is distinct from old.payment_mode then raise exception 'El modo de pago contractual es inmutable'; end if;
 return new;
end $$;
create trigger preserve_payment_mode before update of payment_mode on public.operations for each row execute function public.preserve_operation_payment_mode();

create table public.mp_test_checkouts (
 operation_id uuid primary key references public.operations(id),
 external_reference uuid not null unique default gen_random_uuid(),
 amount numeric(14,2) not null check(amount>0), currency text not null check(currency='ARS'),
 preference_id text unique, checkout_url text,
 preference_state text not null default 'new' check(preference_state in ('new','creating','ready')),
 status text not null default 'pending' check(status in ('pending','approved','rejected','cancelled','refunded','charged_back')),
 checked_at timestamptz, created_at timestamptz not null default now()
);
create table public.mp_test_payments (
 provider_payment_id text primary key,
 operation_id uuid not null references public.mp_test_checkouts(operation_id),
 status text not null check(status in ('pending','approved','rejected','cancelled','refunded','charged_back')),
 amount numeric(14,2) not null, currency text not null check(currency='ARS'),
 provider_updated_at timestamptz not null, checked_at timestamptz not null default now()
);
alter table public.mp_test_checkouts enable row level security;
alter table public.mp_test_payments enable row level security;
revoke all on public.mp_test_checkouts,public.mp_test_payments from public,authenticated;
do $$ begin if exists(select 1 from pg_roles where rolname='anon') then
 execute 'revoke all on public.mp_test_checkouts,public.mp_test_payments from anon';
end if; end $$;
grant select on public.mp_test_checkouts,public.mp_test_payments to authenticated;
grant select,insert,update,delete on public.mp_test_checkouts,public.mp_test_payments to service_role;
create policy "participants read test checkout" on public.mp_test_checkouts for select to authenticated using(public.is_operation_participant(operation_id));
create policy "participants read verified test payments" on public.mp_test_payments for select to authenticated using(public.is_operation_participant(operation_id));

create function public.claim_mp_test_checkout(actor uuid,target uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare op public.operations; amount_value numeric; result public.mp_test_checkouts; claimed boolean:=false;
begin
 select * into op from public.operations where id=target;
 if not found or op.importer_id<>actor or not exists(select 1 from public.profiles where id=actor and role='importer') then raise exception 'Operacion no autorizada'; end if;
 perform public.lock_operator_capacity(op.operator_id);
 select * into op from public.operations where id=target for update;
 if op.payment_mode<>'mercado_pago_test' or op.contract_currency<>'ARS' then raise exception 'Operacion fuera del ensayo Mercado Pago ARS'; end if;
 select * into result from public.mp_test_checkouts where operation_id=target;
 if not found then
  if op.phase<>'created' then raise exception 'La operacion no admite iniciar otro pago'; end if;
  select total_usd into amount_value from public.offers where id=op.accepted_offer_id and payment_currency='ARS' and status='accepted';
  if amount_value is null or amount_value<=0 then raise exception 'Importe contractual no disponible'; end if;
  insert into public.mp_test_checkouts(operation_id,amount,currency) values(target,amount_value,'ARS') returning * into result;
 end if;
 if result.preference_state='new' then
  update public.mp_test_checkouts set preference_state='creating' where operation_id=target returning * into result;
  claimed:=true;
 end if;
 return to_jsonb(result)||jsonb_build_object('claimed',claimed);
end $$;

create function public.save_mp_test_preference(actor uuid,target uuid,preference text,checkout text) returns void
language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from public.operations where id=target and importer_id=actor and payment_mode='mercado_pago_test') then raise exception 'Operacion no autorizada'; end if;
 if checkout !~ '^https://sandbox\.mercadopago\.com/mla/checkout/[^[:space:]]+$' or length(preference)<1 then raise exception 'Checkout de prueba invalido'; end if;
 update public.mp_test_checkouts set preference_id=preference,checkout_url=checkout,preference_state='ready'
 where operation_id=target and preference_state='creating';
 if not found and not exists(select 1 from public.mp_test_checkouts where operation_id=target and preference_id=preference and checkout_url=checkout) then raise exception 'Preferencia incompatible'; end if;
end $$;

create function public.record_mp_test_payment(actor uuid,target uuid,payment jsonb) returns void
language plpgsql security definer set search_path=public as $$
declare op public.operations; intent public.mp_test_checkouts; state text; updated_time timestamptz;
begin
 select * into op from public.operations where id=target;
 if not found or actor is null or op.importer_id<>actor or op.payment_mode<>'mercado_pago_test' then raise exception 'Operacion no autorizada'; end if;
 perform public.lock_operator_capacity(op.operator_id);
 perform 1 from public.operations where id=target for update;
 select * into intent from public.mp_test_checkouts where operation_id=target for update;
 if not found or payment->>'external_reference' is distinct from intent.external_reference::text
 or (payment->>'live_mode')::boolean is distinct from false
 or payment->>'currency_id' is distinct from 'ARS'
 or (payment->>'transaction_amount')::numeric is distinct from intent.amount
 or coalesce(payment->>'id','') !~ '^[0-9]+$' then raise exception 'Pago incompatible con el contrato de prueba'; end if;
 state:=payment->>'status'; updated_time:=(payment->>'date_last_updated')::timestamptz;
 if state is null or updated_time is null or state not in ('pending','approved','rejected','cancelled','refunded','charged_back') then raise exception 'Estado de pago no soportado'; end if;
 if exists(select 1 from public.mp_test_payments where provider_payment_id=payment->>'id' and operation_id<>target) then raise exception 'Pago vinculado a otra operacion'; end if;
 insert into public.mp_test_payments(provider_payment_id,operation_id,status,amount,currency,provider_updated_at)
 values(payment->>'id',target,state,intent.amount,'ARS',updated_time)
 on conflict(provider_payment_id) do update set status=excluded.status,provider_updated_at=excluded.provider_updated_at,checked_at=now()
 where mp_test_payments.operation_id=excluded.operation_id and mp_test_payments.provider_updated_at<=excluded.provider_updated_at;
 if exists(select 1 from public.mp_test_payments where operation_id=target and status='approved') then state:='approved';
 else select status into state from public.mp_test_payments where operation_id=target order by provider_updated_at desc,provider_payment_id desc limit 1; end if;
 update public.mp_test_checkouts set status=state,checked_at=now() where operation_id=target;
 -- This is the academic guarantee gate, not a Mercado Pago escrow/capture.
 if state='approved' and op.phase='created' then
  update public.payment_guarantees set status='held_simulated',verified_by=actor,verified_at=now() where operation_id=target and status='pending';
 end if;
end $$;

create function public.guard_mp_test_guarantee() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.status in ('held_simulated','verified') and exists(select 1 from public.operations where id=new.operation_id and payment_mode='mercado_pago_test')
 and not exists(select 1 from public.mp_test_checkouts where operation_id=new.operation_id and status='approved') then raise exception 'Confirmacion del proveedor requerida'; end if;
 return new;
end $$;
create trigger mp_test_guarantee before insert or update of status on public.payment_guarantees for each row execute function public.guard_mp_test_guarantee();

create function public.guard_mp_test_progress() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.payment_mode='mercado_pago_test' and new.phase<>old.phase and new.phase not in ('cancelled','failed','incident','disputed')
 and not exists(select 1 from public.mp_test_checkouts where operation_id=new.id and status='approved') then raise exception 'Pago de prueba aprobado requerido'; end if;
 return new;
end $$;
create trigger mp_test_progress before update of phase on public.operations for each row execute function public.guard_mp_test_progress();

alter function public.simulate_guarantee(uuid) rename to simulate_guarantee_before_mp_test;
revoke all on function public.simulate_guarantee_before_mp_test(uuid) from public,authenticated;
create function public.simulate_guarantee(target_operation_id uuid) returns void language plpgsql security definer set search_path=public as $$
begin
 if exists(select 1 from public.operations where id=target_operation_id and payment_mode='mercado_pago_test') then raise exception 'Esta operacion requiere checkout de prueba y verificacion del proveedor'; end if;
 perform public.simulate_guarantee_before_mp_test(target_operation_id);
end $$;
revoke all on function public.assign_test_payment_mode(),public.preserve_operation_payment_mode(),public.guard_mp_test_guarantee(),public.guard_mp_test_progress(),public.claim_mp_test_checkout(uuid,uuid),public.save_mp_test_preference(uuid,uuid,text,text),public.record_mp_test_payment(uuid,uuid,jsonb),public.simulate_guarantee(uuid) from public,authenticated;
do $$ begin if exists(select 1 from pg_roles where rolname='anon') then
 execute 'revoke all on function public.assign_test_payment_mode(),public.preserve_operation_payment_mode(),public.guard_mp_test_guarantee(),public.guard_mp_test_progress(),public.claim_mp_test_checkout(uuid,uuid),public.save_mp_test_preference(uuid,uuid,text,text),public.record_mp_test_payment(uuid,uuid,jsonb),public.simulate_guarantee(uuid) from anon';
end if; end $$;
grant execute on function public.simulate_guarantee(uuid) to authenticated;
grant execute on function public.claim_mp_test_checkout(uuid,uuid),public.save_mp_test_preference(uuid,uuid,text,text),public.record_mp_test_payment(uuid,uuid,jsonb) to service_role;
commit;
