-- D9-05: return inspection and immutable damage-charge history.

alter table public.rentals
  drop constraint if exists rentals_status_check;

alter table public.rentals
  add constraint rentals_status_check
    check (status = any (array['active'::text, 'overdue'::text, 'returned'::text, 'completed'::text, 'cancelled'::text]));

create table public.rental_return_inspections (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  rental_id uuid not null references public.rentals(id),
  bike_id uuid not null references public.bikes(id),
  returned_at timestamptz not null,
  return_odometer integer not null check (return_odometer >= 0),
  battery_level integer not null check (battery_level between 0 and 100),
  condition text not null check (condition in ('excellent', 'good', 'fair', 'damaged')),
  checklist jsonb not null check (jsonb_typeof(checklist) = 'object'),
  notes text check (notes is null or char_length(notes) <= 2000),
  vehicle_disposition text not null check (vehicle_disposition in ('available', 'maintenance')),
  evidence_metadata jsonb not null default '[]'::jsonb check (jsonb_typeof(evidence_metadata) = 'array'),
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.profiles(id) on delete set null,
  constraint rental_return_inspections_one_per_rental unique (rental_id)
);

create table public.rental_damage_charges (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  rental_id uuid not null references public.rentals(id),
  inspection_id uuid not null references public.rental_return_inspections(id),
  description text not null check (char_length(btrim(description)) between 3 and 500),
  amount numeric(12,2) not null check (amount >= 0),
  evidence_metadata jsonb not null default '[]'::jsonb check (jsonb_typeof(evidence_metadata) = 'array'),
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.profiles(id) on delete set null
);

alter table public.rental_return_inspections enable row level security;
alter table public.rental_damage_charges enable row level security;

revoke all on table public.rental_return_inspections from public, anon;
revoke all on table public.rental_damage_charges from public, anon;
grant select, insert on table public.rental_return_inspections to authenticated;
grant select, insert on table public.rental_damage_charges to authenticated;

create policy rental_return_inspections_select_own_company
  on public.rental_return_inspections for select to authenticated
  using (company_id = (select private.current_company_id()));

create policy rental_return_inspections_insert_own_company
  on public.rental_return_inspections for insert to authenticated
  with check (company_id = (select private.current_company_id()));

create policy rental_damage_charges_select_own_company
  on public.rental_damage_charges for select to authenticated
  using (company_id = (select private.current_company_id()));

create policy rental_damage_charges_insert_own_company
  on public.rental_damage_charges for insert to authenticated
  with check (company_id = (select private.current_company_id()));

create index rental_return_inspections_company_returned_idx
  on public.rental_return_inspections(company_id, returned_at desc);
create index rental_return_inspections_bike_idx
  on public.rental_return_inspections(bike_id, returned_at desc);
create index rental_damage_charges_inspection_idx
  on public.rental_damage_charges(inspection_id, created_at desc);
create index rental_damage_charges_rental_idx
  on public.rental_damage_charges(company_id, rental_id, created_at desc);
create index rental_return_inspections_created_by_idx
  on public.rental_return_inspections(created_by) where created_by is not null;
create index rental_damage_charges_created_by_idx
  on public.rental_damage_charges(created_by) where created_by is not null;

create or replace function private.protect_return_inspection_history()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'Return inspection history is immutable';
end;
$$;

create trigger protect_rental_return_inspections_history
before update or delete on public.rental_return_inspections
for each row execute function private.protect_return_inspection_history();

create trigger protect_rental_damage_charges_history
before update or delete on public.rental_damage_charges
for each row execute function private.protect_return_inspection_history();

create or replace function public.record_rental_return(
  p_rental_id uuid,
  p_returned_at timestamptz,
  p_return_odometer integer,
  p_battery_level integer,
  p_condition text,
  p_checklist jsonb,
  p_notes text,
  p_vehicle_disposition text,
  p_damage_items jsonb,
  p_evidence_metadata jsonb default '[]'::jsonb
)
returns table(inspection_id uuid, rental_number text, damage_total numeric, vehicle_status text)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_company_id uuid;
  v_role text;
  v_rental public.rentals%rowtype;
  v_bike public.bikes%rowtype;
  v_inspection_id uuid := gen_random_uuid();
  v_damage_items jsonb := coalesce(p_damage_items, '[]'::jsonb);
  v_item jsonb;
  v_description text;
  v_amount numeric;
  v_evidence jsonb;
  v_damage_total numeric := 0;
begin
  select p.company_id, p.role into v_company_id, v_role
  from public.profiles p
  where p.id = v_user_id and p.status = 'active' and p.deleted_at is null;
  if v_company_id is null then raise exception 'Active employee profile required'; end if;
  if v_role not in ('admin', 'super_admin') and not exists (
    select 1 from public.roles r
    where r.company_id = v_company_id and r.name = v_role and r.deleted_at is null
      and coalesce(r.permissions -> 'Rentals', '[]'::jsonb) ?| array['Edit','Manage']
  ) then raise exception 'You do not have permission to record rental returns'; end if;

  if p_return_odometer < 0 then raise exception 'Return odometer cannot be negative'; end if;
  if p_battery_level not between 0 and 100 then raise exception 'Battery level must be between 0 and 100'; end if;
  if p_condition not in ('excellent', 'good', 'fair', 'damaged') then raise exception 'Invalid return condition'; end if;
  if p_vehicle_disposition not in ('available', 'maintenance') then raise exception 'Invalid vehicle disposition'; end if;
  if jsonb_typeof(coalesce(p_checklist, '{}'::jsonb)) <> 'object' then raise exception 'Return checklist must be an object'; end if;
  if jsonb_typeof(coalesce(p_evidence_metadata, '[]'::jsonb)) <> 'array' then raise exception 'Evidence metadata must be an array'; end if;
  if char_length(coalesce(p_notes, '')) > 2000 then raise exception 'Return notes cannot exceed 2000 characters'; end if;
  if jsonb_typeof(v_damage_items) <> 'array' then raise exception 'Damage items must be an array'; end if;

  select * into v_rental
  from public.rentals r
  where r.id = p_rental_id and r.company_id = v_company_id and r.deleted_at is null
  for update;
  if not found then raise exception 'Rental not found'; end if;
  if v_rental.status not in ('active', 'overdue') then raise exception 'Only active or overdue rentals can be returned'; end if;
  if p_returned_at < v_rental.started_at then raise exception 'Return time cannot be before rental start'; end if;
  if p_returned_at > now() + interval '15 minutes' then raise exception 'Return time cannot be in the future'; end if;

  select * into v_bike
  from public.bikes b
  where b.id = v_rental.bike_id and b.company_id = v_company_id and b.deleted_at is null
  for update;
  if not found then raise exception 'Current rental vehicle not found'; end if;
  if p_return_odometer < coalesce(v_bike.current_odometer, 0) then
    raise exception 'Return odometer cannot be below the vehicle odometer';
  end if;
  if p_return_odometer < coalesce(v_rental.start_odometer, 0) then
    raise exception 'Return odometer cannot be below the rental start odometer';
  end if;
  if exists (
    select 1 from public.bookings b
    where b.company_id = v_company_id and b.bike_id = v_rental.bike_id
      and b.deleted_at is null and b.status in ('pending', 'confirmed')
      and b.starts_at < p_returned_at and b.ends_at > p_returned_at
    for update
  ) then raise exception 'Vehicle has a booking conflict at the recorded return time'; end if;

  if exists (select 1 from public.rental_return_inspections i where i.rental_id = v_rental.id) then
    raise exception 'Rental already has a return inspection';
  end if;

  for v_item in select value from jsonb_array_elements(v_damage_items)
  loop
    if jsonb_typeof(v_item) <> 'object' then raise exception 'Each damage item must be an object'; end if;
    v_description := btrim(coalesce(v_item ->> 'description', ''));
    if char_length(v_description) not between 3 and 500 then raise exception 'Damage descriptions must be between 3 and 500 characters'; end if;
    begin
      v_amount := (v_item ->> 'amount')::numeric;
    exception when others then
      raise exception 'Damage charge amounts must be numeric';
    end;
    if v_amount < 0 or round(v_amount, 2) <> v_amount then raise exception 'Damage charge amounts must be non-negative with at most two decimals'; end if;
    v_evidence := coalesce(v_item -> 'evidenceMetadata', '[]'::jsonb);
    if jsonb_typeof(v_evidence) <> 'array' then raise exception 'Damage evidence metadata must be an array'; end if;
    v_damage_total := v_damage_total + v_amount;
  end loop;

  insert into public.rental_return_inspections(
    id, company_id, rental_id, bike_id, returned_at, return_odometer, battery_level,
    condition, checklist, notes, vehicle_disposition, evidence_metadata, created_by
  ) values (
    v_inspection_id, v_company_id, v_rental.id, v_bike.id, p_returned_at,
    p_return_odometer, p_battery_level, p_condition, coalesce(p_checklist, '{}'::jsonb),
    nullif(btrim(coalesce(p_notes, '')), ''), p_vehicle_disposition,
    coalesce(p_evidence_metadata, '[]'::jsonb), v_user_id
  );

  for v_item in select value from jsonb_array_elements(v_damage_items)
  loop
    insert into public.rental_damage_charges(
      company_id, rental_id, inspection_id, description, amount, evidence_metadata, created_by
    ) values (
      v_company_id, v_rental.id, v_inspection_id, btrim(v_item ->> 'description'),
      (v_item ->> 'amount')::numeric, coalesce(v_item -> 'evidenceMetadata', '[]'::jsonb), v_user_id
    );
  end loop;

  update public.bikes
  set current_odometer = p_return_odometer, battery_level = p_battery_level,
      status = p_vehicle_disposition, updated_by = v_user_id,
      updated_at = timezone('utc', now())
  where id = v_bike.id;

  update public.rentals
  set ended_at = p_returned_at, status = 'returned', updated_by = v_user_id,
      updated_at = timezone('utc', now())
  where id = v_rental.id;

  return query select v_inspection_id, v_rental.rental_number, v_damage_total, p_vehicle_disposition;
end;
$$;

revoke all on function public.record_rental_return(uuid,timestamptz,integer,integer,text,jsonb,text,text,jsonb,jsonb) from public, anon;
grant execute on function public.record_rental_return(uuid,timestamptz,integer,integer,text,jsonb,text,text,jsonb,jsonb) to authenticated;
