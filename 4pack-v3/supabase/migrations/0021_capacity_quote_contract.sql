-- Legacy quotes keep NULL/absent estimates. New submissions must explicitly declare capital.
alter function public.validate_normalized_quote(jsonb) rename to validate_quote_before_capacity;
revoke all on function public.validate_quote_before_capacity(jsonb) from public,authenticated;
create function public.validate_normalized_quote(q jsonb) returns void language plpgsql immutable set search_path=public as $$
declare capital numeric; begin
 perform public.validate_quote_before_capacity(q-array['working_capital_amount','working_capital_currency']);
 if jsonb_typeof(q->'working_capital_amount') is distinct from 'string' or coalesce(q->>'working_capital_amount','') !~ '^[0-9]+(\.[0-9]{1,2})?$' then raise exception 'El capital de trabajo estimado requiere revisión'; end if;
 capital:=(q->>'working_capital_amount')::numeric;
 if capital<0 or capital>(q->>'amount')::numeric then raise exception 'El capital estimado debe estar entre cero y el precio contractual'; end if;
 if q->>'working_capital_currency' is distinct from q->>'currency' then raise exception 'La moneda del capital debe coincidir con la contractual'; end if;
end $$;
revoke all on function public.validate_normalized_quote(jsonb) from public;

create or replace function public.quote_command(command text,payload jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare actor uuid:=auth.uid(); target uuid; c public.cargo_requests; draft public.quote_drafts; previous public.offers; result uuid; q jsonb; revision_number int:=1; group_id uuid:=gen_random_uuid(); key text;
begin
 if actor is null or not public.operator_approved() then raise exception 'El operador no está aprobado'; end if;
 perform public.lock_operator_capacity(actor);
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
  elsif key in ('mode','scope','amount','currency','insurance','estimated_days','valid_until','payment_terms','responsibilities','observations','working_capital_amount','working_capital_currency') then
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
