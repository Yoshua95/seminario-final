drop policy if exists "participants manage tracking" on public.tracking_events;
create policy "participants view tracking"
  on public.tracking_events for select to authenticated
  using (public.is_operation_participant(operation_id));

create policy "admins manage tracking"
  on public.tracking_events for all to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

create or replace function public.simulate_guarantee(target_operation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_importer_id uuid;
begin
  select importer_id into target_importer_id
  from public.operations
  where id = target_operation_id
  for update;

  if not found or target_importer_id <> auth.uid() then
    raise exception 'La operación no pertenece al importador';
  end if;

  update public.payment_guarantees
  set status = 'held_simulated', verified_by = auth.uid(), verified_at = now()
  where operation_id = target_operation_id and status = 'pending';

  if not found then
    raise exception 'La garantía no está pendiente';
  end if;
end;
$$;

create or replace function public.advance_operation(target_operation_id uuid, next_status public.cargo_status, event_title text, event_location text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_operation public.operations%rowtype;
begin
  select * into current_operation
  from public.operations
  where id = target_operation_id
  for update;

  if not found or current_operation.operator_id <> auth.uid() then
    raise exception 'La operación no pertenece al operador';
  end if;

  if not exists (
    select 1 from public.payment_guarantees
    where operation_id = target_operation_id and status = 'held_simulated'
  ) then
    raise exception 'La garantía simulada no está confirmada';
  end if;

  if not (
    (current_operation.status = 'awarded' and next_status = 'in_transit')
    or (current_operation.status = 'in_transit' and next_status = 'customs')
    or (current_operation.status = 'customs' and next_status = 'delivered')
  ) then
    raise exception 'Transición de estado inválida';
  end if;

  update public.operations
  set status = next_status, completed_at = case when next_status = 'delivered' then now() else completed_at end
  where id = target_operation_id;

  update public.cargo_requests
  set status = next_status
  where id = current_operation.cargo_id;

  insert into public.tracking_events (operation_id, status, title, location, created_by)
  values (target_operation_id, next_status, event_title, nullif(event_location, ''), auth.uid());

  if next_status = 'delivered' then
    update public.payment_guarantees
    set status = 'released_simulated'
    where operation_id = target_operation_id;

    update public.operator_profiles
    set completed_operations = completed_operations + 1
    where user_id = current_operation.operator_id;
  end if;
end;
$$;

revoke all on function public.simulate_guarantee(uuid) from public;
revoke all on function public.advance_operation(uuid, public.cargo_status, text, text) from public;
grant execute on function public.simulate_guarantee(uuid) to authenticated;
grant execute on function public.advance_operation(uuid, public.cargo_status, text, text) to authenticated;
