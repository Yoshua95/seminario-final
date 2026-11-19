begin;
-- Explicit payment intent: never silently award a legacy-simulated contract
-- behind a button promising checkout. Defaults and historical modes stay intact.
create function public.award_offer_for_test_checkout(target_offer_id uuid) returns uuid
language plpgsql security definer set search_path=public as $$
declare result uuid;begin
 if auth.uid() is null or public.current_user_role()<>'importer' then raise exception 'Acceso de importador requerido';end if;
 perform public.lock_capital_market();
 if not exists(select 1 from public.mp_test_settings where singleton and enabled) then raise exception 'Checkout de prueba desactivado; la oferta no fue adjudicada';end if;
 result:=public.award_offer(target_offer_id);
 if not exists(select 1 from public.operations where id=result and importer_id=auth.uid() and contract_currency='ARS' and payment_mode='mercado_pago_test') then raise exception 'La operacion no admite checkout de prueba; conserva su modo historico';end if;
 return result;
end $$;
revoke all on function public.award_offer_for_test_checkout(uuid) from public,anon;
grant execute on function public.award_offer_for_test_checkout(uuid) to authenticated;
commit;
