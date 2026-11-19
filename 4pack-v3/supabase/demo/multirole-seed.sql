-- FICTIONAL local-only rehearsal account. No approval or economic limits by default.
insert into auth.users(id,email,raw_user_meta_data) values
 ('a0000000-0000-0000-0000-000000000007','operador.multirrol@4pack.demo','{"full_name":"Operador multirrol ficticio"}') on conflict(id) do nothing;
update public.profiles set role='operator' where id='a0000000-0000-0000-0000-000000000007' and role<>'operator';
insert into public.operator_profiles(user_id,company_name,tax_id,verification_status,trade_name,modes)
 values('a0000000-0000-0000-0000-000000000007','Operador multirrol ficticio','30-75678901-2','pending','Ensayo Logistics',array['air','sea']) on conflict(user_id) do nothing;
insert into public.operator_commercial_profiles(operator_id,public_id,trade_name,description,modes,published)
 values('a0000000-0000-0000-0000-000000000007','e2000000-0000-0000-0000-000000000007','Ensayo Logistics','Cuenta ficticia para el circuito multirrol local.',array['air','sea'],true) on conflict(operator_id) do nothing;
