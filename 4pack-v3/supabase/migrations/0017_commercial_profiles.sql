-- Authenticated marketplace projection; legal/account data never enter this table.
create table public.operator_commercial_profiles (
 operator_id uuid primary key references public.operator_profiles(user_id),
 public_id uuid not null unique default gen_random_uuid(),
 trade_name text not null check(char_length(trim(trade_name)) between 3 and 150),
 logo_url text check(logo_url is null or (char_length(logo_url)<=500 and logo_url ~ '^https://[^/@?#]+/[^?#]*$')),
 description text not null default '' check(char_length(description)<=2000),
 city text, province text, country text,
 modes text[] not null default '{}' check(modes <@ array['air','sea','consolidated']::text[]),
 specialties text[] not null default '{}', coverage text[] not null default '{}', categories text[] not null default '{}',
 experience_years integer check(experience_years between 0 and 150),
 published boolean not null default false, admin_hidden boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index commercial_name_idx on public.operator_commercial_profiles(lower(trade_name));
create index commercial_modes_idx on public.operator_commercial_profiles using gin(modes);
create index commercial_specialties_idx on public.operator_commercial_profiles using gin(specialties);
create index commercial_coverage_idx on public.operator_commercial_profiles using gin(coverage);
alter table public.operator_commercial_profiles enable row level security;
revoke all on public.operator_commercial_profiles from public,authenticated;
grant select on public.operator_commercial_profiles to authenticated;
create policy "commercial editor reads own" on public.operator_commercial_profiles for select to authenticated
using(operator_id=auth.uid() or public.current_user_role()='admin');
create trigger commercial_updated before update on public.operator_commercial_profiles for each row execute function public.set_updated_at();

create function public.guard_commercial_content() returns trigger language plpgsql set search_path=public as $$
declare value text; begin
 if length(coalesce(new.city,''))>100 or length(coalesce(new.province,''))>100 or length(coalesce(new.country,''))>100 then raise exception 'Ubicación general demasiado extensa'; end if;
 if coalesce(array_length(new.specialties,1),0)>20 or coalesce(array_length(new.coverage,1),0)>30 or coalesce(array_length(new.categories,1),0)>30 then raise exception 'Demasiados valores comerciales'; end if;
 foreach value in array array[new.trade_name,new.description,new.city,new.province,new.country]||new.specialties||new.coverage||new.categories loop
  if value is not null and (length(value)>2000 or value ~* '(@|https?://|www\.|[0-9][0-9 ()+.-]{7,}[0-9])') then raise exception 'El perfil comercial no admite contactos ni datos legales'; end if;
 end loop;
 foreach value in array new.specialties||new.coverage||new.categories loop
  if value is null or length(trim(value)) not between 1 and 100 then raise exception 'Etiqueta comercial inválida'; end if;
 end loop;
 return new;
end $$;
create trigger commercial_content before insert or update on public.operator_commercial_profiles for each row execute function public.guard_commercial_content();
create function public.audit_commercial_profile() returns trigger language plpgsql security definer set search_path=public as $$ begin
 insert into public.audit_logs(actor_id,action,entity_id,payload) values(auth.uid(),'commercial.'||lower(tg_op),new.public_id,
 jsonb_build_object('before',case when tg_op='UPDATE' then to_jsonb(old) end,'after',to_jsonb(new)));
 return new;
end $$;
create trigger commercial_audit after insert or update on public.operator_commercial_profiles for each row execute function public.audit_commercial_profile();

create function public.save_commercial_profile(payload jsonb) returns uuid language plpgsql security definer set search_path=public as $$
declare actor uuid:=auth.uid(); result uuid; begin
 if actor is null or public.current_user_role()<>'operator' then raise exception 'Cuenta de operador requerida'; end if;
 if exists(select 1 from jsonb_object_keys(payload) k where k not in ('trade_name','logo_url','description','city','province','country','modes','specialties','coverage','categories','experience_years','published')) then raise exception 'Campo comercial no editable'; end if;
 insert into public.operator_commercial_profiles(operator_id,trade_name,logo_url,description,city,province,country,modes,specialties,coverage,categories,experience_years,published)
 values(actor,trim(payload->>'trade_name'),nullif(trim(payload->>'logo_url'),''),coalesce(payload->>'description',''),nullif(payload->>'city',''),nullif(payload->>'province',''),nullif(payload->>'country',''),
 array(select jsonb_array_elements_text(coalesce(payload->'modes','[]'))),array(select jsonb_array_elements_text(coalesce(payload->'specialties','[]'))),
 array(select jsonb_array_elements_text(coalesce(payload->'coverage','[]'))),array(select jsonb_array_elements_text(coalesce(payload->'categories','[]'))),nullif(payload->>'experience_years','')::int,coalesce((payload->>'published')::boolean,false))
 on conflict(operator_id) do update set trade_name=excluded.trade_name,logo_url=excluded.logo_url,description=excluded.description,city=excluded.city,province=excluded.province,country=excluded.country,
 modes=excluded.modes,specialties=excluded.specialties,coverage=excluded.coverage,categories=excluded.categories,experience_years=excluded.experience_years,published=excluded.published
 returning public_id into result;
 return result;
end $$;
create function public.moderate_commercial_profile(target uuid,payload jsonb) returns void language plpgsql security definer set search_path=public as $$ begin
 if auth.uid() is null or public.current_user_role()<>'admin' then raise exception 'Acceso administrativo requerido'; end if;
 if exists(select 1 from jsonb_object_keys(payload) k where k not in ('admin_hidden','trade_name','description','logo_url')) then raise exception 'Campo de moderación inválido'; end if;
 update public.operator_commercial_profiles set admin_hidden=coalesce((payload->>'admin_hidden')::boolean,admin_hidden),trade_name=coalesce(payload->>'trade_name',trade_name),description=coalesce(payload->>'description',description),
 logo_url=case when payload ? 'logo_url' then nullif(payload->>'logo_url','') else logo_url end where public_id=target;
 if not found then raise exception 'Perfil no disponible'; end if;
end $$;

create function public.commercial_directory(search_name text default '',mode_filter text default '',specialty_filter text default '',coverage_filter text default '',target_public_id uuid default null)
returns setof jsonb language sql stable security definer set search_path=public as $$
 select jsonb_build_object('id',c.public_id,'trade_name',c.trade_name,'logo_url',c.logo_url,'description',c.description,'city',c.city,'province',c.province,'country',c.country,
 'modes',c.modes,'specialties',c.specialties,'coverage',c.coverage,'categories',c.categories,'experience_years',c.experience_years,'verification_status',p.verification_status,
 'available',p.verification_status='approved' and c.published and not c.admin_hidden,'reputation',public.public_reputation(c.operator_id,'operator'))
 from public.operator_commercial_profiles c join public.operator_profiles p on p.user_id=c.operator_id
 where auth.uid() is not null and
 ((p.verification_status='approved' and c.published and not c.admin_hidden) or
 (target_public_id is not null and (c.operator_id=auth.uid() or public.current_user_role()='admin' or exists(
 select 1 from public.operations o where o.operator_id=c.operator_id and o.importer_id=auth.uid()))))
 and (target_public_id is null or c.public_id=target_public_id)
 and (coalesce(search_name,'')='' or strpos(lower(c.trade_name),lower(search_name))>0)
 and (coalesce(mode_filter,'')='' or mode_filter=any(c.modes))
 and (coalesce(specialty_filter,'')='' or exists(select 1 from unnest(c.specialties) s where strpos(lower(s),lower(specialty_filter))>0))
 and (coalesce(coverage_filter,'')='' or exists(select 1 from unnest(c.coverage) s where strpos(lower(s),lower(coverage_filter))>0))
 order by lower(c.trade_name),c.public_id limit 100
$$;
revoke all on function public.guard_commercial_content(),public.audit_commercial_profile(),public.save_commercial_profile(jsonb),public.moderate_commercial_profile(uuid,jsonb),public.commercial_directory(text,text,text,text,uuid) from public;
grant execute on function public.save_commercial_profile(jsonb),public.moderate_commercial_profile(uuid,jsonb),public.commercial_directory(text,text,text,text,uuid) to authenticated;

-- A past operation authorizes operational contact, not wholesale access to legal records.
drop policy "profiles related only" on public.profiles;
create policy "account owner and admin read" on public.profiles for select to authenticated using(id=auth.uid() or public.current_user_role()='admin');
drop policy "operator profiles related only" on public.operator_profiles;
create policy "legal owner and admin read" on public.operator_profiles for select to authenticated using(user_id=auth.uid() or public.current_user_role()='admin');
create function public.operation_contacts(target_operation uuid) returns jsonb language sql stable security definer set search_path=public as $$
 select jsonb_build_object('phone',p.phone) from public.operations o join public.profiles p
 on p.id=case when o.importer_id=auth.uid() then o.operator_id else o.importer_id end
 where o.id=target_operation and auth.uid() is not null and (o.importer_id=auth.uid() or (o.operator_id=auth.uid() and public.operator_approved()) or public.current_user_role()='admin')
$$;
revoke all on function public.operation_contacts(uuid) from public;
grant execute on function public.operation_contacts(uuid) to authenticated;
