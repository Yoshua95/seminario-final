insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 10485760, array['application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "related users view documents" on public.documents;
create policy "related users view documents"
  on public.documents for select to authenticated using (
    public.current_user_role() = 'admin'
    or uploaded_by = auth.uid()
    or (operation_id is not null and public.is_operation_participant(operation_id))
    or exists (
      select 1 from public.cargo_requests c
      where c.id = cargo_id
        and (
          c.importer_id = auth.uid()
          or (
            kind = 'msds'
            and c.status = 'open'
            and exists (
              select 1 from public.operator_profiles op
              where op.user_id = auth.uid() and op.verification_status = 'approved'
            )
          )
        )
    )
  );

drop policy if exists "authenticated users upload documents" on public.documents;
create policy "related users upload documents"
  on public.documents for insert to authenticated with check (
    uploaded_by = auth.uid()
    and (
      exists (
        select 1 from public.cargo_requests c
        where c.id = cargo_id and c.importer_id = auth.uid()
      )
      or (operation_id is not null and public.is_operation_participant(operation_id))
    )
  );

create policy "users upload own document objects"
  on storage.objects for insert to authenticated with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "related users read document objects"
  on storage.objects for select to authenticated using (
    bucket_id = 'documents'
    and exists (
      select 1 from public.documents d
      where d.storage_path = name
    )
  );

create policy "users remove own document objects"
  on storage.objects for delete to authenticated using (
    bucket_id = 'documents'
    and owner_id = auth.uid()::text
  );

drop policy if exists "approved operators create offers" on public.offers;
create policy "approved operators create offers"
  on public.offers for insert to authenticated with check (
    operator_id = auth.uid()
    and exists (
      select 1 from public.operator_profiles op
      where op.user_id = auth.uid() and op.verification_status = 'approved'
    )
    and exists (
      select 1 from public.cargo_requests c
      where c.id = cargo_id
        and c.status = 'open'
        and (c.bidding_deadline is null or c.bidding_deadline > now())
    )
  );
