-- Security invoker: private fields are always selected through the caller's RLS.
create or replace function public.operator_snapshot() returns jsonb language plpgsql security invoker set search_path=public as $$
declare snapshot jsonb; begin
 if public.current_user_role()<>'operator' then raise exception 'Se requiere una cuenta de operador'; end if;
 select jsonb_build_object(
 'profile',(select to_jsonb(p) from (select id,full_name,phone,role,created_at from public.profiles where id=auth.uid()) p),
 'operator',(select to_jsonb(p) from public.operator_profiles p where user_id=auth.uid()),
 'commercial',(select to_jsonb(p) from public.operator_commercial_profiles p where operator_id=auth.uid()),
 'cargos',coalesce((select jsonb_agg(to_jsonb(c)) from (select id,public_code,title,origin,destination,category,weight_kg,volume_m3,fob_usd,status,hazmat_review_required,msds_required,description,packages,units_description,required_documents,restrictions,preferred_mode,bidding_deadline,created_at,public.public_reputation(importer_id,'importer') as reputation from public.cargo_requests order by created_at desc limit 500) c),'[]'),
 'offers',coalesce((select jsonb_agg(to_jsonb(f)) from (select * from public.offers where operator_id=auth.uid() order by created_at desc limit 500) f),'[]'),
 'drafts',coalesce((select jsonb_agg(to_jsonb(d)) from public.quote_drafts d where operator_id=auth.uid() and submitted_offer_id is null),'[]'),
 'contracts',coalesce((select jsonb_agg(to_jsonb(s)) from public.operation_contract_snapshots s),'[]'),
 'operations',coalesce((select jsonb_agg(to_jsonb(o)) from (select o.*,'Importador'::text as importer_name,public.operation_contacts(o.id)->>'phone' as importer_phone from public.operations o where o.operator_id=auth.uid() order by awarded_at desc limit 500) o),'[]'),
 'events',coalesce((select jsonb_agg(to_jsonb(e)) from (select * from public.tracking_events order by occurred_at,created_at) e),'[]'),
 'messages',coalesce((select jsonb_agg(to_jsonb(m)) from (select m.*,'Participante'::text as sender_name from public.messages m order by created_at) m),'[]'),
 'documents',coalesce((select jsonb_agg(to_jsonb(d)) from public.documents d),'[]'),
 'guarantees',coalesce((select jsonb_agg(to_jsonb(g)) from public.payment_guarantees g),'[]'),
 'ratings',coalesce((select jsonb_agg(to_jsonb(r)) from public.ratings r),'[]'),
 'movements',coalesce((select jsonb_agg(to_jsonb(w)) from (select * from public.wallet_movements order by created_at desc) w),'[]'),
 'withdrawals',coalesce((select jsonb_agg(to_jsonb(w)) from public.withdrawal_requests w),'[]'),
 'tickets',coalesce((select jsonb_agg(to_jsonb(t)) from public.support_tickets t),'[]'),
 'support_messages',coalesce((select jsonb_agg(to_jsonb(m)) from public.support_messages m),'[]'),
 'reads',coalesce((select jsonb_agg(to_jsonb(r)) from public.conversation_reads r),'[]')
 ) into snapshot;
 return snapshot;
end $$;

create function public.offer_public_profile(target_offer uuid) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare f public.offers; public_identifier uuid; result jsonb; begin
 select * into f from public.offers where id=target_offer;
 if not found or auth.uid() is null or not (f.operator_id=auth.uid() or public.cargo_owned(f.cargo_id) or public.current_user_role()='admin') then return null; end if;
 select public_id into public_identifier from public.operator_commercial_profiles where operator_id=f.operator_id;
 if public_identifier is null then return null; end if;
 select profile into result from public.commercial_directory('','','','',public_identifier) profile limit 1;
 return result;
end $$;
revoke all on function public.offer_public_profile(uuid) from public;
grant execute on function public.offer_public_profile(uuid) to authenticated;
