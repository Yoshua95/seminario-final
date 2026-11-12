drop policy if exists "participants manage messages" on public.messages;

create policy "participants view messages"
  on public.messages for select to authenticated
  using (public.is_operation_participant(operation_id));

create policy "participants send messages"
  on public.messages for insert to authenticated
  with check (
    public.is_operation_participant(operation_id)
    and sender_id = auth.uid()
  );

create policy "admins remove messages"
  on public.messages for delete to authenticated
  using (public.current_user_role() = 'admin');
