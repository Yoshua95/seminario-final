begin;
-- One market gate precedes operator/cargo locks. Besides serializing competing
-- awards, its write conflict prevents stale REPEATABLE READ snapshots succeeding.
create table public.capital_market_mutex(singleton boolean primary key default true check(singleton), revision bigint not null default 0);
insert into public.capital_market_mutex values(true,0);
alter table public.capital_market_mutex enable row level security;
revoke all on public.capital_market_mutex from public,anon,authenticated;
create function public.lock_capital_market() returns void language plpgsql security definer set search_path=public as $$ begin
 update public.capital_market_mutex set revision=revision+1 where singleton;
end $$;

create table public.offer_capital_reservations(
 offer_id uuid primary key references public.offers(id),operator_id uuid not null references public.operator_profiles(user_id),
 currency text not null check(currency='ARS'),amount numeric(16,2) not null check(amount>=0 and amount::text not in ('NaN','Infinity','-Infinity')),
 state text not null check(state in ('reserved','transferred','released')),
 operation_id uuid unique references public.operations(id),created_at timestamptz not null default now(),released_at timestamptz,reason text,
 check((state='transferred')=(operation_id is not null)),check((state='released')=(released_at is not null))
);
create index offer_capital_operator_idx on public.offer_capital_reservations(operator_id,state);
create table public.offer_submission_requests(operator_id uuid not null references public.operator_profiles(user_id),request_key text not null,payload jsonb not null,offer_id uuid not null references public.offers(id),primary key(operator_id,request_key));
alter table public.offer_submission_requests enable row level security;
revoke all on public.offer_submission_requests from public,anon,authenticated;
alter table public.offer_capital_reservations enable row level security;
revoke all on public.offer_capital_reservations from public,anon,authenticated;
grant select on public.offer_capital_reservations to authenticated;
create policy own_capital_read on public.offer_capital_reservations for select to authenticated
 using((operator_id=(select auth.uid()) and public.current_user_role()='operator') or public.current_user_role()='admin');

create function public.capital_commitment(target_operator uuid) returns jsonb language sql stable security definer set search_path=public as $$
 with operation_usage as(select coalesce(sum(working_capital_required) filter(where currency='ARS'),0) amount,count(*) filter(where working_capital_required is null) unknown
 from public.operation_capacity_reservations where operator_id=target_operator and state<>'released'),
 offers as(select coalesce(sum(r.amount),0) amount from public.offer_capital_reservations r join public.offers f on f.id=r.offer_id join public.cargo_requests c on c.id=f.cargo_id
 where r.operator_id=target_operator and r.state='reserved' and f.status='submitted' and f.valid_until>now() and c.status='open' and (c.bidding_deadline is null or c.bidding_deadline>now()))
 select jsonb_build_object('operations',o.amount,'offers',f.amount,'committed',o.amount+f.amount,'requires_review',o.unknown,
 'approved',coalesce((select approved_working_capital from public.operator_capacity_currency_limits where operator_id=target_operator and currency='ARS'),0),
 'available',case when o.unknown>0 then null else coalesce((select approved_working_capital from public.operator_capacity_currency_limits where operator_id=target_operator and currency='ARS'),0)-o.amount-f.amount end)
 from operation_usage o cross join offers f
$$;
create function public.release_expired_offer_capital() returns void language plpgsql security definer set search_path=public as $$ begin
 update public.offer_capital_reservations r set state='released',released_at=now(),reason='Oferta vencida o carga cerrada'
 from public.offers f join public.cargo_requests c on c.id=f.cargo_id where r.offer_id=f.id and r.state='reserved'
 and (f.status not in ('submitted','accepted') or f.valid_until<=now() or (f.status='submitted' and (c.status<>'open' or c.bidding_deadline<=now())));
end $$;
create function public.reserve_offer_capital(target_offer uuid) returns void language plpgsql security definer set search_path=public as $$
declare f public.offers;m public.operator_capacity_currency_limits;l public.operator_capacity_limits; usage jsonb;required numeric;missing numeric;begin
 select * into f from public.offers where id=target_offer;
 if exists(select 1 from public.offer_capital_reservations where offer_id=f.id and state='reserved') then return;end if;
 if f.status<>'submitted' or f.valid_until<=now() or f.payment_currency<>'ARS' then raise exception 'Oferta no vigente en ARS';end if;
 perform public.lock_operator_capacity(f.operator_id);
 if not exists(select 1 from public.operator_profiles o join public.profiles p on p.id=o.user_id where o.user_id=f.operator_id and o.verification_status='approved' and p.role='operator') then raise exception 'Operador aprobado requerido';end if;
 perform public.validate_normalized_quote(f.normalized_quote);
 select * into m from public.operator_capacity_currency_limits where operator_id=f.operator_id and currency='ARS';
 select * into l from public.operator_capacity_limits where operator_id=f.operator_id;
 if m.operator_id is null or l.operator_id is null or m.status<>'active' or l.status<>'active' or m.valid_from>now() or m.valid_until<=now() or l.valid_from>now() or l.valid_until<=now() then raise exception 'Capital aprobado no vigente';end if;
 usage:=public.capital_commitment(f.operator_id);
 if (usage->>'requires_review')::int>0 then raise exception 'Reservas historicas requieren revision administrativa';end if;
 required:=(f.normalized_quote->>'working_capital_amount')::numeric;
 missing:=required-(usage->>'available')::numeric;
 if missing>0 then raise exception 'Capital insuficiente: faltan ARS % para respaldar esta oferta',missing;end if;
 insert into public.offer_capital_reservations(offer_id,operator_id,currency,amount,state) values(f.id,f.operator_id,'ARS',required,'reserved');
 insert into public.capacity_events(operator_id,action,actor_id,reason,payload,event_key) values(f.operator_id,'offer.reserved',auth.uid(),'Capital reservado al presentar oferta',jsonb_build_object('offer_id',f.id,'amount',required,'currency','ARS'),'offer.reserve:'||f.id);
end $$;
create function public.offer_capital_insert() returns trigger language plpgsql security definer set search_path=public as $$ begin
 perform public.reserve_offer_capital(new.id);return new;
end $$;
create trigger offer_capital_insert after insert on public.offers for each row execute function public.offer_capital_insert();
create function public.offer_capital_status() returns trigger language plpgsql security definer set search_path=public as $$ begin
 if new.status in ('withdrawn','rejected') then
  update public.offer_capital_reservations set state='released',released_at=now(),reason='Oferta '||new.status where offer_id=new.id and state='reserved';
 end if;return new;
end $$;
create trigger offer_capital_status after update of status on public.offers for each row execute function public.offer_capital_status();

alter function public.quote_command(text,jsonb) rename to quote_command_before_offer_capital;
revoke all on function public.quote_command_before_offer_capital(text,jsonb) from public,anon,authenticated;
create function public.quote_command(command text,payload jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare prior public.offer_submission_requests;result jsonb;key text:=coalesce(nullif(payload->>'submission_key',''),md5(payload::text));begin
 if auth.uid() is null or not public.operator_approved() then raise exception 'Operador aprobado requerido';end if;
 perform public.lock_capital_market();perform public.release_expired_offer_capital();
 if command='submit' then
  select * into prior from public.offer_submission_requests where operator_id=auth.uid() and request_key=key;
  if found then
   if prior.payload is distinct from payload then raise exception 'El reintento debe conservar los datos de la oferta';end if;
   return jsonb_build_object('ok',true,'id',prior.offer_id);
  end if;
 end if;
 result:=public.quote_command_before_offer_capital(command,payload);
 if command='submit' then insert into public.offer_submission_requests values(auth.uid(),key,payload,(result->>'id')::uuid);end if;
 return result;
end $$;

-- Transfer the already backed amount. No second availability subtraction; no
-- operation-count, price or exposure ceiling. Physical quantities remain facts.
create or replace function public.reserve_operation_capacity(target_operation uuid,source text default 'tender') returns uuid language plpgsql security definer set search_path=public as $$
declare op public.operations;c public.cargo_requests;f public.offers;r public.offer_capital_reservations;begin
 select * into op from public.operations where id=target_operation;
 if exists(select 1 from public.operation_capacity_reservations where operation_id=op.id) then return op.id;end if;
 select * into f from public.offers where id=op.accepted_offer_id;
 select * into c from public.cargo_requests where id=op.cargo_id;
 if c.volume_m3 is null then raise exception 'Confirma el volumen propuesto antes de reservar Capacity';end if;
 select * into r from public.offer_capital_reservations where offer_id=f.id for update;
 if not found or r.state<>'reserved' or r.currency<>op.contract_currency or r.amount is distinct from (f.normalized_quote->>'working_capital_amount')::numeric then raise exception 'Oferta pendiente de respaldo de capital';end if;
 insert into public.operation_capacity_reservations(operation_id,operator_id,contracting_source,currency,contract_exposure,working_capital_required,weight_kg,volume_m3,state,idempotency_key)
 values(op.id,op.operator_id,source,op.contract_currency,f.total_usd,r.amount,c.weight_kg,c.volume_m3,'reserved','reserve:'||op.id);
 update public.offer_capital_reservations set state='transferred',operation_id=op.id where offer_id=f.id;
 insert into public.capacity_events(operator_id,operation_id,action,actor_id,reason,payload,event_key) values(op.operator_id,op.id,'offer.transferred',auth.uid(),'Reserva transferida sin doble descuento',jsonb_build_object('offer_id',f.id,'amount',r.amount),'reserve:'||op.id);
 return op.id;
end $$;
alter function public.award_offer(uuid) rename to award_offer_before_offer_capital;
revoke all on function public.award_offer_before_offer_capital(uuid) from public,anon,authenticated;
create function public.award_offer(target_offer_id uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare result uuid;begin
 if auth.uid() is null or public.current_user_role()<>'importer' then raise exception 'Acceso de importador requerido';end if;
 if not exists(select 1 from public.offers f join public.cargo_requests c on c.id=f.cargo_id where f.id=target_offer_id and c.importer_id=auth.uid()) then raise exception 'Oferta no autorizada';end if;
 perform public.lock_capital_market();perform public.release_expired_offer_capital();
 select id into result from public.operations where accepted_offer_id=target_offer_id and importer_id=auth.uid();if found then return result;end if;
 if not exists(select 1 from public.offer_capital_reservations where offer_id=target_offer_id and state='reserved') then raise exception 'Oferta pendiente de respaldo de capital';end if;
 return public.award_offer_before_offer_capital(target_offer_id);
end $$;

-- Older submitted offers are unavailable until the administrator reconciles
-- them in deterministic order. No synthetic capital or historical conversion.
create function public.reconcile_offer_capital() returns jsonb language plpgsql security definer set search_path=public as $$
declare f record;backed int:=0;pending int:=0;begin
 if auth.uid() is null or public.current_user_role()<>'admin' then raise exception 'Acceso administrativo requerido';end if;
 perform public.lock_capital_market();perform public.release_expired_offer_capital();
 for f in select id from public.offers where status='submitted' and valid_until>now() order by created_at,id loop
  if not exists(select 1 from public.offer_capital_reservations where offer_id=f.id) then
   begin perform public.reserve_offer_capital(f.id);backed:=backed+1;
   exception when raise_exception then pending:=pending+1;end;
  end if;
 end loop;return jsonb_build_object('backed',backed,'pending',pending);
end $$;
create function public.offer_backing(target_cargo uuid) returns table(offer_id uuid,backed boolean,reason text) language plpgsql stable security definer set search_path=public as $$ begin
 if auth.uid() is null or not exists(select 1 from public.cargo_requests where id=target_cargo and (importer_id=auth.uid() or public.current_user_role()='admin' or public.operator_approved())) then raise exception 'Carga no autorizada';end if;
 return query select f.id,
 f.status='submitted' and f.valid_until>now() and c.status='open' and (c.bidding_deadline is null or c.bidding_deadline>now()) and exists(select 1 from public.offer_capital_reservations r where r.offer_id=f.id and r.state='reserved') and exists(select 1 from public.operator_profiles p where p.user_id=f.operator_id and p.verification_status='approved'),
 case when f.status<>'submitted' or f.valid_until<=now() or c.status<>'open' or c.bidding_deadline<=now() then 'Oferta cerrada o vencida'
 when not exists(select 1 from public.offer_capital_reservations r where r.offer_id=f.id and r.state='reserved') then 'Pendiente de respaldo de capital' else 'Capital reservado' end
 from public.offers f join public.cargo_requests c on c.id=f.cargo_id where c.id=target_cargo and (c.importer_id=auth.uid() or public.current_user_role()='admin' or f.operator_id=auth.uid());
end $$;

alter function public.operator_capacity_snapshot(uuid) rename to operator_capacity_snapshot_before_offers;
revoke all on function public.operator_capacity_snapshot_before_offers(uuid) from public,anon,authenticated;
create function public.operator_capacity_snapshot(target_operator uuid default null) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare target uuid:=coalesce(target_operator,auth.uid());result jsonb;begin
 result:=public.operator_capacity_snapshot_before_offers(target);
 return result||jsonb_build_object('capital',public.capital_commitment(target),'offer_reservations',coalesce((select jsonb_agg(to_jsonb(r)) from public.offer_capital_reservations r where operator_id=target),'[]'::jsonb));
end $$;
-- Legacy administrative API is retained but cannot reduce backed commitments.
alter function public.configure_operator_capacity(uuid,jsonb) rename to configure_capacity_before_offers;
revoke all on function public.configure_capacity_before_offers(uuid,jsonb) from public,anon,authenticated;
create function public.configure_operator_capacity(target_operator uuid,payload jsonb) returns void language plpgsql security definer set search_path=public as $$
declare usage jsonb;begin
 if auth.uid() is null or public.current_user_role()<>'admin' then raise exception 'Acceso administrativo requerido';end if;
 perform public.lock_capital_market();usage:=public.capital_commitment(target_operator);
 if not exists(select 1 from public.operator_profiles where user_id=target_operator and verification_status='approved') then raise exception 'Solo empresas registradas y aprobadas';end if;
 if (payload->>'approved_working_capital')::numeric<(usage->>'committed')::numeric then raise exception 'El capital aprobado no puede ser menor que el comprometido';end if;
 perform public.configure_capacity_before_offers(target_operator,payload||jsonb_build_object('max_operations',greatest(2147483647,coalesce((payload->>'max_operations')::int,0))));
end $$;

revoke all on function public.lock_capital_market(),public.capital_commitment(uuid),public.release_expired_offer_capital(),public.reserve_offer_capital(uuid),public.offer_capital_insert(),public.offer_capital_status() from public,anon,authenticated;
revoke all on function public.quote_command(text,jsonb),public.award_offer(uuid),public.offer_backing(uuid),public.reconcile_offer_capital(),public.operator_capacity_snapshot(uuid),public.configure_operator_capacity(uuid,jsonb) from public,anon;
grant execute on function public.quote_command(text,jsonb),public.award_offer(uuid),public.offer_backing(uuid),public.reconcile_offer_capital(),public.operator_capacity_snapshot(uuid),public.configure_operator_capacity(uuid,jsonb) to authenticated;
commit;
