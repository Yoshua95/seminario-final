-- Additive operator completion. Apply through the normal migration process; no remote execution by the app.
create sequence if not exists public.cargo_display_seq start 10000;
create sequence if not exists public.operation_display_seq start 1000;
create sequence if not exists public.document_display_seq start 1000;
create sequence if not exists public.ticket_display_seq start 1000;
alter table public.cargo_requests alter column public_code set default ('LC-'||nextval('public.cargo_display_seq'));
update public.cargo_requests set public_code='LC-'||nextval('public.cargo_display_seq') where public_code is null;
alter table public.operations add column if not exists public_code text not null default ('OP-'||nextval('public.operation_display_seq'));
alter table public.documents add column if not exists public_code text not null default ('DOC-'||nextval('public.document_display_seq'));
alter table public.support_tickets add column if not exists public_code text not null default ('TKT-'||nextval('public.ticket_display_seq'));
create unique index if not exists cargo_public_code_idx on public.cargo_requests(public_code);
create unique index if not exists operation_public_code_idx on public.operations(public_code);
create unique index if not exists document_public_code_idx on public.documents(public_code);
create unique index if not exists ticket_public_code_idx on public.support_tickets(public_code);
-- Allocate beyond existing imported references without rewriting them.
select setval('public.cargo_display_seq',greatest((select last_value from public.cargo_display_seq),coalesce((select max(substring(public_code from '^LC-([0-9]+)$')::bigint) from public.cargo_requests),9999)),true);
select setval('public.operation_display_seq',greatest((select last_value from public.operation_display_seq),coalesce((select max(substring(public_code from '^OP-([0-9]+)$')::bigint) from public.operations),999)),true);
select setval('public.document_display_seq',greatest((select last_value from public.document_display_seq),coalesce((select max(substring(public_code from '^DOC-([0-9]+)$')::bigint) from public.documents),999)),true);
select setval('public.ticket_display_seq',greatest((select last_value from public.ticket_display_seq),coalesce((select max(substring(public_code from '^TKT-([0-9]+)$')::bigint) from public.support_tickets),999)),true);
grant usage on sequence public.cargo_display_seq,public.operation_display_seq,public.document_display_seq,public.ticket_display_seq to authenticated;

alter table public.operator_profiles add column if not exists suspended_at timestamptz;
alter table public.operator_profiles add column if not exists suspension_action text;
create or replace function public.record_operator_suspension()
returns trigger language plpgsql set search_path=public as $$ begin
 if new.verification_status='suspended' and old.verification_status is distinct from new.verification_status then new.suspended_at:=now(); end if;
 return new;
end $$;
drop trigger if exists record_suspension on public.operator_profiles;
create trigger record_suspension before update on public.operator_profiles for each row execute function public.record_operator_suspension();
revoke all on function public.record_operator_suspension() from public;
alter table public.documents add column if not exists support_ticket_id uuid references public.support_tickets(id);
alter table public.documents drop constraint if exists documents_single_target;
alter table public.documents add constraint documents_single_target check(num_nonnulls(cargo_id,operation_id,operator_id,support_ticket_id)=1);

create or replace function public.guard_approved_legal_identity()
returns trigger language plpgsql set search_path=public as $$ begin
 if old.verification_status='approved' and (new.company_name is distinct from old.company_name or new.tax_id is distinct from old.tax_id)
 and auth.uid() is not null and public.current_user_role()<>'admin' then
  raise exception 'Los datos jurídicos aprobados solo pueden modificarse mediante una solicitud a soporte';
 end if;
 return new;
end $$;
drop trigger if exists approved_legal_identity on public.operator_profiles;
create trigger approved_legal_identity before update on public.operator_profiles for each row execute function public.guard_approved_legal_identity();

-- Retain the tested command implementation behind a restricted, validated entry point.
do $$ begin
 if to_regprocedure('public.operator_command_base(text,jsonb)') is null then
  alter function public.operator_command(text,jsonb) rename to operator_command_base;
 end if;
end $$;
revoke all on function public.operator_command_base(text,jsonb) from public,authenticated;
create or replace function public.operator_command(command text,payload jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare actor uuid:=auth.uid(); target uuid; result_id uuid; original public.documents; result jsonb;
begin
 if actor is null or public.current_user_role()<>'operator' then raise exception 'Iniciá sesión con una cuenta de operador'; end if;
 if command='withdraw' and (nullif(payload->>'amount','') is null or (payload->>'amount')::numeric::text in ('NaN','Infinity','-Infinity') or (payload->>'amount')::numeric<=0 or coalesce(payload->>'currency','') not in ('USD','ARS')) then raise exception 'Ingresá un importe válido mayor que cero'; end if;
 if command='document' then
  if nullif(payload->>'storage_path','') is null or nullif(payload->>'size_bytes','') is null or nullif(payload->>'mime_type','') is null then raise exception 'Completá los datos del archivo'; end if;
  if nullif(payload->>'replaces_id','') is not null then
   select * into original from public.documents where id=(payload->>'replaces_id')::uuid and uploaded_by=actor for update;
   if not found or original.document_type is distinct from payload->>'document_type' or original.support_ticket_id is not null then raise exception 'El reemplazo debe conservar el tipo y destino del documento'; end if;
   if exists(select 1 from public.documents where replaces_id=original.id) then raise exception 'Este documento ya tiene una versión más reciente'; end if;
  end if;
  if payload->>'target_type'='support' then
   target:=nullif(payload->>'id','')::uuid;
   perform 1 from public.support_tickets where id=target and operator_id=actor and status not in ('closed','resolved') for update;
   if not found then raise exception 'El ticket no está disponible para adjuntar archivos'; end if;
   if split_part(payload->>'storage_path','/',1)<>actor::text or (payload->>'size_bytes')::bigint not between 1 and 10485760 or payload->>'mime_type' not in ('application/pdf','image/jpeg','image/png') then raise exception 'Archivo inválido'; end if;
   insert into public.documents(support_ticket_id,uploaded_by,kind,document_type,storage_path,original_name,mime_type,size_bytes)
   values(target,actor,'other','Otro',payload->>'storage_path',left(payload->>'original_name',250),payload->>'mime_type',(payload->>'size_bytes')::bigint) returning id into result_id;
   insert into public.audit_logs(actor_id,action,entity_id) values(actor,'operator.document',result_id);
   return jsonb_build_object('ok',true,'id',result_id);
  end if;
 end if;
 return public.operator_command_base(command,payload);
end $$;
revoke all on function public.operator_command(text,jsonb),public.guard_approved_legal_identity() from public;
grant execute on function public.operator_command(text,jsonb) to authenticated;

-- Extend document access only to the owner of the related ticket and administrators.
drop policy if exists "ticket attachments read" on public.documents;
create policy "ticket attachments read" on public.documents for select to authenticated using(
 support_ticket_id is not null and exists(select 1 from public.support_tickets t where t.id=support_ticket_id and (t.operator_id=auth.uid() or public.current_user_role()='admin'))
);
grant update(validation_status,rejection_reason) on public.documents to authenticated;
drop policy if exists "admin validates documents" on public.documents;
create policy "admin validates documents" on public.documents for update to authenticated using(public.current_user_role()='admin') with check(public.current_user_role()='admin');
-- RPC is the only insertion path for support attachments; existing insert policy cannot create them.

create or replace function public.audit_operator_changes()
returns trigger language plpgsql security definer set search_path=public as $$ begin
 if tg_table_name='documents' and tg_op='UPDATE' then
  if new.validation_status='rejected' and nullif(trim(new.rejection_reason),'') is null then raise exception 'Indicá el motivo de rechazo del documento'; end if;
 end if;
 insert into public.audit_logs(actor_id,action,entity_id,payload)
 values(auth.uid(),tg_table_name||'.'||lower(tg_op),coalesce((to_jsonb(new)->>'id')::uuid,(to_jsonb(new)->>'user_id')::uuid),jsonb_build_object('before',case when tg_op='UPDATE' then to_jsonb(old) end,'after',to_jsonb(new)));
 return new;
end $$;
drop trigger if exists audit_document_changes on public.documents;
create trigger audit_document_changes after insert or update on public.documents for each row execute function public.audit_operator_changes();
drop trigger if exists audit_operation_changes on public.operations;
create trigger audit_operation_changes after update on public.operations for each row execute function public.audit_operator_changes();
drop trigger if exists audit_tracking_changes on public.tracking_events;
create trigger audit_tracking_changes after insert on public.tracking_events for each row execute function public.audit_operator_changes();
drop trigger if exists audit_verification_changes on public.operator_profiles;
create trigger audit_verification_changes after update on public.operator_profiles for each row when (old.verification_status is distinct from new.verification_status) execute function public.audit_operator_changes();
revoke all on function public.audit_operator_changes() from public;

-- Prevent clients from forging human identifiers through direct table writes.
create or replace function public.guard_display_code()
returns trigger language plpgsql set search_path=public as $$ begin
 if auth.uid() is not null and public.current_user_role()<>'admin' then
  if tg_op='INSERT' then new.public_code:=tg_argv[0]||nextval(tg_argv[1]::regclass);
  elsif new.public_code is distinct from old.public_code then raise exception 'El código de referencia no puede modificarse'; end if;
 end if;
 return new;
end $$;
drop trigger if exists display_code on public.cargo_requests;
create trigger display_code before insert or update on public.cargo_requests for each row execute function public.guard_display_code('LC-','public.cargo_display_seq');
drop trigger if exists display_code on public.operations;
create trigger display_code before insert or update on public.operations for each row execute function public.guard_display_code('OP-','public.operation_display_seq');
drop trigger if exists display_code on public.documents;
create trigger display_code before insert or update on public.documents for each row execute function public.guard_display_code('DOC-','public.document_display_seq');
drop trigger if exists display_code on public.support_tickets;
create trigger display_code before insert or update on public.support_tickets for each row execute function public.guard_display_code('TKT-','public.ticket_display_seq');
revoke all on function public.guard_display_code() from public;

-- A rejected academic withdrawal returns its reserved amount exactly once.
create or replace function public.review_simulated_withdrawal(request_id uuid,next_status text)
returns void language plpgsql security definer set search_path=public as $$ declare request public.withdrawal_requests; begin
 if auth.uid() is null or public.current_user_role()<>'admin' then raise exception 'Acceso administrativo requerido'; end if;
 if next_status not in ('approved','rejected') then raise exception 'Estado de retiro inválido'; end if;
 select * into request from public.withdrawal_requests where id=request_id for update;
 if not found or request.status<>'requested' then raise exception 'La solicitud ya fue revisada o no está disponible'; end if;
 update public.withdrawal_requests set status=next_status where id=request_id;
 if next_status='rejected' then
  insert into public.wallet_movements(operator_id,kind,amount,currency,description,event_key) values(request.operator_id,'refund',request.amount,request.currency,'Reintegro por retiro académico rechazado','refund:'||request_id) on conflict(event_key) do nothing;
 end if;
 insert into public.audit_logs(actor_id,action,entity_id,payload) values(auth.uid(),'admin.withdrawal_review',request_id,jsonb_build_object('status',next_status,'simulated',true));
end $$;
revoke all on function public.review_simulated_withdrawal(uuid,text) from public;
grant execute on function public.review_simulated_withdrawal(uuid,text) to authenticated;
