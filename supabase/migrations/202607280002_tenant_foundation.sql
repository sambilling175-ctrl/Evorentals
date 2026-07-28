-- Day 2: introduce company/branch tenancy without replacing the live legacy schema.
-- Existing records are assigned to the existing company and branch.

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.companies (id, name, slug)
select cs.id, cs.company_name, 'evo-rentals'
from public.company_settings cs
where not exists (select 1 from public.companies)
limit 1;

insert into public.companies (name, slug)
select 'Evo Rentals', 'evo-rentals'
where not exists (select 1 from public.companies);

alter table public.company_settings add column if not exists company_id uuid references public.companies(id);
alter table public.branches add column if not exists company_id uuid references public.companies(id);
alter table public.profiles add column if not exists company_id uuid references public.companies(id);
alter table public.profiles add column if not exists branch_id uuid references public.branches(id);
alter table public.customers add column if not exists company_id uuid references public.companies(id);
alter table public.customers add column if not exists branch_id uuid references public.branches(id);
alter table public.bikes add column if not exists company_id uuid references public.companies(id);
alter table public.bikes add column if not exists branch_id uuid references public.branches(id);
alter table public.rentals add column if not exists company_id uuid references public.companies(id);
alter table public.rentals add column if not exists branch_id uuid references public.branches(id);

update public.company_settings
set company_id = coalesce(company_id, (select id from public.companies order by created_at limit 1))
where company_id is null;

update public.branches
set company_id = coalesce(company_id, (select id from public.companies order by created_at limit 1))
where company_id is null;

update public.profiles
set company_id = coalesce(company_id, (select id from public.companies order by created_at limit 1)),
    branch_id = coalesce(branch_id, (select id from public.branches where deleted_at is null order by created_at limit 1))
where company_id is null or branch_id is null;

update public.customers
set company_id = coalesce(company_id, (select id from public.companies order by created_at limit 1)),
    branch_id = coalesce(branch_id, (select id from public.branches where deleted_at is null order by created_at limit 1))
where company_id is null or branch_id is null;

update public.bikes
set company_id = coalesce(company_id, (select id from public.companies order by created_at limit 1)),
    branch_id = coalesce(branch_id, (select id from public.branches where deleted_at is null order by created_at limit 1))
where company_id is null or branch_id is null;

update public.rentals r
set company_id = coalesce(r.company_id, c.company_id, b.company_id),
    branch_id = coalesce(r.branch_id, b.branch_id, c.branch_id)
from public.customers c, public.bikes b
where r.customer_id = c.id and r.bike_id = b.id
  and (r.company_id is null or r.branch_id is null);

alter table public.company_settings alter column company_id set not null;
alter table public.branches alter column company_id set not null;
alter table public.profiles alter column company_id set not null;
alter table public.customers alter column company_id set not null;
alter table public.bikes alter column company_id set not null;
alter table public.rentals alter column company_id set not null;

create index if not exists profiles_company_branch_idx on public.profiles(company_id, branch_id);
create index if not exists branches_company_idx on public.branches(company_id);
create index if not exists customers_company_branch_idx on public.customers(company_id, branch_id);
create index if not exists bikes_company_branch_idx on public.bikes(company_id, branch_id);
create index if not exists rentals_company_branch_idx on public.rentals(company_id, branch_id);

create or replace function public.current_company_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.company_id from public.profiles p
  where p.id = (select auth.uid()) and p.status = 'active' and p.deleted_at is null
$$;

create or replace function public.current_branch_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.branch_id from public.profiles p
  where p.id = (select auth.uid()) and p.status = 'active' and p.deleted_at is null
$$;

create or replace function public.is_company_admin()
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

revoke all on function public.current_company_id() from public;
revoke all on function public.current_branch_id() from public;
revoke all on function public.is_company_admin() from public;
grant execute on function public.current_company_id() to authenticated;
grant execute on function public.current_branch_id() to authenticated;
grant execute on function public.is_company_admin() to authenticated;

alter table public.companies enable row level security;
alter table public.company_settings enable row level security;
alter table public.branches enable row level security;
alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.bikes enable row level security;
alter table public.rentals enable row level security;

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

create policy companies_read_own on public.companies
for select to authenticated
using (id = (select public.current_company_id()));

create policy companies_admin_update_own on public.companies
for update to authenticated
using (id = (select public.current_company_id()) and (select public.is_company_admin()))
with check (id = (select public.current_company_id()) and (select public.is_company_admin()));

create policy company_settings_read_own on public.company_settings
for select to authenticated
using (company_id = (select public.current_company_id()));

create policy company_settings_admin_write_own on public.company_settings
for all to authenticated
using (company_id = (select public.current_company_id()) and (select public.is_company_admin()))
with check (company_id = (select public.current_company_id()) and (select public.is_company_admin()));

create policy branches_read_own_company on public.branches
for select to authenticated
using (company_id = (select public.current_company_id()) and deleted_at is null);

create policy branches_admin_write_own_company on public.branches
for all to authenticated
using (company_id = (select public.current_company_id()) and (select public.is_company_admin()))
with check (company_id = (select public.current_company_id()) and (select public.is_company_admin()));

create policy profiles_read_own_company on public.profiles
for select to authenticated
using (company_id = (select public.current_company_id()) and deleted_at is null);

create policy profiles_update_self_or_admin on public.profiles
for update to authenticated
using (
  company_id = (select public.current_company_id())
  and (id = (select auth.uid()) or (select public.is_company_admin()))
)
with check (
  company_id = (select public.current_company_id())
  and (id = (select auth.uid()) or (select public.is_company_admin()))
);

create policy profiles_admin_insert on public.profiles
for insert to authenticated
with check (company_id = (select public.current_company_id()) and (select public.is_company_admin()));

create policy customers_read_own_company on public.customers
for select to authenticated
using (
  company_id = (select public.current_company_id())
  and (branch_id is null or branch_id = (select public.current_branch_id()) or (select public.is_company_admin()))
  and deleted_at is null
);

create policy customers_write_own_scope on public.customers
for all to authenticated
using (
  company_id = (select public.current_company_id())
  and (branch_id is null or branch_id = (select public.current_branch_id()) or (select public.is_company_admin()))
)
with check (
  company_id = (select public.current_company_id())
  and (branch_id is null or branch_id = (select public.current_branch_id()) or (select public.is_company_admin()))
);

create policy bikes_read_own_company on public.bikes
for select to authenticated
using (
  company_id = (select public.current_company_id())
  and (branch_id is null or branch_id = (select public.current_branch_id()) or (select public.is_company_admin()))
  and deleted_at is null
);

create policy bikes_write_own_scope on public.bikes
for all to authenticated
using (
  company_id = (select public.current_company_id())
  and (branch_id is null or branch_id = (select public.current_branch_id()) or (select public.is_company_admin()))
)
with check (
  company_id = (select public.current_company_id())
  and (branch_id is null or branch_id = (select public.current_branch_id()) or (select public.is_company_admin()))
);

create policy rentals_read_own_company on public.rentals
for select to authenticated
using (
  company_id = (select public.current_company_id())
  and (branch_id is null or branch_id = (select public.current_branch_id()) or (select public.is_company_admin()))
  and deleted_at is null
);

create policy rentals_write_own_scope on public.rentals
for all to authenticated
using (
  company_id = (select public.current_company_id())
  and (branch_id is null or branch_id = (select public.current_branch_id()) or (select public.is_company_admin()))
)
with check (
  company_id = (select public.current_company_id())
  and (branch_id is null or branch_id = (select public.current_branch_id()) or (select public.is_company_admin()))
);
