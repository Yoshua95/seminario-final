-- LOCAL TEST/DEMO ONLY. Supabase provides these schemas in real installations.
create schema if not exists auth;
create schema if not exists storage;
create role authenticated nologin;
create role anon nologin;
do $$ begin if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if; end $$;
grant usage on schema auth,storage to authenticated;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create table auth.users(id uuid primary key,email text unique,raw_user_meta_data jsonb not null default '{}');
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,owner_id text,metadata jsonb,user_metadata jsonb);
alter table storage.objects enable row level security;
grant select,insert,delete on storage.objects to authenticated;
create function storage.foldername(name text) returns text[] language sql immutable as $$select string_to_array(name,'/')$$;
