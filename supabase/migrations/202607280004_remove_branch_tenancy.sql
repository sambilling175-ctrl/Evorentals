-- Temporarily simplify authorization to company-only tenancy.
-- Keep the branches table for operational metadata, but do not scope records by branch.

do $$
declare policy_record record;
begin
  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('profiles', 'customers', 'bikes', 'rentals')
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
  end loop;
end
$$;

alter table public.profiles drop column if exists branch_id;
alter table public.customers drop column if exists branch_id;
alter table public.bikes drop column if exists branch_id;
alter table public.rentals drop column if exists branch_id;

drop function if exists private.current_branch_id();

create policy profiles_read_own_company on public.profiles
for select to authenticated
using (
  company_id = (select private.current_company_id())
  and deleted_at is null
);

create policy profiles_update_self_or_admin on public.profiles
for update to authenticated
using (
  company_id = (select private.current_company_id())
  and (id = (select auth.uid()) or (select private.is_company_admin()))
)
with check (
  company_id = (select private.current_company_id())
  and (id = (select auth.uid()) or (select private.is_company_admin()))
);

create policy profiles_admin_insert on public.profiles
for insert to authenticated
with check (
  company_id = (select private.current_company_id())
  and (select private.is_company_admin())
);

create policy customers_read_own_company on public.customers
for select to authenticated
using (
  company_id = (select private.current_company_id())
  and deleted_at is null
);

create policy customers_write_own_company on public.customers
for all to authenticated
using (company_id = (select private.current_company_id()))
with check (company_id = (select private.current_company_id()));

create policy bikes_read_own_company on public.bikes
for select to authenticated
using (
  company_id = (select private.current_company_id())
  and deleted_at is null
);

create policy bikes_write_own_company on public.bikes
for all to authenticated
using (company_id = (select private.current_company_id()))
with check (company_id = (select private.current_company_id()));

create policy rentals_read_own_company on public.rentals
for select to authenticated
using (
  company_id = (select private.current_company_id())
  and deleted_at is null
);

create policy rentals_write_own_company on public.rentals
for all to authenticated
using (company_id = (select private.current_company_id()))
with check (company_id = (select private.current_company_id()));
