-- Datos reproducibles para la demo académica de 4PACK.
-- Las cuentas deben crearse previamente con Supabase Auth.

create temporary table demo_users as
select auth_users.id, demo.email, demo.role::public.user_role, demo.full_name
from (
  values
    ('importador@4pack.demo', 'importer', 'Yoshua Importaciones'),
    ('operador@4pack.demo', 'operator', 'Arbox Logistics'),
    ('admin@4pack.demo', 'admin', 'Administración 4PACK')
) as demo(email, role, full_name)
join auth.users auth_users on auth_users.email = demo.email;

do $$
begin
  if (select count(*) from demo_users) <> 3 then
    raise exception 'Faltan cuentas demo en Supabase Auth';
  end if;
end;
$$;

insert into public.profiles (id, role, full_name)
select id, role, full_name from demo_users
on conflict (id) do update
set role = excluded.role,
    full_name = excluded.full_name;

insert into public.operator_profiles (
  user_id,
  company_name,
  tax_id,
  description,
  verification_status,
  rating,
  completed_operations,
  verified_at,
  verified_by
)
values (
  (select id from demo_users where role = 'operator'),
  'Arbox Logistics',
  '30-71234567-8',
  'Operador especializado en consolidación aérea China–Argentina.',
  'approved',
  4.8,
  37,
  now(),
  (select id from demo_users where role = 'admin')
)
on conflict (user_id) do nothing;

insert into public.cargo_requests (
  id,
  importer_id,
  title,
  description,
  origin,
  destination,
  category,
  weight_kg,
  volume_m3,
  fob_usd,
  preferred_mode,
  status,
  hazmat_review_required,
  msds_required,
  bidding_deadline,
  created_at
)
values
  (
    '41000000-0000-0000-0000-000000000001',
    (select id from demo_users where role = 'importer'),
    'Marroquinería — Guangzhou',
    'Bolsos y accesorios terminados, carga general.',
    'Guangzhou, China',
    'CABA, Argentina',
    'Marroquinería',
    18.4,
    0.310,
    1280,
    'air',
    'awarded',
    false,
    false,
    '2026-11-15T18:00:00-03:00',
    '2026-11-12T18:00:00-03:00'
  ),
  (
    '41000000-0000-0000-0000-000000000002',
    (select id from demo_users where role = 'importer'),
    'Accesorios electrónicos — Shenzhen',
    'Accesorios con baterías de litio incluidas.',
    'Shenzhen, China',
    'Rosario, Argentina',
    'Electrónica',
    12.8,
    0.180,
    940,
    'consolidated',
    'open',
    true,
    true,
    '2026-11-18T18:00:00-03:00',
    '2026-11-12T19:30:00-03:00'
  )
on conflict (id) do nothing;

insert into public.offers (
  id,
  cargo_id,
  operator_id,
  mode,
  freight_usd,
  customs_usd,
  other_costs_usd,
  estimated_days,
  includes_customs,
  terms,
  valid_until,
  status
)
values (
  '51000000-0000-0000-0000-000000000001',
  '41000000-0000-0000-0000-000000000001',
  (select id from demo_users where role = 'operator'),
  'air',
  420,
  110,
  35,
  12,
  true,
  'Retiro en depósito de Guangzhou y entrega en CABA.',
  '2026-11-16T18:00:00-03:00',
  'accepted'
)
on conflict (id) do nothing;

insert into public.operations (
  id,
  cargo_id,
  accepted_offer_id,
  importer_id,
  operator_id,
  status,
  awarded_at
)
values (
  '61000000-0000-0000-0000-000000000001',
  '41000000-0000-0000-0000-000000000001',
  '51000000-0000-0000-0000-000000000001',
  (select id from demo_users where role = 'importer'),
  (select id from demo_users where role = 'operator'),
  'in_transit',
  '2026-11-13T10:00:00-03:00'
)
on conflict (id) do nothing;

insert into public.payment_guarantees (
  id,
  operation_id,
  amount_usd,
  commission_usd,
  status,
  verified_by,
  verified_at
)
values (
  '71000000-0000-0000-0000-000000000001',
  '61000000-0000-0000-0000-000000000001',
  565,
  14.13,
  'held_simulated',
  (select id from demo_users where role = 'admin'),
  '2026-11-13T12:00:00-03:00'
)
on conflict (id) do nothing;

insert into public.tracking_events (
  id,
  operation_id,
  status,
  title,
  description,
  location,
  created_by,
  created_at
)
values
  (
    '81000000-0000-0000-0000-000000000001',
    '61000000-0000-0000-0000-000000000001',
    'awarded',
    'Oferta adjudicada',
    'El importador seleccionó la propuesta de Arbox Logistics.',
    'CABA, Argentina',
    (select id from demo_users where role = 'importer'),
    '2026-11-13T10:00:00-03:00'
  ),
  (
    '81000000-0000-0000-0000-000000000002',
    '61000000-0000-0000-0000-000000000001',
    'in_transit',
    'Carga recibida en origen',
    'El operador consolidó la carga para su salida aérea.',
    'Guangzhou, China',
    (select id from demo_users where role = 'operator'),
    '2026-11-14T09:30:00+08:00'
  )
on conflict (id) do nothing;
