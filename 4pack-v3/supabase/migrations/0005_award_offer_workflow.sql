drop policy if exists "operator updates own submitted offers" on public.offers;
create policy "operator updates own active offers"
  on public.offers for update to authenticated
  using (operator_id = auth.uid() and status = 'submitted')
  with check (operator_id = auth.uid() and status in ('submitted', 'withdrawn'));

create policy "admins manage offers"
  on public.offers for all to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

create or replace function public.award_offer(target_offer_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_offer public.offers%rowtype;
  selected_cargo public.cargo_requests%rowtype;
  created_operation_id uuid;
  commission_rate_value numeric(5,4) := 0.025;
begin
  select * into selected_offer
  from public.offers
  where id = target_offer_id
  for update;

  if not found or selected_offer.status <> 'submitted' then
    raise exception 'La oferta no está disponible';
  end if;

  select * into selected_cargo
  from public.cargo_requests
  where id = selected_offer.cargo_id
  for update;

  if selected_cargo.importer_id <> auth.uid() or selected_cargo.status <> 'open' then
    raise exception 'La carga no puede adjudicarse';
  end if;

  update public.offers
  set status = case when id = target_offer_id then 'accepted'::public.offer_status else 'rejected'::public.offer_status end
  where cargo_id = selected_cargo.id and status = 'submitted';

  update public.cargo_requests
  set status = 'awarded'
  where id = selected_cargo.id;

  insert into public.operations (cargo_id, accepted_offer_id, importer_id, operator_id, commission_rate)
  values (selected_cargo.id, selected_offer.id, selected_cargo.importer_id, selected_offer.operator_id, commission_rate_value)
  returning id into created_operation_id;

  insert into public.payment_guarantees (operation_id, amount_usd, commission_usd, status)
  values (created_operation_id, selected_offer.total_usd, round(selected_offer.total_usd * commission_rate_value, 2), 'pending');

  insert into public.tracking_events (operation_id, status, title, description, created_by)
  values (created_operation_id, 'awarded', 'Oferta adjudicada', 'La operación fue creada y espera la garantía de pago simulada.', auth.uid());

  return created_operation_id;
end;
$$;

revoke all on function public.award_offer(uuid) from public;
grant execute on function public.award_offer(uuid) to authenticated;
