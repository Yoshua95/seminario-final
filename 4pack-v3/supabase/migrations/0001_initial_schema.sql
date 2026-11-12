-- 4PACK v3 — esquema inicial para Supabase/PostgreSQL.
-- Las transacciones financieras son una simulación académica: no representan fondos reales.

create extension if not exists "pgcrypto";

create type public.user_role as enum ('importer', 'operator', 'admin');
create type public.verification_status as enum ('pending', 'approved', 'rejected');
create type public.cargo_status as enum ('draft', 'open', 'awarded', 'in_transit', 'customs', 'delivered', 'cancelled');
create type public.transport_mode as enum ('air', 'sea', 'consolidated');
create type public.offer_status as enum ('submitted', 'accepted', 'rejected', 'expired', 'withdrawn');
create type public.guarantee_status as enum ('pending', 'proof_uploaded', 'verified', 'held_simulated', 'released_simulated', 'rejected');
create type public.document_kind as enum ('invoice', 'packing_list', 'msds', 'payment_proof', 'operator_credential', 'other');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'importer',
  full_name text not null,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.operator_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  company_name text not null,
  tax_id text not null,
  description text,
  verification_status public.verification_status not null default 'pending',
  rating numeric(2,1) not null default 0 check (rating between 0 and 5),
  completed_operations integer not null default 0 check (completed_operations >= 0),
  verified_at timestamptz,
  verified_by uuid references public.profiles(id)
);

create table public.cargo_requests (
  id uuid primary key default gen_random_uuid(),
  importer_id uuid not null references public.profiles(id),
  title text not null,
  description text not null,
  origin text not null,
  destination text not null,
  category text not null,
  weight_kg numeric(10,2) not null check (weight_kg > 0),
  volume_m3 numeric(10,3) not null check (volume_m3 > 0),
  fob_usd numeric(12,2) not null check (fob_usd >= 0),
  preferred_mode public.transport_mode,
  status public.cargo_status not null default 'draft',
  hazmat_review_required boolean not null default false,
  msds_required boolean not null default false,
  bidding_deadline timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  cargo_id uuid not null references public.cargo_requests(id) on delete cascade,
  operator_id uuid not null references public.profiles(id),
  mode public.transport_mode not null,
  freight_usd numeric(12,2) not null check (freight_usd >= 0),
  customs_usd numeric(12,2) not null default 0 check (customs_usd >= 0),
  other_costs_usd numeric(12,2) not null default 0 check (other_costs_usd >= 0),
  total_usd numeric(12,2) generated always as (freight_usd + customs_usd + other_costs_usd) stored,
  estimated_days integer not null check (estimated_days > 0),
  includes_customs boolean not null default false,
  terms text not null,
  valid_until timestamptz not null,
  status public.offer_status not null default 'submitted',
  created_at timestamptz not null default now(),
  unique (cargo_id, operator_id, mode)
);

create table public.operations (
  id uuid primary key default gen_random_uuid(),
  cargo_id uuid not null unique references public.cargo_requests(id),
  accepted_offer_id uuid not null unique references public.offers(id),
  importer_id uuid not null references public.profiles(id),
  operator_id uuid not null references public.profiles(id),
  status public.cargo_status not null default 'awarded',
  commission_rate numeric(5,4) not null default 0.025 check (commission_rate between 0 and 1),
  awarded_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.payment_guarantees (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null unique references public.operations(id) on delete cascade,
  amount_usd numeric(12,2) not null check (amount_usd >= 0),
  commission_usd numeric(12,2) not null check (commission_usd >= 0),
  status public.guarantee_status not null default 'pending',
  proof_path text,
  verified_by uuid references public.profiles(id),
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.tracking_events (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null references public.operations(id) on delete cascade,
  status public.cargo_status not null,
  title text not null,
  description text,
  location text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null references public.operations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  body text not null check (char_length(body) between 1 and 2000),
  contains_blocked_contact boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  cargo_id uuid references public.cargo_requests(id) on delete cascade,
  operation_id uuid references public.operations(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id),
  kind public.document_kind not null,
  storage_path text not null,
  original_name text not null,
  mime_type text not null,
  created_at timestamptz not null default now(),
  check (cargo_id is not null or operation_id is not null)
);

create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null references public.operations(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  recipient_id uuid not null references public.profiles(id),
  score integer not null check (score between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (operation_id, author_id),
  check (author_id <> recipient_id)
);

create index cargo_requests_status_idx on public.cargo_requests(status, created_at desc);
create index offers_cargo_idx on public.offers(cargo_id, status);
create index operations_participants_idx on public.operations(importer_id, operator_id, status);
create index tracking_events_operation_idx on public.tracking_events(operation_id, created_at);
create index messages_operation_idx on public.messages(operation_id, created_at);

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$ select role from public.profiles where id = auth.uid() $$;

create or replace function public.is_operation_participant(target_operation uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.operations
    where id = target_operation
      and (importer_id = auth.uid() or operator_id = auth.uid())
  ) or public.current_user_role() = 'admin';
$$;

alter table public.profiles enable row level security;
alter table public.operator_profiles enable row level security;
alter table public.cargo_requests enable row level security;
alter table public.offers enable row level security;
alter table public.operations enable row level security;
alter table public.payment_guarantees enable row level security;
alter table public.tracking_events enable row level security;
alter table public.messages enable row level security;
alter table public.documents enable row level security;
alter table public.ratings enable row level security;

create policy "profiles visible to authenticated users"
  on public.profiles for select to authenticated using (true);
create policy "users update own profile"
  on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "operator profiles visible to authenticated users"
  on public.operator_profiles for select to authenticated using (true);
create policy "operator manages own pending profile"
  on public.operator_profiles for all to authenticated
  using (user_id = auth.uid() or public.current_user_role() = 'admin')
  with check (user_id = auth.uid() or public.current_user_role() = 'admin');

create policy "open cargo visible to authenticated users"
  on public.cargo_requests for select to authenticated
  using (status <> 'draft' or importer_id = auth.uid() or public.current_user_role() = 'admin');
create policy "importer manages own cargo"
  on public.cargo_requests for all to authenticated
  using (importer_id = auth.uid() or public.current_user_role() = 'admin')
  with check (importer_id = auth.uid() or public.current_user_role() = 'admin');

create policy "offers visible to owner and cargo importer"
  on public.offers for select to authenticated using (
    operator_id = auth.uid()
    or exists (select 1 from public.cargo_requests c where c.id = cargo_id and c.importer_id = auth.uid())
    or public.current_user_role() = 'admin'
  );
create policy "approved operators create offers"
  on public.offers for insert to authenticated with check (
    operator_id = auth.uid()
    and exists (
      select 1 from public.operator_profiles op
      where op.user_id = auth.uid() and op.verification_status = 'approved'
    )
  );
create policy "operator updates own submitted offers"
  on public.offers for update to authenticated
  using (operator_id = auth.uid() or public.current_user_role() = 'admin');

create policy "participants view operations"
  on public.operations for select to authenticated
  using (public.is_operation_participant(id));
create policy "admin manages operations"
  on public.operations for all to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

create policy "participants view guarantees"
  on public.payment_guarantees for select to authenticated
  using (public.is_operation_participant(operation_id));
create policy "admin manages guarantee state"
  on public.payment_guarantees for all to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

create policy "participants manage tracking"
  on public.tracking_events for all to authenticated
  using (public.is_operation_participant(operation_id))
  with check (public.is_operation_participant(operation_id));
create policy "participants manage messages"
  on public.messages for all to authenticated
  using (public.is_operation_participant(operation_id))
  with check (public.is_operation_participant(operation_id) and sender_id = auth.uid());
create policy "related users view documents"
  on public.documents for select to authenticated using (
    public.current_user_role() = 'admin'
    or (operation_id is not null and public.is_operation_participant(operation_id))
    or exists (select 1 from public.cargo_requests c where c.id = cargo_id and c.importer_id = auth.uid())
  );
create policy "authenticated users upload documents"
  on public.documents for insert to authenticated with check (uploaded_by = auth.uid());
create policy "operation participants view ratings"
  on public.ratings for select to authenticated using (public.is_operation_participant(operation_id));
create policy "participants create one rating"
  on public.ratings for insert to authenticated
  with check (author_id = auth.uid() and public.is_operation_participant(operation_id));

