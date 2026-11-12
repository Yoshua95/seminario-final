alter table public.documents
  add constraint documents_single_target
  check (num_nonnulls(cargo_id, operation_id) = 1) not valid;

alter table public.documents validate constraint documents_single_target;

drop policy if exists "related users upload documents" on public.documents;
create policy "related users upload documents"
  on public.documents for insert to authenticated with check (
    uploaded_by = auth.uid()
    and num_nonnulls(cargo_id, operation_id) = 1
    and (
      public.current_user_role() = 'admin'
      or exists (
        select 1 from public.cargo_requests c
        where c.id = cargo_id and c.importer_id = auth.uid()
      )
      or (operation_id is not null and public.is_operation_participant(operation_id))
    )
  );

drop policy if exists "participants create one rating" on public.ratings;
create policy "participants rate completed counterpart"
  on public.ratings for insert to authenticated with check (
    author_id = auth.uid()
    and exists (
      select 1
      from public.operations o
      where o.id = operation_id
        and o.status = 'delivered'
        and (
          (o.importer_id = auth.uid() and recipient_id = o.operator_id)
          or (o.operator_id = auth.uid() and recipient_id = o.importer_id)
        )
    )
  );

create or replace function public.refresh_operator_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user uuid := coalesce(new.recipient_id, old.recipient_id);
begin
  update public.operator_profiles
  set rating = coalesce((
    select round(avg(r.score)::numeric, 1)
    from public.ratings r
    where r.recipient_id = target_user
  ), 0)
  where user_id = target_user;

  return coalesce(new, old);
end;
$$;

drop trigger if exists ratings_refresh_operator_rating on public.ratings;
create trigger ratings_refresh_operator_rating
after insert or update or delete on public.ratings
for each row execute function public.refresh_operator_rating();

revoke all on function public.refresh_operator_rating() from public;
