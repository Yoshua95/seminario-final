-- Draft -> trusted gateway -> publish. No client may bypass MSDS with flags.
create function public.cargo_requires_msds(title text,description text,category text) returns boolean
language sql immutable set search_path=public as $$
 select lower(coalesce(title,'')||' '||coalesce(description,'')||' '||coalesce(category,''))
 ~ '(batería|bateria|litio|líquido|liquido|imán|iman|aerosol|químico|quimico)'
$$;

create function public.cargo_has_valid_msds(target uuid) returns boolean
language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.documents d
 join public.cargo_requests c on c.id=d.cargo_id
 join public.document_objects b on b.document_id=d.id and b.uploaded_by=d.uploaded_by and b.storage_path=d.storage_path
 join storage.objects o on o.id=b.object_id and o.bucket_id='documents' and o.name=b.storage_path
 where c.id=target and d.uploaded_by=c.importer_id and d.kind='msds' and d.document_type='MSDS'
 and d.mime_type='application/pdf' and d.size_bytes between 1 and 10485760
 and d.validation_status in ('pending','approved') and b.sha256 ~ '^[a-f0-9]{64}$'
 and o.user_metadata->>'sha256'=b.sha256 and o.user_metadata->>'uploaded_by'=d.uploaded_by::text
 and o.metadata->>'mimetype'='application/pdf' and (o.metadata->>'size')::bigint=d.size_bytes
 and not exists(select 1 from public.documents v where v.replaces_id=d.id))
$$;
revoke all on function public.cargo_has_valid_msds(uuid) from public,authenticated;

create function public.guard_cargo_msds() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 new.msds_required:=new.msds_required or new.hazmat_review_required
   or public.cargo_requires_msds(new.title,new.description,new.category);
 if tg_op='UPDATE' then new.msds_required:=new.msds_required or old.msds_required or old.hazmat_review_required; end if;
 new.hazmat_review_required:=new.msds_required;
 if new.msds_required and new.status in ('open','awarded') and not public.cargo_has_valid_msds(new.id) then
   raise exception 'MSDS PDF válido y vinculado requerido antes de publicar o adjudicar';
 end if;
 return new;
end $$;
create trigger cargo_msds before insert or update on public.cargo_requests
for each row execute function public.guard_cargo_msds();

-- Historical unsafe listings remain preserved as private drafts for remediation.
update public.cargo_requests set status='draft'
where status='open' and (msds_required or hazmat_review_required or public.cargo_requires_msds(title,description,category))
and not public.cargo_has_valid_msds(id);

-- Also protects legacy open rows, all callers of award_offer, and operation inserts.
create function public.guard_operation_msds() returns trigger
language plpgsql security definer set search_path=public as $$
declare c public.cargo_requests; begin
 select * into c from public.cargo_requests where id=new.cargo_id;
 if (c.msds_required or c.hazmat_review_required or public.cargo_requires_msds(c.title,c.description,c.category))
 and not public.cargo_has_valid_msds(c.id) then raise exception 'MSDS PDF válido y vinculado requerido antes de adjudicar'; end if;
 return new;
end $$;
create trigger operation_msds before insert on public.operations for each row execute function public.guard_operation_msds();

alter function public.award_offer(uuid) rename to award_offer_before_msds;
revoke all on function public.award_offer_before_msds(uuid) from public,authenticated;
create function public.award_offer(target_offer_id uuid) returns uuid
language plpgsql security definer set search_path=public as $$
declare c public.cargo_requests; begin
 select cargo.* into c from public.cargo_requests cargo join public.offers f on f.cargo_id=cargo.id
 where f.id=target_offer_id and cargo.importer_id=auth.uid();
 if not found or public.current_user_role()<>'importer' then raise exception 'Carga no autorizada'; end if;
 if not exists(select 1 from public.operations where cargo_id=c.id)
 and (c.msds_required or c.hazmat_review_required or public.cargo_requires_msds(c.title,c.description,c.category))
 and not public.cargo_has_valid_msds(c.id) then raise exception 'MSDS PDF válido y vinculado requerido antes de adjudicar'; end if;
 return public.award_offer_before_msds(target_offer_id);
end $$;
revoke all on function public.award_offer(uuid) from public;
grant execute on function public.award_offer(uuid) to authenticated;

-- A later administrative rejection must remove an invalid cargo from bidding.
create function public.unpublish_invalid_msds() returns trigger
language plpgsql security definer set search_path=public as $$
declare target uuid; begin
 target:=old.cargo_id;
 if target is not null then
  update public.cargo_requests set status='draft' where id=target and status='open'
   and (msds_required or hazmat_review_required or public.cargo_requires_msds(title,description,category))
   and not public.cargo_has_valid_msds(target);
 end if;
 return null;
end $$;
create trigger msds_rejected after update of validation_status or delete on public.documents
for each row execute function public.unpublish_invalid_msds();

create table public.cargo_publication_requests (
 actor_id uuid not null references public.profiles(id), request_id uuid not null,
 cargo_id uuid not null unique references public.cargo_requests(id), payload jsonb not null,
 primary key(actor_id,request_id)
);
alter table public.cargo_publication_requests enable row level security;
revoke all on public.cargo_publication_requests from public,authenticated;

create function public.prepare_cargo_publication(request_id uuid,payload jsonb) returns uuid
language plpgsql security definer set search_path=public as $$
declare prior public.cargo_publication_requests; result uuid; k text; begin
 if auth.uid() is null or public.current_user_role()<>'importer' then raise exception 'Solo un importador puede publicar cargas'; end if;
 if request_id is null then raise exception 'Identificador de reintento requerido'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||request_id::text,0));
 select * into prior from public.cargo_publication_requests r where r.actor_id=auth.uid() and r.request_id=prepare_cargo_publication.request_id;
 if found then
  if prior.payload<>payload then raise exception 'El reintento debe conservar los datos de la carga'; end if;
  return prior.cargo_id;
 end if;
 foreach k in array array['title','description','origin','destination','category'] loop
  if length(trim(coalesce(payload->>k,''))) not between 2 and 2000 then raise exception 'Datos de carga inválidos'; end if;
 end loop;
 if (payload->>'weight_kg')::numeric<=0 or (payload->>'volume_m3')::numeric<=0 or (payload->>'fob_usd')::numeric<0
 or coalesce(payload->>'weight_kg','NaN') in ('NaN','Infinity','-Infinity')
 or coalesce(payload->>'volume_m3','NaN') in ('NaN','Infinity','-Infinity')
 or coalesce(payload->>'fob_usd','NaN') in ('NaN','Infinity','-Infinity') then raise exception 'Dimensiones inválidas'; end if;
 insert into public.cargo_requests(importer_id,title,description,origin,destination,category,weight_kg,volume_m3,fob_usd,preferred_mode,status,bidding_deadline)
 values(auth.uid(),trim(payload->>'title'),trim(payload->>'description'),trim(payload->>'origin'),trim(payload->>'destination'),trim(payload->>'category'),
 (payload->>'weight_kg')::numeric,(payload->>'volume_m3')::numeric,(payload->>'fob_usd')::numeric,
 coalesce(nullif(payload->>'preferred_mode',''),'sea')::public.transport_mode,'draft',
 coalesce(nullif(payload->>'bidding_deadline','')::timestamptz,now()+interval '7 days')) returning id into result;
 insert into public.cargo_publication_requests values(auth.uid(),request_id,result,payload);
 return result;
end $$;
create function public.publish_cargo(target uuid) returns uuid
language plpgsql security definer set search_path=public as $$
declare c public.cargo_requests; begin
 select * into c from public.cargo_requests where id=target for update;
 if not found or auth.uid() is null or c.importer_id<>auth.uid() or public.current_user_role()<>'importer' then raise exception 'Carga no autorizada'; end if;
 if c.status='open' then
  if (c.msds_required or c.hazmat_review_required or public.cargo_requires_msds(c.title,c.description,c.category)) and not public.cargo_has_valid_msds(c.id) then raise exception 'MSDS PDF válido requerido'; end if;
  return c.id;
 end if;
 if c.status<>'draft' then raise exception 'La carga no es publicable'; end if;
 if c.bidding_deadline<=now() then raise exception 'Plazo de ofertas vencido'; end if;
 update public.cargo_requests set status='open' where id=c.id;
 return c.id;
end $$;
revoke all on function public.prepare_cargo_publication(uuid,jsonb),public.publish_cargo(uuid) from public;
grant execute on function public.prepare_cargo_publication(uuid,jsonb),public.publish_cargo(uuid) to authenticated;

-- Gateway replays bind the same verified object to the same document, never another target.
alter function public.register_document_upload(uuid,jsonb) rename to register_document_upload_before_retries;
revoke all on function public.register_document_upload_before_retries(uuid,jsonb) from public,authenticated,service_role;
create function public.register_document_upload(actor uuid,payload jsonb) returns uuid
language plpgsql security definer set search_path=public as $$
declare prior public.documents; binding public.document_objects; begin
 if not coalesce(public.document_upload_target(actor,payload),false) then raise exception 'Destino documental no autorizado'; end if;
 if coalesce(payload->>'storage_path','') !~ ('^'||actor::text||'/[a-f0-9-]{36}\.(pdf|png|jpg)$') then raise exception 'Archivo inválido'; end if;
 perform pg_advisory_xact_lock(hashtextextended(coalesce(payload->>'storage_path',''),0));
 select * into prior from public.documents where storage_path=payload->>'storage_path';
 if found then
  select * into binding from public.document_objects where document_id=prior.id;
  if prior.uploaded_by<>actor or binding.sha256 is distinct from payload->>'sha256'
   or prior.mime_type is distinct from payload->>'mime_type' or prior.size_bytes is distinct from (payload->>'size_bytes')::bigint
   or prior.document_type is distinct from payload->>'document_type'
   or prior.kind::text is distinct from coalesce(nullif(payload->>'kind',''),'other')
   or coalesce(prior.cargo_id,prior.operation_id,prior.operator_id,prior.support_ticket_id) is distinct from
      (case when payload->>'target_type'='operator' then actor else (payload->>'id')::uuid end)
   or (prior.cargo_id is not null)<>(payload->>'target_type'='cargo')
   or (prior.operation_id is not null)<>(payload->>'target_type'='operation')
   or (prior.operator_id is not null)<>(payload->>'target_type'='operator')
   or (prior.support_ticket_id is not null)<>(payload->>'target_type'='support') then raise exception 'Reintento documental incompatible'; end if;
  return prior.id;
 end if;
 return public.register_document_upload_before_retries(actor,payload);
end $$;
revoke all on function public.register_document_upload(uuid,jsonb) from public,authenticated;
grant execute on function public.register_document_upload(uuid,jsonb) to service_role;
