begin;
-- Historical tables, contracts and audit rows are retained. No new monetary
-- reservation, capital approval, operation-count or exposure gate is active.
drop trigger if exists offer_capital_insert on public.offers;
drop trigger if exists offer_capital_status on public.offers;
drop trigger if exists capacity_reserve on public.operations;
drop trigger if exists capacity_phase on public.operations;

create table public.marketplace_mutex (
 singleton boolean primary key default true check(singleton), revision bigint not null default 0
);
insert into public.marketplace_mutex values(true,0);
alter table public.marketplace_mutex enable row level security;
revoke all on public.marketplace_mutex from public,anon,authenticated,service_role;
create function public.lock_marketplace() returns void language plpgsql security definer set search_path=public as $$
begin update public.marketplace_mutex set revision=revision+1 where singleton; end $$;
revoke all on function public.lock_marketplace() from public,anon,authenticated;

create function public.valid_cuit(value text) returns boolean language plpgsql immutable set search_path=public as $$
declare digits text:=regexp_replace(coalesce(value,''),'[^0-9]','','g'); total int:=0; weights int[]:=array[5,4,3,2,7,6,5,4,3,2]; digit int;
begin
 if digits !~ '^[0-9]{11}$' or left(digits,2) not in ('20','23','24','27','30','33','34') then return false;end if;
 for i in 1..10 loop total:=total+substring(digits,i,1)::int*weights[i];end loop;
 digit:=11-(total%11);if digit=11 then digit:=0;elsif digit=10 then return false;end if;
 return digit=right(digits,1)::int;
end $$;
create function public.route_region(value text) returns text language sql immutable set search_path=public as $$
 select case when lower(trim(value)) in ('china','cn','shenzhen','guangzhou','shanghai','ningbo','hong kong') then 'CN'
 when lower(trim(value)) in ('argentina','ar','buenos aires','ezeiza','rosario','cordoba','córdoba') then 'AR'
 else lower(trim(value)) end
$$;
alter table public.cargo_requests add column requested_services text[] not null default array['international_transport'];
create table public.company_applications (
 operator_id uuid primary key references public.operator_profiles(user_id),
 tax_id text not null unique check(public.valid_cuit(tax_id)),
 origin text not null, destination text not null,
 services text[] not null check(cardinality(services) between 1 and 9),
 modes public.transport_mode[] not null check(cardinality(modes) between 1 and 3),
 document_ids uuid[] not null default '{}',
 state text not null default 'pending' check(state in ('pending','correction','approved','rejected')),
 correction text, reviewed_by uuid references public.profiles(id), reviewed_at timestamptz,
 declared_at timestamptz not null default now(), system_checks jsonb not null default '{}',
 request_key uuid not null, request_payload jsonb not null
);
create table public.operator_authorizations (
 operator_id uuid primary key references public.operator_profiles(user_id),
 origin text not null,destination text not null, services text[] not null,
 modes public.transport_mode[] not null,
 approved_by uuid not null references public.profiles(id), approved_at timestamptz not null default now(),
 reason text not null check(length(trim(reason))>=5), decision_id uuid not null unique references public.administrative_decisions(id)
);
alter table public.company_applications enable row level security;
alter table public.operator_authorizations enable row level security;
revoke all on public.company_applications,public.operator_authorizations from public,anon,authenticated,service_role;
grant select on public.company_applications,public.operator_authorizations to authenticated;
create policy company_application_owner on public.company_applications for select to authenticated
 using(operator_id=(select auth.uid()) or public.current_user_role()='admin');
create policy authorization_owner on public.operator_authorizations for select to authenticated
 using(operator_id=(select auth.uid()) or public.current_user_role()='admin');

create function public.operator_compatible(target_operator uuid,target_cargo uuid) returns boolean
language plpgsql stable security definer set search_path=public as $$
declare c public.cargo_requests;begin
 if auth.uid() is null then return false;end if;
 select * into c from public.cargo_requests where id=target_cargo;
 if not found or not(target_operator=auth.uid() or c.importer_id=auth.uid() or public.current_user_role()='admin') then return false;end if;
 return exists(select 1 from public.operator_profiles p join public.profiles u on u.id=p.user_id
 join public.operator_authorizations a on a.operator_id=p.user_id
 where p.user_id=target_operator and p.verification_status='approved' and u.role='operator'
 and public.route_region(a.origin)=public.route_region(c.origin) and public.route_region(a.destination)=public.route_region(c.destination)
 and c.requested_services<@a.services and (c.preferred_mode is null or c.preferred_mode=any(a.modes)));
end $$;
revoke all on function public.operator_compatible(uuid,uuid) from public,anon;
grant execute on function public.operator_compatible(uuid,uuid) to authenticated;

create function public.submit_company_application(request_id uuid,payload jsonb) returns uuid
language plpgsql security definer set search_path=public as $$
declare actor uuid:=auth.uid();tax text:=regexp_replace(payload->>'tax_id','[^0-9]','','g'); prior public.company_applications;
 services text[];modes public.transport_mode[];doc uuid;begin
 if actor is null or public.current_user_role() not in ('operator','importer') then raise exception 'Cuenta de empresa requerida';end if;
 if not exists(select 1 from auth.users where id=actor and email_confirmed_at is not null) then raise exception 'Confirma tu correo antes de presentar la empresa';end if;
 perform public.lock_marketplace();
 if exists(select 1 from public.operations where importer_id=actor) or exists(select 1 from public.cargo_requests where importer_id=actor) then raise exception 'Una cuenta de importador con cargas no puede cambiar de rol';end if;
 if request_id is null or length(trim(coalesce(payload->>'company_name','')))<3 or not public.valid_cuit(tax) then raise exception 'Empresa y CUIT valido requeridos';end if;
 select * into prior from public.company_applications where operator_id=actor for update;
 if found and prior.request_key=request_id then
  if prior.request_payload is distinct from payload then raise exception 'El reintento debe conservar la ficha';end if;return actor;
 end if;
 if prior.state in ('approved','rejected') then raise exception 'La ficha ya tiene una decision administrativa';end if;
 if exists(select 1 from public.operator_profiles where user_id<>actor and regexp_replace(tax_id,'[^0-9]','','g')=tax)
 or exists(select 1 from public.company_applications where operator_id<>actor and tax_id=tax) then raise exception 'El CUIT ya pertenece a otra empresa';end if;
 services:=array(select jsonb_array_elements_text(payload->'services'));
 modes:=array(select jsonb_array_elements_text(payload->'modes')::public.transport_mode);
 if cardinality(services) not between 1 and 9 or not services<@public.quote_taxonomy() or cardinality(modes) not between 1 and 3
 or length(trim(coalesce(payload->>'origin','')))<2 or length(trim(coalesce(payload->>'destination','')))<2 then raise exception 'Ruta, modalidades y servicios requeridos';end if;
 foreach doc in array coalesce(array(select jsonb_array_elements_text(payload->'document_ids')::uuid),'{}') loop
  if not exists(select 1 from public.documents where id=doc and operator_id=actor and uploaded_by=actor and validation_status<>'rejected') then raise exception 'Documento empresarial no autorizado';end if;
 end loop;
 update public.profiles set role='operator' where id=actor;
 insert into public.operator_profiles(user_id,company_name,tax_id,description,verification_status,modes,routes)
 values(actor,trim(payload->>'company_name'),tax,coalesce(payload->>'description',''),'pending',modes::text[],trim(payload->>'origin')||' → '||trim(payload->>'destination'))
 on conflict(user_id) do update set company_name=excluded.company_name,tax_id=excluded.tax_id,description=excluded.description,modes=excluded.modes,routes=excluded.routes;
 insert into public.company_applications(operator_id,tax_id,origin,destination,services,modes,document_ids,request_key,request_payload,system_checks)
 values(actor,tax,trim(payload->>'origin'),trim(payload->>'destination'),services,modes,array(select jsonb_array_elements_text(payload->'document_ids')::uuid),request_id,payload,
 jsonb_build_object('email_confirmed',true,'cuit_format',true,'cuit_duplicate',false,'registry_verified',false))
 on conflict(operator_id) do update set tax_id=excluded.tax_id,origin=excluded.origin,destination=excluded.destination,services=excluded.services,modes=excluded.modes,
 document_ids=excluded.document_ids,state='pending',request_key=excluded.request_key,request_payload=excluded.request_payload,system_checks=excluded.system_checks,declared_at=now();
 update public.operator_profiles set application_state='pending',application_note=null where user_id=actor;
 insert into public.audit_logs(actor_id,action,entity_id,payload)values(actor,'company.submitted',actor,jsonb_build_object('checks','format-and-email-only'));
 return actor;
end $$;
create function public.admin_review_company(target_operator uuid,decision text,reason text,checklist jsonb,request_key uuid) returns uuid
language plpgsql security definer set search_path=public as $$
declare a public.company_applications;d public.administrative_decisions;payload jsonb:=jsonb_build_object('operator',target_operator,'decision',decision,'checklist',checklist);doc uuid;begin
 if auth.uid() is null or public.current_user_role()<>'admin' then raise exception 'Acceso administrativo requerido';end if;
 if request_key is null or decision not in ('approved','correction','rejected') or coalesce(length(trim(reason)),0)<5 then raise exception 'Decision y motivo requeridos';end if;
 perform public.lock_marketplace();
 select * into d from public.administrative_decisions where actor_id=auth.uid() and administrative_decisions.request_key=admin_review_company.request_key;
 if found then
  if d.entity_id<>target_operator or d.payload is distinct from payload or d.reason<>trim(reason) then raise exception 'La decision repetida debe conservar sus datos';end if;return d.id;
 end if;
 select * into a from public.company_applications where operator_id=target_operator for update;
 if not found or a.state not in ('pending','correction') or exists(select 1 from public.operator_profiles where user_id=target_operator and verification_status='suspended') then raise exception 'Postulacion no disponible para esta decision';end if;
 if decision='approved' then
  if checklist->'identity' is distinct from 'true'::jsonb or checklist->'company' is distinct from 'true'::jsonb or checklist->'documents' is distinct from 'true'::jsonb then raise exception 'Revisa identidad, empresa y documentos';end if;
  foreach doc in array a.document_ids loop
   if not exists(select 1 from public.documents where id=doc and operator_id=target_operator and validation_status='approved') then raise exception 'Documentacion empresarial pendiente de validar';end if;
  end loop;
 end if;
 insert into public.administrative_decisions(actor_id,entity_id,action,reason,payload,request_key)
 values(auth.uid(),target_operator,'company.'||decision,trim(reason),payload,request_key) returning * into d;
 update public.company_applications set state=decision,correction=case when decision='correction' then trim(reason) end,reviewed_by=auth.uid(),reviewed_at=now() where operator_id=target_operator;
 update public.operator_profiles set application_state=decision,application_note=trim(reason),
 verification_status=case decision when 'approved' then 'approved'::public.verification_status when 'rejected' then 'rejected'::public.verification_status else 'pending'::public.verification_status end,
 verified_by=auth.uid(),verified_at=now() where user_id=target_operator;
 if decision='approved' then
  insert into public.operator_authorizations(operator_id,origin,destination,services,modes,approved_by,reason,decision_id)
  values(target_operator,a.origin,a.destination,a.services,a.modes,auth.uid(),trim(reason),d.id)
  on conflict(operator_id) do update set origin=excluded.origin,destination=excluded.destination,services=excluded.services,modes=excluded.modes,approved_by=excluded.approved_by,approved_at=now(),reason=excluded.reason,decision_id=excluded.decision_id;
 end if;
 return d.id;
end $$;

create or replace function public.validate_normalized_quote(q jsonb) returns void language plpgsql immutable set search_path=public as $$
begin
 perform public.validate_quote_before_capacity(q-array['working_capital_amount','working_capital_currency']);
 if q->>'currency' is distinct from 'ARS' then raise exception 'Las nuevas ofertas deben cotizarse en ARS';end if;
end $$;
create or replace function public.quote_command(command text,payload jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$
declare prior public.offer_submission_requests;c public.cargo_requests;f public.offers;result jsonb;target uuid;
 key text:=coalesce(nullif(payload->>'submission_key',''),md5(payload::text));clean jsonb:=payload;begin
 if auth.uid() is null or public.current_user_role()<>'operator' then raise exception 'Acceso de operador requerido';end if;
 perform public.lock_marketplace();
 if command='withdraw' then
  select * into f from public.offers where id=(payload->>'offer_id')::uuid and operator_id=auth.uid() for update;
  if not found then raise exception 'Oferta no autorizada';end if;
  if f.status='withdrawn' then return jsonb_build_object('ok',true,'id',f.id,'status',f.status);end if;
  if f.status<>'submitted' or f.valid_until<=now() then raise exception 'La oferta ya fue adjudicada o vencio';end if;
  update public.offers set status='withdrawn' where id=f.id;
  return jsonb_build_object('ok',true,'id',f.id,'status','withdrawn');
 end if;
 if not public.operator_approved() then raise exception 'Operador no habilitado';end if;
 if payload ? 'quote' then clean:=jsonb_set(payload,'{quote}',(payload->'quote')-array['working_capital_amount','working_capital_currency']);end if;
 if command='submit' then
  select * into prior from public.offer_submission_requests where operator_id=auth.uid() and request_key=key;
  if found then
   if prior.payload is distinct from clean then raise exception 'El reintento debe conservar los datos de la oferta';end if;
   return jsonb_build_object('ok',true,'id',prior.offer_id,'status',(select status from public.offers where id=prior.offer_id));
  end if;
 end if;
 target:=coalesce(nullif(payload->>'cargo_id',''),nullif(payload->>'id',''))::uuid;
 if target is null and nullif(payload->>'draft_id','') is not null then select cargo_id into target from public.quote_drafts where id=(payload->>'draft_id')::uuid and operator_id=auth.uid();end if;
 if not public.operator_compatible(auth.uid(),target) then raise exception 'Empresa no habilitada para la ruta y servicios de esta carga';end if;
 select * into c from public.cargo_requests where id=target;
 if clean ? 'quote' and (not array(select jsonb_array_elements_text(clean#>'{quote,services}'))<@array(select unnest(a.services) from public.operator_authorizations a where a.operator_id=auth.uid())
 or not exists(select 1 from public.operator_authorizations a where a.operator_id=auth.uid() and (clean#>>'{quote,mode}')::public.transport_mode=any(a.modes))) then raise exception 'La oferta excede los servicios o modalidades habilitados';end if;
 result:=public.quote_command_before_offer_capital(command,clean);
 if command='submit' then insert into public.offer_submission_requests values(auth.uid(),key,clean,(result->>'id')::uuid);end if;
 return result;
end $$;
create or replace function public.award_offer(target_offer_id uuid) returns uuid
language plpgsql security definer set search_path=public as $$
declare target uuid;c public.cargo_requests;f public.offers;existing public.operations;result uuid;begin
 if auth.uid() is null or public.current_user_role()<>'importer' then raise exception 'Acceso de importador requerido';end if;
 perform public.lock_marketplace();
 select cargo_id into target from public.offers where id=target_offer_id;
 select * into c from public.cargo_requests where id=target for update;
 if not found or c.importer_id<>auth.uid() then raise exception 'Oferta no autorizada';end if;
 select * into existing from public.operations where cargo_id=c.id;
 if found then
  if existing.accepted_offer_id=target_offer_id then return existing.id;end if;
  raise exception 'La carga ya fue adjudicada a otra oferta';
 end if;
 select * into f from public.offers where id=target_offer_id for update;
 if f.status='withdrawn' then raise exception 'La oferta fue retirada por el operador';end if;
 if f.status<>'submitted' or f.valid_until<=now() then raise exception 'La oferta no esta disponible o vencio';end if;
 if c.status<>'open' or c.bidding_deadline<=now() then raise exception 'La licitacion esta cerrada';end if;
 if not public.operator_compatible(f.operator_id,c.id) then raise exception 'El operador ya no esta habilitado para esta ruta y servicio';end if;
 if c.volume_m3 is null then raise exception 'Confirma el volumen propuesto antes de aceptar la oferta';end if;
 perform public.validate_normalized_quote(f.normalized_quote);
 update public.offers set status=case when id=f.id then 'accepted'::public.offer_status else 'rejected'::public.offer_status end where cargo_id=c.id and status='submitted';
 update public.cargo_requests set status='awarded' where id=c.id;
 insert into public.operations(cargo_id,accepted_offer_id,importer_id,operator_id,phase,contract_currency)
 values(c.id,f.id,c.importer_id,f.operator_id,'created','ARS') returning id into result;
 insert into public.payment_guarantees(operation_id,amount_usd,commission_usd,currency)values(result,f.total_usd,round(f.total_usd*0.025,2),'ARS');
 insert into public.tracking_events(operation_id,status,title,event_type,created_by)values(result,'awarded','Oferta adjudicada','Adjudicacion',auth.uid());
 return result;
end $$;
create or replace function public.award_offer_for_test_checkout(target_offer_id uuid) returns uuid
language plpgsql security definer set search_path=public as $$
declare result uuid;begin
 if auth.uid() is null or public.current_user_role()<>'importer' then raise exception 'Acceso de importador requerido';end if;
 perform public.lock_marketplace();
 select o.id into result from public.operations o where o.accepted_offer_id=target_offer_id and o.importer_id=auth.uid() and o.payment_mode='mercado_pago_test';
 if found then return result;end if;
 if not exists(select 1 from public.mp_test_settings where singleton and enabled) then raise exception 'Pago de prueba no disponible; la oferta no fue adjudicada';end if;
 result:=public.award_offer(target_offer_id);
 if not exists(select 1 from public.operations where id=result and payment_mode='mercado_pago_test') then raise exception 'Esta operacion conserva su modo de pago historico';end if;
 return result;
end $$;
create or replace function public.offer_backing(target_cargo uuid) returns table(offer_id uuid,backed boolean,reason text)
language plpgsql stable security definer set search_path=public as $$ begin
 if auth.uid() is null or not exists(select 1 from public.cargo_requests where id=target_cargo and (importer_id=auth.uid() or public.current_user_role()='admin' or public.operator_compatible(auth.uid(),target_cargo))) then raise exception 'Carga no autorizada';end if;
 return query select f.id,
 f.status='submitted' and f.valid_until>now() and c.status='open' and (c.bidding_deadline is null or c.bidding_deadline>now()) and public.operator_compatible(f.operator_id,c.id),
 case when f.status='withdrawn' then 'Oferta retirada' when f.valid_until<=now() then 'Oferta vencida' when f.status<>'submitted' or c.status<>'open' then 'Oferta cerrada'
 when not public.operator_compatible(f.operator_id,c.id) then 'Operador no habilitado para esta carga' else 'Oferta vigente' end
 from public.offers f join public.cargo_requests c on c.id=f.cargo_id where c.id=target_cargo and (c.importer_id=auth.uid() or public.current_user_role()='admin' or f.operator_id=auth.uid());
end $$;

-- Old monetary APIs cannot be used to restart retired workflows. Read-only
-- archives remain available to administrators; no historical rows are rewritten.
do $$ declare f record;begin
 for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname in ('configure_operator_capacity','configure_operator_capacity_before_ars','configure_capacity_before_offers',
 'request_capital_increase','admin_review_capital','set_approved_capital','reconcile_offer_capital','reserve_offer_capital','reserve_operation_capacity',
 'admin_review_operator','review_operator_before_suspension_guard') loop
 execute format('revoke all on function %s from public,anon,authenticated,service_role',f.signature);
 end loop;
end $$;
revoke all on function public.valid_cuit(text),public.route_region(text),public.submit_company_application(uuid,jsonb),public.admin_review_company(uuid,text,text,jsonb,uuid),
 public.validate_normalized_quote(jsonb),public.quote_command(text,jsonb),public.award_offer(uuid),public.award_offer_for_test_checkout(uuid),public.offer_backing(uuid) from public,anon;
grant execute on function public.submit_company_application(uuid,jsonb),public.admin_review_company(uuid,text,text,jsonb,uuid),
 public.quote_command(text,jsonb),public.award_offer(uuid),public.award_offer_for_test_checkout(uuid),public.offer_backing(uuid) to authenticated;
-- Functions invoked by RLS/checks need no privileged write capability.
grant execute on function public.valid_cuit(text),public.route_region(text) to authenticated;
drop policy if exists "open cargo approved operators" on public.cargo_requests;
create policy "open cargo approved operators" on public.cargo_requests for select to authenticated using(
 importer_id=(select auth.uid()) or public.current_user_role()='admin' or
 (public.operator_approved() and ((status='open' and (bidding_deadline is null or bidding_deadline>now()) and public.operator_compatible(auth.uid(),id))
 or exists(select 1 from public.offers f where f.cargo_id=cargo_requests.id and f.operator_id=auth.uid())
 or exists(select 1 from public.operations o where o.cargo_id=cargo_requests.id and o.operator_id=auth.uid())))
);
create or replace function public.admin_workbench() returns jsonb language plpgsql stable security definer set search_path=public as $$ begin
 if auth.uid() is null or public.current_user_role()<>'admin' then raise exception 'Acceso administrativo requerido';end if;
 return jsonb_build_object('actor',auth.uid(),
 'profiles',coalesce((select jsonb_agg(to_jsonb(p)) from public.profiles p),'[]'),
 'operators',coalesce((select jsonb_agg(to_jsonb(o)) from public.operator_profiles o join public.profiles p on p.id=o.user_id where p.role='operator'),'[]'),
 'applications',coalesce((select jsonb_agg(to_jsonb(a)) from public.company_applications a),'[]'),
 'authorizations',coalesce((select jsonb_agg(to_jsonb(a)) from public.operator_authorizations a),'[]'),
 'requests','[]'::jsonb,
 'operations',coalesce((select jsonb_agg(to_jsonb(o) order by awarded_at desc) from public.operations o),'[]'),
 'cargos',coalesce((select jsonb_agg(to_jsonb(c)) from public.cargo_requests c),'[]'),
 'events',coalesce((select jsonb_agg(to_jsonb(e) order by occurred_at desc) from public.tracking_events e),'[]'),
 'documents',coalesce((select jsonb_agg(to_jsonb(d)) from public.documents d),'[]'),
 'claims',coalesce((select jsonb_agg(to_jsonb(t) order by created_at desc) from public.support_tickets t),'[]'),
 'messages',coalesce((select jsonb_agg(to_jsonb(m) order by created_at) from public.support_messages m),'[]'),
 'ratings',coalesce((select jsonb_agg(to_jsonb(r)) from public.ratings r),'[]'),
 'contracts',coalesce((select jsonb_agg(to_jsonb(c)) from public.operation_contract_snapshots c),'[]'),
 'guarantees',coalesce((select jsonb_agg(to_jsonb(g)) from public.payment_guarantees g),'[]'),
 'payments',coalesce((select jsonb_agg(jsonb_build_object('operation_id',p.operation_id,'status',p.status,'amount',p.amount,'currency',p.currency,'provider_payment_id',p.provider_payment_id)) from public.mp_test_payments p),'[]'),
 'decisions',coalesce((select jsonb_agg(to_jsonb(d) order by created_at desc) from public.administrative_decisions d),'[]'));
end $$;
revoke all on function public.admin_workbench() from public,anon;
grant execute on function public.admin_workbench() to authenticated;
-- Preserve old rows without allowing new limits, capital requests or reserves.
revoke insert,update,delete on public.operator_capacity_limits,public.operator_capacity_currency_limits,
 public.operation_capacity_reservations,public.offer_capital_reservations,public.capital_increase_requests from authenticated,service_role;
commit;
