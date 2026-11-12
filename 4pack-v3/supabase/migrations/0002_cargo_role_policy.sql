drop policy if exists "importer manages own cargo" on public.cargo_requests;

create policy "importers manage own cargo"
  on public.cargo_requests for all to authenticated
  using (
    (importer_id = auth.uid() and public.current_user_role() = 'importer')
    or public.current_user_role() = 'admin'
  )
  with check (
    (importer_id = auth.uid() and public.current_user_role() = 'importer')
    or public.current_user_role() = 'admin'
  );
