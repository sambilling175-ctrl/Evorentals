-- Keep RLS helpers outside the exposed API schema and cover tenant foreign keys.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.current_company_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.company_id from public.profiles p
  where p.id = (select auth.uid()) and p.status = 'active' and p.deleted_at is null
$$;

create or replace function private.current_branch_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.branch_id from public.profiles p
  where p.id = (select auth.uid()) and p.status = 'active' and p.deleted_at is null
$$;

create or replace function private.is_company_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(p.role in ('admin', 'super_admin'), false)
  from public.profiles p
  where p.id = (select auth.uid()) and p.status = 'active' and p.deleted_at is null
$$;

revoke all on function private.current_company_id() from public, anon;
revoke all on function private.current_branch_id() from public, anon;
revoke all on function private.is_company_admin() from public, anon;
grant execute on function private.current_company_id() to authenticated;
grant execute on function private.current_branch_id() to authenticated;
grant execute on function private.is_company_admin() to authenticated;

do $$
declare policy_record record;
begin
  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('companies', 'company_settings', 'branches', 'profiles', 'customers', 'bikes', 'rentals')
  loop
    execute format('drop policy if exists %I on %I.%I',
      policy_record.policyname, policy_record.schemaname, policy_record.tablename);
  end loop;
end
$$;

create policy companies_read_own on public.companies for select to authenticated
using (id = (select private.current_company_id()));
create policy companies_admin_update_own on public.companies for update to authenticated
using (id = (select private.current_company_id()) and (select private.is_company_admin()))
with check (id = (select private.current_company_id()) and (select private.is_company_admin()));

create policy company_settings_read_own on public.company_settings for select to authenticated
using (company_id = (select private.current_company_id()));
create policy company_settings_admin_write_own on public.company_settings for all to authenticated
using (company_id = (select private.current_company_id()) and (select private.is_company_admin()))
with check (company_id = (select private.current_company_id()) and (select private.is_company_admin()));

create policy branches_read_own_company on public.branches for select to authenticated
using (company_id = (select private.current_company_id()) and deleted_at is null);
create policy branches_admin_write_own_company on public.branches for all to authenticated
using (company_id = (select private.current_company_id()) and (select private.is_company_admin()))
with check (company_id = (select private.current_company_id()) and (select private.is_company_admin()));

create policy profiles_read_own_company on public.profiles for select to authenticated
using (company_id = (select private.current_company_id()) and deleted_at is null);
create policy profiles_update_self_or_admin on public.profiles for update to authenticated
using (company_id = (select private.current_company_id()) and (id = (select auth.uid()) or (select private.is_company_admin())))
with check (company_id = (select private.current_company_id()) and (id = (select auth.uid()) or (select private.is_company_admin())));
create policy profiles_admin_insert on public.profiles for insert to authenticated
with check (company_id = (select private.current_company_id()) and (select private.is_company_admin()));

create policy customers_read_own_company on public.customers for select to authenticated
using (company_id = (select private.current_company_id()) and (branch_id is null or branch_id = (select private.current_branch_id()) or (select private.is_company_admin())) and deleted_at is null);
create policy customers_write_own_scope on public.customers for all to authenticated
using (company_id = (select private.current_company_id()) and (branch_id is null or branch_id = (select private.current_branch_id()) or (select private.is_company_admin())))
with check (company_id = (select private.current_company_id()) and (branch_id is null or branch_id = (select private.current_branch_id()) or (select private.is_company_admin())));

create policy bikes_read_own_company on public.bikes for select to authenticated
using (company_id = (select private.current_company_id()) and (branch_id is null or branch_id = (select private.current_branch_id()) or (select private.is_company_admin())) and deleted_at is null);
create policy bikes_write_own_scope on public.bikes for all to authenticated
using (company_id = (select private.current_company_id()) and (branch_id is null or branch_id = (select private.current_branch_id()) or (select private.is_company_admin())))
with check (company_id = (select private.current_company_id()) and (branch_id is null or branch_id = (select private.current_branch_id()) or (select private.is_company_admin())));

create policy rentals_read_own_company on public.rentals for select to authenticated
using (company_id = (select private.current_company_id()) and (branch_id is null or branch_id = (select private.current_branch_id()) or (select private.is_company_admin())) and deleted_at is null);
create policy rentals_write_own_scope on public.rentals for all to authenticated
using (company_id = (select private.current_company_id()) and (branch_id is null or branch_id = (select private.current_branch_id()) or (select private.is_company_admin())))
with check (company_id = (select private.current_company_id()) and (branch_id is null or branch_id = (select private.current_branch_id()) or (select private.is_company_admin())));

drop function public.current_company_id();
drop function public.current_branch_id();
drop function public.is_company_admin();

create index if not exists company_settings_company_id_idx on public.company_settings(company_id);
create index if not exists profiles_branch_id_idx on public.profiles(branch_id);
create index if not exists customers_branch_id_idx on public.customers(branch_id);
create index if not exists bikes_branch_id_idx on public.bikes(branch_id);
create index if not exists rentals_branch_id_idx on public.rentals(branch_id);
