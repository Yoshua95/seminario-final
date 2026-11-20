-- Explicit ownership/participation, independent of indirect support_tickets RLS.
-- Safe to apply both after the historical baseline and on an existing schema.
drop policy if exists "ticket messages related" on public.support_messages;
create policy "ticket messages related" on public.support_messages
for select to authenticated
using (
  (select auth.uid()) is not null
  and exists (
    select 1 from public.support_tickets t
    where t.id = support_messages.ticket_id
      and (
        public.current_user_role() = 'admin'
        or t.operator_id = (select auth.uid())
        or (t.operation_id is not null and public.is_operation_participant(t.operation_id))
      )
  )
);
