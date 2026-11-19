-- Avoid recursive RLS between cargo_requests and offers.
create or replace function public.cargo_visible(target_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.cargo_requests c where c.id=target_id and (
 c.importer_id=auth.uid() or public.current_user_role()='admin' or (public.operator_approved() and (
 (c.status='open' and (c.bidding_deadline is null or c.bidding_deadline>now())) or exists(select 1 from public.offers f where f.cargo_id=c.id and f.operator_id=auth.uid()) or exists(select 1 from public.operations o where o.cargo_id=c.id and o.operator_id=auth.uid())
 ))))
$$;
create or replace function public.cargo_owned(target_id uuid)
returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from public.cargo_requests where id=target_id and importer_id=auth.uid())$$;
drop policy if exists "open cargo approved operators" on public.cargo_requests;
create policy "open cargo approved operators" on public.cargo_requests for select to authenticated using(public.cargo_visible(id));
drop policy if exists "offers visible to owner and cargo importer" on public.offers;
create policy "offers visible to owner and cargo importer" on public.offers for select to authenticated using((operator_id=auth.uid() and public.operator_approved()) or public.cargo_owned(cargo_id) or public.current_user_role()='admin');
revoke all on function public.cargo_visible(uuid),public.cargo_owned(uuid) from public;
grant execute on function public.cargo_visible(uuid),public.cargo_owned(uuid) to authenticated;

create or replace function public.sync_simulated_finance()
returns trigger language plpgsql security definer set search_path=public as $$ declare operator_user uuid; begin
 select operator_id into operator_user from public.operations where id=new.operation_id;
 if new.status='held_simulated' then
  update public.operations set phase='payment_secured' where id=new.operation_id and phase in ('awarded','payment_pending');
 end if;
 if new.status='released_simulated' then
  insert into public.wallet_movements(operator_id,operation_id,kind,amount,description,event_key)
  values(operator_user,new.operation_id,'release',new.amount_usd-new.commission_usd,'Liberación académica de garantía, neta de comisión','release:'||new.operation_id) on conflict(event_key) do nothing;
 end if;
 return new;
end $$;
drop trigger if exists sync_simulated_finance on public.payment_guarantees;
create trigger sync_simulated_finance after insert or update on public.payment_guarantees for each row execute function public.sync_simulated_finance();
-- Backfill historical releases once; event_key makes this safe to reapply.
insert into public.wallet_movements(operator_id,operation_id,kind,amount,description,event_key)
select o.operator_id,g.operation_id,'release',g.amount_usd-g.commission_usd,'Liberación académica histórica, neta de comisión','release:'||g.operation_id
from public.payment_guarantees g join public.operations o on o.id=g.operation_id
where g.status='released_simulated' and g.amount_usd>g.commission_usd
on conflict(event_key) do nothing;
create or replace function public.guard_milestone_attachment()
returns trigger language plpgsql set search_path=public as $$ begin
 if new.attachment_id is not null and not exists(select 1 from public.documents where id=new.attachment_id and operation_id=new.operation_id) then raise exception 'El comprobante debe pertenecer a la operación'; end if;
 return new;
end $$;
drop trigger if exists milestone_attachment on public.tracking_events;
create trigger milestone_attachment before insert on public.tracking_events for each row execute function public.guard_milestone_attachment();

create or replace function public.operator_command(command text, payload jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
 actor uuid:=auth.uid(); target uuid; result_id uuid; op public.operations; c public.cargo_requests;
 next_phase text; allowed text; coarse public.cargo_status; amount_value numeric; available numeric; ticket public.support_tickets;
begin
 if actor is null or public.current_user_role()<>'operator' then raise exception 'Iniciá sesión con una cuenta de operador'; end if;
 if command not in ('profile','ticket','support_message','document') and not public.operator_approved() then raise exception 'El operador no está aprobado'; end if;
 target:=nullif(payload->>'id','')::uuid;
 if command='offer' then
  select * into c from public.cargo_requests where id=target for update;
  if not found or c.status<>'open' or (c.bidding_deadline is not null and c.bidding_deadline<=now()) then raise exception 'La licitación está cerrada'; end if;
  if payload->>'mode' not in ('sea','air') or (payload->>'amount')::numeric<=0 or round((payload->>'amount')::numeric,2)<>(payload->>'amount')::numeric or (payload->>'days')::int not between 1 and 365 or length(trim(coalesce(payload->>'terms','')))=0 then raise exception 'Revisá la modalidad, tarifa, plazo y observaciones'; end if;
  insert into public.offers(cargo_id,operator_id,mode,freight_usd,estimated_days,terms,documentation_terms,payment_currency,valid_until,status)
  values(target,actor,(payload->>'mode')::public.transport_mode,(payload->>'amount')::numeric,(payload->>'days')::int,left(payload->>'terms',2000),left(coalesce(payload->>'documentation',''),1000),coalesce(payload->>'currency','USD'),coalesce(c.bidding_deadline,now()+interval '7 days'),'submitted') returning id into result_id;
 elsif command in ('advance','milestone','message','read') then
  select * into op from public.operations where id=target and operator_id=actor for update;
  if not found then raise exception 'La operación no pertenece al operador'; end if;
  if command='advance' then
   next_phase:=payload->>'phase';
   allowed:=case op.phase when 'awarded' then 'payment_pending' when 'payment_secured' then 'received_at_origin' when 'received_at_origin' then 'in_transit' when 'in_transit' then 'customs' when 'customs' then 'ready_for_delivery' when 'ready_for_delivery' then 'delivered' when 'delivered' then 'completed' else null end;
   if (next_phase is distinct from allowed or allowed is null) and not (next_phase='disputed' and op.phase in ('payment_secured','received_at_origin','in_transit','customs','ready_for_delivery','delivered')) then raise exception 'Transición de operación inválida'; end if;
   if not exists(select 1 from public.payment_guarantees where operation_id=target and status='held_simulated') then raise exception 'La garantía simulada debe estar confirmada'; end if;
   coarse:=case next_phase when 'in_transit' then 'in_transit'::public.cargo_status when 'customs' then 'customs'::public.cargo_status when 'ready_for_delivery' then 'customs'::public.cargo_status when 'delivered' then 'delivered'::public.cargo_status when 'completed' then 'delivered'::public.cargo_status else op.status end;
   update public.operations set phase=next_phase,status=coarse,completed_at=case when next_phase='completed' then now() else completed_at end where id=target;
   update public.cargo_requests set status=coarse where id=op.cargo_id;
   insert into public.tracking_events(operation_id,status,title,description,location,created_by,event_type) values(target,coarse,'Estado: '||next_phase,left(coalesce(payload->>'description',''),2000),left(coalesce(payload->>'location',''),300),actor,next_phase);
   if next_phase='completed' then
    update public.payment_guarantees set status='released_simulated' where operation_id=target and status='held_simulated';
    update public.operator_profiles set completed_operations=(select count(*) from public.operations where operator_id=actor and phase='completed') where user_id=actor;
   end if;
  elsif command='milestone' then
   if op.phase in ('completed','cancelled') then raise exception 'La operación está cerrada'; end if;
   if payload->>'event_type' not in ('Carga recibida en origen','Documentación validada','Despacho en origen','En tránsito','Arribo al país','Aduana','Liberación','En distribución','Entregada','Incidencia') then raise exception 'Tipo de hito inválido'; end if;
   if length(trim(coalesce(payload->>'description','')))<3 or nullif(payload->>'occurred_at','') is null or (payload->>'occurred_at')::timestamptz>now()+interval '5 minutes' or (payload->>'occurred_at')::timestamptz<op.awarded_at-interval '1 minute' then raise exception 'Revisá la descripción y la fecha del hito'; end if;
   if payload->>'event_type'='Entregada' and op.phase not in ('delivered','completed') then raise exception 'Confirmá la entrega antes de registrar su comprobante'; end if;
   insert into public.tracking_events(operation_id,status,title,event_type,description,location,occurred_at,attachment_id,created_by)
   values(target,op.status,payload->>'event_type',payload->>'event_type',left(payload->>'description',2000),left(payload->>'location',300),(payload->>'occurred_at')::timestamptz,nullif(payload->>'attachment_id','')::uuid,actor) returning id into result_id;
  elsif command='message' then
   if char_length(trim(coalesce(payload->>'body',''))) not between 1 and 2000 then raise exception 'Escribí un mensaje de hasta 2000 caracteres'; end if;
   insert into public.messages(operation_id,sender_id,body) values(target,actor,trim(payload->>'body')) returning id into result_id;
  else
   insert into public.conversation_reads(operation_id,user_id,read_at) values(target,actor,now()) on conflict(operation_id,user_id) do update set read_at=excluded.read_at;
  end if;
 elsif command='withdraw' then
  amount_value:=(payload->>'amount')::numeric;
  if amount_value<=0 or round(amount_value,2)<>amount_value or payload->>'currency' not in ('USD','ARS') then raise exception 'Ingresá un importe válido'; end if;
  perform 1 from public.operator_profiles where user_id=actor for update;
  select coalesce(sum(amount),0) into available from public.wallet_movements where operator_id=actor and currency=payload->>'currency';
  if amount_value>available then raise exception 'El saldo simulado es insuficiente'; end if;
  insert into public.withdrawal_requests(operator_id,amount,currency) values(actor,amount_value,payload->>'currency') returning id into result_id;
  insert into public.wallet_movements(operator_id,kind,amount,currency,description,event_key) values(actor,'withdrawal',-amount_value,payload->>'currency','Solicitud de retiro SIMULADA; no mueve dinero real','withdrawal:'||result_id);
 elsif command='ticket' then
  if target is not null and not exists(select 1 from public.operations where id=target and operator_id=actor) then raise exception 'Operación no disponible'; end if;
  if length(trim(coalesce(payload->>'subject','')))<5 or length(trim(coalesce(payload->>'body','')))<3 then raise exception 'Completá asunto y descripción'; end if;
  insert into public.support_tickets(operator_id,operation_id,subject,category,priority) values(actor,target,left(trim(payload->>'subject'),150),left(coalesce(payload->>'category','General'),80),coalesce(payload->>'priority','normal')) returning id into result_id;
  insert into public.support_messages(ticket_id,sender_id,body) values(result_id,actor,left(trim(payload->>'body'),2000));
 elsif command='support_message' then
  select * into ticket from public.support_tickets where id=target and operator_id=actor for update;
  if not found or ticket.status in ('closed','resolved') then raise exception 'El ticket no está disponible para responder'; end if;
  insert into public.support_messages(ticket_id,sender_id,body) values(target,actor,trim(payload->>'body')) returning id into result_id;
  update public.support_tickets set status='open' where id=target and status='waiting_user';
 elsif command='profile' then
  if length(trim(coalesce(payload->>'company_name','')))<3 or length(trim(coalesce(payload->>'full_name','')))<3 or length(trim(coalesce(payload->>'tax_id','')))<7 then raise exception 'Completá razón social, responsable y CUIT'; end if;
  update public.profiles set full_name=left(trim(payload->>'full_name'),150),phone=left(payload->>'phone',60) where id=actor;
  update public.operator_profiles set company_name=left(payload->>'company_name',150),tax_id=left(payload->>'tax_id',30),trade_name=left(payload->>'trade_name',150),description=left(payload->>'description',2000),address=left(payload->>'address',300),routes=left(payload->>'routes',500),certifications=left(payload->>'certifications',1000),modes=array(select jsonb_array_elements_text(coalesce(payload->'modes','[]'))) where user_id=actor;
 elsif command='document' then
  if payload->>'target_type'='operator' then target:=actor;
  elsif payload->>'target_type'='operation' then
   if not public.operator_approved() or not exists(select 1 from public.operations where id=target and operator_id=actor) then raise exception 'Operación no disponible'; end if;
  else raise exception 'Destino documental inválido'; end if;
  if payload->>'document_type' not in ('MSDS','UN38.3','Packing list','Factura comercial','Guía aérea','Conocimiento de embarque','Constancia de entrega','Credencial del operador','Otro') then raise exception 'Tipo documental inválido'; end if;
  if split_part(payload->>'storage_path','/',1)<>actor::text or (payload->>'size_bytes')::bigint not between 1 and 10485760 or payload->>'mime_type' not in ('application/pdf','image/jpeg','image/png') then raise exception 'Archivo inválido'; end if;
  if nullif(payload->>'replaces_id','') is not null and not exists(select 1 from public.documents where id=(payload->>'replaces_id')::uuid and uploaded_by=actor and validation_status in ('pending','rejected') and coalesce(operation_id,operator_id)=target) then raise exception 'Este documento no puede reemplazarse'; end if;
  insert into public.documents(operation_id,operator_id,uploaded_by,kind,document_type,storage_path,original_name,mime_type,size_bytes,replaces_id)
  values(case when payload->>'target_type'='operation' then target end,case when payload->>'target_type'='operator' then actor end,actor,'other',payload->>'document_type',payload->>'storage_path',left(payload->>'original_name',250),payload->>'mime_type',(payload->>'size_bytes')::bigint,nullif(payload->>'replaces_id','')::uuid) returning id into result_id;
 else raise exception 'Acción no disponible'; end if;
 if command<>'read' then insert into public.audit_logs(actor_id,action,entity_id,payload) values(actor,'operator.'||command,coalesce(result_id,target),jsonb_build_object('simulated',command='withdraw')); end if;
 return jsonb_build_object('id',result_id,'ok',true);
end $$;
revoke all on function public.operator_command(text,jsonb),public.sync_simulated_finance(),public.guard_milestone_attachment() from public;
grant execute on function public.operator_command(text,jsonb) to authenticated;

-- Legacy mobile RPC now uses the same state machine and approval checks.
create or replace function public.advance_operation(target_operation_id uuid,next_status public.cargo_status,event_title text,event_location text default null)
returns void language plpgsql security definer set search_path=public as $$ begin
 perform public.operator_command('advance',jsonb_build_object('id',target_operation_id,'phase',next_status::text,'description',event_title,'location',event_location));
end $$;
