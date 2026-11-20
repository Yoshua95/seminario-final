begin;
-- Existing operations retain their historical workflow and currency.
alter table public.operations add column workflow_version text not null default 'legacy';
alter table public.operations alter column workflow_version set default 'mvp_delivery_v1';
create or replace function public.assign_test_payment_mode() returns trigger language plpgsql security definer set search_path=public as $$ begin
 new.payment_mode:=case when new.contract_currency='ARS' and (new.workflow_version='mvp_delivery_v1' or exists(select 1 from public.mp_test_settings where singleton and enabled)) then 'mercado_pago_test' else 'legacy_simulated' end;
 return new;
end $$;
create table public.operation_delivery_confirmations (
 operation_id uuid primary key references public.operations(id),
 importer_id uuid not null references public.profiles(id),
 delivery_event_id uuid not null references public.tracking_events(id),
 confirmed_at timestamptz not null default now()
);
create table public.test_operation_protection (
 operation_id uuid primary key references public.operations(id),
 provider_payment_id text references public.mp_test_payments(provider_payment_id),
 state text not null check(state in ('pending_payment','pending_delivery','in_review','released_test','refunded_test')),
 amount numeric(14,2) not null check(amount>0),commission numeric(14,2) not null check(commission>=0 and commission<=amount),
 currency text not null check(currency='ARS'),
 updated_at timestamptz not null default now(),released_at timestamptz,
 decision_id uuid references public.administrative_decisions(id),
 check(state<>'released_test' or released_at is not null)
);
alter table public.support_tickets add column opened_by uuid references public.profiles(id),add column request_key uuid,
 add column request_payload jsonb,add column previous_phase text,add column resolution_policy text check(resolution_policy in ('resume','release_test','refund_test'));
create unique index claim_actor_request_key on public.support_tickets(opened_by,request_key) where request_key is not null;
alter table public.operation_delivery_confirmations enable row level security;
alter table public.test_operation_protection enable row level security;
revoke all on public.operation_delivery_confirmations,public.test_operation_protection from public,anon,authenticated,service_role;
grant select on public.operation_delivery_confirmations,public.test_operation_protection to authenticated;
create policy delivery_confirmation_participants on public.operation_delivery_confirmations for select to authenticated using(public.is_operation_participant(operation_id));
create policy protection_participants on public.test_operation_protection for select to authenticated using(public.is_operation_participant(operation_id));

create function public.refresh_test_protection(target uuid) returns void language plpgsql security definer set search_path=public as $$
declare op public.operations;g public.payment_guarantees;payment public.mp_test_payments;state_value text; prior public.test_operation_protection;decision uuid;begin
 select * into op from public.operations where id=target for update;
 if not found or op.workflow_version<>'mvp_delivery_v1' or op.payment_mode<>'mercado_pago_test' then return;end if;
 select * into g from public.payment_guarantees where operation_id=target for update;
 if not found then return;end if;
 select * into prior from public.test_operation_protection where operation_id=target;
 select * into payment from public.mp_test_payments where operation_id=target and status='approved' order by provider_updated_at desc limit 1;
 if payment.provider_payment_id is null and exists(select 1 from public.mp_test_payments where operation_id=target and status in ('refunded','charged_back')) then
  select * into payment from public.mp_test_payments where operation_id=target order by provider_updated_at desc limit 1;state_value:='in_review';
 elsif payment.provider_payment_id is null then state_value:='pending_payment';
 elsif exists(select 1 from public.support_tickets where operation_id=target and status not in ('resolved','closed')) then state_value:='in_review';
 elsif exists(select 1 from public.support_tickets where operation_id=target and resolution_policy='refund_test' and status in ('resolved','closed')) then state_value:='refunded_test';
 elsif exists(select 1 from public.operation_delivery_confirmations where operation_id=target) and op.phase='completed' then state_value:='released_test';
 else state_value:='pending_delivery';end if;
 if prior.state='released_test' and state_value<>'released_test' then
  -- Never discard a newer provider reversal just because the test book released.
  -- Retain the historical movement, remove availability and require review.
  state_value:='in_review';
  update public.payment_guarantees set status='rejected' where operation_id=target and status='released_simulated';
  insert into public.audit_logs(actor_id,action,entity_id,payload)values(auth.uid(),'payment.reversal_after_test_release',target,jsonb_build_object('provider_payment_id',payment.provider_payment_id));
 end if;
 insert into public.test_operation_protection(operation_id,provider_payment_id,state,amount,commission,currency,released_at)
 values(target,payment.provider_payment_id,state_value,g.amount_usd,g.commission_usd,'ARS',case when state_value='released_test' then now() end)
 on conflict(operation_id) do update set provider_payment_id=excluded.provider_payment_id,state=excluded.state,updated_at=now(),released_at=coalesce(test_operation_protection.released_at,excluded.released_at);
 if state_value='released_test' then
  update public.payment_guarantees set status='released_simulated' where operation_id=target and status='held_simulated';
 elsif state_value='refunded_test' then
  update public.payment_guarantees set status='rejected' where operation_id=target and status in ('pending','held_simulated');
 end if;
end $$;
create function public.protection_after_payment() returns trigger language plpgsql security definer set search_path=public as $$begin
 perform public.refresh_test_protection(new.operation_id);return new;
end $$;
create trigger test_protection_payment after insert or update on public.mp_test_payments for each row execute function public.protection_after_payment();
create function public.protection_after_guarantee() returns trigger language plpgsql security definer set search_path=public as $$begin
 if new.status='held_simulated' then perform public.refresh_test_protection(new.operation_id);end if;return new;
end $$;
create trigger test_protection_guarantee after update of status on public.payment_guarantees for each row when(old.status is distinct from new.status) execute function public.protection_after_guarantee();

create or replace function public.transition_operation(target uuid,next_phase text,description text default '',location text default '') returns void
language plpgsql security definer set search_path=public as $$
declare op public.operations;proof public.tracking_events;has_claim boolean;begin
 select * into op from public.operations where id=target for update;
 if not found or auth.uid() is null or not public.is_operation_participant(target) then raise exception 'Operacion no autorizada';end if;
 if op.workflow_version<>'mvp_delivery_v1' or op.payment_mode<>'mercado_pago_test' then
  perform public.transition_operation_before_capacity(target,next_phase,description,location);return;
 end if;
 if next_phase='completed' then
  if auth.uid()<>op.importer_id or public.current_user_role()<>'importer' then raise exception 'Solo el importador confirma la entrega';end if;
  if exists(select 1 from public.operation_delivery_confirmations where operation_id=target) then return;end if;
  if op.phase not in ('awaiting_delivery_confirmation','disputed') then raise exception 'La entrega todavia no esta lista para confirmar';end if;
  if not exists(select 1 from public.mp_test_payments where operation_id=target and status='approved') then raise exception 'Pago de prueba aprobado requerido';end if;
  select e.* into proof from public.tracking_events e join public.documents d on d.id=e.attachment_id
   where e.operation_id=target and e.event_type='Entregada' and e.created_by=op.operator_id
   and d.operation_id=target and d.validation_status<>'rejected' order by e.occurred_at desc limit 1;
  if not found then raise exception 'Falta el hito de entrega con evidencia vinculada';end if;
  insert into public.operation_delivery_confirmations(operation_id,importer_id,delivery_event_id)values(target,auth.uid(),proof.id);
  select exists(select 1 from public.support_tickets where operation_id=target and status not in ('resolved','closed')) into has_claim;
  if not has_claim then
   update public.operations set phase='completed',status='delivered',completed_at=now() where id=target;
   update public.cargo_requests set status='delivered' where id=op.cargo_id;
   update public.operator_profiles set completed_operations=(select count(*) from public.operations where operator_id=op.operator_id and phase='completed') where user_id=op.operator_id;
  end if;
  insert into public.tracking_events(operation_id,status,title,event_type,description,created_by)
   values(target,op.status,'Entrega confirmada por el importador','delivery_confirmation',case when has_claim then 'Liberacion de prueba en revision por reclamo abierto' else 'Entrega y liberacion registradas en entorno de prueba' end,auth.uid());
  perform public.refresh_test_protection(target);return;
 end if;
 if op.phase=next_phase then return;end if;
 if next_phase='in_progress' and exists(select 1 from public.operation_contract_snapshots s where s.operation_id=target and s.content#>'{quote,required_documents}' @> '["Packing list"]'::jsonb)
 and not exists(select 1 from public.documents where operation_id=target and document_type='Packing list' and uploaded_by=op.importer_id and validation_status<>'rejected') then raise exception 'Esperando packing list del importador';end if;
 perform public.transition_operation_before_capacity(target,next_phase,description,location);
 perform public.refresh_test_protection(target);
end $$;

create function public.open_operation_claim(target_operation uuid,request_id uuid,subject text,body text) returns uuid
language plpgsql security definer set search_path=public as $$
declare op public.operations;t public.support_tickets;payload jsonb:=jsonb_build_object('operation',target_operation,'subject',subject,'body',body);begin
 if auth.uid() is null or not public.is_operation_participant(target_operation) or public.current_user_role() not in ('importer','operator') then raise exception 'Operacion no autorizada';end if;
 if request_id is null or length(trim(coalesce(subject,''))) not between 5 and 150 or length(trim(coalesce(body,''))) not between 5 and 2000 then raise exception 'Motivo y descripcion requeridos';end if;
 select * into op from public.operations where id=target_operation for update;
 select * into t from public.support_tickets where opened_by=auth.uid() and request_key=request_id;
 if found then if t.request_payload is distinct from payload then raise exception 'El reintento debe conservar el reclamo';end if;return t.id;end if;
 if op.workflow_version<>'mvp_delivery_v1' or op.phase in ('completed','cancelled','failed') or exists(select 1 from public.test_operation_protection where operation_id=target_operation and state='released_test') then raise exception 'La operacion ya esta cerrada o fuera de este circuito';end if;
 insert into public.support_tickets(operator_id,operation_id,subject,category,opened_by,request_key,request_payload,previous_phase)
 values(op.operator_id,op.id,trim(subject),'delivery',auth.uid(),request_id,payload,case when op.phase='disputed' then 'awaiting_delivery_confirmation' else op.phase end) returning * into t;
 insert into public.support_messages(ticket_id,sender_id,body)values(t.id,auth.uid(),trim(body));
 update public.operations set phase='disputed' where id=op.id;
 insert into public.audit_logs(actor_id,action,entity_id,payload)values(auth.uid(),'claim.opened',t.id,payload);
 perform public.refresh_test_protection(op.id);return t.id;
end $$;
create function public.admin_resolve_operation_claim(target_ticket uuid,next_status text,responsible uuid,reason text,resolution_policy text,request_key uuid) returns uuid
language plpgsql security definer set search_path=public as $$
declare t public.support_tickets;op public.operations;d public.administrative_decisions;payload jsonb:=jsonb_build_object('status',next_status,'responsible',responsible,'policy',resolution_policy);begin
 if auth.uid() is null or public.current_user_role()<>'admin' then raise exception 'Acceso administrativo requerido';end if;
 if request_key is null or coalesce(length(trim(reason)),0)<5 or not exists(select 1 from public.profiles where id=responsible and role='admin')
 or next_status not in ('open','in_progress','waiting_user','resolved','closed') then raise exception 'Estado, responsable y motivo requeridos';end if;
 select * into t from public.support_tickets where id=target_ticket;
 if not found or t.operation_id is null then raise exception 'Reclamo operativo no disponible';end if;
 select * into op from public.operations where id=t.operation_id for update;
 select * into d from public.administrative_decisions where actor_id=auth.uid() and administrative_decisions.request_key=admin_resolve_operation_claim.request_key;
 if found then if d.entity_id<>target_ticket or d.payload is distinct from payload or d.reason<>trim(reason) then raise exception 'La decision repetida debe conservar sus datos';end if;return d.id;end if;
 if t.status in ('closed','resolved') then raise exception 'El reclamo ya tiene una resolucion';end if;
 if next_status in ('closed','resolved') and resolution_policy not in ('resume','release_test','refund_test') then raise exception 'Selecciona la consecuencia de prueba';end if;
 if resolution_policy='release_test' and next_status in ('closed','resolved') and not exists(select 1 from public.operation_delivery_confirmations where operation_id=op.id) then raise exception 'La liberacion requiere confirmacion de entrega del importador';end if;
 insert into public.administrative_decisions(actor_id,entity_id,action,reason,payload,request_key)
 values(auth.uid(),target_ticket,'claim.'||next_status,trim(reason),payload,request_key) returning * into d;
 update public.support_tickets set status=next_status,assigned_to=responsible,resolution=trim(reason),resolved_at=case when next_status in ('closed','resolved') then now() end,
 resolution_policy=case when next_status in ('closed','resolved') then admin_resolve_operation_claim.resolution_policy end where id=t.id;
 insert into public.support_messages(ticket_id,sender_id,body)values(t.id,auth.uid(),trim(reason));
 if next_status in ('closed','resolved') and not exists(select 1 from public.support_tickets where operation_id=op.id and status not in ('closed','resolved')) then
  if resolution_policy='refund_test' then
   update public.operations set phase='failed' where id=op.id;
  elsif exists(select 1 from public.operation_delivery_confirmations where operation_id=op.id) then
   update public.operations set phase='completed',status='delivered',completed_at=now() where id=op.id;
   update public.cargo_requests set status='delivered' where id=op.cargo_id;
  else update public.operations set phase=coalesce(nullif(t.previous_phase,'disputed'),'in_progress') where id=op.id;end if;
 end if;
 perform public.refresh_test_protection(op.id);
 update public.test_operation_protection set decision_id=d.id where operation_id=op.id;
 return d.id;
end $$;
-- Importer can read/respond to a claim about its own operation, not others.
drop policy if exists "ticket owner reads" on public.support_tickets;
create policy "ticket owner reads" on public.support_tickets for select to authenticated using(
 operator_id=(select auth.uid()) or public.current_user_role()='admin' or (operation_id is not null and public.is_operation_participant(operation_id))
);
create function public.guard_document_responsibility() returns trigger language plpgsql security definer set search_path=public as $$
declare op public.operations;begin
 if new.operation_id is null then return new;end if;
 select * into op from public.operations where id=new.operation_id;
 if op.workflow_version='mvp_delivery_v1' and new.document_type='Packing list' and new.uploaded_by<>op.importer_id then raise exception 'El packing list corresponde al importador';end if;
 return new;
end $$;
create trigger document_responsibility before insert on public.documents for each row execute function public.guard_document_responsibility();
create unique index operator_valid_cuit_idx on public.operator_profiles(regexp_replace(tax_id,'[^0-9]','','g')) where public.valid_cuit(tax_id);
create function public.guard_approved_company_identity() returns trigger language plpgsql set search_path=public as $$begin
 if old.verification_status='approved' and public.current_user_role() is distinct from 'admin'::public.user_role and auth.uid() is not null
 and row(new.tax_id,new.company_name) is distinct from row(old.tax_id,old.company_name) then raise exception 'La identidad de una empresa habilitada requiere revision administrativa';end if;return new;
end $$;
create trigger approved_company_identity before update on public.operator_profiles for each row execute function public.guard_approved_company_identity();
revoke all on function public.refresh_test_protection(uuid),public.protection_after_payment(),public.protection_after_guarantee(),public.guard_document_responsibility(),public.guard_approved_company_identity() from public,anon,authenticated,service_role;
revoke all on function public.open_operation_claim(uuid,uuid,text,text),public.admin_resolve_operation_claim(uuid,text,uuid,text,text,uuid),public.transition_operation(uuid,text,text,text) from public,anon;
revoke execute on function public.admin_manage_claim(uuid,text,uuid,text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.open_operation_claim(uuid,uuid,text,text),public.admin_resolve_operation_claim(uuid,text,uuid,text,text,uuid),public.transition_operation(uuid,text,text,text) to authenticated;
alter function public.admin_workbench() rename to admin_workbench_before_delivery;
revoke all on function public.admin_workbench_before_delivery() from public,anon,authenticated,service_role;
create function public.admin_workbench() returns jsonb language plpgsql stable security definer set search_path=public as $$
declare data jsonb;begin
 data:=public.admin_workbench_before_delivery();
 return data||jsonb_build_object('protection',coalesce((select jsonb_agg(to_jsonb(p)) from public.test_operation_protection p),'[]'),
 'delivery_confirmations',coalesce((select jsonb_agg(to_jsonb(d)) from public.operation_delivery_confirmations d),'[]'));
end $$;
revoke all on function public.admin_workbench() from public,anon;
grant execute on function public.admin_workbench() to authenticated;
-- Document bytes and catalog use the same authorization predicate. Open-cargo
-- sharing is restricted to approved compatible operators; sealed shipments are
-- readable only by participants and administration.
create function public.can_read_operation_document(target_document uuid) returns boolean
language sql stable security definer set search_path=public as $$
 select auth.uid() is not null and exists(select 1 from public.documents d where d.id=target_document and (
 public.current_user_role()='admin' or d.operator_id=auth.uid()
 or (d.operation_id is not null and public.is_operation_participant(d.operation_id))
 or exists(select 1 from public.support_tickets t where t.id=d.support_ticket_id and (t.operator_id=auth.uid() or (t.operation_id is not null and public.is_operation_participant(t.operation_id))))
 or exists(select 1 from public.cargo_requests c where c.id=d.cargo_id and (c.importer_id=auth.uid()
 or exists(select 1 from public.operations o where o.cargo_id=c.id and public.is_operation_participant(o.id))
 or (c.status='open' and (c.bidding_deadline is null or c.bidding_deadline>now()) and public.operator_compatible(auth.uid(),c.id)
 and d.document_type in ('MSDS','UN38.3','Packing list','Factura comercial'))))))
$$;
create or replace function public.can_read_document_object(target_object uuid) returns boolean
language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.document_objects b join public.documents d on d.id=b.document_id
 where b.object_id=target_object and b.storage_path=d.storage_path and b.uploaded_by=d.uploaded_by and public.can_read_operation_document(d.id))
$$;
drop policy if exists "related users view documents" on public.documents;
drop policy if exists "ticket attachments read" on public.documents;
create policy "related users view documents" on public.documents for select to authenticated using(public.can_read_operation_document(id));
revoke all on function public.can_read_operation_document(uuid) from public,anon;
grant execute on function public.can_read_operation_document(uuid) to authenticated;
commit;
