create or replace function public.operator_approved()
returns boolean language sql stable security definer set search_path=public as $$
 select public.current_user_role()='operator' and exists(select 1 from public.operator_profiles where user_id=auth.uid() and verification_status='approved')
$$;
create or replace function public.is_operation_participant(target_operation uuid)
returns boolean language sql stable security definer set search_path=public as $$
 select public.current_user_role()='admin' or exists(select 1 from public.operations where id=target_operation and (importer_id=auth.uid() or (operator_id=auth.uid() and public.operator_approved())))
$$;
create or replace function public.related_profile(target_user uuid)
returns boolean language sql stable security definer set search_path=public as $$
 select target_user=auth.uid() or public.current_user_role()='admin' or exists(select 1 from public.operations o where public.is_operation_participant(o.id) and target_user in (o.operator_id,o.importer_id))
$$;
drop policy if exists "profiles visible to authenticated users" on public.profiles;
drop policy if exists "profiles related only" on public.profiles;
create policy "profiles related only" on public.profiles for select to authenticated using(public.related_profile(id));
drop policy if exists "operator profiles visible to authenticated users" on public.operator_profiles;
drop policy if exists "operator profiles related only" on public.operator_profiles;
create policy "operator profiles related only" on public.operator_profiles for select to authenticated using(public.related_profile(user_id));
drop policy if exists "open cargo visible to authenticated users" on public.cargo_requests;
drop policy if exists "open cargo approved operators" on public.cargo_requests;
create policy "open cargo approved operators" on public.cargo_requests for select to authenticated using(
 importer_id=auth.uid() or public.current_user_role()='admin' or (public.operator_approved() and (
 (status='open' and (bidding_deadline is null or bidding_deadline>now())) or exists(select 1 from public.offers f where f.cargo_id=id and f.operator_id=auth.uid())
 or exists(select 1 from public.operations o where o.cargo_id=id and o.operator_id=auth.uid())
 ))
);
drop policy if exists "importer manages own cargo" on public.cargo_requests;
create policy "importer manages own cargo" on public.cargo_requests for all to authenticated using(
 (importer_id=auth.uid() and public.current_user_role()='importer') or public.current_user_role()='admin'
) with check((importer_id=auth.uid() and public.current_user_role()='importer') or public.current_user_role()='admin');
drop policy if exists "operator updates own active offers" on public.offers;
drop policy if exists "approved operators create offers" on public.offers;
create policy "approved operators create offers" on public.offers for insert to authenticated with check(operator_id=auth.uid() and public.operator_approved());
drop policy if exists "offers visible to owner and cargo importer" on public.offers;
create policy "offers visible to owner and cargo importer" on public.offers for select to authenticated using(
 (operator_id=auth.uid() and public.operator_approved()) or public.current_user_role()='admin' or exists(select 1 from public.cargo_requests c where c.id=cargo_id and c.importer_id=auth.uid())
);

create or replace function public.protect_account_fields()
returns trigger language plpgsql set search_path=public as $$ begin
 if current_user not in ('postgres','supabase_admin') and public.current_user_role()<>'admin' then
  if tg_table_name='profiles' then
   if new.role<>old.role or new.id<>old.id or new.created_at<>old.created_at then raise exception 'No podés modificar el rol ni los datos de auditoría'; end if;
  elsif (to_jsonb(new)-array['company_name','tax_id','description','trade_name','address','modes','routes','certifications']) is distinct from (to_jsonb(old)-array['company_name','tax_id','description','trade_name','address','modes','routes','certifications']) then
   raise exception 'La aprobación y reputación son administradas por 4PACK';
  end if;
 end if;
 return new;
end $$;
drop trigger if exists protect_profile_fields on public.profiles;
create trigger protect_profile_fields before update on public.profiles for each row execute function public.protect_account_fields();
drop trigger if exists protect_operator_fields on public.operator_profiles;
create trigger protect_operator_fields before update on public.operator_profiles for each row execute function public.protect_account_fields();

create or replace function public.guard_offer()
returns trigger language plpgsql security definer set search_path=public as $$ declare c public.cargo_requests; begin
 if tg_op='UPDATE' then
  if (to_jsonb(new)-array['status','review_started_at','total_usd']) is distinct from (to_jsonb(old)-array['status','review_started_at','total_usd']) then raise exception 'La oferta está sellada'; end if;
  return new;
 end if;
 select * into c from public.cargo_requests where id=new.cargo_id for update;
 if c.status<>'open' or (c.bidding_deadline is not null and c.bidding_deadline<=now()) then raise exception 'La licitación está cerrada'; end if;
 if not exists(select 1 from public.operator_profiles where user_id=new.operator_id and verification_status='approved') then raise exception 'Operador no aprobado'; end if;
 if exists(select 1 from public.offers where cargo_id=new.cargo_id and operator_id=new.operator_id and status in ('submitted','accepted')) then raise exception 'Ya existe una oferta activa para esta carga'; end if;
 if new.total_usd is not null then null; end if;
 if new.freight_usd+new.customs_usd+new.other_costs_usd<=0 or new.estimated_days not between 1 and 365 or new.valid_until<=now() then raise exception 'Tarifa, vigencia o plazo inválidos'; end if;
 return new;
end $$;
drop trigger if exists guard_sealed_offer on public.offers;
create trigger guard_sealed_offer before insert or update on public.offers for each row execute function public.guard_offer();

drop policy if exists "related users view documents" on public.documents;
create policy "related users view documents" on public.documents for select to authenticated using(
 public.current_user_role()='admin' or operator_id=auth.uid() or (operation_id is not null and public.is_operation_participant(operation_id)) or exists(
 select 1 from public.cargo_requests c where c.id=cargo_id and (c.importer_id=auth.uid() or (public.operator_approved() and c.status='open' and (c.bidding_deadline is null or c.bidding_deadline>now()) and document_type in ('MSDS','UN38.3','Packing list','Factura comercial'))))
);
drop policy if exists "related users upload documents" on public.documents;
create policy "related users upload documents" on public.documents for insert to authenticated with check(
 uploaded_by=auth.uid() and validation_status='pending' and rejection_reason is null and num_nonnulls(cargo_id,operation_id,operator_id)=1 and (
 (operator_id=auth.uid() and public.current_user_role()='operator') or (operation_id is not null and public.is_operation_participant(operation_id)) or exists(select 1 from public.cargo_requests c where c.id=cargo_id and c.importer_id=auth.uid()))
);
-- Read URLs are short lived; replacement stores a new version, never overwrites a validated object.
drop policy if exists "users remove own document objects" on storage.objects;
create policy "users remove own document objects" on storage.objects for delete to authenticated using(bucket_id='documents' and (storage.foldername(name))[1]=auth.uid()::text and not exists(select 1 from public.documents d where d.storage_path=name));

create or replace function public.public_reputation(target_user uuid)
returns jsonb language sql stable security definer set search_path=public as $$
 select jsonb_build_object('average',coalesce(round(avg(score),1),0),'count',count(*),'completed',(select count(*) from public.operations where importer_id=target_user and status='delivered')) from public.ratings where recipient_id=target_user
$$;
revoke all on function public.operator_approved(),public.related_profile(uuid),public.public_reputation(uuid),public.guard_offer(),public.protect_account_fields() from public;
grant execute on function public.operator_approved(),public.related_profile(uuid),public.public_reputation(uuid) to authenticated;

-- Security-invoker snapshot: every underlying table continues to enforce RLS.
create or replace function public.operator_snapshot()
returns jsonb language plpgsql security invoker set search_path=public as $$ declare snapshot jsonb; begin
 if public.current_user_role()<>'operator' then raise exception 'Se requiere una cuenta de operador'; end if;
 select jsonb_build_object(
 'profile',(select to_jsonb(p) from (select id,full_name,phone,role,created_at from public.profiles where id=auth.uid()) p),
 'operator',(select to_jsonb(p) from public.operator_profiles p where user_id=auth.uid()),
 'cargos',coalesce((select jsonb_agg(to_jsonb(c)) from (select id,public_code,title,origin,destination,category,weight_kg,volume_m3,fob_usd,status,hazmat_review_required,msds_required,description,packages,units_description,required_documents,restrictions,preferred_mode,bidding_deadline,created_at,public.public_reputation(importer_id) as reputation from public.cargo_requests order by created_at desc limit 500) c),'[]'),
 'offers',coalesce((select jsonb_agg(to_jsonb(f)) from (select * from public.offers where operator_id=auth.uid() order by created_at desc limit 500) f),'[]'),
 'operations',coalesce((select jsonb_agg(to_jsonb(o)) from (select o.*,p.full_name as importer_name,p.phone as importer_phone from public.operations o left join public.profiles p on p.id=o.importer_id where o.operator_id=auth.uid() order by awarded_at desc limit 500) o),'[]'),
 'events',coalesce((select jsonb_agg(to_jsonb(e)) from (select * from public.tracking_events order by occurred_at,created_at) e),'[]'),
 'messages',coalesce((select jsonb_agg(to_jsonb(m)) from (select m.*,p.full_name as sender_name from public.messages m left join public.profiles p on p.id=m.sender_id order by created_at) m),'[]'),
 'documents',coalesce((select jsonb_agg(to_jsonb(d)) from public.documents d),'[]'),
 'guarantees',coalesce((select jsonb_agg(to_jsonb(g)) from public.payment_guarantees g),'[]'),
 'ratings',coalesce((select jsonb_agg(to_jsonb(r)) from public.ratings r),'[]'),
 'movements',coalesce((select jsonb_agg(to_jsonb(w)) from (select * from public.wallet_movements order by created_at desc) w),'[]'),
 'withdrawals',coalesce((select jsonb_agg(to_jsonb(w)) from (select * from public.withdrawal_requests order by created_at desc) w),'[]'),
 'tickets',coalesce((select jsonb_agg(to_jsonb(t)) from (select * from public.support_tickets order by created_at desc) t),'[]'),
 'support_messages',coalesce((select jsonb_agg(to_jsonb(m)) from (select * from public.support_messages order by created_at) m),'[]'),
 'reads',coalesce((select jsonb_agg(to_jsonb(r)) from public.conversation_reads r),'[]')
 ) into snapshot;
 return snapshot;
end $$;
revoke all on function public.operator_snapshot() from public;
grant execute on function public.operator_snapshot() to authenticated;
