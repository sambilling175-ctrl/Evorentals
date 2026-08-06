alter table public.rentals
  add column if not exists original_bike_id uuid references public.bikes(id);

update public.rentals set original_bike_id = bike_id where original_bike_id is null;
alter table public.rentals alter column original_bike_id set not null;

create index rentals_original_bike_idx on public.rentals(original_bike_id)
  where deleted_at is null;

create or replace function private.set_rental_original_bike()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.original_bike_id is null then new.original_bike_id := new.bike_id; end if;
  return new;
end;
$$;

create trigger set_rental_original_bike
before insert on public.rentals
for each row execute function private.set_rental_original_bike();

create table public.rental_swaps (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  rental_id uuid not null references public.rentals(id),
  from_bike_id uuid not null references public.bikes(id),
  to_bike_id uuid not null references public.bikes(id),
  swapped_at timestamptz not null,
  from_return_odometer integer not null check (from_return_odometer >= 0),
  to_start_odometer integer not null check (to_start_odometer >= 0),
  returned_vehicle_status text not null check (returned_vehicle_status in ('available','maintenance')),
  reason text not null check (char_length(btrim(reason)) between 3 and 500),
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.profiles(id) on delete set null,
  constraint rental_swaps_different_bikes_check check (from_bike_id <> to_bike_id)
);

alter table public.rental_swaps enable row level security;
revoke all on table public.rental_swaps from public, anon;
grant select, insert on table public.rental_swaps to authenticated;

create policy rental_swaps_select_own_company on public.rental_swaps
  for select to authenticated
  using (company_id = (select private.current_company_id()));
create policy rental_swaps_insert_own_company on public.rental_swaps
  for insert to authenticated
  with check (company_id = (select private.current_company_id()));

create index rental_swaps_rental_time_idx on public.rental_swaps(rental_id, swapped_at desc);
create index rental_swaps_company_time_idx on public.rental_swaps(company_id, swapped_at desc);
create index rental_swaps_from_bike_idx on public.rental_swaps(from_bike_id);
create index rental_swaps_to_bike_idx on public.rental_swaps(to_bike_id);

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
     or new.original_bike_id is distinct from old.original_bike_id
     or new.started_at is distinct from old.started_at
     or new.start_odometer is distinct from old.start_odometer
     or new.pricing_snapshot is distinct from old.pricing_snapshot
     or new.contract_amount is distinct from old.contract_amount then
    raise exception 'Rental contract facts are immutable';
  end if;
  return new;
end;
$$;

create or replace function public.swap_rental_vehicle(
  p_rental_id uuid,
  p_to_bike_id uuid,
  p_swapped_at timestamptz,
  p_from_return_odometer integer,
  p_to_start_odometer integer,
  p_returned_vehicle_status text,
  p_reason text
)
returns table(swap_id uuid, rental_number text, from_bike_id uuid, to_bike_id uuid)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_company_id uuid;
  v_role text;
  v_rental public.rentals%rowtype;
  v_from_bike public.bikes%rowtype;
  v_to_bike public.bikes%rowtype;
  v_swap_id uuid := gen_random_uuid();
  v_last_swap_at timestamptz;
begin
  select p.company_id, p.role into v_company_id, v_role
  from public.profiles p
  where p.id = v_user_id and p.status = 'active' and p.deleted_at is null;
  if v_company_id is null then raise exception 'Active employee profile required'; end if;
  if v_role not in ('admin','super_admin') and not exists (
    select 1 from public.roles r
    where r.company_id = v_company_id and r.name = v_role and r.deleted_at is null
      and coalesce(r.permissions -> 'Rentals', '[]'::jsonb) ?| array['Edit','Manage']
  ) then raise exception 'You do not have permission to swap rental vehicles'; end if;

  select * into v_rental from public.rentals r
  where r.id = p_rental_id and r.company_id = v_company_id and r.deleted_at is null
  for update;
  if not found then raise exception 'Rental not found'; end if;
  if v_rental.status <> 'active' then raise exception 'Only active rentals can swap vehicles; extend an overdue rental first'; end if;
  if p_to_bike_id = v_rental.bike_id then raise exception 'Select a different replacement vehicle'; end if;
  if p_swapped_at < v_rental.started_at or p_swapped_at >= v_rental.planned_end_at then
    raise exception 'Swap time must fall within the open rental period';
  end if;
  if p_swapped_at > now() + interval '15 minutes' then raise exception 'Swap time cannot be in the future'; end if;
  select max(s.swapped_at) into v_last_swap_at from public.rental_swaps s where s.rental_id = v_rental.id;
  if v_last_swap_at is not null and p_swapped_at <= v_last_swap_at then
    raise exception 'Swap time must be after the previous swap';
  end if;
  if p_returned_vehicle_status not in ('available','maintenance') then
    raise exception 'Returned vehicle status must be available or maintenance';
  end if;
  if char_length(btrim(coalesce(p_reason,''))) not between 3 and 500 then
    raise exception 'Swap reason must be between 3 and 500 characters';
  end if;

  perform 1 from public.bookings b
  where b.company_id = v_company_id and b.bike_id = p_to_bike_id
    and b.deleted_at is null and b.status in ('pending','confirmed')
    and b.starts_at < v_rental.planned_end_at and b.ends_at > p_swapped_at
  order by b.id for update;
  if found then raise exception 'Replacement vehicle has a conflicting booking'; end if;

  perform 1 from public.bikes b
  where b.id in (v_rental.bike_id, p_to_bike_id)
    and b.company_id = v_company_id and b.deleted_at is null
  order by b.id for update;

  select * into v_from_bike from public.bikes b
  where b.id = v_rental.bike_id and b.company_id = v_company_id and b.deleted_at is null;
  select * into v_to_bike from public.bikes b
  where b.id = p_to_bike_id and b.company_id = v_company_id and b.deleted_at is null;
  if v_from_bike.id is null then raise exception 'Current rental vehicle not found'; end if;
  if v_to_bike.id is null then raise exception 'Replacement vehicle not found'; end if;
  if v_to_bike.status <> 'available' then raise exception 'Replacement vehicle is not operationally available'; end if;
  if p_from_return_odometer < v_from_bike.current_odometer then
    raise exception 'Return odometer cannot be below the current vehicle odometer';
  end if;
  if p_to_start_odometer < v_to_bike.current_odometer then
    raise exception 'Replacement start odometer cannot be below its current odometer';
  end if;
  if exists (
    select 1 from public.rentals r
    where r.company_id = v_company_id and r.bike_id = p_to_bike_id
      and r.status in ('active','overdue') and r.deleted_at is null
  ) then raise exception 'Replacement vehicle already has an open rental'; end if;

  insert into public.rental_swaps(
    id, company_id, rental_id, from_bike_id, to_bike_id, swapped_at,
    from_return_odometer, to_start_odometer, returned_vehicle_status, reason, created_by
  ) values (
    v_swap_id, v_company_id, v_rental.id, v_from_bike.id, v_to_bike.id, p_swapped_at,
    p_from_return_odometer, p_to_start_odometer, p_returned_vehicle_status, btrim(p_reason), v_user_id
  );

  update public.bikes set current_odometer = p_from_return_odometer,
    status = p_returned_vehicle_status, updated_by = v_user_id,
    updated_at = timezone('utc', now()) where id = v_from_bike.id;
  update public.bikes set current_odometer = p_to_start_odometer,
    updated_by = v_user_id, updated_at = timezone('utc', now()) where id = v_to_bike.id;
  update public.rentals set bike_id = v_to_bike.id, updated_by = v_user_id,
    updated_at = timezone('utc', now()) where id = v_rental.id;

  return query select v_swap_id, v_rental.rental_number, v_from_bike.id, v_to_bike.id;
end;
$$;

revoke all on function public.swap_rental_vehicle(uuid,uuid,timestamptz,integer,integer,text,text) from public, anon;
grant execute on function public.swap_rental_vehicle(uuid,uuid,timestamptz,integer,integer,text,text) to authenticated;
