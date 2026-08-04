-- D7-01: Fleet directory on the legacy public.bikes table.
-- Adds the vehicle master fields used by the live directory and the
-- register/edit vehicle forms, drops legacy demo geo defaults, and indexes
-- the company/status scan used by the directory and dashboard counts.

alter table public.bikes
  add column if not exists registration_number text,
  add column if not exists manufacturer text,
  add column if not exists variant text,
  add column if not exists color text,
  add column if not exists category text,
  add column if not exists vin_number text,
  add column if not exists manufacturing_year smallint,
  add column if not exists purchase_date date,
  add column if not exists current_odometer integer not null default 0,
  add column if not exists notes text;

-- Legacy demo defaults (San Francisco coordinates) must not apply to new vehicles.
alter table public.bikes
  alter column location_lat drop default,
  alter column location_lng drop default;

-- Availability is derived from active rentals. Keep only the base operational
-- state on bikes and reconcile the legacy stored `rented` state before the
-- constraint is replaced.
update public.bikes
set status = 'available',
    updated_at = timezone('utc'::text, now())
where status = 'rented';

alter table public.bikes
  drop constraint if exists bikes_status_check,
  drop constraint if exists bikes_manufacturing_year_check,
  drop constraint if exists bikes_current_odometer_check,
  add constraint bikes_status_check
    check (status = any (array['available'::text, 'reserved'::text, 'maintenance'::text, 'retired'::text])),
  add constraint bikes_manufacturing_year_check
    check (manufacturing_year is null or manufacturing_year between 2000 and 2100),
  add constraint bikes_current_odometer_check
    check (current_odometer >= 0);

create index if not exists bikes_company_status_idx
  on public.bikes (company_id, status)
  where deleted_at is null;

create unique index if not exists bikes_registration_number_key
  on public.bikes (upper(registration_number))
  where registration_number is not null and deleted_at is null;

create unique index if not exists bikes_vin_number_key
  on public.bikes (upper(vin_number))
  where vin_number is not null and deleted_at is null;
