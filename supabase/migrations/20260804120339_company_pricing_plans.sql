create table public.pricing_plans (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  vehicle_category text,
  billing_unit text not null,
  base_rate numeric(12,2) not null,
  included_km numeric(10,2) not null default 0,
  extra_km_rate numeric(10,2) not null default 0,
  deposit_amount numeric(12,2) not null default 0,
  minimum_days integer not null default 1,
  maximum_days integer,
  tax_inclusive boolean not null default false,
  status text not null default 'active',
  effective_from date not null default current_date,
  effective_to date,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  constraint pricing_plans_code_format_check check (code ~ '^[A-Z0-9_-]{2,24}$'),
  constraint pricing_plans_billing_unit_check check (billing_unit in ('day', 'week', 'month')),
  constraint pricing_plans_status_check check (status in ('active', 'inactive')),
  constraint pricing_plans_amounts_check check (base_rate >= 0 and included_km >= 0 and extra_km_rate >= 0 and deposit_amount >= 0),
  constraint pricing_plans_duration_check check (minimum_days >= 1 and (maximum_days is null or maximum_days >= minimum_days)),
  constraint pricing_plans_dates_check check (effective_to is null or effective_to >= effective_from)
);

create unique index pricing_plans_company_code_key
  on public.pricing_plans (company_id, upper(code)) where deleted_at is null;
create index pricing_plans_company_status_idx
  on public.pricing_plans (company_id, status, effective_from) where deleted_at is null;
create index pricing_plans_created_by_idx on public.pricing_plans (created_by) where created_by is not null;
create index pricing_plans_updated_by_idx on public.pricing_plans (updated_by) where updated_by is not null;

alter table public.pricing_plans enable row level security;

create policy pricing_plans_read_own_company on public.pricing_plans
  for select to authenticated
  using (company_id = (select private.current_company_id()) and deleted_at is null);
create policy pricing_plans_insert_own_company on public.pricing_plans
  for insert to authenticated
  with check (company_id = (select private.current_company_id()));
create policy pricing_plans_update_own_company on public.pricing_plans
  for update to authenticated
  using (company_id = (select private.current_company_id()))
  with check (company_id = (select private.current_company_id()));
create policy pricing_plans_delete_own_company on public.pricing_plans
  for delete to authenticated
  using (company_id = (select private.current_company_id()));
