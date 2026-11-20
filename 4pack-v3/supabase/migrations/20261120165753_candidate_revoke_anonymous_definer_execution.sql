begin;
-- Candidate hardening: anonymous users never invoke application SECURITY DEFINER
-- APIs. Preserve the effective authenticated/service permissions before removing
-- PUBLIC inheritance; legacy internal APIs already denied stay denied.
do $$
declare f record;
begin
 for f in
  select p.oid::regprocedure as signature,
   has_function_privilege('authenticated',p.oid,'execute') as authenticated_allowed,
   has_function_privilege('service_role',p.oid,'execute') as service_allowed
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.prosecdef
 loop
  if f.authenticated_allowed then execute format('grant execute on function %s to authenticated',f.signature);end if;
  if f.service_allowed then execute format('grant execute on function %s to service_role',f.signature);end if;
  execute format('revoke all on function %s from public, anon',f.signature);
 end loop;
 if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.prosecdef and has_function_privilege('anon',p.oid,'execute'))
 then raise exception 'Anonymous SECURITY DEFINER execution remains';end if;
end $$;
-- No global defaults, data rewrites, Auth changes or checkout enablement.
commit;
