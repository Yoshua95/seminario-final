-- Additive operator model. Existing mobile columns and enum values are preserved.
alter table public.operator_profiles add column if not exists trade_name text not null default '';
alter table public.operator_profiles add column if not exists address text not null default '';
alter table public.operator_profiles add column if not exists modes text[] not null default '{}';
alter table public.operator_profiles add column if not exists routes text not null default '';
alter table public.operator_profiles add column if not exists certifications text not null default '';
alter table public.operator_profiles add column if not exists rejection_reason text;
alter table public.cargo_requests add column if not exists public_code text;
alter table public.cargo_requests add column if not exists packages integer not null default 1 check (packages > 0);
alter table public.cargo_requests add column if not exists units_description text not null default '';
alter table public.cargo_requests add column if not exists required_documents text[] not null default '{}';
alter table public.cargo_requests add column if not exists restrictions text not null default '';
alter table public.offers add column if not exists documentation_terms text not null default '';
alter table public.offers add column if not exists payment_currency text not null default 'USD' check (payment_currency in ('USD','ARS','USD/ARS'));
alter table public.offers add column if not exists review_started_at timestamptz;
-- The serialized offer trigger enforces one active offer across modalities.
-- Historical rejected/expired proposals must not prevent a later eligible proposal.
alter table public.offers drop constraint if exists offers_cargo_id_operator_id_mode_key;
alter table public.operations add column if not exists phase text;
update public.operations set phase = case status when 'delivered' then 'completed' when 'in_transit' then 'in_transit' when 'customs' then 'customs' when 'cancelled' then 'cancelled' else 'payment_pending' end where phase is null;
alter table public.operations alter column phase set default 'payment_pending';
alter table public.operations alter column phase set not null;
do $$ begin
  if not exists (select 1 from pg_constraint where conname='operations_valid_phase') then
    alter table public.operations add constraint operations_valid_phase check (phase in ('awarded','payment_pending','payment_secured','received_at_origin','in_transit','customs','ready_for_delivery','delivered','completed','disputed','cancelled'));
  end if;
end $$;
alter table public.tracking_events add column if not exists event_type text not null default 'Actualización';
alter table public.tracking_events add column if not exists occurred_at timestamptz not null default now();
alter table public.tracking_events add column if not exists attachment_id uuid;
alter table public.documents add column if not exists operator_id uuid references public.operator_profiles(user_id);
alter table public.documents add column if not exists document_type text not null default 'Otro';
alter table public.documents add column if not exists validation_status text not null default 'pending' check (validation_status in ('pending','approved','rejected'));
alter table public.documents add column if not exists rejection_reason text;
alter table public.documents add column if not exists size_bytes bigint not null default 0;
alter table public.documents add column if not exists replaces_id uuid references public.documents(id);
alter table public.documents drop constraint if exists documents_single_target;
-- Replace the anonymous original check allowing cargo OR operation targets.
do $$ declare c record; begin
  for c in select conname from pg_constraint where conrelid='public.documents'::regclass and contype='c' and pg_get_constraintdef(oid) like '%cargo_id%' loop
    execute format('alter table public.documents drop constraint %I',c.conname);
  end loop;
end $$;
alter table public.documents add constraint documents_single_target check (num_nonnulls(cargo_id,operation_id,operator_id)=1);
update storage.buckets set allowed_mime_types=array['application/pdf','image/jpeg','image/png'],file_size_limit=10485760 where id='documents';

create table if not exists public.wallet_movements (
 id uuid primary key default gen_random_uuid(), operator_id uuid not null references public.profiles(id),
 operation_id uuid references public.operations(id), kind text not null check (kind in ('release','withdrawal','refund')),
 amount numeric(12,2) not null check (amount<>0), currency text not null default 'USD' check(currency in ('USD','ARS')),
 description text not null, event_key text not null unique, created_at timestamptz not null default now()
);
create table if not exists public.withdrawal_requests (
 id uuid primary key default gen_random_uuid(), operator_id uuid not null references public.profiles(id),
 amount numeric(12,2) not null check(amount>0),currency text not null default 'USD' check(currency in ('USD','ARS')),
 status text not null default 'requested' check(status in ('requested','approved','rejected')),created_at timestamptz not null default now()
);
create table if not exists public.support_tickets (
 id uuid primary key default gen_random_uuid(),operator_id uuid not null references public.profiles(id),
 operation_id uuid references public.operations(id),subject text not null check(char_length(subject) between 5 and 150),
 category text not null,priority text not null default 'normal' check(priority in ('normal','high','urgent')),
 status text not null default 'open' check(status in ('open','in_progress','waiting_user','resolved','closed')),
 created_at timestamptz not null default now()
);
create table if not exists public.support_messages (
 id uuid primary key default gen_random_uuid(),ticket_id uuid not null references public.support_tickets(id),
 sender_id uuid not null references public.profiles(id),body text not null check(char_length(trim(body)) between 1 and 2000),created_at timestamptz not null default now()
);
-- Operation ID is already the unique conversation identifier; do not duplicate it.
create table if not exists public.conversation_reads (
 operation_id uuid not null references public.operations(id),user_id uuid not null references public.profiles(id),
 read_at timestamptz not null default now(),primary key(operation_id,user_id)
);
create table if not exists public.audit_logs (
 id uuid primary key default gen_random_uuid(),actor_id uuid references public.profiles(id),action text not null,
 entity_id uuid,payload jsonb not null default '{}',created_at timestamptz not null default now()
);
create index if not exists wallet_operator_idx on public.wallet_movements(operator_id,created_at);
create index if not exists support_operator_idx on public.support_tickets(operator_id,created_at);
create index if not exists support_messages_ticket_idx on public.support_messages(ticket_id,created_at);
create index if not exists messages_operation_idx on public.messages(operation_id,created_at);
create index if not exists tracking_operation_idx on public.tracking_events(operation_id,occurred_at);

alter table public.wallet_movements enable row level security;
alter table public.withdrawal_requests enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;
alter table public.conversation_reads enable row level security;
alter table public.audit_logs enable row level security;
grant select on public.wallet_movements,public.withdrawal_requests,public.support_tickets,public.support_messages,public.audit_logs to authenticated;
grant select,insert,update on public.conversation_reads to authenticated;
drop policy if exists "wallet owner reads" on public.wallet_movements;
create policy "wallet owner reads" on public.wallet_movements for select to authenticated using(operator_id=auth.uid() or public.current_user_role()='admin');
drop policy if exists "withdrawal owner reads" on public.withdrawal_requests;
create policy "withdrawal owner reads" on public.withdrawal_requests for select to authenticated using(operator_id=auth.uid() or public.current_user_role()='admin');
drop policy if exists "ticket owner reads" on public.support_tickets;
create policy "ticket owner reads" on public.support_tickets for select to authenticated using(operator_id=auth.uid() or public.current_user_role()='admin');
drop policy if exists "ticket messages related" on public.support_messages;
create policy "ticket messages related" on public.support_messages for select to authenticated using(exists(select 1 from public.support_tickets t where t.id=ticket_id));
drop policy if exists "own conversation reads" on public.conversation_reads;
create policy "own conversation reads" on public.conversation_reads for all to authenticated using(user_id=auth.uid() and public.is_operation_participant(operation_id)) with check(user_id=auth.uid() and public.is_operation_participant(operation_id));
drop policy if exists "admins audit" on public.audit_logs;
create policy "admins audit" on public.audit_logs for select to authenticated using(public.current_user_role()='admin');

do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='messages') then alter publication supabase_realtime add table public.messages; end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='tracking_events') then alter publication supabase_realtime add table public.tracking_events; end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='support_messages') then alter publication supabase_realtime add table public.support_messages; end if;
 end if;
end $$;
