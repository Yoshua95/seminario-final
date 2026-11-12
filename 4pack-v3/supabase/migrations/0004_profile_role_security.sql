drop policy if exists "users update own profile" on public.profiles;
create policy "users update own safe profile fields"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = public.current_user_role());

create or replace function public.current_operator_verification_status()
returns public.verification_status
language sql
stable
security definer
set search_path = public
as $$
  select verification_status from public.operator_profiles where user_id = auth.uid()
$$;

revoke all on function public.current_operator_verification_status() from public;
grant execute on function public.current_operator_verification_status() to authenticated;

drop policy if exists "operator manages own pending profile" on public.operator_profiles;
create policy "operators create own pending profile"
  on public.operator_profiles for insert to authenticated
  with check (user_id = auth.uid() and verification_status = 'pending');

create policy "operators update own profile without changing status"
  on public.operator_profiles for update to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and verification_status = public.current_operator_verification_status()
  );

create policy "admins manage operator verification"
  on public.operator_profiles for all to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');
