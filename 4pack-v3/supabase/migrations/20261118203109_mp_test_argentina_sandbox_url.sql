-- Add the observed Argentina sandbox format; do not replay or modify 0024.
begin;
create or replace function public.save_mp_test_preference(actor uuid,target uuid,preference text,checkout text) returns void
language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from public.operations where id=target and importer_id=actor and payment_mode='mercado_pago_test') then raise exception 'Operacion no autorizada'; end if;
 if checkout is null or preference is null or length(preference)<1 or not (
   checkout ~ '^https://sandbox\.mercadopago\.com/mla/checkout/[^[:space:]]+$'
   or checkout ~ '^https://sandbox\.mercadopago\.com\.ar/checkout/v1/redirect(\?[^[:space:]#]*)?$'
 ) then raise exception 'Checkout de prueba invalido'; end if;
 update public.mp_test_checkouts set preference_id=preference,checkout_url=checkout,preference_state='ready'
 where operation_id=target and preference_state='creating';
 if not found and not exists(select 1 from public.mp_test_checkouts where operation_id=target and preference_id=preference and checkout_url=checkout) then raise exception 'Preferencia incompatible'; end if;
end $$;
-- CREATE OR REPLACE retains existing grants; explicitly keep this service-only.
revoke all on function public.save_mp_test_preference(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.save_mp_test_preference(uuid,uuid,text,text) to service_role;
commit;
