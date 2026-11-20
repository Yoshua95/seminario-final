begin;

alter table public.cargo_requests add column corridor_version text not null default 'legacy',
 add column origin_country text,add column destination_country text,add column origin_plan jsonb;
alter table public.cargo_requests add constraint cargo_fixed_china_corridor check(corridor_version='legacy' or
 (corridor_version='china_origin_v1' and origin_country='CN' and destination_country='AR' and origin_plan is not null));

create table public.china_warehouses(
 id uuid primary key default gen_random_uuid(),operator_id uuid not null references public.operator_profiles(user_id),
 alias text not null,recipient text not null,phone text not null,province text not null,city text not null,
 district text not null default '',postal_code text not null default '',address_zh text not null,instructions text not null,
 active boolean not null default true,is_default boolean not null default false,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),check(not is_default or active)
);
create unique index china_warehouse_one_default on public.china_warehouses(operator_id) where active and is_default;
create index china_warehouse_owner_idx on public.china_warehouses(operator_id,active);
create table public.china_command_requests(
 actor_id uuid not null references public.profiles(id),request_id uuid not null,command text not null,
 payload jsonb not null,result jsonb not null,created_at timestamptz not null default now(),primary key(actor_id,request_id)
);
create table public.offer_china_receipt_terms(
 offer_id uuid primary key references public.offers(id),warehouse_id uuid not null references public.china_warehouses(id),
 warehouse_snapshot jsonb not null,receiving_conditions text not null,pickup_included boolean not null,pickup_conditions text not null
);
create table public.china_operation_coordination(
 operation_id uuid primary key references public.operations(id),origin_plan jsonb not null,warehouse_snapshot jsonb not null,
 state text not null default 'awaiting_dispatch' check(state in ('awaiting_dispatch','in_transit_to_warehouse','received_in_china')),
 tracking_reference text,dispatched_by uuid references public.profiles(id),dispatched_at timestamptz,
 measured jsonb,received_by uuid references public.profiles(id),received_at timestamptz,
 created_at timestamptz not null default now()
);
create table public.china_receipt_revisions(
 id uuid primary key default gen_random_uuid(),operation_id uuid not null references public.operations(id),
 proposed_by uuid not null references public.profiles(id),amount_ars numeric(12,2) not null check(amount_ars>0),
 estimated_days int not null check(estimated_days between 1 and 365),conditions text not null,reason text not null,
 previous_terms jsonb not null,status text not null default 'proposed' check(status in ('proposed','accepted','rejected')),
 created_at timestamptz not null default now(),accepted_at timestamptz,decided_by uuid references public.profiles(id)
);
create index china_revision_operation_idx on public.china_receipt_revisions(operation_id,created_at);
create unique index china_revision_one_pending on public.china_receipt_revisions(operation_id) where status='proposed';

alter table public.china_warehouses enable row level security;
alter table public.china_command_requests enable row level security;
alter table public.offer_china_receipt_terms enable row level security;
alter table public.china_operation_coordination enable row level security;
alter table public.china_receipt_revisions enable row level security;
revoke all on public.china_warehouses,public.china_command_requests,public.offer_china_receipt_terms,
 public.china_operation_coordination,public.china_receipt_revisions from public,anon,authenticated,service_role;
grant select on public.china_warehouses,public.offer_china_receipt_terms,public.china_operation_coordination,public.china_receipt_revisions to authenticated;
create policy china_warehouse_owner_read on public.china_warehouses for select to authenticated
 using(operator_id=(select auth.uid()) or public.current_user_role()='admin');
create policy china_offer_terms_read on public.offer_china_receipt_terms for select to authenticated using(
 public.current_user_role()='admin' or exists(select 1 from public.offers f where f.id=offer_id and f.operator_id=(select auth.uid()))
 or exists(select 1 from public.operations o where o.accepted_offer_id=offer_id and public.is_operation_participant(o.id)));
create policy china_operation_read on public.china_operation_coordination for select to authenticated using(public.is_operation_participant(operation_id));
create policy china_revision_read on public.china_receipt_revisions for select to authenticated using(public.is_operation_participant(operation_id));

create function public.china_measurements(value jsonb) returns jsonb language plpgsql immutable set search_path=public as $$
declare k text;n numeric;volume numeric:=1;begin
 if jsonb_typeof(value) is distinct from 'object' or jsonb_typeof(value->'estimated') is distinct from 'boolean' then raise exception 'Medidas y tipo estimado o medido requeridos';end if;
 foreach k in array array['packages','weight_kg','length_cm','width_cm','height_cm'] loop
  if coalesce(value->>k,'NaN') in ('NaN','Infinity','-Infinity') then raise exception 'Medidas invalidas';end if;
  n:=(value->>k)::numeric;if n<=0 or n>1000000 then raise exception 'Medidas fuera de rango';end if;
  if k='packages' and (n<>trunc(n) or n>10000) then raise exception 'Cantidad de bultos invalida';end if;
  if k in ('length_cm','width_cm','height_cm') and n>10000 then raise exception 'Dimensiones en centimetros fuera de rango';end if;
  if k<>'weight_kg' then volume:=volume*n;end if;
 end loop;
 volume:=volume/1000000;if volume<=0 or volume>=1000000 then raise exception 'Volumen calculado fuera de rango';end if;
 return value||jsonb_build_object('volume_m3',volume);
end $$;

create function public.china_cached(command_name text,key uuid,value jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$
declare prior public.china_command_requests;begin
 if auth.uid() is null or key is null then raise exception 'Sesion e identificador de reintento requeridos';end if;
 select * into prior from public.china_command_requests where actor_id=auth.uid() and request_id=key;
 if found then if prior.command<>command_name or prior.payload is distinct from value then raise exception 'El reintento debe conservar los mismos datos';end if;return prior.result;end if;
 return null;
end $$;

create function public.save_china_warehouse(request_id uuid,payload jsonb) returns uuid
language plpgsql security definer set search_path=public as $$
declare cached jsonb;target uuid;w public.china_warehouses;k text;desired_default boolean;is_active boolean;begin
 if auth.uid() is null or public.current_user_role()<>'operator' then raise exception 'Acceso de operador requerido';end if;
 perform public.lock_marketplace();cached:=public.china_cached('warehouse',request_id,payload);if cached is not null then return (cached->>'id')::uuid;end if;
 foreach k in array array['alias','recipient','phone','province','city','address_zh','instructions'] loop
  if length(trim(coalesce(payload->>k,''))) not between 1 and 2000 then raise exception 'Completa los datos e instrucciones del deposito';end if;
 end loop;
 target:=coalesce(nullif(payload->>'id','')::uuid,gen_random_uuid());
 select * into w from public.china_warehouses where id=target for update;
 if found and w.operator_id<>auth.uid() then raise exception 'Deposito ajeno';end if;
 is_active:=coalesce((payload->>'active')::boolean,true);
 desired_default:=is_active and (coalesce((payload->>'is_default')::boolean,false) or not exists(select 1 from public.china_warehouses where operator_id=auth.uid() and active and id<>target));
 if desired_default then update public.china_warehouses set is_default=false where operator_id=auth.uid() and is_default;end if;
 insert into public.china_warehouses(id,operator_id,alias,recipient,phone,province,city,district,postal_code,address_zh,instructions,active,is_default)
 values(target,auth.uid(),trim(payload->>'alias'),trim(payload->>'recipient'),trim(payload->>'phone'),trim(payload->>'province'),trim(payload->>'city'),coalesce(payload->>'district',''),coalesce(payload->>'postal_code',''),trim(payload->>'address_zh'),trim(payload->>'instructions'),is_active,desired_default)
 on conflict(id) do update set alias=excluded.alias,recipient=excluded.recipient,phone=excluded.phone,province=excluded.province,city=excluded.city,district=excluded.district,postal_code=excluded.postal_code,address_zh=excluded.address_zh,instructions=excluded.instructions,active=excluded.active,is_default=excluded.is_default,updated_at=now();
 if not exists(select 1 from public.china_warehouses where operator_id=auth.uid() and active and is_default) then
  update public.china_warehouses set is_default=true where id=(select id from public.china_warehouses where operator_id=auth.uid() and active order by created_at,id limit 1);
 end if;
 insert into public.china_command_requests values(auth.uid(),request_id,'warehouse',payload,jsonb_build_object('id',target),now());return target;
end $$;

alter function public.prepare_cargo_publication(uuid,jsonb) rename to prepare_cargo_before_china;
do $$ begin
 execute replace(pg_get_functiondef('public.prepare_cargo_before_china(uuid,jsonb)'::regprocedure),
  'prepare_cargo_publication.request_id','prepare_cargo_before_china.request_id');
end $$;
revoke all on function public.prepare_cargo_before_china(uuid,jsonb) from public,anon,authenticated,service_role;
create function public.prepare_cargo_publication(request_id uuid,payload jsonb) returns uuid
language plpgsql security definer set search_path=public as $$
declare plan jsonb:=payload->'origin_plan';m jsonb;result uuid;clean jsonb;province text;begin
 if auth.uid() is null or public.current_user_role()<>'importer' then raise exception 'Acceso de importador requerido';end if;
 if coalesce(payload->>'origin_country','CN')<>'CN' or coalesce(payload->>'destination_country','AR')<>'AR' then raise exception 'El corredor del MVP es China a Argentina';end if;
 if plan is null or coalesce(plan->>'kind','') not in ('agent','supplier') then raise exception 'Actualiza el APK para indicar como llega el paquete al deposito de China';end if;
 if plan->>'kind'='agent' then
  if coalesce(plan->>'handoff','') not in ('agent_sends','pickup') or length(trim(coalesce(plan->>'agent_name','')))=0 or length(trim(coalesce(plan#>>'{origin,province}','')))=0 or length(trim(coalesce(plan#>>'{origin,city}','')))=0 or length(trim(coalesce(plan#>>'{origin,address}','')))=0 then raise exception 'Completa agente, ubicacion y quien despacha o retira';end if;
 elsif coalesce(plan->>'handoff','')<>'supplier_sends' or length(trim(coalesce(plan#>>'{origin,province}','')||coalesce(plan#>>'{origin,city}','')))=0 then raise exception 'Indica desde donde despacha el proveedor';end if;
 province:=plan#>>'{destination,province}';
 if province is null or not(province=any(array['Buenos Aires','Catamarca','Chaco','Chubut','Córdoba','Corrientes','Entre Ríos','Formosa','Jujuy','La Pampa','La Rioja','Mendoza','Misiones','Neuquén','Río Negro','Salta','San Juan','San Luis','Santa Cruz','Santa Fe','Santiago del Estero','Tierra del Fuego','Tucumán','CABA'])) or length(trim(coalesce(plan#>>'{destination,city}','')))=0 then raise exception 'Provincia y localidad de Argentina requeridas';end if;
 m:=public.china_measurements(plan->'measurements');plan:=jsonb_set(plan,'{measurements}',m);
 clean:=payload||jsonb_build_object('origin_country','CN','destination_country','AR','origin_plan',plan,
  'origin',concat_ws(', ',nullif(trim(plan#>>'{origin,city}'),''),nullif(trim(plan#>>'{origin,province}'),''),'China'),
  'destination',concat_ws(', ',trim(plan#>>'{destination,city}'),province,'Argentina'),
  'weight_kg',(m->>'weight_kg')::numeric,'volume_m3',(m->>'volume_m3')::numeric,'volume_unknown',false);
 result:=public.prepare_cargo_before_china(request_id,clean);
 update public.cargo_requests set corridor_version='china_origin_v1',origin_country='CN',destination_country='AR',origin_plan=plan,
 packages=(m->>'packages')::int,requested_services=case when plan->>'handoff'='pickup' then array['international_transport','origin_pickup'] else array['international_transport'] end where id=result and status='draft';
 return result;
end $$;
revoke insert on public.cargo_requests from authenticated;
create function public.guard_china_cargo_fields() returns trigger language plpgsql set search_path=public as $$ begin
 if current_user in ('anon','authenticated') and (new.corridor_version,new.origin_country,new.destination_country,new.origin_plan,new.requested_services) is distinct from (old.corridor_version,old.origin_country,old.destination_country,old.origin_plan,old.requested_services) then raise exception 'Los datos de coordinacion se gestionan por el flujo autorizado';end if;return new;end $$;
create trigger protect_china_cargo_fields before update on public.cargo_requests for each row execute function public.guard_china_cargo_fields();

create or replace function public.operator_compatible(target_operator uuid,target_cargo uuid) returns boolean
language plpgsql stable security definer set search_path=public as $$ declare c public.cargo_requests;begin
 select * into c from public.cargo_requests where id=target_cargo;
 if not found or auth.uid() is null or not(target_operator=auth.uid() or c.importer_id=auth.uid() or public.current_user_role()='admin') then return false;end if;
 return exists(select 1 from public.operator_authorizations a join public.operator_profiles p on p.user_id=a.operator_id join public.profiles u on u.id=p.user_id
  where a.operator_id=target_operator and p.verification_status='approved' and u.role='operator'
  and ((c.corridor_version='legacy' and public.route_region(a.origin)=public.route_region(c.origin) and public.route_region(a.destination)=public.route_region(c.destination))
   or (c.corridor_version='china_origin_v1' and c.origin_country='CN' and c.destination_country='AR' and public.route_region(a.origin)='CN' and public.route_region(a.destination)='AR'))
  and c.requested_services<@a.services and (c.preferred_mode is null or c.preferred_mode=any(a.modes)));
end $$;
create or replace function public.quote_taxonomy() returns text[] language sql immutable set search_path=public as $$
 select array['international_transport','origin_pickup','origin_handling','customs_coordination','destination_handling','domestic_delivery','storage','insurance','integrated_service','other']::text[] $$;

alter function public.quote_command(text,jsonb) rename to quote_command_before_china;
revoke all on function public.quote_command_before_china(text,jsonb) from public,anon,authenticated,service_role;
create function public.quote_command(command text,payload jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$
declare c public.cargo_requests;w public.china_warehouses;key uuid;cached jsonb;clean jsonb;result jsonb;conditions text;pickup text;begin
 if auth.uid() is null or public.current_user_role()<>'operator' then raise exception 'Acceso de operador requerido';end if;
 select * into c from public.cargo_requests where id=nullif(payload->>'cargo_id','')::uuid;
 if command<>'submit' or c.corridor_version is distinct from 'china_origin_v1' then return public.quote_command_before_china(command,payload);end if;
 perform public.lock_marketplace();key:=nullif(payload->>'submission_key','')::uuid;cached:=public.china_cached('quote',key,payload);if cached is not null then return cached;end if;
 select * into w from public.china_warehouses where id=nullif(payload#>>'{quote,china_warehouse_id}','')::uuid and operator_id=auth.uid() and active;
 if not found then raise exception 'Selecciona un deposito activo propio en China desde Perfil empresarial';end if;
 conditions:=trim(coalesce(payload#>>'{quote,receiving_conditions}',''));pickup:=trim(coalesce(payload#>>'{quote,pickup_conditions}',''));
 if length(conditions) not between 5 and 2000 then raise exception 'Detalla las condiciones de recepcion';end if;
 if c.origin_plan->>'handoff'='pickup' and (payload#>>'{quote,pickup_included}' is distinct from 'true' or length(pickup) not between 5 and 2000) then raise exception 'Confirma retiro incluido y sus condiciones';end if;
 clean:=jsonb_set(payload,'{quote}',(payload->'quote')-'china_warehouse_id'-'china_warehouse_summary'-'receiving_conditions'-'pickup_included'-'pickup_conditions');
 result:=public.quote_command_before_china(command,clean);
 insert into public.offer_china_receipt_terms values((result->>'id')::uuid,w.id,to_jsonb(w),conditions,coalesce((payload#>>'{quote,pickup_included}')::boolean,false),pickup);
 insert into public.china_command_requests values(auth.uid(),key,'quote',payload,result,now());return result;
end $$;

create function public.china_offer_summaries(target_cargo uuid) returns jsonb
language plpgsql stable security definer set search_path=public as $$ begin
 if auth.uid() is null or not exists(select 1 from public.cargo_requests c where c.id=target_cargo and (c.importer_id=auth.uid() or public.current_user_role()='admin' or public.operator_compatible(auth.uid(),target_cargo))) then raise exception 'Carga no autorizada';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('offer_id',f.id,'warehouse',jsonb_build_object('id',t.warehouse_id,'alias',t.warehouse_snapshot->>'alias','province',t.warehouse_snapshot->>'province','city',t.warehouse_snapshot->>'city','district',t.warehouse_snapshot->>'district'),'receiving_conditions',t.receiving_conditions,'pickup_included',t.pickup_included,'pickup_conditions',t.pickup_conditions))
 from public.offers f join public.offer_china_receipt_terms t on t.offer_id=f.id join public.cargo_requests c on c.id=f.cargo_id where c.id=target_cargo and (c.importer_id=auth.uid() or public.current_user_role()='admin' or f.operator_id=auth.uid())),'[]'::jsonb);
end $$;

alter function public.award_offer(uuid) rename to award_offer_before_china;
revoke all on function public.award_offer_before_china(uuid) from public,anon,authenticated,service_role;
create function public.award_offer(target_offer_id uuid) returns uuid
language plpgsql security definer set search_path=public as $$
declare c public.cargo_requests;t public.offer_china_receipt_terms;result uuid;begin
 if auth.uid() is null or public.current_user_role()<>'importer' then raise exception 'Acceso de importador requerido';end if;
 perform public.lock_marketplace();select c2.* into c from public.cargo_requests c2 join public.offers f on f.cargo_id=c2.id where f.id=target_offer_id;
 if c.corridor_version='china_origin_v1' then
  select * into t from public.offer_china_receipt_terms where offer_id=target_offer_id;if not found then raise exception 'La oferta no incluye un deposito y condiciones de recepcion';end if;
 end if;
 result:=public.award_offer_before_china(target_offer_id);
 if c.corridor_version='china_origin_v1' then insert into public.china_operation_coordination(operation_id,origin_plan,warehouse_snapshot)values(result,c.origin_plan,t.warehouse_snapshot) on conflict(operation_id) do nothing;end if;
 return result;
end $$;

create function public.record_china_dispatch(target_operation uuid,request_id uuid,tracking_reference text default '') returns uuid
language plpgsql security definer set search_path=public as $$
declare op public.operations;coord public.china_operation_coordination;value jsonb:=jsonb_build_object('operation',target_operation,'tracking',tracking_reference);cached jsonb;begin
 if auth.uid() is null then raise exception 'Sesion requerida';end if;
 select * into op from public.operations where id=target_operation for update;
 select * into coord from public.china_operation_coordination where operation_id=target_operation;
 if not found or not(case when coord.origin_plan->>'handoff'='pickup' then op.operator_id=auth.uid() and public.current_user_role()='operator' else op.importer_id=auth.uid() and public.current_user_role()='importer' end) then raise exception 'Solo la parte responsable puede registrar despacho o retiro';end if;
 cached:=public.china_cached('dispatch',request_id,value);if cached is not null then return target_operation;end if;
 if op.phase in ('cancelled','failed','completed','disputed') or coord.state<>'awaiting_dispatch' then raise exception 'La operacion no admite registrar otro despacho';end if;
 if length(coalesce(tracking_reference,''))>250 then raise exception 'Seguimiento local demasiado largo';end if;
 update public.china_operation_coordination set state='in_transit_to_warehouse',tracking_reference=record_china_dispatch.tracking_reference,dispatched_by=auth.uid(),dispatched_at=now() where operation_id=target_operation;
 insert into public.tracking_events(operation_id,status,title,event_type,description,created_by)values(op.id,op.status,'En camino al deposito de China','china_dispatch',coalesce(tracking_reference,''),auth.uid());
 insert into public.china_command_requests values(auth.uid(),request_id,'dispatch',value,jsonb_build_object('id',target_operation),now());return target_operation;
end $$;

create function public.confirm_china_receipt(target_operation uuid,request_id uuid,measurements jsonb) returns uuid
language plpgsql security definer set search_path=public as $$
declare op public.operations;coord public.china_operation_coordination;m jsonb;value jsonb:=jsonb_build_object('operation',target_operation,'measurements',measurements);cached jsonb;begin
 if auth.uid() is null or public.current_user_role()<>'operator' then raise exception 'Acceso de operador requerido';end if;
 select * into op from public.operations where id=target_operation for update;
 if op.operator_id is distinct from auth.uid() then raise exception 'Operacion ajena';end if;
 cached:=public.china_cached('receipt',request_id,value);if cached is not null then return target_operation;end if;
 select * into coord from public.china_operation_coordination where operation_id=target_operation;
 if not found or coord.state<>'in_transit_to_warehouse' or op.phase in ('cancelled','failed','completed','disputed') then raise exception 'Registra primero el despacho o retiro de esta operacion';end if;
 m:=public.china_measurements(measurements);if m->>'estimated'<>'false' then raise exception 'La recepcion requiere medidas reales';end if;
 update public.china_operation_coordination set state='received_in_china',measured=m,received_by=auth.uid(),received_at=now() where operation_id=target_operation;
 insert into public.tracking_events(operation_id,status,title,event_type,description,location,created_by)values(op.id,op.status,'Recibido en el deposito de China','china_receipt',m::text,coord.warehouse_snapshot->>'city',auth.uid());
 insert into public.china_command_requests values(auth.uid(),request_id,'receipt',value,jsonb_build_object('id',target_operation),now());return target_operation;
end $$;

create function public.propose_china_revision(target_operation uuid,request_id uuid,payload jsonb) returns uuid
language plpgsql security definer set search_path=public as $$
declare op public.operations;cached jsonb;value jsonb:=jsonb_build_object('operation',target_operation,'terms',payload);result uuid;previous jsonb;amount numeric;days int;begin
 if auth.uid() is null or public.current_user_role()<>'operator' then raise exception 'Acceso de operador requerido';end if;
 select * into op from public.operations where id=target_operation for update;if op.operator_id is distinct from auth.uid() then raise exception 'Operacion ajena';end if;
 cached:=public.china_cached('revision',request_id,value);if cached is not null then return (cached->>'id')::uuid;end if;
 if not exists(select 1 from public.china_operation_coordination where operation_id=op.id and state='received_in_china') or op.phase in ('cancelled','completed','failed','disputed') then raise exception 'Revisa las medidas recibidas antes de proponer un ajuste';end if;
 if coalesce(payload->>'currency','ARS')<>'ARS' then raise exception 'Los ajustes nuevos deben estar en ARS';end if;
 amount:=(payload->>'amount_ars')::numeric;days:=(payload->>'estimated_days')::int;
 if amount is null or amount::text in ('NaN','Infinity','-Infinity') or amount<=0 or amount>999999999 or days is null or days not between 1 and 365 or length(trim(coalesce(payload->>'reason','')))<5 or length(trim(coalesce(payload->>'conditions','')))<5 then raise exception 'Completa importe, plazo, motivo y condiciones del ajuste';end if;
 select to_jsonb(r) into previous from public.china_receipt_revisions r where operation_id=op.id and status='accepted' order by accepted_at desc limit 1;
 if previous is null then select content into previous from public.operation_contract_snapshots where operation_id=op.id;end if;
 insert into public.china_receipt_revisions(operation_id,proposed_by,amount_ars,estimated_days,conditions,reason,previous_terms)
 values(op.id,auth.uid(),amount,days,trim(payload->>'conditions'),trim(payload->>'reason'),coalesce(previous,'{}')) returning id into result;
 insert into public.tracking_events(operation_id,status,title,event_type,description,created_by)values(op.id,op.status,'Revision de recepcion propuesta','china_revision',result::text,auth.uid());
 insert into public.china_command_requests values(auth.uid(),request_id,'revision',value,jsonb_build_object('id',result),now());return result;
end $$;
create function public.decide_china_revision(target_revision uuid,request_id uuid,accept boolean) returns uuid
language plpgsql security definer set search_path=public as $$
declare op public.operations;r public.china_receipt_revisions;value jsonb:=jsonb_build_object('revision',target_revision,'accept',accept);cached jsonb;begin
 if auth.uid() is null or public.current_user_role()<>'importer' then raise exception 'Acceso de importador requerido';end if;
 select o.* into op from public.operations o join public.china_receipt_revisions v on v.operation_id=o.id where v.id=target_revision for update of o;
 if not found or op.importer_id<>auth.uid() then raise exception 'Revision ajena';end if;
 cached:=public.china_cached('decision',request_id,value);if cached is not null then return target_revision;end if;
 select * into r from public.china_receipt_revisions where id=target_revision for update;
 if accept is null or r.status<>'proposed' or op.phase in ('cancelled','completed','failed','disputed') then raise exception 'La revision ya fue decidida o la operacion esta cerrada';end if;
 update public.china_receipt_revisions set status=case when accept then 'accepted' else 'rejected' end,accepted_at=now(),decided_by=auth.uid() where id=r.id;
 insert into public.tracking_events(operation_id,status,title,event_type,description,created_by)values(op.id,op.status,case when accept then 'Revision de recepcion aceptada' else 'Revision de recepcion rechazada' end,'china_revision_decision',r.id::text,auth.uid());
 insert into public.china_command_requests values(auth.uid(),request_id,'decision',value,jsonb_build_object('id',r.id),now());return r.id;
end $$;

alter function public.transition_operation(uuid,text,text,text) rename to transition_operation_before_china;
revoke all on function public.transition_operation_before_china(uuid,text,text,text) from public,anon,authenticated,service_role;
create function public.transition_operation(target uuid,next_phase text,description text default '',location text default '') returns void
language plpgsql security definer set search_path=public as $$ declare coord public.china_operation_coordination;op public.operations;begin
 if auth.uid() is null or not public.is_operation_participant(target) then raise exception 'Operacion no autorizada';end if;
 select * into op from public.operations where id=target for update;select * into coord from public.china_operation_coordination where operation_id=target;
 if found and next_phase not in ('disputed','cancelled') then
  if coord.state<>'received_in_china' then raise exception 'Completa despacho y recepcion en China antes de avanzar';end if;
  if exists(select 1 from public.china_receipt_revisions where operation_id=target and status='proposed') then raise exception 'El importador debe decidir la revision antes de avanzar';end if;
  if (select amount_ars from public.china_receipt_revisions where operation_id=target and status='accepted' order by accepted_at desc,id desc limit 1) is not null and (select amount_ars from public.china_receipt_revisions where operation_id=target and status='accepted' order by accepted_at desc,id desc limit 1) is distinct from (select total_usd from public.offers where id=op.accepted_offer_id) then raise exception 'El ajuste economico aceptado requiere conciliacion adicional; no modifica ni duplica el pago original';end if;
 end if;
 perform public.transition_operation_before_china(target,next_phase,description,location);
end $$;
-- Never send an obsolete initial price to the provider after accepting a price addendum.
alter function public.claim_mp_test_checkout(uuid,uuid) rename to claim_mp_checkout_before_china;
revoke all on function public.claim_mp_checkout_before_china(uuid,uuid) from public,anon,authenticated,service_role;
create function public.claim_mp_test_checkout(actor uuid,target uuid) returns jsonb
language plpgsql security definer set search_path=public as $$ begin
 if exists(select 1 from public.operations o where o.id=target and (select r.amount_ars from public.china_receipt_revisions r where r.operation_id=o.id and r.status='accepted' order by r.accepted_at desc,r.id desc limit 1) is not null and (select r.amount_ars from public.china_receipt_revisions r where r.operation_id=o.id and r.status='accepted' order by r.accepted_at desc,r.id desc limit 1) is distinct from (select f.total_usd from public.offers f where f.id=o.accepted_offer_id)) then raise exception 'El ajuste economico aceptado requiere un circuito adicional; el checkout original se conserva';end if;
 return public.claim_mp_checkout_before_china(actor,target);
end $$;

revoke all on function public.china_measurements(jsonb),public.china_cached(text,uuid,jsonb),public.guard_china_cargo_fields() from public,anon,authenticated,service_role;
revoke all on function public.save_china_warehouse(uuid,jsonb),public.prepare_cargo_publication(uuid,jsonb),public.operator_compatible(uuid,uuid),public.quote_command(text,jsonb),public.award_offer(uuid),public.record_china_dispatch(uuid,uuid,text),public.confirm_china_receipt(uuid,uuid,jsonb),public.propose_china_revision(uuid,uuid,jsonb),public.decide_china_revision(uuid,uuid,boolean),public.transition_operation(uuid,text,text,text) from public,anon,authenticated,service_role;
grant execute on function public.save_china_warehouse(uuid,jsonb),public.prepare_cargo_publication(uuid,jsonb),public.operator_compatible(uuid,uuid),public.quote_command(text,jsonb),public.award_offer(uuid),public.record_china_dispatch(uuid,uuid,text),public.confirm_china_receipt(uuid,uuid,jsonb),public.propose_china_revision(uuid,uuid,jsonb),public.decide_china_revision(uuid,uuid,boolean),public.transition_operation(uuid,text,text,text) to authenticated;
revoke all on function public.claim_mp_test_checkout(uuid,uuid) from public,anon,authenticated;
grant execute on function public.claim_mp_test_checkout(uuid,uuid) to service_role;
revoke all on function public.china_offer_summaries(uuid) from public,anon,authenticated,service_role;
grant execute on function public.china_offer_summaries(uuid) to authenticated;
commit;
