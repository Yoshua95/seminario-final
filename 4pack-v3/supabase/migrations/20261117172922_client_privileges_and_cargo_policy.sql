-- Prepared and rehearsed locally. Remote application requires explicit approval.
-- Keep CRUD/column grants and service_role unchanged; RLS cannot restrict TRUNCATE.
begin;
drop policy if exists "importers manage own cargo" on public.cargo_requests;
do $hardening$
declare
 names text[] := array['profiles','operator_profiles','cargo_requests','offers','operations','payment_guarantees','tracking_events','messages','documents','ratings','wallet_movements','withdrawal_requests','support_tickets','support_messages','conversation_reads','audit_logs','document_objects','operator_commercial_profiles','quote_drafts','operation_contract_snapshots','operator_capacity_limits','operator_capacity_mutex','operator_capacity_currency_limits','operation_capacity_reservations','capacity_events','capacity_terminal_decisions','cargo_publication_requests'];
 item record; client text; privilege text;
 privileges text := 'TRUNCATE, REFERENCES, TRIGGER';
begin
 if current_setting('server_version_num')::int >= 170000 then privileges := privileges || ', MAINTAIN'; end if;
 for item in select c.oid,c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p') and c.relname=any(names) loop
  execute format('revoke %s on table public.%I from public',privileges,item.relname);
  foreach client in array array['anon','authenticated'] loop
   if exists(select 1 from pg_roles where rolname=client) then
    execute format('revoke %s on table public.%I from %I',privileges,item.relname,client);
   end if;
  end loop;
 end loop;
 -- Work verified postgres authority only, with dangerous defaults in public.
 -- Do not modify global defaults or defaults owned by the managed supabase_admin.
 -- Future application tables MUST be created by postgres in public and audited
 -- for effective privileges. Tables created by another role are not covered.
  execute format('alter default privileges for role postgres in schema public revoke %s on tables from public',privileges);
  foreach client in array array['anon','authenticated'] loop
   if exists(select 1 from pg_roles where rolname=client) then
    execute format('alter default privileges for role postgres in schema public revoke %s on tables from %I',privileges,client);
   end if;
  end loop;
  -- Read-only guard: global/inherited dangerous defaults for postgres would
  -- defeat schema-only hardening. Abort rather than modifying their scope.
  if exists(select 1 from pg_default_acl d cross join lateral aclexplode(d.defaclacl) a
   where d.defaclrole='postgres'::regrole and d.defaclobjtype='r' and d.defaclnamespace in (0,'public'::regnamespace)
   and a.privilege_type=any(string_to_array(replace(privileges,' ',''),','))
   and exists(select 1 from pg_roles r where r.rolname in ('anon','authenticated') and
    (a.grantee=0 or case when a.grantee<>0 then pg_has_role(r.oid,a.grantee,'USAGE') else false end))) then
   raise exception 'Unsafe inherited/global default privileges for postgres; reconcile Q4';
  end if;
 for item in select c.oid,c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p') and c.relname=any(names) loop
  foreach client in array array['anon','authenticated'] loop
   if exists(select 1 from pg_roles where rolname=client) then
    foreach privilege in array string_to_array(replace(privileges,' ',''),',') loop
     if has_table_privilege(client,item.oid,privilege) then raise exception 'Unsafe effective % on % for %; reconcile role inheritance Q4',privilege,item.relname,client; end if;
    end loop;
   end if;
  end loop;
 end loop;
end $hardening$;
commit;
