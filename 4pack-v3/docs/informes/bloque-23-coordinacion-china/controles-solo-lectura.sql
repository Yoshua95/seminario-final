-- Ejecutar solo en khtfjogqvtjuxhmzkmue. No modifica datos ni historial.
select jsonb_build_object(
 'cargas',(select count(*) from public.cargo_requests),
 'ofertas',(select count(*) from public.offers),
 'operaciones',(select count(*) from public.operations),
 'documentos',(select count(*) from public.documents),
 'cuentas',(select count(*) from auth.users),
 'checkout_enabled',(select enabled from public.mp_test_settings)
) as conservation;
select c.id,c.public_code,c.title,c.origin,c.destination,c.status,f.id as offer_id,f.total_usd,f.payment_currency,f.estimated_days
from public.cargo_requests c left join public.offers f on f.cargo_id=c.id
where c.id='43d2e5b7-4667-4f6f-a1a6-99f3d0c14200';
select version,name from supabase_migrations.schema_migrations order by version;
-- Comprobar después de la aplicación:
select c.relname,c.relrowsecurity,
 has_table_privilege('anon',c.oid,'SELECT') as anon_read,
 has_table_privilege('authenticated',c.oid,'INSERT') as client_insert,
 has_table_privilege('authenticated',c.oid,'UPDATE') as client_update,
 has_table_privilege('authenticated',c.oid,'DELETE') as client_delete
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in('china_warehouses','china_command_requests','offer_china_receipt_terms','china_operation_coordination','china_receipt_revisions');
select p.proname,
 has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
 has_function_privilege('authenticated',p.oid,'EXECUTE') as client_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and (p.proname like '%china%' or p.proname='operator_compatible') order by p.proname;
-- Origen no equivale a entrega ni liberación:
select c.operation_id,c.state,c.received_at,o.phase,o.status,
 (select count(*) from public.wallet_movements m where m.operation_id=o.id and m.kind='release') as release_movements
from public.china_operation_coordination c join public.operations o on o.id=c.operation_id;
