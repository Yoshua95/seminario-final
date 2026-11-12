-- Datos reproducibles para la demo académica de 4PACK.
-- Todos los usuarios usan la contraseña local: Demo4pack!2026

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'importador@4pack.demo',
    crypt('Demo4pack!2026', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Yoshua Importaciones"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '20000000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    'operador@4pack.demo',
    crypt('Demo4pack!2026', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Arbox Logistics"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '30000000-0000-0000-0000-000000000003',
    'authenticated',
    'authenticated',
    'admin@4pack.demo',
    crypt('Demo4pack!2026', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Administración 4PACK"}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  )
on conflict (id) do nothing;

insert into public.profiles (id, role, full_name)
values
  ('10000000-0000-0000-0000-000000000001', 'importer', 'Yoshua Importaciones'),
  ('20000000-0000-0000-0000-000000000002', 'operator', 'Arbox Logistics'),
  ('30000000-0000-0000-0000-000000000003', 'admin', 'Administración 4PACK')
on conflict (id) do nothing;

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
  '20000000-0000-0000-0000-000000000002',
  'Arbox Logistics',
  '30-71234567-8',
  'Operador especializado en consolidación aérea China–Argentina.',
  'approved',
  4.8,
  37,
  now(),
  '30000000-0000-0000-0000-000000000003'
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
    '10000000-0000-0000-0000-000000000001',
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
    '10000000-0000-0000-0000-000000000001',
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
  '20000000-0000-0000-0000-000000000002',
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
  '10000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000002',
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
  '30000000-0000-0000-0000-000000000003',
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
    '10000000-0000-0000-0000-000000000001',
    '2026-11-13T10:00:00-03:00'
  ),
  (
    '81000000-0000-0000-0000-000000000002',
    '61000000-0000-0000-0000-000000000001',
    'in_transit',
    'Carga recibida en origen',
    'El operador consolidó la carga para su salida aérea.',
    'Guangzhou, China',
    '20000000-0000-0000-0000-000000000002',
    '2026-11-14T09:30:00+08:00'
  )
on conflict (id) do nothing;
