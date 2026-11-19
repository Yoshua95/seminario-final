begin;
create table public.capital_increase_requests(
 id uuid primary key default gen_random_uuid(),operator_id uuid not null references public.operator_profiles(user_id),request_key uuid not null,
 previous_total numeric(16,2) not null,requested_total numeric(16,2) not null check(requested_total>0),evidence uuid[] not null check(cardinality(evidence)>0),
 status text not null default 'submitted' check(status in ('submitted','approved','rejected','correction')),
 approved_total numeric(16,2),reviewed_by uuid references public.profiles(id),reviewed_at timestamptz,reason text,
 created_at timestamptz not null default now(),unique(operator_id,request_key)
);
create unique index one_pending_capital_request on public.capital_increase_requests(operator_id) where status='submitted';
alter table public.capital_increase_requests enable row level security;
revoke all on public.capital_increase_requests from public,anon,authenticated;
grant select on public.capital_increase_requests to authenticated;
create policy capital_request_read on public.capital_increase_requests for select to authenticated using(operator_id=(select auth.uid()) or public.current_user_role()='admin');
alter table public.operator_profiles add column application_state text not null default 'pending' check(application_state in ('pending','correction','approved','rejected')),
 add column application_note text;
update public.operator_profiles set application_state=case when verification_status='approved' then 'approved' when verification_status='rejected' then 'rejected' else 'pending' end;
alter table public.support_tickets add column assigned_to uuid references public.profiles(id),add column resolution text,add column resolved_at timestamptz;
alter table public.profiles add column importer_access_status text not null default 'active' check(importer_access_status in ('pending','active'));
alter table public.profiles alter column importer_access_status set default 'pending';
create function public.guard_importer_activation() returns trigger language plpgsql set search_path=public as $$ begin
 if new.importer_access_status is distinct from old.importer_access_status and current_user not in ('postgres','supabase_admin') then raise exception 'Activacion administrativa requerida';end if;return new;
end $$;
create trigger importer_activation_guard before update on public.profiles for each row execute function public.guard_importer_activation();
create table public.administrative_decisions(
 id uuid primary key default gen_random_uuid(),actor_id uuid not null references public.profiles(id),entity_id uuid not null,
 action text not null,reason text not null check(length(trim(reason))>=5),payload jsonb not null,request_key uuid not null,created_at timestamptz not null default now(),unique(actor_id,request_key)
);
alter table public.administrative_decisions enable row level security;
revoke all on public.administrative_decisions from public,anon,authenticated;
grant select on public.administrative_decisions to authenticated;
create policy admin_decisions_read on public.administrative_decisions for select to authenticated using(public.current_user_role()='admin' or entity_id=(select auth.uid()) or exists(select 1 from public.capital_increase_requests r where r.id=entity_id and r.operator_id=(select auth.uid())));

create function public.valid_capital_evidence(target_operator uuid,evidence uuid[]) returns boolean language sql stable security definer set search_path=public as $$
 select cardinality(evidence)>0 and not exists(select 1 from unnest(evidence) e where not exists(select 1 from public.documents d where d.id=e and d.operator_id=target_operator and d.validation_status='approved' and not exists(select 1 from public.documents newer where newer.replaces_id=d.id)))
$$;
create function public.request_capital_increase(request_key uuid,requested_total numeric,evidence uuid[]) returns uuid language plpgsql security definer set search_path=public as $$
declare prior public.capital_increase_requests;capital jsonb;result uuid;begin
 if auth.uid() is null or not public.operator_approved() or request_key is null then raise exception 'Operador aprobado requerido';end if;
 perform public.lock_capital_market();
 select * into prior from public.capital_increase_requests r where operator_id=auth.uid() and r.request_key=request_capital_increase.request_key;
 if found then
  if prior.requested_total is distinct from requested_total or prior.evidence is distinct from evidence then raise exception 'El reintento debe conservar importe y documentos';end if;return prior.id;
 end if;
 capital:=public.capital_commitment(auth.uid());
 if requested_total is null or requested_total::text in ('NaN','Infinity','-Infinity') or requested_total<=(capital->>'approved')::numeric then raise exception 'Solicita un nuevo total mayor al capital aprobado';end if;
 if not public.valid_capital_evidence(auth.uid(),evidence) then raise exception 'Selecciona documentos vigentes de tu empresa, aprobados y sin reemplazo';end if;
 if exists(select 1 from public.capital_increase_requests where operator_id=auth.uid() and status='submitted') then raise exception 'Ya existe una ampliacion pendiente';end if;
 insert into public.capital_increase_requests(operator_id,request_key,previous_total,requested_total,evidence) values(auth.uid(),request_key,(capital->>'approved')::numeric,requested_total,evidence) returning id into result;
 return result;
end $$;
create function public.set_approved_capital(target_operator uuid,new_total numeric,reason text) returns void language plpgsql security definer set search_path=public as $$
declare c jsonb;previous numeric;begin
 if auth.uid() is null or public.current_user_role()<>'admin' then raise exception 'Acceso administrativo requerido';end if;
 if not exists(select 1 from public.operator_profiles o join public.profiles p on p.id=o.user_id where o.user_id=target_operator and o.verification_status='approved' and p.role='operator') then raise exception 'Solo empresas registradas y aprobadas';end if;
 if new_total is null or new_total<0 or new_total::text in ('NaN','Infinity','-Infinity') or coalesce(length(trim(reason)),0)<5 then raise exception 'Capital o motivo invalido';end if;
 perform public.lock_capital_market();perform public.lock_operator_capacity(target_operator);
 c:=public.capital_commitment(target_operator);previous:=(c->>'approved')::numeric;
 if (c->>'requires_review')::int>0 then raise exception 'Revisa el capital historico desconocido antes de modificar limites';end if;
 if new_total<(c->>'committed')::numeric then raise exception 'El capital aprobado no puede ser menor que el comprometido';end if;
 insert into public.operator_capacity_limits(operator_id,max_operations,status,valid_from,approved_by,approved_at,reason) values(target_operator,2147483647,'active',now(),auth.uid(),now(),reason)
 on conflict(operator_id) do update set max_operations=2147483647,status='active',approved_by=auth.uid(),approved_at=now(),reason=excluded.reason;
 insert into public.operator_capacity_currency_limits(operator_id,currency,max_per_operation,max_exposure,declared_working_capital,approved_working_capital,status,valid_from,approved_by,approved_at,reason)
 values(target_operator,'ARS',new_total,new_total,new_total,new_total,'active',now(),auth.uid(),now(),reason)
 on conflict(operator_id,currency) do update set approved_working_capital=excluded.approved_working_capital,declared_working_capital=greatest(operator_capacity_currency_limits.declared_working_capital,new_total),status='active',approved_by=auth.uid(),approved_at=now(),reason=excluded.reason;
 insert into public.capacity_events(operator_id,action,actor_id,reason,payload,event_key) values(target_operator,'capital.adjusted',auth.uid(),reason,jsonb_build_object('previous_total',previous,'new_total',new_total,'currency','ARS'),'capital.adjust:'||gen_random_uuid());
end $$;
create function public.admin_review_capital(target_request uuid,decision text,approved_total numeric,reason text,request_key uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare r public.capital_increase_requests;prior public.administrative_decisions;begin
 if auth.uid() is null or public.current_user_role()<>'admin' then raise exception 'Acceso administrativo requerido';end if;
 if request_key is null or decision not in ('approved','rejected','correction') or coalesce(length(trim(reason)),0)<5 then raise exception 'Decision y motivo requeridos';end if;
 perform public.lock_capital_market();
 select * into prior from public.administrative_decisions d where actor_id=auth.uid() and d.request_key=admin_review_capital.request_key;
 if found then
  if prior.entity_id<>target_request or prior.payload is distinct from jsonb_build_object('decision',decision,'approved_total',approved_total,'reason',reason) then raise exception 'Reintento administrativo distinto';end if;return target_request;
 end if;
 select * into r from public.capital_increase_requests where id=target_request for update;
 if not found or r.status<>'submitted' then raise exception 'Solicitud no disponible';end if;
 if decision='approved' then
  if approved_total is null or approved_total>r.requested_total or approved_total<=(public.capital_commitment(r.operator_id)->>'approved')::numeric or not public.valid_capital_evidence(r.operator_id,r.evidence) then raise exception 'Monto o evidencia de aprobacion invalido';end if;
  perform public.set_approved_capital(r.operator_id,approved_total,reason);
 end if;
 update public.capital_increase_requests set status=decision,approved_total=case when decision='approved' then admin_review_capital.approved_total else null end,reviewed_by=auth.uid(),reviewed_at=now(),reason=admin_review_capital.reason where id=r.id;
 insert into public.administrative_decisions(actor_id,entity_id,action,reason,payload,request_key) values(auth.uid(),r.id,'capital.'||decision,reason,jsonb_build_object('decision',decision,'approved_total',approved_total,'reason',reason),request_key);
 return r.id;
end $$;
create function public.admin_review_operator(target_operator uuid,decision text,initial_capital numeric,reason text,checklist jsonb,request_key uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare o public.operator_profiles;prior public.administrative_decisions;begin
 if auth.uid() is null or public.current_user_role()<>'admin' then raise exception 'Acceso administrativo requerido';end if;
 if request_key is null or decision not in ('approved','rejected','correction') or coalesce(length(trim(reason)),0)<5 then raise exception 'Decision y motivo requeridos';end if;
 perform public.lock_capital_market();
 select * into prior from public.administrative_decisions d where actor_id=auth.uid() and d.request_key=admin_review_operator.request_key;
 if found then
  if prior.entity_id<>target_operator or prior.payload is distinct from jsonb_build_object('decision',decision,'initial_capital',initial_capital,'checklist',checklist,'reason',reason) then raise exception 'Reintento administrativo distinto';end if;return target_operator;
 end if;
 select * into o from public.operator_profiles where user_id=target_operator for update;
 if not found or not exists(select 1 from public.profiles where id=target_operator and role='operator') or o.verification_status='approved' then raise exception 'Postulacion no disponible';end if;
 if decision='approved' then
  if checklist is distinct from '{"identity":true,"company":true,"documents":true}'::jsonb or not exists(select 1 from public.documents d where d.operator_id=target_operator and d.validation_status='approved' and not exists(select 1 from public.documents n where n.replaces_id=d.id)) then raise exception 'Completa identidad, empresa y documentos del checklist';end if;
 end if;
 update public.operator_profiles set application_state=decision,application_note=reason,verification_status=case when decision='approved' then 'approved'::public.verification_status when decision='rejected' then 'rejected'::public.verification_status else 'pending'::public.verification_status end,verified_by=auth.uid(),verified_at=now() where user_id=target_operator;
 if decision='approved' then perform public.set_approved_capital(target_operator,initial_capital,reason);end if;
 insert into public.administrative_decisions(actor_id,entity_id,action,reason,payload,request_key) values(auth.uid(),target_operator,'operator.'||decision,reason,jsonb_build_object('decision',decision,'initial_capital',initial_capital,'checklist',checklist,'reason',reason),request_key);return target_operator;
end $$;
create function public.admin_manage_claim(target_ticket uuid,next_status text,responsible uuid,reason text,request_key uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare t public.support_tickets;prior public.administrative_decisions;begin
 if auth.uid() is null or public.current_user_role()<>'admin' then raise exception 'Acceso administrativo requerido';end if;
 if request_key is null or next_status not in ('open','in_progress','waiting_user','resolved','closed') or coalesce(length(trim(reason)),0)<5 or not exists(select 1 from public.profiles where id=responsible and role='admin') then raise exception 'Estado, responsable y motivo requeridos';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||request_key::text,0));
 select * into prior from public.administrative_decisions d where actor_id=auth.uid() and d.request_key=admin_manage_claim.request_key;
 if found then
  if prior.entity_id<>target_ticket or prior.payload is distinct from jsonb_build_object('status',next_status,'responsible',responsible,'reason',reason) then raise exception 'Reintento administrativo distinto';end if;return target_ticket;
 end if;
 select * into t from public.support_tickets where id=target_ticket for update;if not found then raise exception 'Reclamo no disponible';end if;
 if t.status in ('resolved','closed') then raise exception 'El reclamo ya tiene resolucion';end if;
 update public.support_tickets set status=next_status,assigned_to=responsible,resolution=case when next_status in ('resolved','closed') then reason else null end,resolved_at=case when next_status in ('resolved','closed') then now() else null end where id=t.id;
 insert into public.support_messages(ticket_id,sender_id,body) values(t.id,auth.uid(),reason);
 insert into public.administrative_decisions(actor_id,entity_id,action,reason,payload,request_key) values(auth.uid(),t.id,'claim.'||next_status,reason,jsonb_build_object('status',next_status,'responsible',responsible,'reason',reason),request_key);return t.id;
end $$;
-- Activate an existing individual identity, never create Auth users through SQL.
create function public.admin_activate_importer(target_importer uuid,reason text,request_key uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare prior public.administrative_decisions;begin
 if auth.uid() is null or public.current_user_role()<>'admin' then raise exception 'Acceso administrativo requerido';end if;
 if request_key is null or coalesce(length(trim(reason)),0)<5 or not exists(select 1 from public.profiles where id=target_importer and role='importer') then raise exception 'Cuenta importadora y motivo requeridos';end if;
 perform pg_advisory_xact_lock(hashtextextended(target_importer::text,0));
 select * into prior from public.administrative_decisions d where actor_id=auth.uid() and d.request_key=admin_activate_importer.request_key;
 if found then if prior.entity_id<>target_importer or prior.reason<>reason then raise exception 'Reintento administrativo distinto';end if;return target_importer;end if;
 update public.profiles set importer_access_status='active' where id=target_importer;
 insert into public.administrative_decisions(actor_id,entity_id,action,reason,payload,request_key) values(auth.uid(),target_importer,'importer.activated',reason,'{}',request_key);return target_importer;
end $$;
create function public.guard_cargo_importer_activation() returns trigger language plpgsql security definer set search_path=public as $$ begin
 if not exists(select 1 from public.profiles where id=new.importer_id and role='importer' and importer_access_status='active') then raise exception 'Cuenta importadora pendiente de activacion';end if;return new;
end $$;
create trigger cargo_importer_activation before insert on public.cargo_requests for each row execute function public.guard_cargo_importer_activation();
revoke all on function public.guard_cargo_importer_activation(),public.guard_importer_activation() from public,anon,authenticated;
revoke all on function public.valid_capital_evidence(uuid,uuid[]),public.request_capital_increase(uuid,numeric,uuid[]),public.set_approved_capital(uuid,numeric,text),public.admin_review_capital(uuid,text,numeric,text,uuid),public.admin_review_operator(uuid,text,numeric,text,jsonb,uuid),public.admin_manage_claim(uuid,text,uuid,text,uuid),public.admin_activate_importer(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.request_capital_increase(uuid,numeric,uuid[]),public.set_approved_capital(uuid,numeric,text),public.admin_review_capital(uuid,text,numeric,text,uuid),public.admin_review_operator(uuid,text,numeric,text,jsonb,uuid),public.admin_manage_claim(uuid,text,uuid,text,uuid),public.admin_activate_importer(uuid,text,uuid) to authenticated;
create function public.admin_workbench() returns jsonb language plpgsql stable security definer set search_path=public as $$ begin
 if auth.uid() is null or public.current_user_role()<>'admin' then raise exception 'Acceso administrativo requerido';end if;
 return jsonb_build_object('actor',auth.uid(),
 'profiles',coalesce((select jsonb_agg(to_jsonb(p)) from public.profiles p),'[]'),
 'operators',coalesce((select jsonb_agg(to_jsonb(o)||jsonb_build_object('capital',public.capital_commitment(o.user_id))) from public.operator_profiles o join public.profiles p on p.id=o.user_id where p.role='operator'),'[]'),
 'requests',coalesce((select jsonb_agg(to_jsonb(r) order by created_at desc) from public.capital_increase_requests r),'[]'),
 'operations',coalesce((select jsonb_agg(to_jsonb(o) order by awarded_at desc) from public.operations o),'[]'),
 'cargos',coalesce((select jsonb_agg(to_jsonb(c)) from public.cargo_requests c),'[]'),
 'events',coalesce((select jsonb_agg(to_jsonb(e) order by occurred_at desc) from public.tracking_events e),'[]'),
 'documents',coalesce((select jsonb_agg(to_jsonb(d)) from public.documents d),'[]'),
 'claims',coalesce((select jsonb_agg(to_jsonb(t) order by created_at desc) from public.support_tickets t),'[]'),
 'messages',coalesce((select jsonb_agg(to_jsonb(m) order by created_at) from public.support_messages m),'[]'),
 'ratings',coalesce((select jsonb_agg(to_jsonb(r)) from public.ratings r),'[]'),
 'decisions',coalesce((select jsonb_agg(to_jsonb(d) order by created_at desc) from public.administrative_decisions d),'[]'));
end $$;
revoke all on function public.admin_workbench() from public,anon;
grant execute on function public.admin_workbench() to authenticated;
alter function public.operator_capacity_snapshot(uuid) rename to capacity_snapshot_before_requests;
revoke all on function public.capacity_snapshot_before_requests(uuid) from public,anon,authenticated;
create function public.operator_capacity_snapshot(target_operator uuid default null) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare target uuid:=coalesce(target_operator,auth.uid());result jsonb;begin
 result:=public.capacity_snapshot_before_requests(target);
 return result||jsonb_build_object('requests',coalesce((select jsonb_agg(to_jsonb(r) order by created_at desc) from public.capital_increase_requests r where operator_id=target),'[]'),
 'capital_documents',coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'name',d.original_name,'status',d.validation_status)) from public.documents d where d.operator_id=target and d.validation_status='approved' and not exists(select 1 from public.documents n where n.replaces_id=d.id)),'[]'));
end $$;
revoke all on function public.operator_capacity_snapshot(uuid) from public,anon;
grant execute on function public.operator_capacity_snapshot(uuid) to authenticated;
commit;
