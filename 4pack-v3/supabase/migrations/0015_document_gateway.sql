-- Only the authenticated upload gateway may bind bytes to a document.
-- Existing objects are bound only when uploader/path agree; unmatched legacy rows stay unreadable.
create table public.document_objects (
 object_id uuid primary key references storage.objects(id),
 document_id uuid not null unique references public.documents(id) deferrable initially deferred,
 uploaded_by uuid not null references public.profiles(id),
 storage_path text not null unique,
 sha256 text,
 created_at timestamptz not null default now()
);
alter table public.document_objects enable row level security;
revoke all on public.document_objects from public,authenticated;
insert into public.document_objects(object_id,document_id,uploaded_by,storage_path)
select distinct on (o.id) o.id,d.id,d.uploaded_by,d.storage_path
from public.documents d join storage.objects o on o.bucket_id='documents' and o.name=d.storage_path
where split_part(o.name,'/',1)=d.uploaded_by::text and o.owner_id=d.uploaded_by::text
order by o.id,d.created_at;

revoke insert,delete on public.documents from authenticated;
revoke update on public.documents from authenticated;
grant update(validation_status,rejection_reason) on public.documents to authenticated;
drop policy if exists "related users upload documents" on public.documents;
drop policy if exists "users upload own document objects" on storage.objects;
drop policy if exists "users remove own document objects" on storage.objects;
drop policy if exists "related users read document objects" on storage.objects;

create function public.can_read_document_object(target_object uuid) returns boolean
language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.document_objects b join public.documents d on d.id=b.document_id
 where b.object_id=target_object and b.storage_path=d.storage_path and b.uploaded_by=d.uploaded_by and (
 public.current_user_role()='admin' or d.operator_id=auth.uid()
 or (d.operation_id is not null and public.is_operation_participant(d.operation_id))
 or exists(select 1 from public.support_tickets t where t.id=d.support_ticket_id and t.operator_id=auth.uid())
 or exists(select 1 from public.cargo_requests c where c.id=d.cargo_id and (c.importer_id=auth.uid() or
 (public.operator_approved() and c.status='open' and (c.bidding_deadline is null or c.bidding_deadline>now())
 and d.document_type in ('MSDS','UN38.3','Packing list','Factura comercial'))))))
$$;
revoke all on function public.can_read_document_object(uuid) from public;
grant execute on function public.can_read_document_object(uuid) to authenticated;
create policy "bound document object reads" on storage.objects for select to authenticated
using(bucket_id='documents' and public.can_read_document_object(id));

create function public.document_upload_target(actor uuid,payload jsonb) returns boolean
language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.profiles where id=actor) and case payload->>'target_type'
 when 'operator' then exists(select 1 from public.profiles where id=actor and role='operator') and coalesce(nullif(payload->>'id','')::uuid,actor)=actor
 when 'cargo' then exists(select 1 from public.cargo_requests where id=(payload->>'id')::uuid and importer_id=actor)
 when 'operation' then exists(select 1 from public.operations where id=(payload->>'id')::uuid and
 (importer_id=actor or (operator_id=actor and exists(select 1 from public.operator_profiles where user_id=actor and verification_status='approved'))))
 when 'support' then exists(select 1 from public.support_tickets where id=(payload->>'id')::uuid and operator_id=actor and status not in ('closed','resolved'))
 else false end
$$;
revoke all on function public.document_upload_target(uuid,jsonb) from public,authenticated;
grant execute on function public.document_upload_target(uuid,jsonb) to service_role;

create function public.register_document_upload(actor uuid,payload jsonb) returns uuid
language plpgsql security definer set search_path=public as $$
declare target uuid:=case when payload->>'target_type'='operator' then actor else (payload->>'id')::uuid end; object storage.objects; original public.documents; result uuid:=gen_random_uuid();
begin
 if not coalesce(public.document_upload_target(actor,payload),false) then raise exception 'Destino documental no autorizado'; end if;
 if payload->>'mime_type' not in ('application/pdf','image/jpeg','image/png') or
 (payload->>'size_bytes')::bigint not between 1 and 10485760 or
 coalesce(payload->>'sha256','') !~ '^[a-f0-9]{64}$' or
 coalesce(payload->>'storage_path','') !~ ('^'||actor::text||'/[a-f0-9-]{36}\.(pdf|png|jpg)$') then raise exception 'Archivo inválido'; end if;
 select * into object from storage.objects where bucket_id='documents' and name=payload->>'storage_path' for update;
 if not found or object.user_metadata->>'uploaded_by' is distinct from actor::text or
 object.user_metadata->>'sha256' is distinct from payload->>'sha256' or
 (object.metadata->>'size')::bigint is distinct from (payload->>'size_bytes')::bigint or
 object.metadata->>'mimetype' is distinct from payload->>'mime_type' then raise exception 'Objeto no verificado'; end if;
 if payload->>'document_type' not in ('MSDS','UN38.3','Packing list','Factura comercial','Guía aérea','Conocimiento de embarque','Constancia de entrega','Credencial del operador','Otro','Comprobante de pago') then raise exception 'Tipo documental inválido'; end if;
 if nullif(payload->>'replaces_id','') is not null then
  select * into original from public.documents where id=(payload->>'replaces_id')::uuid for update;
  if found and exists(select 1 from public.documents where replaces_id=original.id) then raise exception 'Este documento ya tiene una versión más reciente'; end if;
  if not found or original.uploaded_by<>actor or original.validation_status not in ('pending','rejected') or
  original.document_type is distinct from payload->>'document_type' or
  coalesce(original.cargo_id,original.operation_id,original.operator_id,original.support_ticket_id)<>target or
  (original.cargo_id is not null)<>(payload->>'target_type'='cargo') or
  (original.operation_id is not null)<>(payload->>'target_type'='operation') or
  (original.operator_id is not null)<>(payload->>'target_type'='operator') or
  exists(select 1 from public.documents where replaces_id=original.id) then raise exception 'Reemplazo documental inválido: conservá tipo y destino'; end if;
 end if;
 perform set_config('request.jwt.claim.sub',actor::text,true);
 insert into public.documents(id,cargo_id,operation_id,operator_id,support_ticket_id,uploaded_by,kind,document_type,storage_path,original_name,mime_type,size_bytes,replaces_id)
 values(result,case when payload->>'target_type'='cargo' then target end,case when payload->>'target_type'='operation' then target end,
 case when payload->>'target_type'='operator' then target end,case when payload->>'target_type'='support' then target end,
 actor,coalesce(nullif(payload->>'kind',''),'other')::public.document_kind,payload->>'document_type',object.name,left(payload->>'original_name',250),payload->>'mime_type',(payload->>'size_bytes')::bigint,nullif(payload->>'replaces_id','')::uuid);
 insert into public.document_objects(object_id,document_id,uploaded_by,storage_path,sha256) values(object.id,result,actor,object.name,payload->>'sha256');
 return result;
end $$;
revoke all on function public.register_document_upload(uuid,jsonb) from public,authenticated;
grant execute on function public.register_document_upload(uuid,jsonb) to service_role;

-- The old SECURITY DEFINER command must not bypass the gateway either.
alter function public.operator_command(text,jsonb) rename to operator_command_before_documents;
revoke all on function public.operator_command_before_documents(text,jsonb) from public,authenticated;
create function public.operator_command(command text,payload jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$ begin
 if command='document' then raise exception 'Usá la subida documental autorizada'; end if;
 return public.operator_command_before_documents(command,payload);
end $$;
revoke all on function public.operator_command(text,jsonb) from public;
grant execute on function public.operator_command(text,jsonb) to authenticated;
