-- Core rental lifecycle. Depends on companies, branches, profiles, vehicles,
-- and pricing_plans defined in docs/02_Database_Design.
create extension if not exists btree_gist;

create type public.kyc_status as enum ('pending', 'verified', 'rejected', 'expired');
create type public.booking_status as enum ('draft', 'pending', 'confirmed', 'cancelled', 'converted');
create type public.rental_status as enum ('draft', 'confirmed', 'active', 'extended', 'returned', 'settled', 'closed', 'cancelled');
create type public.payment_status as enum ('pending', 'partially_paid', 'paid', 'refunded', 'failed');

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  branch_id uuid references public.branches(id),
  public_id text not null,
  full_name text not null,
  phone text not null,
  email text,
  kyc_status public.kyc_status not null default 'pending',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, public_id),
  unique (company_id, phone)
);

create table public.customer_documents (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  document_type text not null,
  document_number text,
  storage_path text not null,
  expires_on date,
  status public.kyc_status not null default 'pending',
  verified_by uuid references public.profiles(id),
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  branch_id uuid not null references public.branches(id),
  public_id text not null,
  customer_id uuid not null references public.customers(id),
  vehicle_id uuid references public.vehicles(id),
  pricing_plan_id uuid references public.pricing_plans(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.booking_status not null default 'draft',
  quoted_amount numeric(12,2) not null check (quoted_amount >= 0),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  unique (company_id, public_id)
);

alter table public.bookings add constraint bookings_vehicle_no_overlap
exclude using gist (
  vehicle_id with =,
  tstzrange(starts_at, ends_at, '[)') with &&
) where (vehicle_id is not null and status in ('confirmed', 'converted'));

create table public.rental_contracts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  branch_id uuid not null references public.branches(id),
  public_id text not null,
  booking_id uuid unique references public.bookings(id),
  customer_id uuid not null references public.customers(id),
  vehicle_id uuid not null references public.vehicles(id),
  status public.rental_status not null default 'draft',
  starts_at timestamptz not null,
  planned_ends_at timestamptz not null,
  returned_at timestamptz,
  start_odometer integer,
  return_odometer integer,
  deposit_amount numeric(12,2) not null default 0,
  final_amount numeric(12,2),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (planned_ends_at > starts_at),
  unique (company_id, public_id)
);

create table public.rental_pricing_snapshots (
  id uuid primary key default gen_random_uuid(),
  rental_id uuid not null unique references public.rental_contracts(id) on delete cascade,
  currency char(3) not null default 'INR',
  base_amount numeric(12,2) not null,
  deposit_amount numeric(12,2) not null default 0,
  included_distance integer,
  extra_distance_rate numeric(12,2),
  late_fee_rule jsonb not null default '{}'::jsonb,
  line_items jsonb not null default '[]'::jsonb,
  total_amount numeric(12,2) not null,
  created_at timestamptz not null default now()
);

create table public.rental_events (
  id bigint generated always as identity primary key,
  rental_id uuid not null references public.rental_contracts(id) on delete cascade,
  event_type text not null,
  from_status public.rental_status,
  to_status public.rental_status,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  actor_id uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.rental_inspections (
  id uuid primary key default gen_random_uuid(),
  rental_id uuid not null references public.rental_contracts(id) on delete cascade,
  inspection_type text not null check (inspection_type in ('checkout', 'return')),
  odometer integer not null,
  battery_percent integer check (battery_percent between 0 and 100),
  damage_notes text,
  photo_paths text[] not null default '{}',
  inspected_by uuid references public.profiles(id),
  inspected_at timestamptz not null default now()
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  rental_id uuid not null references public.rental_contracts(id),
  public_id text not null,
  status public.payment_status not null default 'pending',
  total_amount numeric(12,2) not null,
  due_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (company_id, public_id)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  branch_id uuid not null references public.branches(id),
  rental_id uuid references public.rental_contracts(id),
  public_id text not null,
  payment_kind text not null check (payment_kind in ('deposit', 'rental', 'penalty', 'damage', 'refund')),
  status public.payment_status not null default 'pending',
  method text not null,
  amount numeric(12,2) not null check (amount > 0),
  reference text,
  received_by uuid references public.profiles(id),
  received_at timestamptz,
  created_at timestamptz not null default now(),
  unique (company_id, public_id)
);

create table public.payment_allocations (
  payment_id uuid not null references public.payments(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  primary key (payment_id, invoice_id)
);

create index customers_company_branch_idx on public.customers(company_id, branch_id);
create index bookings_company_period_idx on public.bookings(company_id, starts_at, ends_at);
create index rentals_company_status_idx on public.rental_contracts(company_id, status);
create index invoices_company_due_idx on public.invoices(company_id, due_at) where status <> 'paid';
create index rental_events_rental_created_idx on public.rental_events(rental_id, created_at);

alter table public.customers enable row level security;
alter table public.customer_documents enable row level security;
alter table public.bookings enable row level security;
alter table public.rental_contracts enable row level security;
alter table public.rental_pricing_snapshots enable row level security;
alter table public.rental_events enable row level security;
alter table public.rental_inspections enable row level security;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;
alter table public.payment_allocations enable row level security;

-- Add tenant policies after the project authentication migration exposes
-- current_company_id() and permitted_branch_ids().
