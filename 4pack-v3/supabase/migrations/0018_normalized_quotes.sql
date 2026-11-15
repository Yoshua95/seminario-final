create function public.quote_taxonomy() returns text[] language sql immutable as $$ select array['international_transport','origin_handling','customs_coordination','destination_handling','domestic_delivery','storage','insurance','integrated_service','other']::text[] $$;

alter table public.offers add column normalized_quote jsonb;
alter table public.offers add column quote_group_id uuid not null default gen_random_uuid();
alter table public.offers add column revision integer not null default 1 check(revision>0);
alter table public.offers add column replaces_offer_id uuid references public.offers(id);
create unique index quote_revision_idx on public.offers(quote_group_id,revision);
create unique index quote_replacement_idx on public.offers(replaces_offer_id) where replaces_offer_id is not null;
create unique index one_active_quote_idx on public.offers(cargo_id,operator_id) where status in ('submitted','accepted');

create table public.quote_drafts (
 id uuid primary key default gen_random_uuid(),operator_id uuid not null references public.operator_profiles(user_id),cargo_id uuid not null references public.cargo_requests(id),
 content jsonb not null default '{}' check(jsonb_typeof(content)='object' and octet_length(content::text)<=20000),
 replaces_offer_id uuid references public.offers(id),submitted_offer_id uuid unique references public.offers(id),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index quote_drafts_owner_idx on public.quote_drafts(operator_id,cargo_id,updated_at);
alter table public.quote_drafts enable row level security;
revoke all on public.quote_drafts from public,authenticated;
grant select on public.quote_drafts to authenticated;
create policy "draft owner only" on public.quote_drafts for select to authenticated using(operator_id=auth.uid() or public.current_user_role()='admin');
create trigger draft_updated before update on public.quote_drafts for each row execute function public.set_updated_at();

create function public.validate_normalized_quote(q jsonb) returns void language plpgsql immutable set search_path=public as $$
declare amount numeric; v text; key text; begin
 if q is null or jsonb_typeof(q)<>'object' or octet_length(q::text)>20000 then raise exception 'Cotización incompleta: requiere revisión'; end if;
 if exists(select 1 from jsonb_object_keys(q) k where k not in ('mode','services','scope','amount','currency','included','excluded','insurance','estimated_days','valid_until','payment_terms','required_documents','responsibilities','observations')) then raise exception 'Campo de cotización inválido'; end if;
 foreach key in array array['mode','scope','amount','currency','insurance','estimated_days','valid_until','payment_terms','responsibilities','observations'] loop
  if jsonb_typeof(q->key) is distinct from 'string' or length(trim(q->>key))=0 or length(q->>key)>2000 then raise exception 'Completá todos los términos de la cotización: %',key; end if;
 end loop;
 if q->>'currency' not in ('USD','ARS') or q->>'mode' not in ('air','sea','consolidated') then raise exception 'Moneda o modalidad inválida'; end if;
 if coalesce(q->>'amount','') !~ '^[0-9]+(\.[0-9]{1,2})?$' then raise exception 'Precio inválido'; end if;
 amount:=(q->>'amount')::numeric;
 if amount<=0 or amount>999999999 then raise exception 'Precio inválido'; end if;
 if coalesce(q->>'estimated_days','') !~ '^[0-9]+$' or (q->>'estimated_days')::int not between 1 and 365 then raise exception 'Plazo inválido'; end if;
 if coalesce(q->>'valid_until','') !~ '^\d{4}-\d{2}-\d{2}T.*(Z|[+-]\d{2}:\d{2})$' then raise exception 'Vigencia con zona horaria requerida'; end if;
 perform (q->>'valid_until')::timestamptz;
 foreach key in array array['services','included','excluded','required_documents'] loop
  if jsonb_typeof(q->key) is distinct from 'array' or jsonb_array_length(q->key) not between 1 and 30 then raise exception 'Completá incluidos, excluidos, servicios y documentación'; end if;
  if exists(select 1 from jsonb_array_elements(q->key) item where jsonb_typeof(item)<>'string') then raise exception 'Los conceptos deben ser texto'; end if;
  for v in select jsonb_array_elements_text(q->key) loop
   if length(trim(v)) not between 1 and 300 then raise exception 'Concepto inválido'; end if;
   if key='services' and not v=any(public.quote_taxonomy()) then raise exception 'Servicio inválido'; end if;
  end loop;
 end loop;
 if exists(select 1 from jsonb_array_elements_text(q->'included') i join jsonb_array_elements_text(q->'excluded') e on lower(trim(i))=lower(trim(e))) then raise exception 'Un concepto no puede estar incluido y excluido'; end if;
end $$;

-- Clients cannot bypass the versioning API with a direct table mutation.
revoke insert,update,delete on public.offers from authenticated;
create or replace function public.guard_offer() returns trigger language plpgsql security definer set search_path=public as $$
declare c public.cargo_requests; begin
 if tg_op='UPDATE' then
  if (to_jsonb(new)-array['status','review_started_at','total_usd']) is distinct from (to_jsonb(old)-array['status','review_started_at','total_usd']) then raise exception 'La oferta está sellada: creá una nueva versión'; end if;
  return new;
 end if;
 select * into c from public.cargo_requests where id=new.cargo_id for update;
 if not found or c.status<>'open' or (c.bidding_deadline is not null and c.bidding_deadline<=now()) then raise exception 'La licitación está cerrada'; end if;
 if not exists(select 1 from public.operator_profiles where user_id=new.operator_id and verification_status='approved') then raise exception 'Operador no aprobado'; end if;
 if exists(select 1 from public.offers where cargo_id=new.cargo_id and operator_id=new.operator_id and status in ('submitted','accepted')) then raise exception 'Ya existe una oferta activa para esta carga'; end if;
 if new.freight_usd+new.customs_usd+new.other_costs_usd<=0 or new.estimated_days not between 1 and 365 or new.valid_until<=now() then raise exception 'Tarifa, vigencia o plazo inválidos'; end if;
 if new.normalized_quote is not null then
  perform public.validate_normalized_quote(new.normalized_quote);
  if new.payment_currency<>new.normalized_quote->>'currency' or new.mode::text<>new.normalized_quote->>'mode' or
  new.freight_usd+new.customs_usd+new.other_costs_usd<>(new.normalized_quote->>'amount')::numeric or
  new.estimated_days<>(new.normalized_quote->>'estimated_days')::int or new.valid_until<>(new.normalized_quote->>'valid_until')::timestamptz then raise exception 'Cotización incoherente'; end if;
 end if;
 return new;
end $$;

create function public.audit_quote_change() returns trigger language plpgsql security definer set search_path=public as $$ begin
 insert into public.audit_logs(actor_id,action,entity_id,payload) values(auth.uid(),tg_table_name||'.'||lower(tg_op),new.id,
 jsonb_build_object('before',case when tg_op='UPDATE' then to_jsonb(old) end,'after',to_jsonb(new)));
 return new;
end $$;
create trigger quote_draft_audit after insert or update on public.quote_drafts for each row execute function public.audit_quote_change();
create trigger quote_offer_audit after insert or update on public.offers for each row execute function public.audit_quote_change();

create function public.quote_command(command text,payload jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare actor uuid:=auth.uid(); target uuid; c public.cargo_requests; draft public.quote_drafts; previous public.offers; result uuid; q jsonb; revision_number int:=1; group_id uuid:=gen_random_uuid(); key text;
begin
 if actor is null or not public.operator_approved() then raise exception 'El operador no está aprobado'; end if;
 if command not in ('save','submit','withdraw') then raise exception 'Comando de cotización inválido'; end if;
 if command='withdraw' then select cargo_id into target from public.offers where id=(payload->>'offer_id')::uuid and operator_id=actor;
 elsif nullif(payload->>'draft_id','') is not null then select cargo_id into target from public.quote_drafts where id=(payload->>'draft_id')::uuid and operator_id=actor;
 else target:=coalesce(nullif(payload->>'cargo_id',''),nullif(payload->>'id',''))::uuid; end if;
 if target is null then raise exception 'Cotización no disponible'; end if;
 select * into c from public.cargo_requests where id=target for update;
 -- Recover a completed submission before deadline checks, without creating a second revision.
 if command='submit' and nullif(payload->>'draft_id','') is not null then
  select * into draft from public.quote_drafts where id=(payload->>'draft_id')::uuid and operator_id=actor for update;
  if draft.submitted_offer_id is not null then return jsonb_build_object('ok',true,'id',draft.submitted_offer_id); end if;
 end if;
 if not found or c.status<>'open' or (c.bidding_deadline is not null and c.bidding_deadline<=now()) then raise exception 'La licitación está cerrada'; end if;
 if command='withdraw' then
  select * into previous from public.offers where id=(payload->>'offer_id')::uuid and operator_id=actor and cargo_id=target for update;
  if not found or previous.status<>'submitted' or previous.valid_until<=now() then raise exception 'La oferta ya está cerrada o vencida'; end if;
  update public.offers set status='withdrawn' where id=previous.id;
  return jsonb_build_object('ok',true,'id',previous.id);
 end if;
 if draft.id is null and nullif(payload->>'draft_id','') is not null then
  select * into draft from public.quote_drafts where id=(payload->>'draft_id')::uuid and operator_id=actor for update;
  if not found then raise exception 'Borrador no disponible'; end if;
 end if;
 if draft.submitted_offer_id is not null then raise exception 'El borrador ya fue presentado'; end if;
 q:=coalesce(payload->'quote',draft.content,'{}'::jsonb);
 if jsonb_typeof(q) is distinct from 'object' then raise exception 'Borrador inválido'; end if;
 for key in select jsonb_object_keys(q) loop
  if key in ('services','included','excluded','required_documents') then
   if jsonb_typeof(q->key)<>'array' then raise exception 'Lista de conceptos inválida'; end if;
   if exists(select 1 from jsonb_array_elements(q->key) item where jsonb_typeof(item)<>'string') then raise exception 'Los conceptos deben ser texto'; end if;
  elsif key in ('mode','scope','amount','currency','insurance','estimated_days','valid_until','payment_terms','responsibilities','observations') then
   if jsonb_typeof(q->key)<>'string' then raise exception 'Los términos deben ser texto; el precio usa decimal como cadena'; end if;
  else raise exception 'Campo de borrador inválido'; end if;
 end loop;
 if draft.id is null then
  insert into public.quote_drafts(operator_id,cargo_id,content,replaces_offer_id) values(actor,target,q,nullif(payload->>'replaces_offer_id','')::uuid) returning * into draft;
 else update public.quote_drafts set content=q where id=draft.id returning * into draft; end if;
 if command='save' then return jsonb_build_object('ok',true,'id',draft.id); end if;
 perform public.validate_normalized_quote(q);
 if (q->>'valid_until')::timestamptz<=now() or (c.bidding_deadline is not null and (q->>'valid_until')::timestamptz>c.bidding_deadline) then raise exception 'Vigencia inválida'; end if;
 if draft.replaces_offer_id is not null then
  select * into previous from public.offers where id=draft.replaces_offer_id and operator_id=actor and cargo_id=target for update;
  if not found or previous.status not in ('submitted','withdrawn') or previous.valid_until<=now() or exists(select 1 from public.offers where replaces_offer_id=previous.id) then raise exception 'La versión ya no puede reemplazarse'; end if;
  group_id:=previous.quote_group_id; revision_number:=previous.revision+1;
  if previous.status='submitted' then update public.offers set status='withdrawn' where id=previous.id; end if;
 end if;
 insert into public.offers(cargo_id,operator_id,mode,freight_usd,estimated_days,terms,documentation_terms,payment_currency,valid_until,normalized_quote,quote_group_id,revision,replaces_offer_id)
 values(target,actor,(q->>'mode')::public.transport_mode,(q->>'amount')::numeric,(q->>'estimated_days')::int,q->>'scope',array_to_string(array(select jsonb_array_elements_text(q->'required_documents')),E'\n'),q->>'currency',(q->>'valid_until')::timestamptz,q,group_id,revision_number,draft.replaces_offer_id) returning id into result;
 update public.quote_drafts set submitted_offer_id=result where id=draft.id;
 return jsonb_build_object('ok',true,'id',result);
end $$;

create table public.operation_contract_snapshots (
 operation_id uuid primary key references public.operations(id),offer_id uuid not null unique references public.offers(id),
 state text not null check(state in ('complete','requires_review')),content jsonb,
 captured_at timestamptz not null default now(),check((state='complete' and content is not null) or (state='requires_review' and content is null))
);
alter table public.operation_contract_snapshots enable row level security;
grant select on public.operation_contract_snapshots to authenticated;
create policy "contract participants read" on public.operation_contract_snapshots for select to authenticated using(public.is_operation_participant(operation_id));
-- No invented historical terms: old contracts retain an explicit review marker.
insert into public.operation_contract_snapshots(operation_id,offer_id,state) select id,accepted_offer_id,'requires_review' from public.operations;
create function public.capture_quote_contract() returns trigger language plpgsql security definer set search_path=public as $$
declare f public.offers; begin
 select * into f from public.offers where id=new.accepted_offer_id;
 insert into public.operation_contract_snapshots(operation_id,offer_id,state,content) values(new.id,f.id,
 case when f.normalized_quote is null then 'requires_review' else 'complete' end,
 case when f.normalized_quote is not null then jsonb_build_object('quote',f.normalized_quote,'offer_id',f.id,'revision',f.revision,'quote_group_id',f.quote_group_id,'commission_rate',new.commission_rate) end);
 return new;
end $$;
create trigger capture_quote_contract after insert on public.operations for each row execute function public.capture_quote_contract();
create function public.immutable_contract_snapshot() returns trigger language plpgsql as $$ begin raise exception 'El snapshot contractual es inmutable'; end $$;
create trigger immutable_contract_snapshot before update or delete on public.operation_contract_snapshots for each row execute function public.immutable_contract_snapshot();

alter function public.award_offer(uuid) rename to award_offer_before_quotes;
revoke all on function public.award_offer_before_quotes(uuid) from public,authenticated;
create function public.award_offer(target_offer_id uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare c uuid; f public.offers; begin
 if auth.uid() is null then raise exception 'Sesión requerida'; end if;
 select cargo_id into c from public.offers where id=target_offer_id;
 if not found then raise exception 'Oferta inexistente'; end if;
 perform 1 from public.cargo_requests where id=c and importer_id=auth.uid() for update;
 if not found then raise exception 'Carga no autorizada'; end if;
 if exists(select 1 from public.operations where cargo_id=c) then return public.award_offer_before_quotes(target_offer_id); end if;
 select * into f from public.offers where id=target_offer_id and cargo_id=c for update;
 perform public.validate_normalized_quote(f.normalized_quote);
 return public.award_offer_before_quotes(target_offer_id);
end $$;

alter function public.operator_command(text,jsonb) rename to operator_command_before_marketplace;
revoke all on function public.operator_command_before_marketplace(text,jsonb) from public,authenticated;
create function public.operator_command(command text,payload jsonb) returns jsonb language plpgsql security definer set search_path=public as $$ begin
 if command='offer' then return public.quote_command('submit',payload);
 elsif command='commercial_profile' then return jsonb_build_object('ok',true,'id',public.save_commercial_profile(payload));
 else return public.operator_command_before_marketplace(command,payload); end if;
end $$;
revoke all on function public.quote_command(text,jsonb),public.audit_quote_change(),public.capture_quote_contract(),public.immutable_contract_snapshot(),public.validate_normalized_quote(jsonb),public.award_offer(uuid),public.operator_command(text,jsonb) from public;
grant execute on function public.quote_command(text,jsonb),public.award_offer(uuid),public.operator_command(text,jsonb) to authenticated;
