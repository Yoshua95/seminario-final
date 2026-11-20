begin;
-- New requests use declared quantities and reception-only origin.
-- Historical plans, offers, amounts and operation snapshots are not rewritten.
alter table public.cargo_requests drop constraint cargo_fixed_china_corridor;
alter table public.cargo_requests add constraint cargo_fixed_china_corridor check(
 corridor_version='legacy' or (corridor_version in ('china_origin_v1','china_origin_v2') and origin_country='CN' and destination_country='AR' and origin_plan is not null));

create function public.origin_positive_decimal(value text,max_scale int) returns numeric
language plpgsql immutable set search_path=public as $$ declare n numeric;v text:=trim(coalesce(value,''));begin
 if v !~ '^[0-9]+([.,][0-9]+)?$' then raise exception 'Ingresa un valor positivo con coma o punto decimal';end if;
 n:=replace(v,',','.')::numeric;
 if n<=0 or n>999999999 or n<>round(n,max_scale) then raise exception 'Valor positivo fuera de rango o con demasiados decimales';end if;
 return n;
end $$;
create function public.argentina_provinces() returns text[] language sql immutable set search_path=public as $$
 select array['Buenos Aires','Catamarca','Chaco','Chubut','Córdoba','Corrientes','Entre Ríos','Formosa','Jujuy','La Pampa','La Rioja','Mendoza','Misiones','Neuquén','Río Negro','Salta','San Juan','San Luis','Santa Cruz','Santa Fe','Santiago del Estero','Tierra del Fuego','Tucumán','CABA']::text[] $$;

create table public.operator_argentina_depots(
 id uuid primary key default gen_random_uuid(),operator_id uuid not null references public.operator_profiles(user_id),
 alias text not null,recipient text not null,phone text not null,province text not null,city text not null,
 district text not null default '',postal_code text not null default '',address text not null,instructions text not null,
 delivery_provinces text[] not null default '{}',active boolean not null default true,is_default boolean not null default false,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),check(not is_default or active)
);
create unique index argentina_depot_one_default on public.operator_argentina_depots(operator_id) where active and is_default;
create index argentina_depot_owner_idx on public.operator_argentina_depots(operator_id,active);
create table public.offer_destination_terms(
 offer_id uuid primary key references public.offers(id),depot_id uuid not null references public.operator_argentina_depots(id),
 agreed_mode text not null check(agreed_mode in ('pickup','home')),import_fee numeric(12,2) not null check(import_fee>0),
 delivery_fee numeric(12,2) not null check(delivery_fee>=0),total numeric(12,2) not null check(total=import_fee+delivery_fee),
 currency text not null default 'ARS' check(currency='ARS'),pickup_snapshot jsonb not null,delivery_address jsonb,
 acceptance_required boolean not null,condition text not null,created_at timestamptz not null default now(),
 check(agreed_mode<>'pickup' or delivery_fee=0)
);
create table public.offer_destination_acceptances(
 offer_id uuid primary key references public.offer_destination_terms(offer_id),importer_id uuid not null references public.profiles(id),
 condition text not null,accepted_at timestamptz not null default now()
);
create table public.operation_destination_terms(
 operation_id uuid primary key references public.operations(id),offer_id uuid not null references public.offers(id),
 content jsonb not null,accepted_at timestamptz not null default now()
);
alter table public.operator_argentina_depots enable row level security;
alter table public.offer_destination_terms enable row level security;
alter table public.offer_destination_acceptances enable row level security;
alter table public.operation_destination_terms enable row level security;
revoke all on public.operator_argentina_depots,public.offer_destination_terms,public.offer_destination_acceptances,public.operation_destination_terms from public,anon,authenticated,service_role;
grant select on public.operator_argentina_depots,public.offer_destination_terms,public.operation_destination_terms to authenticated;
create policy argentina_depot_owner on public.operator_argentina_depots for select to authenticated using(operator_id=(select auth.uid()) or public.current_user_role()='admin');
create policy destination_offer_owner on public.offer_destination_terms for select to authenticated using(public.current_user_role()='admin'
 or exists(select 1 from public.offers f where f.id=offer_id and f.operator_id=(select auth.uid()))
 or exists(select 1 from public.operations o where o.accepted_offer_id=offer_id and public.is_operation_participant(o.id)));
create policy destination_operation_owner on public.operation_destination_terms for select to authenticated using(public.is_operation_participant(operation_id));
create index destination_terms_depot_idx on public.offer_destination_terms(depot_id);
create index destination_acceptance_importer_idx on public.offer_destination_acceptances(importer_id);
create index destination_operation_offer_idx on public.operation_destination_terms(offer_id);

create function public.save_argentina_depot(request_id uuid,payload jsonb) returns uuid
language plpgsql security definer set search_path=public as $$
declare prior jsonb;target uuid;item public.operator_argentina_depots;k text;active_value boolean;default_value boolean;coverage text[];begin
 if auth.uid() is null or public.current_user_role()<>'operator' then raise exception 'Acceso de operador requerido';end if;
 perform public.lock_marketplace();prior:=public.china_cached('argentina_depot',request_id,payload);if prior is not null then return (prior->>'id')::uuid;end if;
 foreach k in array array['alias','recipient','phone','province','city','address','instructions'] loop
  if length(trim(coalesce(payload->>k,''))) not between 1 and 2000 then raise exception 'Completa los datos del deposito de Argentina';end if;
 end loop;
 coverage:=array(select jsonb_array_elements_text(coalesce(payload->'delivery_provinces','[]')));
 if not(payload->>'province'=any(public.argentina_provinces())) or not coverage<@public.argentina_provinces() then raise exception 'Provincia o cobertura de Argentina invalida';end if;
 target:=coalesce(nullif(payload->>'id','')::uuid,gen_random_uuid());
 select * into item from public.operator_argentina_depots where id=target for update;
 if found and item.operator_id<>auth.uid() then raise exception 'Deposito ajeno';end if;
 active_value:=coalesce((payload->>'active')::boolean,true);
 default_value:=active_value and (coalesce((payload->>'is_default')::boolean,false) or not exists(select 1 from public.operator_argentina_depots where operator_id=auth.uid() and active and id<>target));
 if default_value then update public.operator_argentina_depots set is_default=false where operator_id=auth.uid() and is_default;end if;
 insert into public.operator_argentina_depots(id,operator_id,alias,recipient,phone,province,city,district,postal_code,address,instructions,delivery_provinces,active,is_default)
 values(target,auth.uid(),trim(payload->>'alias'),trim(payload->>'recipient'),trim(payload->>'phone'),trim(payload->>'province'),trim(payload->>'city'),coalesce(payload->>'district',''),coalesce(payload->>'postal_code',''),trim(payload->>'address'),trim(payload->>'instructions'),coverage,active_value,default_value)
 on conflict(id) do update set alias=excluded.alias,recipient=excluded.recipient,phone=excluded.phone,province=excluded.province,city=excluded.city,district=excluded.district,postal_code=excluded.postal_code,address=excluded.address,instructions=excluded.instructions,delivery_provinces=excluded.delivery_provinces,active=excluded.active,is_default=excluded.is_default,updated_at=now();
 if not exists(select 1 from public.operator_argentina_depots where operator_id=auth.uid() and active and is_default) then
  update public.operator_argentina_depots set is_default=true where id=(select id from public.operator_argentina_depots where operator_id=auth.uid() and active order by created_at,id limit 1);
 end if;
 insert into public.china_command_requests values(auth.uid(),request_id,'argentina_depot',payload,jsonb_build_object('id',target),now());return target;
end $$;

create or replace function public.prepare_cargo_publication(request_id uuid,payload jsonb) returns uuid
language plpgsql security definer set search_path=public as $$
declare p jsonb:=payload->'origin_plan';m jsonb;result uuid;clean jsonb;weight numeric;volume numeric;package_count int;sender text;begin
 if auth.uid() is null or public.current_user_role()<>'importer' then raise exception 'Acceso de importador requerido';end if;
 if coalesce(payload->>'origin_country','CN')<>'CN' or coalesce(payload->>'destination_country','AR')<>'AR' then raise exception 'El corredor del MVP es China a Argentina';end if;
 if p->>'handoff'='pickup' or payload->>'origin_pickup'='true' then raise exception 'El operador solo recibe en China; no se permite solicitar retiro en origen';end if;
 if coalesce(p->>'version','')<>'2' then raise exception 'Actualiza la aplicacion para declarar peso, volumen y entrega en Argentina';end if;
 sender:=p->>'sender_type';if coalesce(sender,'') not in ('agent','private_supplier','store','other') or length(trim(coalesce(p->>'sender_name','')))=0 then raise exception 'Selecciona el remitente e indica su nombre';end if;
 if coalesce(p->>'handoff','') not in ('agent_sends','supplier_sends') or (sender='agent') is distinct from (p->>'kind'='agent') then raise exception 'Todos los remitentes despachan al deposito del operador';end if;
 if length(trim(coalesce(p#>>'{origin,province}','')||coalesce(p#>>'{origin,city}','')))=0 or length(trim(coalesce(p#>>'{origin,address}','')))=0 then raise exception 'Indica localidad y Direccion de origen';end if;
 if not(coalesce(p#>>'{destination,province}','')=any(public.argentina_provinces())) or length(trim(coalesce(p#>>'{destination,city}','')))=0 then raise exception 'Provincia y localidad de Argentina requeridas';end if;
 if coalesce(p#>>'{destination,delivery_mode}','') not in ('pickup','home') then raise exception 'Elegi retiro en deposito o envio a domicilio en Argentina';end if;
 if p#>>'{destination,delivery_mode}'='home' and length(trim(coalesce(p#>>'{destination,address}','')))<5 then raise exception 'Direccion de entrega requerida para envio a domicilio';end if;
 weight:=public.origin_positive_decimal(p#>>'{measurements,weight_kg}',2);
 volume:=public.origin_positive_decimal(p#>>'{measurements,volume_m3}',3);
 if weight>1000000 or volume>=1000000 then raise exception 'Peso o volumen fuera de rango';end if;
 package_count:=coalesce(nullif(p#>>'{measurements,packages}','')::int,1);if package_count not between 1 and 10000 then raise exception 'Cantidad de bultos invalida';end if;
 m:=jsonb_build_object('weight_kg',weight,'volume_m3',volume,'packages',package_count);
 p:=jsonb_set(p,'{measurements}',m);
 clean:=payload||jsonb_build_object('origin_country','CN','destination_country','AR','origin_plan',p,
  'origin',concat_ws(', ',nullif(trim(p#>>'{origin,city}'),''),nullif(trim(p#>>'{origin,province}'),''),'China'),
  'destination',concat_ws(', ',trim(p#>>'{destination,city}'),p#>>'{destination,province}','Argentina'),
  'weight_kg',weight,'volume_m3',volume,'volume_unknown',false);
 result:=public.prepare_cargo_before_china(request_id,clean);
 update public.cargo_requests set corridor_version='china_origin_v2',origin_country='CN',destination_country='AR',origin_plan=p,
  weight_kg=weight,volume_m3=volume,packages=package_count,requested_services=array['international_transport'] where id=result and status='draft';
 return result;
end $$;
create or replace function public.guard_china_cargo_fields() returns trigger language plpgsql set search_path=public as $$ begin
 if current_user in ('anon','authenticated') and (
  (new.corridor_version,new.origin_country,new.destination_country,new.origin_plan,new.requested_services) is distinct from (old.corridor_version,old.origin_country,old.destination_country,old.origin_plan,old.requested_services)
  or (old.corridor_version='china_origin_v2' and (new.origin,new.destination,new.weight_kg,new.volume_m3,new.packages) is distinct from (old.origin,old.destination,old.weight_kg,old.volume_m3,old.packages)))
 then raise exception 'Los datos declarados se gestionan por el flujo autorizado';end if;return new;end $$;
alter function public.publish_cargo(uuid) rename to publish_cargo_before_destination;
revoke all on function public.publish_cargo_before_destination(uuid) from public,anon,authenticated,service_role;
create function public.publish_cargo(target uuid) returns void language plpgsql security definer set search_path=public as $$ begin
 if exists(select 1 from public.cargo_requests where id=target and status='draft' and origin_plan->>'handoff'='pickup') then raise exception 'No se permiten nuevas solicitudes de retiro en China';end if;
 perform public.publish_cargo_before_destination(target);
end $$;

create or replace function public.operator_compatible(target_operator uuid,target_cargo uuid) returns boolean
language plpgsql stable security definer set search_path=public as $$ begin
 return exists(select 1 from public.operator_authorizations a join public.operator_profiles p on p.user_id=a.operator_id join public.cargo_requests c on c.id=target_cargo
 where a.operator_id=target_operator and p.verification_status='approved' and c.status='open'
 and ((c.corridor_version='legacy' and public.route_region(a.origin)=public.route_region(c.origin) and public.route_region(a.destination)=public.route_region(c.destination))
 or(c.corridor_version in ('china_origin_v1','china_origin_v2') and c.origin_country='CN' and c.destination_country='AR' and public.route_region(a.origin)='CN' and public.route_region(a.destination)='AR'))
 and c.requested_services<@a.services and (c.preferred_mode is null or c.preferred_mode=any(a.modes)));
end $$;
create function public.operator_available_cargos() returns table(cargo_id uuid) language plpgsql stable security definer set search_path=public as $$ begin
 if auth.uid() is null or public.current_user_role()<>'operator' then raise exception 'Acceso de operador requerido';end if;
 return query select c.id from public.cargo_requests c where public.operator_compatible(auth.uid(),c.id)
 and (c.bidding_deadline is null or c.bidding_deadline>now())
 and not exists(select 1 from public.offers f where f.cargo_id=c.id and f.operator_id=auth.uid());
end $$;

alter function public.quote_command(text,jsonb) rename to quote_command_before_destination;
revoke all on function public.quote_command_before_destination(text,jsonb) from public,anon,authenticated,service_role;
create function public.quote_command(command text,payload jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$
declare c public.cargo_requests;w public.china_warehouses;d public.operator_argentina_depots;key uuid;prior jsonb;clean jsonb;result jsonb;conditions text;mode_value text;import_fee numeric;delivery_fee numeric;total_value numeric;acceptance boolean;condition_value text;begin
 if auth.uid() is null or public.current_user_role()<>'operator' then raise exception 'Acceso de operador requerido';end if;
 if command in ('submit','save') and ((payload#>'{quote,services}') ? 'origin_pickup' or payload#>>'{quote,pickup_included}'='true') then raise exception 'El operador solo recibe en China; no se cotiza retiro en origen';end if;
 select * into c from public.cargo_requests where id=nullif(payload->>'cargo_id','')::uuid;
 if command<>'submit' or c.corridor_version is distinct from 'china_origin_v2' then return public.quote_command_before_destination(command,payload);end if;
 perform public.lock_marketplace();key:=nullif(payload->>'submission_key','')::uuid;prior:=public.china_cached('quote_v2',key,payload);if prior is not null then return prior;end if;
 select * into w from public.china_warehouses where id=nullif(payload#>>'{quote,china_warehouse_id}','')::uuid and operator_id=auth.uid() and active;
 if not found then raise exception 'Selecciona un deposito activo propio en China';end if;
 select * into d from public.operator_argentina_depots where id=nullif(payload#>>'{quote,argentina_depot_id}','')::uuid and operator_id=auth.uid() and active;
 if not found then raise exception 'Configura y selecciona tu deposito de retiro en Argentina';end if;
 conditions:=trim(coalesce(payload#>>'{quote,receiving_conditions}',''));if length(conditions) not between 5 and 2000 then raise exception 'Detalla las condiciones de recepcion';end if;
 mode_value:=payload#>>'{quote,destination_mode}';if coalesce(mode_value,'') not in ('pickup','home') then raise exception 'Selecciona la modalidad efectiva de entrega en Argentina';end if;
 import_fee:=public.origin_positive_decimal(payload#>>'{quote,import_fee}',2);
 if mode_value='home' then
  if c.origin_plan#>>'{destination,delivery_mode}' is distinct from 'home' or not exists(select 1 from public.operator_authorizations where operator_id=auth.uid() and 'domestic_delivery'=any(services))
   or not(c.origin_plan#>>'{destination,province}'=any(d.delivery_provinces)) or payload#>>'{quote,home_address_confirmed}' is distinct from 'true'
   or not((payload#>'{quote,services}') ? 'domestic_delivery') then raise exception 'No puedes ofrecer domicilio para esta direccion; ofrece solo retiro en deposito';end if;
  delivery_fee:=public.origin_positive_decimal(payload#>>'{quote,delivery_fee}',2);
 else
  delivery_fee:=coalesce(nullif(replace(payload#>>'{quote,delivery_fee}',',','.'),'')::numeric,0);
  if delivery_fee<>0 or (payload#>'{quote,services}') ? 'domestic_delivery' then raise exception 'Una oferta de retiro no incluye tarifa ni servicio de envio a domicilio';end if;
 end if;
 total_value:=import_fee+delivery_fee;
 if public.origin_positive_decimal(payload#>>'{quote,amount}',2)<>total_value then raise exception 'El total debe coincidir con importacion mas envio a domicilio';end if;
 acceptance:=c.origin_plan#>>'{destination,delivery_mode}'='home' and mode_value='pickup';
 condition_value:=case when acceptance then 'Solo retiro en el deposito del operador. No realiza envios dentro de Argentina' when mode_value='pickup' then 'Retiro en el deposito del operador en Argentina' else 'Envio a domicilio en Argentina para la direccion declarada' end;
 clean:=jsonb_set(payload,'{quote}',(payload->'quote')-array['china_warehouse_id','receiving_conditions','pickup_included','pickup_conditions','argentina_depot_id','destination_mode','import_fee','delivery_fee','home_address_confirmed']);
 -- Existing quote validation, ARS rule, eligibility, ownership and versioning stay authoritative.
 result:=public.quote_command_before_china(command,clean);
 insert into public.offer_china_receipt_terms values((result->>'id')::uuid,w.id,to_jsonb(w),conditions,false,'');
 insert into public.offer_destination_terms(offer_id,depot_id,agreed_mode,import_fee,delivery_fee,total,pickup_snapshot,delivery_address,acceptance_required,condition)
 values((result->>'id')::uuid,d.id,mode_value,import_fee,delivery_fee,total_value,to_jsonb(d),case when mode_value='home' then c.origin_plan->'destination' end,acceptance,condition_value);
 insert into public.china_command_requests values(auth.uid(),key,'quote_v2',payload,result,now());return result;
end $$;

create or replace function public.china_offer_summaries(target_cargo uuid) returns jsonb
language plpgsql stable security definer set search_path=public as $$ begin
 if auth.uid() is null or not exists(select 1 from public.cargo_requests c where c.id=target_cargo and (c.importer_id=auth.uid() or public.current_user_role()='admin' or public.operator_compatible(auth.uid(),target_cargo))) then raise exception 'Carga no autorizada';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('offer_id',f.id,'warehouse',jsonb_build_object('id',t.warehouse_id,'alias',t.warehouse_snapshot->>'alias','province',t.warehouse_snapshot->>'province','city',t.warehouse_snapshot->>'city','district',t.warehouse_snapshot->>'district'),
 'receiving_conditions',t.receiving_conditions,'pickup_included',t.pickup_included,'pickup_conditions',t.pickup_conditions,
 'destination',case when d.offer_id is not null then jsonb_build_object('agreed_mode',d.agreed_mode,'import_fee',d.import_fee,'delivery_fee',d.delivery_fee,'total',d.total,'currency',d.currency,'acceptance_required',d.acceptance_required,'condition',d.condition,
 'pickup_summary',jsonb_build_object('alias',d.pickup_snapshot->>'alias','province',d.pickup_snapshot->>'province','city',d.pickup_snapshot->>'city')) end))
 from public.offers f join public.offer_china_receipt_terms t on t.offer_id=f.id left join public.offer_destination_terms d on d.offer_id=f.id join public.cargo_requests c on c.id=f.cargo_id
 where c.id=target_cargo and (c.importer_id=auth.uid() or public.current_user_role()='admin' or f.operator_id=auth.uid())),'[]'::jsonb);
end $$;

alter function public.award_offer(uuid) rename to award_offer_before_destination;
revoke all on function public.award_offer_before_destination(uuid) from public,anon,authenticated,service_role;
create function public.award_offer(target_offer_id uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare c public.cargo_requests;t public.offer_china_receipt_terms;d public.offer_destination_terms;result uuid;begin
 if auth.uid() is null or public.current_user_role()<>'importer' then raise exception 'Acceso de importador requerido';end if;
 perform public.lock_marketplace();select c2.* into c from public.cargo_requests c2 join public.offers f on f.cargo_id=c2.id where f.id=target_offer_id;
 if c.corridor_version is distinct from 'china_origin_v2' then return public.award_offer_before_destination(target_offer_id);end if;
 if c.importer_id is distinct from auth.uid() then raise exception 'Carga ajena';end if;
 select * into d from public.offer_destination_terms where offer_id=target_offer_id;if not found then raise exception 'La oferta no incluye la entrega acordada en Argentina';end if;
 if d.acceptance_required and not exists(select 1 from public.offer_destination_acceptances where offer_id=target_offer_id and importer_id=auth.uid() and condition=d.condition) then raise exception 'Acepta expresamente Solo retiro en el deposito del operador antes de adjudicar';end if;
 select * into t from public.offer_china_receipt_terms where offer_id=target_offer_id;if not found then raise exception 'Falta el deposito receptor de China';end if;
 result:=public.award_offer_before_destination(target_offer_id);
 insert into public.china_operation_coordination(operation_id,origin_plan,warehouse_snapshot)values(result,c.origin_plan,t.warehouse_snapshot)on conflict(operation_id)do nothing;
 insert into public.operation_destination_terms(operation_id,offer_id,content)values(result,target_offer_id,to_jsonb(d))on conflict(operation_id)do nothing;
 return result;
end $$;
alter function public.award_offer_for_test_checkout(uuid) rename to award_checkout_before_destination;
revoke all on function public.award_checkout_before_destination(uuid) from public,anon,authenticated,service_role;
create function public.award_offer_for_test_checkout(target_offer_id uuid,accept_pickup_only boolean default false) returns uuid language plpgsql security definer set search_path=public as $$
declare d public.offer_destination_terms;begin
 if auth.uid() is null or public.current_user_role()<>'importer' or not exists(select 1 from public.offers f join public.cargo_requests c on c.id=f.cargo_id where f.id=target_offer_id and c.importer_id=auth.uid()) then raise exception 'Oferta no autorizada';end if;
 perform public.lock_marketplace();select * into d from public.offer_destination_terms where offer_id=target_offer_id;
 if found and d.acceptance_required then
  if accept_pickup_only is distinct from true then raise exception 'Acepta expresamente Solo retiro en el deposito del operador; No realiza envios dentro de Argentina';end if;
  insert into public.offer_destination_acceptances values(target_offer_id,auth.uid(),d.condition,now())on conflict(offer_id)do nothing;
 end if;
 return public.award_checkout_before_destination(target_offer_id);
end $$;

alter function public.confirm_china_receipt(uuid,uuid,jsonb) rename to confirm_receipt_before_declared;
revoke all on function public.confirm_receipt_before_declared(uuid,uuid,jsonb) from public,anon,authenticated,service_role;
create function public.confirm_china_receipt(target_operation uuid,request_id uuid,measurements jsonb default null) returns uuid
language plpgsql security definer set search_path=public as $$
declare op public.operations;coord public.china_operation_coordination;cached jsonb;value jsonb:=jsonb_build_object('operation',target_operation);begin
 if auth.uid() is null or public.current_user_role()<>'operator' then raise exception 'Acceso de operador requerido';end if;
 select * into op from public.operations where id=target_operation for update;
 if op.operator_id is distinct from auth.uid() then raise exception 'Operacion ajena';end if;
 select * into coord from public.china_operation_coordination where operation_id=target_operation;
 if coord.origin_plan->>'version' is distinct from '2' then return public.confirm_receipt_before_declared(target_operation,request_id,measurements);end if;
 cached:=public.china_cached('receipt_declared',request_id,value);if cached is not null then return target_operation;end if;
 if coord.state<>'in_transit_to_warehouse' or op.phase in ('cancelled','failed','completed','disputed') then raise exception 'Registra primero el despacho de esta operacion';end if;
 update public.china_operation_coordination set state='received_in_china',measured=coord.origin_plan->'measurements',received_by=auth.uid(),received_at=now() where operation_id=target_operation;
 insert into public.tracking_events(operation_id,status,title,event_type,description,location,created_by)values(op.id,op.status,'Recibido en el deposito de China','china_receipt','Recepcion registrada; peso y volumen declarados por el importador',coord.warehouse_snapshot->>'city',auth.uid());
 insert into public.china_command_requests values(auth.uid(),request_id,'receipt_declared',value,jsonb_build_object('id',target_operation),now());return target_operation;
end $$;

revoke all on function public.origin_positive_decimal(text,int),public.argentina_provinces() from public,anon,authenticated,service_role;
revoke all on function public.save_argentina_depot(uuid,jsonb),public.operator_available_cargos(),public.prepare_cargo_publication(uuid,jsonb),public.publish_cargo(uuid),public.quote_command(text,jsonb),public.award_offer(uuid),public.award_offer_for_test_checkout(uuid,boolean),public.confirm_china_receipt(uuid,uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.save_argentina_depot(uuid,jsonb),public.operator_available_cargos(),public.prepare_cargo_publication(uuid,jsonb),public.publish_cargo(uuid),public.quote_command(text,jsonb),public.award_offer(uuid),public.award_offer_for_test_checkout(uuid,boolean),public.confirm_china_receipt(uuid,uuid,jsonb) to authenticated;
commit;
