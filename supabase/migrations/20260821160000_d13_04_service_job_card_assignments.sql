-- D13-04: assign service job cards to internal employees or external garages.
-- Assignment rows are append-only; the latest row is the current assignment.

create table public.service_job_card_assignments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  job_card_id uuid not null references public.service_job_cards(id) on delete cascade,
  assignment_type text not null check (assignment_type in ('internal_employee', 'external_garage')),
  employee_id uuid references public.profiles(id) on delete restrict,
  external_garage_name text,
  external_garage_contact text,
  external_garage_phone text,
  external_garage_address text,
  notes text check (notes is null or char_length(notes) <= 1000),
  assigned_at timestamptz not null default timezone('utc', now()),
  assigned_by uuid references public.profiles(id) on delete set null,
  constraint service_job_card_assignments_target_check check (
    (assignment_type = 'internal_employee'
      and employee_id is not null
      and external_garage_name is null
      and external_garage_contact is null
      and external_garage_phone is null
      and external_garage_address is null)
    or
    (assignment_type = 'external_garage'
      and employee_id is null
      and external_garage_name is not null
      and char_length(btrim(external_garage_name)) between 2 and 200)
  )
);

alter table public.service_job_card_assignments enable row level security;

revoke all on table public.service_job_card_assignments from public, anon;
grant select, insert on table public.service_job_card_assignments to authenticated;

create policy service_job_card_assignments_select_own_company
  on public.service_job_card_assignments for select to authenticated
  using (company_id = (select private.current_company_id()));

create policy service_job_card_assignments_insert_own_company
  on public.service_job_card_assignments for insert to authenticated
  with check (company_id = (select private.current_company_id()));

create index service_job_card_assignments_job_card_idx
  on public.service_job_card_assignments(company_id, job_card_id, assigned_at desc);
create index service_job_card_assignments_employee_idx
  on public.service_job_card_assignments(company_id, employee_id, assigned_at desc)
  where employee_id is not null;

create or replace function private.enforce_service_job_card_assignment()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_company_id uuid;
  v_role text;
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
        coalesce(r.permissions -> 'Service', '[]'::jsonb) ?| array['Create', 'Edit', 'Manage']
        or coalesce(r.permissions -> 'Service & Maintenance', '[]'::jsonb) ?| array['Create', 'Edit', 'Manage']
        or coalesce(r.permissions -> 'Maintenance', '[]'::jsonb) ?| array['Create', 'Edit', 'Manage']
      )
  ) then
    raise exception 'You do not have permission to assign service job cards';
  end if;

  if not exists (
    select 1
    from public.service_job_cards j
    where j.id = new.job_card_id
      and j.company_id = new.company_id
      and j.deleted_at is null
      and j.status <> 'completed'
  ) then
    raise exception 'Service job card is not found, completed, or access denied';
  end if;

  if new.assignment_type = 'internal_employee' then
    if not exists (
      select 1 from public.profiles p
      where p.id = new.employee_id
        and p.company_id = new.company_id
        and p.status = 'active'
        and p.deleted_at is null
    ) then
      raise exception 'Selected employee is not active in this company';
    end if;
  elsif new.assignment_type = 'external_garage' then
    if new.employee_id is not null or char_length(btrim(coalesce(new.external_garage_name, ''))) < 2 then
      raise exception 'External garage name is required';
    end if;
  else
    raise exception 'Invalid service assignment type';
  end if;

  new.assigned_at := coalesce(new.assigned_at, timezone('utc', now()));
  new.assigned_by := coalesce(new.assigned_by, v_user_id);
  return new;
end;
$$;

create trigger service_job_card_assignments_guard
before insert on public.service_job_card_assignments
for each row execute function private.enforce_service_job_card_assignment();

create or replace function private.protect_service_job_card_assignment_history()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'Service job-card assignment history is immutable';
end;
$$;

create trigger protect_service_job_card_assignments_history
before update or delete on public.service_job_card_assignments
for each row execute function private.protect_service_job_card_assignment_history();

create or replace function public.assign_service_job_card(
  p_job_card_id uuid,
  p_assignment_type text,
  p_employee_id uuid default null,
  p_external_garage_name text default null,
  p_external_garage_contact text default null,
  p_external_garage_phone text default null,
  p_external_garage_address text default null,
  p_notes text default null
)
returns table(assignment_id uuid, job_card_id uuid, assignment_type text, employee_id uuid, external_garage_name text, assigned_at timestamptz)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_company_id uuid;
  v_assignment_id uuid := gen_random_uuid();
begin
  select p.company_id into v_company_id
  from public.profiles p
  where p.id = v_user_id and p.status = 'active' and p.deleted_at is null;
  if v_company_id is null then raise exception 'Active employee profile required'; end if;
  if char_length(coalesce(p_notes, '')) > 1000 then raise exception 'Assignment notes cannot exceed 1000 characters'; end if;

  insert into public.service_job_card_assignments(
    id, company_id, job_card_id, assignment_type, employee_id,
    external_garage_name, external_garage_contact, external_garage_phone,
    external_garage_address, notes, assigned_by
  ) values (
    v_assignment_id, v_company_id, p_job_card_id, p_assignment_type, p_employee_id,
    nullif(btrim(p_external_garage_name), ''), nullif(btrim(p_external_garage_contact), ''),
    nullif(btrim(p_external_garage_phone), ''), nullif(btrim(p_external_garage_address), ''),
    nullif(btrim(p_notes), ''), v_user_id
  );

  return query
  select a.id, a.job_card_id, a.assignment_type, a.employee_id, a.external_garage_name, a.assigned_at
  from public.service_job_card_assignments a
  where a.id = v_assignment_id;
end;
$$;

revoke all on function public.assign_service_job_card(uuid, text, uuid, text, text, text, text, text) from public, anon;
grant execute on function public.assign_service_job_card(uuid, text, uuid, text, text, text, text, text) to authenticated;
