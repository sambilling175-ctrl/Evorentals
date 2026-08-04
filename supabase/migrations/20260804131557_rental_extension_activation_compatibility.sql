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
  select p.company_id, p.role into v_company_id, v_role
  from public.profiles p
  where p.id = v_user_id and p.status = 'active' and p.deleted_at is null;
  if v_company_id is null then raise exception 'Active employee profile required'; end if;
  if v_role not in ('admin','super_admin') and not exists (
    select 1 from public.roles r where r.company_id = v_company_id and r.name = v_role
      and r.deleted_at is null
      and coalesce(r.permissions -> 'Rentals', '[]'::jsonb) ?| array['Create','Edit','Manage']
  ) then raise exception 'You do not have permission to activate rentals'; end if;

  select * into v_booking from public.bookings b
  where b.id = p_booking_id and b.company_id = v_company_id and b.deleted_at is null
  for update;
  if not found then raise exception 'Booking not found'; end if;
  if v_booking.status <> 'confirmed' then raise exception 'Only confirmed bookings can be activated'; end if;
  if p_started_at < v_booking.starts_at or p_started_at >= v_booking.ends_at then
    raise exception 'Rental start must fall within the confirmed booking period';
  end if;

  select * into v_bike from public.bikes b
  where b.id = v_booking.bike_id and b.company_id = v_company_id and b.deleted_at is null
  for update;
  if not found then raise exception 'Vehicle not found'; end if;
  if v_bike.status <> 'available' then raise exception 'Vehicle is not operationally available'; end if;
  if p_start_odometer < coalesce(v_bike.current_odometer, 0) then
    raise exception 'Start odometer cannot be below the vehicle odometer';
  end if;
  if exists (
    select 1 from public.rentals r where r.company_id = v_company_id
      and r.bike_id = v_booking.bike_id and r.status in ('active','overdue')
      and r.deleted_at is null
  ) then raise exception 'Vehicle already has an open rental'; end if;

  v_rental_id := gen_random_uuid();
  v_rental_number := 'RNT-' || to_char(timezone('Asia/Kolkata', now()), 'YYYYMMDD') || '-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  insert into public.rentals(
    id, company_id, booking_id, rental_number, bike_id, customer_id,
    started_at, planned_end_at, start_odometer, status, pricing_snapshot,
    contract_amount, extension_amount, total_amount, created_by, updated_by
  ) values (
    v_rental_id, v_company_id, v_booking.id, v_rental_number,
    v_booking.bike_id, v_booking.customer_id, p_started_at, v_booking.ends_at,
    p_start_odometer, 'active', v_booking.pricing_snapshot,
    v_booking.total_amount, 0, v_booking.total_amount, v_user_id, v_user_id
  );
  update public.bookings set status = 'converted', updated_by = v_user_id,
    updated_at = timezone('utc', now()) where id = v_booking.id;
  update public.bikes set current_odometer = p_start_odometer, updated_by = v_user_id,
    updated_at = timezone('utc', now()) where id = v_booking.bike_id;
  return query select v_rental_id, v_rental_number;
end;
$$;

revoke all on function public.activate_confirmed_booking(uuid,timestamptz,integer) from public, anon;
grant execute on function public.activate_confirmed_booking(uuid,timestamptz,integer) to authenticated;
