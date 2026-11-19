-- Unknown means NULL, never zero. Existing measurements and reservations stay intact.
begin;
alter table public.cargo_requests alter column volume_m3 drop not null;
alter table public.cargo_requests add column volume_confirmed_by uuid references public.profiles(id), add column volume_confirmed_at timestamptz;
create table public.cargo_volume_proposals (
 id uuid primary key default gen_random_uuid(),
 cargo_id uuid not null references public.cargo_requests(id),
 operator_id uuid not null references public.profiles(id),
 volume_m3 numeric not null check(volume_m3>0 and volume_m3<1000000),
 status text not null default 'proposed' check(status in ('proposed','confirmed','superseded')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(cargo_id,operator_id)
);
alter table public.cargo_volume_proposals enable row level security;
create index cargo_volume_proposals_operator_idx on public.cargo_volume_proposals(operator_id);
revoke all on public.cargo_volume_proposals from public,anon,authenticated,service_role;
grant select on public.cargo_volume_proposals to authenticated,service_role;
create policy volume_proposal_read on public.cargo_volume_proposals for select to authenticated using(
 operator_id=(select auth.uid()) or public.current_user_role()='admin' or exists(select 1 from public.cargo_requests c where c.id=cargo_id and c.importer_id=(select auth.uid()))
);

create function public.propose_cargo_volume(target_cargo uuid,proposed_volume numeric) returns uuid
language plpgsql security definer set search_path=public as $$
declare c public.cargo_requests; p public.cargo_volume_proposals; begin
 if auth.uid() is null or public.current_user_role()<>'operator' or not exists(select 1 from public.operator_profiles where user_id=auth.uid() and verification_status='approved') then raise exception 'Operador aprobado requerido'; end if;
 if proposed_volume is null or not(proposed_volume>0 and proposed_volume<1000000) then raise exception 'Volumen propuesto invalido'; end if;
 select * into c from public.cargo_requests where id=target_cargo for update;
 if not found or c.status<>'open' or c.bidding_deadline<=now() or c.volume_m3 is not null then raise exception 'La carga no admite propuestas de volumen'; end if;
 insert into public.cargo_volume_proposals(cargo_id,operator_id,volume_m3) values(c.id,auth.uid(),proposed_volume)
 on conflict(cargo_id,operator_id) do update set volume_m3=excluded.volume_m3,updated_at=case when cargo_volume_proposals.volume_m3=excluded.volume_m3 then cargo_volume_proposals.updated_at else now() end
 where cargo_volume_proposals.status='proposed' returning * into p;
 if p.id is null then raise exception 'Propuesta no modificable'; end if;
 return p.id;
end $$;
create function public.confirm_cargo_volume(target_proposal uuid,expected_volume numeric) returns uuid
language plpgsql security definer set search_path=public as $$
declare c public.cargo_requests; p public.cargo_volume_proposals; cargo uuid; begin
 select cargo_id into cargo from public.cargo_volume_proposals where id=target_proposal;
 select * into c from public.cargo_requests where id=cargo for update;
 if not found or auth.uid() is null or public.current_user_role()<>'importer' or c.importer_id<>auth.uid() then raise exception 'Carga no autorizada'; end if;
 select * into p from public.cargo_volume_proposals where id=target_proposal for update;
 if expected_volume is distinct from p.volume_m3 then raise exception 'El volumen propuesto cambio; revisalo antes de confirmar'; end if;
 if p.status='confirmed' and c.volume_m3=p.volume_m3 and c.volume_confirmed_by=auth.uid() then return c.id; end if;
 if c.status<>'open' or c.volume_m3 is not null or p.status<>'proposed' then raise exception 'La propuesta no es confirmable'; end if;
 update public.cargo_requests set volume_m3=p.volume_m3,volume_confirmed_by=auth.uid(),volume_confirmed_at=now() where id=c.id;
 update public.cargo_volume_proposals set status=case when id=p.id then 'confirmed' else 'superseded' end,updated_at=now() where cargo_id=c.id and status='proposed';
 return c.id;
end $$;

create or replace function public.prepare_cargo_publication(request_id uuid,payload jsonb) returns uuid
language plpgsql security definer set search_path=public as $$
declare prior public.cargo_publication_requests; result uuid; k text; volume numeric; begin
 if auth.uid() is null or public.current_user_role()<>'importer' then raise exception 'Solo un importador puede publicar cargas'; end if;
 if request_id is null then raise exception 'Identificador de reintento requerido'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||request_id::text,0));
 select * into prior from public.cargo_publication_requests r where r.actor_id=auth.uid() and r.request_id=prepare_cargo_publication.request_id;
 if found then
  if prior.payload<>payload then raise exception 'El reintento debe conservar los datos de la carga'; end if;
  return prior.cargo_id;
 end if;
 foreach k in array array['title','description','origin','destination','category'] loop
  if length(trim(coalesce(payload->>k,''))) not between 2 and 2000 then raise exception 'Datos de carga invalidos'; end if;
 end loop;
 if lower(trim(payload->>'category'))='otro' and length(trim(payload->>'description'))<10 then raise exception 'Describi la mercaderia de la categoria Otro'; end if;
 if jsonb_typeof(payload->'volume_unknown')='boolean' and payload->'volume_unknown'='true'::jsonb then
  if payload->>'volume_m3' is not null then raise exception 'Volumen desconocido debe ser null'; end if;
  volume:=null;
 else
  volume:=(payload->>'volume_m3')::numeric;
  if volume is null or not(volume>0 and volume<1000000) then raise exception 'Volumen invalido'; end if;
 end if;
 if coalesce(payload->>'weight_kg','NaN') in ('NaN','Infinity','-Infinity') or (payload->>'weight_kg')::numeric<=0
 or coalesce(payload->>'fob_usd','NaN') in ('NaN','Infinity','-Infinity') or (payload->>'fob_usd')::numeric<0 then raise exception 'Dimensiones invalidas'; end if;
 insert into public.cargo_requests(importer_id,title,description,origin,destination,category,weight_kg,volume_m3,fob_usd,preferred_mode,status,bidding_deadline)
 values(auth.uid(),trim(payload->>'title'),trim(payload->>'description'),trim(payload->>'origin'),trim(payload->>'destination'),trim(payload->>'category'),
 (payload->>'weight_kg')::numeric,volume,(payload->>'fob_usd')::numeric,coalesce(nullif(payload->>'preferred_mode',''),'sea')::public.transport_mode,'draft',
 coalesce(nullif(payload->>'bidding_deadline','')::timestamptz,now()+interval '7 days')) returning id into result;
 insert into public.cargo_publication_requests values(auth.uid(),request_id,result,payload);
 return result;
end $$;

alter function public.reserve_operation_capacity(uuid,text) rename to reserve_operation_capacity_before_volume;
revoke all on function public.reserve_operation_capacity_before_volume(uuid,text) from public,anon,authenticated;
create function public.reserve_operation_capacity(target_operation uuid,source text default 'tender') returns uuid
language plpgsql security definer set search_path=public as $$ begin
 if exists(select 1 from public.operation_capacity_reservations where operation_id=target_operation) then return target_operation; end if;
 if exists(select 1 from public.operations o join public.cargo_requests c on c.id=o.cargo_id where o.id=target_operation and c.volume_m3 is null) then raise exception 'Confirma el volumen propuesto antes de reservar Capacity'; end if;
 return public.reserve_operation_capacity_before_volume(target_operation,source);
end $$;
revoke all on function public.reserve_operation_capacity(uuid,text) from public,anon,authenticated;
revoke all on function public.propose_cargo_volume(uuid,numeric),public.confirm_cargo_volume(uuid,numeric),public.prepare_cargo_publication(uuid,jsonb) from public,anon;
grant execute on function public.propose_cargo_volume(uuid,numeric),public.confirm_cargo_volume(uuid,numeric),public.prepare_cargo_publication(uuid,jsonb) to authenticated;
commit;
