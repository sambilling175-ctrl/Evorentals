create extension if not exists btree_gist with schema extensions;

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  booking_number text not null,
  customer_id uuid not null references public.customers(id),
  bike_id uuid not null references public.bikes(id),
  pricing_plan_id uuid not null references public.pricing_plans(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  estimated_km numeric(10,2) not null default 0,
  status text not null default 'pending',
  pricing_snapshot jsonb not null,
  total_amount numeric(12,2) not null,
  notes text,
  confirmed_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  booking_period tstzrange generated always as (tstzrange(starts_at, ends_at, '[)')) stored,
  constraint bookings_number_format_check check (booking_number ~ '^BKG-[0-9]{8}-[A-Z0-9]{6}$'),
  constraint bookings_dates_check check (ends_at > starts_at),
  constraint bookings_status_check check (status in ('pending','confirmed','cancelled','converted')),
  constraint bookings_amounts_check check (estimated_km >= 0 and total_amount >= 0),
  constraint bookings_snapshot_object_check check (jsonb_typeof(pricing_snapshot) = 'object'),
  constraint bookings_company_number_key unique (company_id, booking_number),
  constraint bookings_no_vehicle_overlap exclude using gist
    (company_id with =, bike_id with =, booking_period with &&)
    where (status in ('pending','confirmed') and deleted_at is null)
);

create index bookings_company_status_idx on public.bookings(company_id,status,starts_at) where deleted_at is null;
create index bookings_customer_idx on public.bookings(customer_id) where deleted_at is null;
create index bookings_created_by_idx on public.bookings(created_by) where created_by is not null;
create index bookings_updated_by_idx on public.bookings(updated_by) where updated_by is not null;

alter table public.bookings enable row level security;
create policy bookings_read_own_company on public.bookings for select to authenticated using (company_id=(select private.current_company_id()) and deleted_at is null);
create policy bookings_insert_own_company on public.bookings for insert to authenticated with check (company_id=(select private.current_company_id()));
create policy bookings_update_own_company on public.bookings for update to authenticated using (company_id=(select private.current_company_id())) with check (company_id=(select private.current_company_id()));
create policy bookings_delete_own_company on public.bookings for delete to authenticated using (company_id=(select private.current_company_id()));

create function private.protect_booking_pricing_snapshot() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.pricing_snapshot is distinct from old.pricing_snapshot
     or new.total_amount is distinct from old.total_amount
     or new.pricing_plan_id is distinct from old.pricing_plan_id then
    raise exception 'Confirmed booking pricing is immutable';
  end if;
  return new;
end; $$;
create trigger protect_booking_pricing before update on public.bookings
for each row execute function private.protect_booking_pricing_snapshot();
