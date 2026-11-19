-- Preserve legacy documents and prevent self-assigned reputation at account creation.
update public.documents set document_type=case kind when 'msds' then 'MSDS' when 'packing_list' then 'Packing list' when 'invoice' then 'Factura comercial' when 'operator_credential' then 'Credencial del operador' else 'Otro' end where document_type='Otro';
create or replace function public.guard_operator_insert()
returns trigger language plpgsql set search_path=public as $$ begin
 if current_user not in ('postgres','supabase_admin') and public.current_user_role()<>'admin' and (new.verification_status<>'pending' or new.rating<>0 or new.completed_operations<>0 or new.verified_at is not null or new.verified_by is not null) then raise exception 'El alta de una empresa requiere validación interna'; end if;
 return new;
end $$;
drop trigger if exists operator_safe_creation on public.operator_profiles;
create trigger operator_safe_creation before insert on public.operator_profiles for each row execute function public.guard_operator_insert();
create or replace function public.guard_new_offer_status()
returns trigger language plpgsql set search_path=public as $$ begin
 if auth.uid() is not null and public.current_user_role()<>'admin' and new.status<>'submitted' then raise exception 'Una oferta debe comenzar presentada'; end if;
 return new;
end $$;
drop trigger if exists safe_new_offer_status on public.offers;
create trigger safe_new_offer_status before insert on public.offers for each row execute function public.guard_new_offer_status();
create or replace function public.admin_support_reply(ticket_id uuid,body text,next_status text default 'waiting_user')
returns uuid language plpgsql security definer set search_path=public as $$ declare message_id uuid; begin
 if auth.uid() is null or public.current_user_role()<>'admin' then raise exception 'Acceso administrativo requerido'; end if;
 if next_status not in ('open','in_progress','waiting_user','resolved','closed') then raise exception 'Estado de ticket inválido'; end if;
 if not exists(select 1 from public.support_tickets t where t.id=ticket_id) then raise exception 'Ticket no disponible'; end if;
 insert into public.support_messages(ticket_id,sender_id,body) values(ticket_id,auth.uid(),trim(body)) returning id into message_id;
 update public.support_tickets t set status=next_status where t.id=ticket_id;
 insert into public.audit_logs(actor_id,action,entity_id) values(auth.uid(),'admin.support_reply',ticket_id);
 return message_id;
end $$;
revoke all on function public.guard_operator_insert(),public.guard_new_offer_status(),public.admin_support_reply(uuid,text,text) from public;
grant execute on function public.admin_support_reply(uuid,text,text) to authenticated;
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='offers') then alter publication supabase_realtime add table public.offers; end if;
 if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='operator_profiles') then alter publication supabase_realtime add table public.operator_profiles; end if;
end $$;
