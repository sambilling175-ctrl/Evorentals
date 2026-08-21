-- D13-03: immutable service vehicle intake inspection and telemetry capture.

create table public.service_intake_inspections (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  job_card_id uuid not null references public.service_job_cards(id),
  bike_id uuid not null references public.bikes(id),
  inspected_at timestamptz not null default timezone('utc', now()),
  odometer integer not null check (odometer >= 0),
  battery_level integer not null check (battery_level between 0 and 100),
  condition text not null check (condition in ('excellent', 'good', 'fair', 'damaged')),
  checklist jsonb not null check (jsonb_typeof(checklist) = 'object'),
  notes text check (notes is null or char_length(notes) <= 2000),
  evidence_metadata jsonb not null default '[]'::jsonb
    check (jsonb_typeof(evidence_metadata) = 'array'),
  created_at timestamptz not null default timezone('utc', now()),
  inspected_by uuid references public.profiles(id) on delete set null,
  constraint service_intake_inspections_one_per_job_card unique (job_card_id)
);

alter table public.service_intake_inspections enable row level security;

revoke all on table public.service_intake_inspections from public, anon;
grant select, insert on table public.service_intake_inspections to authenticated;

create policy service_intake_inspections_select_own_company
  on public.service_intake_inspections for select to authenticated
  using (company_id = (select private.current_company_id()));

create policy service_intake_inspections_insert_own_company
  on public.service_intake_inspections for insert to authenticated
  with check (company_id = (select private.current_company_id()));

create index service_intake_inspections_company_time_idx
  on public.service_intake_inspections(company_id, inspected_at desc);
create index service_intake_inspections_job_card_fk_idx
  on public.service_intake_inspections(job_card_id);
create index service_intake_inspections_bike_fk_idx
  on public.service_intake_inspections(bike_id, inspected_at desc);
create index service_intake_inspections_inspected_by_fk_idx
  on public.service_intake_inspections(inspected_by)
  where inspected_by is not null;

create or replace function private.protect_service_intake_inspection_history()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'Service intake inspection history is immutable';
end;
$$;

create trigger protect_service_intake_inspection_history
before update or delete on public.service_intake_inspections
for each row execute function private.protect_service_intake_inspection_history();

create or replace function private.enforce_service_intake_inspection_insert()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_company_id uuid;
  v_role text;
  v_job_card public.service_job_cards%rowtype;
  v_bike public.bikes%rowtype;
begin
  select p.company_id, p.role
    into v_company_id, v_role
  from public.profiles p
  where p.id = v_user_id
    and p.status = 'active'
    and p.deleted_at is null;
  if v_company_id is null or v_company_id is distinct from new.company_id then
    raise exception 'Active employee profile required for this company';
  end if;
  if v_role not in ('admin', 'super_admin') and not exists (
    select 1
    from public.roles r
    where r.company_id = v_company_id
      and r.name = v_role
      and r.deleted_at is null
      and (
        coalesce(r.permissions -> 'Service', '[]'::jsonb) ?| array['Edit', 'Manage']
        or coalesce(r.permissions -> 'Service & Maintenance', '[]'::jsonb) ?| array['Edit', 'Manage']
        or coalesce(r.permissions -> 'Maintenance', '[]'::jsonb) ?| array['Edit', 'Manage']
      )
  ) then
    raise exception 'You do not have permission to record vehicle intake inspections';
  end if;

  select j.* into v_job_card
  from public.service_job_cards j
  where j.id = new.job_card_id
    and j.company_id = v_company_id
    and j.deleted_at is null
    and j.status in ('requested', 'inspection');
  if not found or v_job_card.bike_id is distinct from new.bike_id then
    raise exception 'Job card is not available for this vehicle intake inspection';
  end if;

  select b.* into v_bike
  from public.bikes b
  where b.id = new.bike_id
    and b.company_id = v_company_id
    and b.deleted_at is null;
  if not found then raise exception 'Vehicle not found or access denied'; end if;
  if new.odometer < coalesce(v_bike.current_odometer, 0) then
    raise exception 'Intake odometer cannot be below the current vehicle odometer';
  end if;
  return new;
end;
$$;

create trigger service_intake_inspection_insert_guard
before insert on public.service_intake_inspections
for each row execute function private.enforce_service_intake_inspection_insert();

create or replace function public.record_service_intake_inspection(
  p_job_card_id uuid,
  p_odometer integer,
  p_battery_level integer,
  p_condition text,
  p_checklist jsonb,
  p_notes text,
  p_evidence_metadata jsonb default '[]'::jsonb
)
returns table(
  inspection_id uuid,
  job_card_number text,
  status text,
  odometer integer,
  battery_level integer
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_company_id uuid;
  v_role text;
  v_job_card public.service_job_cards%rowtype;
  v_bike public.bikes%rowtype;
  v_inspection_id uuid := gen_random_uuid();
  v_status text;
begin
  select p.company_id, p.role
    into v_company_id, v_role
  from public.profiles p
  where p.id = v_user_id
    and p.status = 'active'
    and p.deleted_at is null;
  if v_company_id is null then raise exception 'Active employee profile required'; end if;
  if v_role not in ('admin', 'super_admin') and not exists (
    select 1
    from public.roles r
    where r.company_id = v_company_id
      and r.name = v_role
      and r.deleted_at is null
      and (
        coalesce(r.permissions -> 'Service', '[]'::jsonb) ?| array['Edit', 'Manage']
        or coalesce(r.permissions -> 'Service & Maintenance', '[]'::jsonb) ?| array['Edit', 'Manage']
        or coalesce(r.permissions -> 'Maintenance', '[]'::jsonb) ?| array['Edit', 'Manage']
      )
  ) then raise exception 'You do not have permission to record vehicle intake inspections'; end if;

  if p_odometer < 0 then raise exception 'Intake odometer cannot be negative'; end if;
  if p_battery_level not between 0 and 100 then raise exception 'Battery level must be between 0 and 100'; end if;
  if p_condition not in ('excellent', 'good', 'fair', 'damaged') then raise exception 'Invalid intake condition'; end if;
  if jsonb_typeof(coalesce(p_checklist, '{}'::jsonb)) <> 'object' then raise exception 'Intake checklist must be an object'; end if;
  if jsonb_typeof(coalesce(p_evidence_metadata, '[]'::jsonb)) <> 'array' then raise exception 'Evidence metadata must be an array'; end if;
  if char_length(coalesce(p_notes, '')) > 2000 then raise exception 'Intake notes cannot exceed 2000 characters'; end if;

  select j.* into v_job_card
  from public.service_job_cards j
  where j.id = p_job_card_id
    and j.company_id = v_company_id
    and j.deleted_at is null
    and j.status in ('requested', 'inspection')
  for update;
  if not found then raise exception 'Job card is not available for intake inspection'; end if;
  if exists (select 1 from public.service_intake_inspections i where i.job_card_id = v_job_card.id) then
    raise exception 'Job card already has an intake inspection';
  end if;

  select b.* into v_bike
  from public.bikes b
  where b.id = v_job_card.bike_id
    and b.company_id = v_company_id
    and b.deleted_at is null
  for update;
  if not found then raise exception 'Vehicle not found or access denied'; end if;
  if p_odometer < coalesce(v_bike.current_odometer, 0) then
    raise exception 'Intake odometer cannot be below the current vehicle odometer';
  end if;

  insert into public.service_intake_inspections(
    id, company_id, job_card_id, bike_id, odometer, battery_level, condition,
    checklist, notes, evidence_metadata, inspected_by
  ) values (
    v_inspection_id, v_company_id, v_job_card.id, v_bike.id, p_odometer,
    p_battery_level, p_condition, coalesce(p_checklist, '{}'::jsonb),
    nullif(btrim(coalesce(p_notes, '')), ''), coalesce(p_evidence_metadata, '[]'::jsonb),
    v_user_id
  );

  update public.bikes
  set current_odometer = p_odometer,
      battery_level = p_battery_level,
      updated_by = v_user_id,
      updated_at = timezone('utc', now())
  where id = v_bike.id;

  v_status := v_job_card.status;
  if v_job_card.status = 'requested' then
    update public.service_job_cards
    set status = 'inspection', updated_by = v_user_id
    where id = v_job_card.id;
    v_status := 'inspection';
  end if;

  return query select v_inspection_id, v_job_card.job_card_number, v_status,
    p_odometer, p_battery_level;
end;
$$;

revoke all on function public.record_service_intake_inspection(uuid, integer, integer, text, jsonb, text, jsonb) from public, anon;
grant execute on function public.record_service_intake_inspection(uuid, integer, integer, text, jsonb, text, jsonb) to authenticated;
