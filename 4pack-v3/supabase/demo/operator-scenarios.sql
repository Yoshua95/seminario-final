-- Additional LOCAL fixtures. Idempotent and never run against Supabase by the app.
update public.operator_profiles set rejection_reason=coalesce(rejection_reason,'La credencial de habilitación presentada está vencida.'),suspended_at=coalesce(suspended_at,now()-interval '2 days'),suspension_action=coalesce(suspension_action,'Presentá una credencial de habilitación vigente en Documentos y solicitá la revisión por soporte.') where user_id='a0000000-0000-0000-0000-000000000006';
update public.profiles set phone='+54 11 5555-0100' where id='a0000000-0000-0000-0000-000000000002' and phone is null;
insert into public.offers(id,cargo_id,operator_id,mode,freight_usd,estimated_days,terms,documentation_terms,valid_until)
select 'c1000000-0000-0000-0000-000000008211','b0000000-0000-0000-0000-000000008211','a0000000-0000-0000-0000-000000000001','sea',640,30,'Servicio marítimo consolidado.','Packing list estándar',now()+interval '14 days'
where not exists(select 1 from public.offers where id='c1000000-0000-0000-0000-000000008211');
update public.offers set review_started_at=coalesce(review_started_at,now()) where id='c1000000-0000-0000-0000-000000008211';
insert into public.offers(id,cargo_id,operator_id,mode,freight_usd,estimated_days,terms,documentation_terms,valid_until)
select 'c1000000-0000-0000-0000-000000003104','b0000000-0000-0000-0000-000000003104','a0000000-0000-0000-0000-000000000001','sea',3100,45,'Servicio de maquinaria e insumos.','MSDS y declaración técnica',now()+interval '7 days'
where not exists(select 1 from public.offers where id='c1000000-0000-0000-0000-000000003104');
update public.offers set status='rejected' where id='c1000000-0000-0000-0000-000000003104';
