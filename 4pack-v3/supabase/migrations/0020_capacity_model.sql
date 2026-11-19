create table public.operator_capacity_limits (
 operator_id uuid primary key references public.operator_profiles(user_id),
 max_operations integer not null check(max_operations>=0),
 max_weight_kg numeric(16,2) check(max_weight_kg>=0 and max_weight_kg::text not in ('NaN','Infinity','-Infinity')),
 max_volume_m3 numeric(16,3) check(max_volume_m3>=0 and max_volume_m3::text not in ('NaN','Infinity','-Infinity')),
 status text not null check(status in ('active','inactive')),
 valid_from timestamptz not null, valid_until timestamptz check(valid_until>valid_from),
 approved_by uuid not null references public.profiles(id), approved_at timestamptz not null,
 reason text not null check(length(trim(reason)) between 5 and 2000),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
-- Write conflict as well as a lock: stale REPEATABLE READ/SERIALIZABLE callers
-- must retry rather than calculate usage from an old transaction snapshot.
create table public.operator_capacity_mutex (
 operator_id uuid primary key references public.operator_profiles(user_id),revision bigint not null default 0
);
alter table public.operator_capacity_mutex enable row level security;
revoke all on public.operator_capacity_mutex from public,authenticated;
create table public.operator_capacity_currency_limits (
 operator_id uuid not null references public.operator_capacity_limits(operator_id),currency text not null check(currency in ('USD','ARS')),
 max_per_operation numeric(16,2) not null check(max_per_operation>=0 and max_per_operation::text not in ('NaN','Infinity','-Infinity')),
 max_exposure numeric(16,2) not null check(max_exposure>=0 and max_exposure::text not in ('NaN','Infinity','-Infinity')),
 declared_working_capital numeric(16,2) not null check(declared_working_capital>=0 and declared_working_capital::text not in ('NaN','Infinity','-Infinity')),
 approved_working_capital numeric(16,2) not null check(approved_working_capital between 0 and declared_working_capital and approved_working_capital::text not in ('NaN','Infinity','-Infinity')),
 status text not null check(status in ('active','inactive')),valid_from timestamptz not null,valid_until timestamptz check(valid_until>valid_from),
 approved_by uuid not null references public.profiles(id),approved_at timestamptz not null,reason text not null check(length(trim(reason)) between 5 and 2000),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),primary key(operator_id,currency)
);
create table public.operation_capacity_reservations (
 operation_id uuid primary key references public.operations(id),operator_id uuid not null references public.operator_profiles(user_id),
 contracting_source text not null check(contracting_source in ('tender','direct','rehire','legacy')),
 currency text not null check(currency in ('USD','ARS')),contract_exposure numeric(16,2) not null check(contract_exposure>0),
 working_capital_required numeric(16,2) check(working_capital_required between 0 and contract_exposure and working_capital_required::text not in ('NaN','Infinity','-Infinity')),
 weight_kg numeric(16,2) not null check(weight_kg>0),volume_m3 numeric(16,3) not null check(volume_m3>0),
 state text not null check(state in ('reserved','active','released','requires_review')),
 reserved_at timestamptz not null default now(),activated_at timestamptz,released_at timestamptz,release_reason text,
 idempotency_key text not null unique,
 check(state in ('requires_review','released') or working_capital_required is not null),
 check((state='released')=(released_at is not null)),check(state<>'released' or length(trim(release_reason))>=5)
);
create index capacity_active_operator_idx on public.operation_capacity_reservations(operator_id,currency,state);
create table public.capacity_events (
 id uuid primary key default gen_random_uuid(),operator_id uuid not null references public.operator_profiles(user_id),operation_id uuid references public.operations(id),
 action text not null,actor_id uuid references public.profiles(id),reason text not null check(length(trim(reason))>=5),
 payload jsonb not null default '{}',event_key text not null unique,created_at timestamptz not null default now()
);
create index capacity_events_operator_idx on public.capacity_events(operator_id,created_at desc);
create table public.capacity_terminal_decisions (
 operation_id uuid primary key references public.operations(id),operator_id uuid not null references public.operator_profiles(user_id),
 terminal_phase text not null check(terminal_phase in ('cancelled','failed')),reason text not null check(length(trim(reason))>=5),
 consequences jsonb not null,recorded_by uuid not null references public.profiles(id),recorded_at timestamptz not null default now()
);
do $$ declare name text; begin foreach name in array array['operator_capacity_limits','operator_capacity_currency_limits','operation_capacity_reservations','capacity_events','capacity_terminal_decisions'] loop
 execute format('alter table public.%I enable row level security',name);
 execute format('revoke all on public.%I from public,authenticated',name);
 execute format('grant select on public.%I to authenticated',name);
 execute format('create policy capacity_private on public.%I for select to authenticated using ((operator_id=auth.uid() and public.current_user_role()=''operator'') or public.current_user_role()=''admin'')',name);
end loop; end $$;
create trigger capacity_limits_updated before update on public.operator_capacity_limits for each row execute function public.set_updated_at();
create trigger capacity_money_updated before update on public.operator_capacity_currency_limits for each row execute function public.set_updated_at();

-- Known historical usage is preserved. Unknown working capital remains NULL, never invented zero.
insert into public.operation_capacity_reservations(operation_id,operator_id,contracting_source,currency,contract_exposure,weight_kg,volume_m3,state,idempotency_key)
select o.id,o.operator_id,'legacy',o.contract_currency,f.total_usd,c.weight_kg,c.volume_m3,'requires_review','reserve:'||o.id
from public.operations o join public.offers f on f.id=o.accepted_offer_id join public.cargo_requests c on c.id=o.cargo_id
where o.phase not in ('completed','cancelled','failed');

-- All supported mutation APIs take the same locks BEFORE cargo/operation locks.
-- Serializing at operator level also protects operational dimensions across currencies.
create function public.lock_operator_capacity(target_operator uuid) returns void language plpgsql security definer set search_path=public as $$ begin
 perform 1 from public.operator_profiles where user_id=target_operator for update;
 insert into public.operator_capacity_mutex(operator_id) values(target_operator)
 on conflict(operator_id) do update set revision=public.operator_capacity_mutex.revision+1;
 perform 1 from public.operator_capacity_limits where operator_id=target_operator for update;
 perform 1 from public.operator_capacity_currency_limits where operator_id=target_operator order by currency for update;
end $$;
create function public.capacity_usage(target_operator uuid) returns jsonb language sql stable security definer set search_path=public as $$
 select jsonb_build_object('operations',count(*),'weight_kg',coalesce(sum(weight_kg),0),'volume_m3',coalesce(sum(volume_m3),0),'requires_review',count(*) filter(where state='requires_review'),
 'currencies',(select jsonb_object_agg(currency,usage) from (select currency,jsonb_build_object('exposure',sum(contract_exposure),'working_capital',case when count(*) filter(where working_capital_required is null)>0 then null else sum(working_capital_required) end,'requires_review',count(*) filter(where working_capital_required is null)) usage
 from public.operation_capacity_reservations where operator_id=target_operator and state<>'released' group by currency) totals))
 from public.operation_capacity_reservations where operator_id=target_operator and state<>'released'
$$;
create function public.operator_capacity_snapshot(target_operator uuid default null) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare target uuid:=coalesce(target_operator,auth.uid()); begin
 if auth.uid() is null or not (public.current_user_role()='admin' or (public.current_user_role()='operator' and target=auth.uid())) then raise exception 'Acceso a capacidad no autorizado'; end if;
 return jsonb_build_object('limits',(select to_jsonb(l) from public.operator_capacity_limits l where operator_id=target),
 'currencies',coalesce((select jsonb_agg(to_jsonb(l) order by currency) from public.operator_capacity_currency_limits l where operator_id=target),'[]'),
 'usage',public.capacity_usage(target),'reservations',coalesce((select jsonb_agg(to_jsonb(r)||jsonb_build_object('public_code',(select c.public_code from public.operations o join public.cargo_requests c on c.id=o.cargo_id where o.id=r.operation_id)) order by reserved_at desc) from public.operation_capacity_reservations r where operator_id=target),'[]'),
 'events',coalesce((select jsonb_agg(to_jsonb(e)) from (select * from public.capacity_events where operator_id=target order by created_at desc limit 100) e),'[]'));
end $$;
create function public.configure_operator_capacity(target_operator uuid,payload jsonb) returns void language plpgsql security definer set search_path=public as $$
declare l public.operator_capacity_limits; m public.operator_capacity_currency_limits; u jsonb; cur text:=payload->>'currency'; reason text:=trim(payload->>'reason'); begin
 if auth.uid() is null or public.current_user_role()<>'admin' then raise exception 'Acceso administrativo requerido'; end if;
 if not exists(select 1 from public.profiles p join public.operator_profiles o on o.user_id=p.id where p.id=target_operator and p.role='operator') then raise exception 'La cuenta no es operador'; end if;
 if cur not in ('USD','ARS') or coalesce(length(reason),0)<5 or payload->>'status' not in ('active','inactive') then raise exception 'Completá moneda, estado y motivo'; end if;
 perform public.lock_operator_capacity(target_operator);
 u:=public.capacity_usage(target_operator);
 if (u->>'requires_review')::int>0 then raise exception 'Revisá las reservas históricas antes de aprobar límites'; end if;
 if (payload->>'max_operations')::int<(u->>'operations')::int or (nullif(payload->>'max_weight_kg','')::numeric is not null and (payload->>'max_weight_kg')::numeric<(u->>'weight_kg')::numeric)
 or (nullif(payload->>'max_volume_m3','')::numeric is not null and (payload->>'max_volume_m3')::numeric<(u->>'volume_m3')::numeric)
 or (payload->>'max_exposure')::numeric<coalesce((u->'currencies'->cur->>'exposure')::numeric,0)
 or (payload->>'approved_working_capital')::numeric<coalesce((u->'currencies'->cur->>'working_capital')::numeric,0)
 or exists(select 1 from public.operation_capacity_reservations where operator_id=target_operator and currency=cur and state<>'released' and contract_exposure>(payload->>'max_per_operation')::numeric) then raise exception 'No se puede reducir un límite por debajo del consumo activo'; end if;
 select * into l from public.operator_capacity_limits where operator_id=target_operator;
 select * into m from public.operator_capacity_currency_limits where operator_id=target_operator and currency=cur;
 insert into public.operator_capacity_limits(operator_id,max_operations,max_weight_kg,max_volume_m3,status,valid_from,valid_until,approved_by,approved_at,reason)
 values(target_operator,(payload->>'max_operations')::int,nullif(payload->>'max_weight_kg','')::numeric,nullif(payload->>'max_volume_m3','')::numeric,coalesce(payload->>'operational_status',payload->>'status'),coalesce(payload->>'operational_valid_from',payload->>'valid_from')::timestamptz,nullif(case when payload ? 'operational_valid_until' then payload->>'operational_valid_until' else payload->>'valid_until' end,'')::timestamptz,auth.uid(),now(),reason)
 on conflict(operator_id) do update set max_operations=excluded.max_operations,max_weight_kg=excluded.max_weight_kg,max_volume_m3=excluded.max_volume_m3,status=excluded.status,valid_from=excluded.valid_from,valid_until=excluded.valid_until,approved_by=excluded.approved_by,approved_at=excluded.approved_at,reason=excluded.reason;
 insert into public.operator_capacity_currency_limits(operator_id,currency,max_per_operation,max_exposure,declared_working_capital,approved_working_capital,status,valid_from,valid_until,approved_by,approved_at,reason)
 values(target_operator,cur,(payload->>'max_per_operation')::numeric,(payload->>'max_exposure')::numeric,(payload->>'declared_working_capital')::numeric,(payload->>'approved_working_capital')::numeric,payload->>'status',(payload->>'valid_from')::timestamptz,nullif(payload->>'valid_until','')::timestamptz,auth.uid(),now(),reason)
 on conflict(operator_id,currency) do update set max_per_operation=excluded.max_per_operation,max_exposure=excluded.max_exposure,declared_working_capital=excluded.declared_working_capital,approved_working_capital=excluded.approved_working_capital,status=excluded.status,valid_from=excluded.valid_from,valid_until=excluded.valid_until,approved_by=excluded.approved_by,approved_at=excluded.approved_at,reason=excluded.reason;
 insert into public.capacity_events(operator_id,action,actor_id,reason,payload,event_key) values(target_operator,'limits.configured',auth.uid(),reason,jsonb_build_object('before_operational',to_jsonb(l),'before_currency',to_jsonb(m),'after',payload),'limits:'||gen_random_uuid());
 insert into public.audit_logs(actor_id,action,entity_id,payload) values(auth.uid(),'capacity.configure',target_operator,jsonb_build_object('currency',cur,'reason',reason));
end $$;

create function public.review_historical_capacity(target_operation uuid,capital_amount numeric,reason text) returns void language plpgsql security definer set search_path=public as $$
declare r public.operation_capacity_reservations; begin
 if auth.uid() is null or public.current_user_role()<>'admin' then raise exception 'Acceso administrativo requerido'; end if;
 select * into r from public.operation_capacity_reservations where operation_id=target_operation;
 if not found then raise exception 'Reserva no disponible'; end if;
 perform public.lock_operator_capacity(r.operator_id);
 select * into r from public.operation_capacity_reservations where operation_id=target_operation for update;
 if r.state<>'requires_review' or capital_amount is null or capital_amount<0 or capital_amount>r.contract_exposure or capital_amount::text in ('NaN','Infinity','-Infinity') or coalesce(length(trim(reason)),0)<5 then raise exception 'Revisión de capital inválida'; end if;
 update public.operation_capacity_reservations set working_capital_required=capital_amount,state=case when (select phase from public.operations where id=target_operation)='created' then 'reserved' else 'active' end where operation_id=target_operation;
 insert into public.capacity_events(operator_id,operation_id,action,actor_id,reason,payload,event_key) values(r.operator_id,target_operation,'legacy.reviewed',auth.uid(),reason,jsonb_build_object('declared_capital',capital_amount),'review:'||target_operation);
end $$;
revoke all on function public.lock_operator_capacity(uuid),public.capacity_usage(uuid),public.operator_capacity_snapshot(uuid),public.configure_operator_capacity(uuid,jsonb),public.review_historical_capacity(uuid,numeric,text) from public;
grant execute on function public.operator_capacity_snapshot(uuid),public.configure_operator_capacity(uuid,jsonb),public.review_historical_capacity(uuid,numeric,text) to authenticated;
