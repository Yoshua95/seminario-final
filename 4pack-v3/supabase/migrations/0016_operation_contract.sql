-- Source: packages/domain/src/operation-contract.json. Regenerate with prepare-operation-contract.mjs.
-- Direct state writes are not a supported client API; all transitions use RPC.
revoke insert,update,delete on public.operations from authenticated;
-- BEGIN GENERATED CONTRACT
create or replace function public.operation_contract() returns jsonb language sql immutable as $contract$ select '{"created":{"label":"Creada","next":["confirmed","cancelled"]},"confirmed":{"label":"Confirmada","next":["in_progress","cancelled"]},"in_progress":{"label":"En curso","next":["awaiting_delivery_confirmation","incident","disputed"]},"awaiting_delivery_confirmation":{"label":"Esperando confirmación de entrega","next":["completed","incident","disputed"]},"completed":{"label":"Completada","next":[]},"incident":{"label":"Con incidencia","next":["in_progress","disputed","failed"]},"disputed":{"label":"En disputa","next":[]},"cancelled":{"label":"Cancelada","next":[]},"failed":{"label":"Fallida","next":[]}}'::jsonb $contract$;
-- END GENERATED CONTRACT

alter table public.operations drop constraint operations_valid_phase;
update public.operations set phase=case phase
 when 'awarded' then 'created' when 'payment_pending' then 'created'
 when 'payment_secured' then 'confirmed'
 when 'received_at_origin' then 'in_progress' when 'in_transit' then 'in_progress' when 'customs' then 'in_progress'
 when 'ready_for_delivery' then 'awaiting_delivery_confirmation' when 'delivered' then 'awaiting_delivery_confirmation' else phase end;
alter table public.operations alter column phase set default 'created';
alter table public.operations add constraint operations_valid_phase check(public.operation_contract() ? phase);
update public.operations set completed_at=coalesce(completed_at,awarded_at) where phase='completed';

alter table public.operations add column contract_currency text not null default 'USD' check(contract_currency in ('USD','ARS'));
alter table public.payment_guarantees add column currency text not null default 'USD' check(currency in ('USD','ARS'));
-- Never silently relabel historical ledgers. Manual reconciliation is required if this assertion fails.
do $$ begin
 if exists(select 1 from public.operations o join public.offers f on f.id=o.accepted_offer_id where f.payment_currency<>'USD') then
  raise exception 'Reconciliación requerida: operaciones históricas no USD';
 end if;
end $$;
alter table public.offers drop constraint offers_payment_currency_check;
alter table public.offers add constraint offers_payment_currency_check check(payment_currency in ('USD','ARS')) not valid;
-- NOT VALID preserves ambiguous historical proposals; they cannot be awarded.

create function public.guard_contract_currency() returns trigger language plpgsql set search_path=public as $$ begin
 if new.payment_currency not in ('USD','ARS') then raise exception 'Moneda contractual inválida'; end if;
 if new.freight_usd::text in ('NaN','Infinity','-Infinity') or new.customs_usd::text in ('NaN','Infinity','-Infinity') or new.other_costs_usd::text in ('NaN','Infinity','-Infinity') then raise exception 'Importe inválido'; end if;
 return new;
end $$;
create trigger contract_currency before insert or update on public.offers for each row execute function public.guard_contract_currency();

create or replace function public.sync_simulated_finance() returns trigger language plpgsql security definer set search_path=public as $$
declare op public.operations; begin
 select * into op from public.operations where id=new.operation_id;
 if new.currency<>op.contract_currency then raise exception 'Monedas incoherentes'; end if;
 if new.status='held_simulated' then update public.operations set phase='confirmed' where id=new.operation_id and phase='created'; end if;
 if new.status='released_simulated' then
  if op.phase<>'completed' then raise exception 'La operación no está finalizada'; end if;
  insert into public.wallet_movements(operator_id,operation_id,kind,amount,currency,description,event_key)
  values(op.operator_id,new.operation_id,'release',new.amount_usd-new.commission_usd,new.currency,'Liberación simulada neta de comisión','release:'||new.operation_id) on conflict(event_key) do nothing;
 end if; return new;
end $$;

create or replace function public.award_offer(target_offer_id uuid) returns uuid
language plpgsql security definer set search_path=public as $$
declare cargo_id_value uuid; c public.cargo_requests; f public.offers; existing public.operations; result uuid; approved public.operator_profiles;
begin
 if auth.uid() is null then raise exception 'Sesión requerida'; end if;
 select cargo_id into cargo_id_value from public.offers where id=target_offer_id;
 if not found then raise exception 'Oferta inexistente'; end if;
 -- All offers for one cargo share this first lock, including guard_offer inserts.
 select * into c from public.cargo_requests where id=cargo_id_value for update;
 if c.importer_id is distinct from auth.uid() or public.current_user_role()<>'importer' then raise exception 'Carga no autorizada'; end if;
 select * into existing from public.operations where cargo_id=c.id;
 if found then
  if existing.accepted_offer_id=target_offer_id then return existing.id; end if;
  raise exception 'La carga ya fue adjudicada';
 end if;
 select * into f from public.offers where id=target_offer_id and cargo_id=c.id for update;
 if not found or f.status<>'submitted' or f.valid_until<=now() then raise exception 'Oferta no presentada o vencida'; end if;
 select * into approved from public.operator_profiles where user_id=f.operator_id for share;
 if not found or approved.verification_status<>'approved' or not exists(select 1 from public.profiles where id=f.operator_id and role='operator') then raise exception 'Operador no aprobado o suspendido'; end if;
 if c.status<>'open' or (c.bidding_deadline is not null and c.bidding_deadline<=now()) then raise exception 'La carga no es adjudicable'; end if;
 if f.payment_currency not in ('USD','ARS') then raise exception 'Moneda contractual inválida'; end if;
 -- Future capacity validation/reservation belongs HERE, within this transaction and cargo lock.
 update public.offers set status=case when id=f.id then 'accepted'::public.offer_status else 'rejected'::public.offer_status end where cargo_id=c.id and status='submitted';
 update public.cargo_requests set status='awarded' where id=c.id;
 insert into public.operations(cargo_id,accepted_offer_id,importer_id,operator_id,phase,contract_currency)
 values(c.id,f.id,c.importer_id,f.operator_id,'created',f.payment_currency) returning id into result;
 insert into public.payment_guarantees(operation_id,amount_usd,commission_usd,currency)
 values(result,f.total_usd,round(f.total_usd*0.025,2),f.payment_currency);
 insert into public.tracking_events(operation_id,status,title,event_type,created_by) values(result,'awarded','Oferta adjudicada','Adjudicación',auth.uid());
 return result;
end $$;

create function public.transition_operation(target uuid,next_phase text,description text default '',location text default '') returns void
language plpgsql security definer set search_path=public as $$
declare op public.operations; role_value text:=public.current_user_role()::text; coarse public.cargo_status;
begin
 select * into op from public.operations where id=target for update;
 if not found or auth.uid() is null or not public.is_operation_participant(target) then raise exception 'Operación no autorizada'; end if;
 if not coalesce((public.operation_contract()->op.phase->'next') ? next_phase,false) then raise exception 'Transición inválida'; end if;
 if next_phase='confirmed' then raise exception 'La confirmación requiere garantía simulada'; end if;
 if next_phase='completed' and (role_value<>'importer' or auth.uid()<>op.importer_id) then raise exception 'Solo el importador confirma entrega'; end if;
 if next_phase in ('in_progress','awaiting_delivery_confirmation') and (role_value<>'operator' or auth.uid()<>op.operator_id or not public.operator_approved()) then raise exception 'Acción exclusiva del operador web'; end if;
 if next_phase='failed' and role_value<>'admin' then raise exception 'Acceso administrativo requerido'; end if;
 if next_phase='cancelled' and role_value not in ('importer','admin') then raise exception 'Cancelación no autorizada'; end if;
 if next_phase in ('incident','disputed') and length(trim(coalesce(description,'')))<5 then raise exception 'Indicá el motivo'; end if;
 if next_phase not in ('cancelled','failed') and not exists(select 1 from public.payment_guarantees where operation_id=target and status='held_simulated') then raise exception 'Garantía simulada requerida'; end if;
 coarse:=case next_phase when 'in_progress' then 'in_transit'::public.cargo_status when 'awaiting_delivery_confirmation' then 'customs'::public.cargo_status when 'completed' then 'delivered'::public.cargo_status when 'cancelled' then 'cancelled'::public.cargo_status else op.status end;
 update public.operations set phase=next_phase,status=coarse,completed_at=case when next_phase='completed' then now() else completed_at end where id=target;
 update public.cargo_requests set status=coarse where id=op.cargo_id;
 insert into public.tracking_events(operation_id,status,title,event_type,description,location,created_by)
 values(target,coarse,'Estado: '||next_phase,next_phase,left(description,2000),left(location,300),auth.uid());
 if next_phase='completed' then
  update public.payment_guarantees set status='released_simulated' where operation_id=target and status='held_simulated';
  update public.operator_profiles set completed_operations=(select count(*) from public.operations where operator_id=op.operator_id and phase='completed') where user_id=op.operator_id;
 end if;
end $$;
revoke all on function public.transition_operation(uuid,text,text,text) from public;
grant execute on function public.transition_operation(uuid,text,text,text) to authenticated;

alter function public.operator_command(text,jsonb) rename to operator_command_before_states;
revoke all on function public.operator_command_before_states(text,jsonb) from public,authenticated;
create function public.operator_command(command text,payload jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$
declare op public.operations; result uuid; begin
 if command='advance' then
  if not public.operator_approved() then raise exception 'Operador no aprobado'; end if;
  perform public.transition_operation((payload->>'id')::uuid,payload->>'phase',coalesce(payload->>'description',''),coalesce(payload->>'location',''));
  return jsonb_build_object('ok',true);
 elsif command='milestone' then
  select * into op from public.operations where id=(payload->>'id')::uuid and operator_id=auth.uid() for update;
  if not found or not public.operator_approved() then raise exception 'La operación no pertenece al operador'; end if;
  if op.phase in ('completed','cancelled','failed') then raise exception 'Operación cerrada'; end if;
  if coalesce(payload->>'event_type','') not in ('Carga recibida en origen','Documentación validada','Despacho en origen','En tránsito','Arribo al país','Aduana','Liberación','En distribución','Entregada','Incidencia') then raise exception 'Tipo de hito inválido'; end if;
  if length(trim(coalesce(payload->>'description','')))<3 or nullif(payload->>'occurred_at','') is null or (payload->>'occurred_at')::timestamptz>now()+interval '5 minutes' or (payload->>'occurred_at')::timestamptz<op.awarded_at-interval '1 minute' then raise exception 'Fecha o descripción inválida'; end if;
  if payload->>'event_type'='Entregada' and op.phase<>'awaiting_delivery_confirmation' then raise exception 'Confirmá la entrega antes de registrar su comprobante'; end if;
  insert into public.tracking_events(operation_id,status,title,event_type,description,location,occurred_at,attachment_id,created_by)
  values(op.id,op.status,payload->>'event_type',payload->>'event_type',left(payload->>'description',2000),left(payload->>'location',300),(payload->>'occurred_at')::timestamptz,nullif(payload->>'attachment_id','')::uuid,auth.uid()) returning id into result;
  return jsonb_build_object('ok',true,'id',result);
 end if;
 return public.operator_command_before_states(command,payload);
end $$;
revoke all on function public.operator_command(text,jsonb) from public;
grant execute on function public.operator_command(text,jsonb) to authenticated;

create or replace function public.advance_operation(target_operation_id uuid,next_status public.cargo_status,event_title text,event_location text default null)
returns void language plpgsql as $$ begin raise exception 'Cliente anterior incompatible: gestioná la operación desde web'; end $$;

drop policy "participants rate completed counterpart" on public.ratings;
create policy "participants rate completed counterpart" on public.ratings for insert to authenticated with check(
 author_id=auth.uid() and exists(select 1 from public.operations o where o.id=operation_id and o.phase='completed' and
 ((o.importer_id=auth.uid() and recipient_id=o.operator_id) or (o.operator_id=auth.uid() and recipient_id=o.importer_id))));

create function public.public_reputation(target_user uuid,target_role text) returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare result jsonb; begin
 if target_role not in ('importer','operator') then raise exception 'Rol de reputación inválido'; end if;
 select jsonb_build_object('role',target_role,'average',round(avg(r.score),1),'count',count(r.id),
 'completed',count(distinct o.id),'history',case when count(distinct o.id)=0 then 'sin historial' else 'verificado' end)
 into result from public.operations o left join public.ratings r on r.operation_id=o.id and r.recipient_id=target_user
 where o.phase='completed' and case target_role when 'importer' then o.importer_id=target_user else o.operator_id=target_user end;
 return result;
end $$;
-- Compatibility entry point; callers with explicit roles use the overload above.
create or replace function public.public_reputation(target_user uuid) returns jsonb
language sql stable security definer set search_path=public as $$
 select public.public_reputation(target_user,case when exists(select 1 from public.profiles where id=target_user and role='operator') then 'operator' else 'importer' end)
$$;
revoke all on function public.public_reputation(uuid,text),public.guard_contract_currency() from public;
grant execute on function public.public_reputation(uuid,text) to authenticated;

create or replace function public.refresh_operator_rating() returns trigger language plpgsql security definer set search_path=public as $$
declare target_user uuid:=coalesce(new.recipient_id,old.recipient_id); begin
 update public.operator_profiles set rating=coalesce((select round(avg(r.score),1) from public.ratings r join public.operations o on o.id=r.operation_id where r.recipient_id=target_user and o.operator_id=target_user and o.phase='completed'),0)
 where user_id=target_user;
 return coalesce(new,old);
end $$;

create function public.guard_guarantee_contract() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from public.operations o join public.offers f on f.id=o.accepted_offer_id
 where o.id=new.operation_id and new.currency=o.contract_currency and new.amount_usd=f.total_usd and new.commission_usd=round(f.total_usd*o.commission_rate,2)) then raise exception 'Importe o moneda de garantía incoherente'; end if;
 return new;
end $$;
create trigger guarantee_contract before insert or update on public.payment_guarantees for each row execute function public.guard_guarantee_contract();
revoke all on function public.guard_guarantee_contract() from public;

-- Existing importer UI writes are narrowed to pre-contract editing.
drop policy "importer manages own cargo" on public.cargo_requests;
create policy "importer reads own cargo" on public.cargo_requests for select to authenticated using(importer_id=auth.uid());
create policy "importer creates cargo" on public.cargo_requests for insert to authenticated with check(importer_id=auth.uid() and public.current_user_role()='importer' and status in ('draft','open'));
create policy "importer edits uncontracted cargo" on public.cargo_requests for update to authenticated using(importer_id=auth.uid() and public.current_user_role()='importer' and status in ('draft','open')) with check(importer_id=auth.uid() and status in ('draft','open'));
create policy "admin manages cargo" on public.cargo_requests for all to authenticated using(public.current_user_role()='admin') with check(public.current_user_role()='admin');
