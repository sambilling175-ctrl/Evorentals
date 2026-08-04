alter table public.rentals
  add column if not exists booking_id uuid references public.bookings(id),
  add column if not exists rental_number text,
  add column if not exists planned_end_at timestamptz,
  add column if not exists start_odometer integer,
  add column if not exists pricing_snapshot jsonb;

alter table public.rentals
  add constraint rentals_number_format_check
    check (rental_number is null or rental_number ~ '^RNT-[0-9]{8}-[A-Z0-9]{6}$'),
  add constraint rentals_dates_check
    check (planned_end_at is null or planned_end_at > started_at),
  add constraint rentals_start_odometer_check
    check (start_odometer is null or start_odometer >= 0),
  add constraint rentals_snapshot_object_check
    check (pricing_snapshot is null or jsonb_typeof(pricing_snapshot) = 'object');

create unique index rentals_company_number_key
  on public.rentals(company_id, rental_number)
  where rental_number is not null;
create unique index rentals_booking_key
  on public.rentals(booking_id)
  where booking_id is not null and deleted_at is null;
create unique index rentals_one_open_per_vehicle
  on public.rentals(company_id, bike_id)
  where status in ('active','overdue') and deleted_at is null;
create index rentals_company_status_end_idx
  on public.rentals(company_id, status, planned_end_at)
  where deleted_at is null;
create index rentals_customer_idx
  on public.rentals(customer_id)
  where deleted_at is null;

create or replace function private.protect_rental_contract_facts()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.booking_id is distinct from old.booking_id
     or new.rental_number is distinct from old.rental_number
     or new.customer_id is distinct from old.customer_id
     or new.bike_id is distinct from old.bike_id
     or new.started_at is distinct from old.started_at
     or new.start_odometer is distinct from old.start_odometer
     or new.pricing_snapshot is distinct from old.pricing_snapshot
     or new.total_amount is distinct from old.total_amount then
    raise exception 'Rental contract facts are immutable';
  end if;
  return new;
end;
$$;

create trigger protect_rental_contract_facts
before update on public.rentals
for each row execute function private.protect_rental_contract_facts();

create or replace function public.activate_confirmed_booking(
  p_booking_id uuid,
  p_started_at timestamptz,
  p_start_odometer integer
)
returns table(rental_id uuid, rental_number text)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_company_id uuid;
  v_role text;
  v_booking public.bookings%rowtype;
  v_bike public.bikes%rowtype;
  v_rental_id uuid;
  v_rental_number text;
begin
  select p.company_id, p.role
    into v_company_id, v_role
  from public.profiles p
  where p.id = v_user_id and p.status = 'active' and p.deleted_at is null;

  if v_company_id is null then
    raise exception 'Active employee profile required';
  end if;

  if v_role not in ('admin','super_admin') and not exists (
    select 1 from public.roles r
    where r.company_id = v_company_id
      and r.name = v_role
      and r.deleted_at is null
      and coalesce(r.permissions -> 'Rentals', '[]'::jsonb) ?| array['Create','Edit','Manage']
  ) then
    raise exception 'You do not have permission to activate rentals';
  end if;

  select * into v_booking
  from public.bookings b
  where b.id = p_booking_id
    and b.company_id = v_company_id
    and b.deleted_at is null
  for update;

  if not found then raise exception 'Booking not found'; end if;
  if v_booking.status <> 'confirmed' then
    raise exception 'Only confirmed bookings can be activated';
  end if;
  if p_started_at < v_booking.starts_at or p_started_at >= v_booking.ends_at then
    raise exception 'Rental start must fall within the confirmed booking period';
  end if;

  select * into v_bike
  from public.bikes b
  where b.id = v_booking.bike_id
    and b.company_id = v_company_id
    and b.deleted_at is null
  for update;

  if not found then raise exception 'Vehicle not found'; end if;
  if v_bike.status <> 'available' then raise exception 'Vehicle is not operationally available'; end if;
  if p_start_odometer < coalesce(v_bike.current_odometer, 0) then
    raise exception 'Start odometer cannot be below the vehicle odometer';
  end if;
  if exists (
    select 1 from public.rentals r
    where r.company_id = v_company_id and r.bike_id = v_booking.bike_id
      and r.status in ('active','overdue') and r.deleted_at is null
  ) then raise exception 'Vehicle already has an open rental'; end if;

  v_rental_id := gen_random_uuid();
  v_rental_number := 'RNT-' || to_char(timezone('Asia/Kolkata', now()), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  insert into public.rentals(
    id, company_id, booking_id, rental_number, bike_id, customer_id,
    started_at, planned_end_at, start_odometer, status, pricing_snapshot,
    total_amount, created_by, updated_by
  ) values (
    v_rental_id, v_company_id, v_booking.id, v_rental_number,
    v_booking.bike_id, v_booking.customer_id, p_started_at, v_booking.ends_at,
    p_start_odometer, 'active', v_booking.pricing_snapshot,
    v_booking.total_amount, v_user_id, v_user_id
  );

  update public.bookings
  set status = 'converted', updated_by = v_user_id,
      updated_at = timezone('utc', now())
  where id = v_booking.id;

  update public.bikes
  set current_odometer = p_start_odometer, updated_by = v_user_id,
      updated_at = timezone('utc', now())
  where id = v_booking.bike_id;

  return query select v_rental_id, v_rental_number;
end;
$$;

revoke all on function public.activate_confirmed_booking(uuid,timestamptz,integer) from public, anon;
grant execute on function public.activate_confirmed_booking(uuid,timestamptz,integer) to authenticated;
grant select, insert, update on public.rentals to authenticated;
