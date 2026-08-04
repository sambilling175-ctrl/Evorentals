-- Company-scope role definitions, prevent self-service privilege escalation,
-- and add append-only employee access history.

alter table public.roles
  add column if not exists company_id uuid references public.companies(id);

update public.roles
set company_id = (select id from public.companies order by created_at limit 1)
where company_id is null;

alter table public.roles alter column company_id set not null;
alter table public.roles drop constraint if exists roles_name_key;
alter table public.roles add constraint roles_company_name_key unique (company_id, name);

alter table public.profiles
  add constraint profiles_company_role_fkey
  foreign key (company_id, role)
  references public.roles(company_id, name);

drop policy if exists "Enable select for all authenticated users on roles" on public.roles;
drop policy if exists "Enable write operations for admins only on roles" on public.roles;

create policy roles_read_own_company on public.roles
for select to authenticated
using (company_id = (select private.current_company_id()) and deleted_at is null);

revoke all on public.roles from anon;
revoke all on public.roles from authenticated;
grant select on public.roles to authenticated;

revoke all on public.profiles from anon;

create or replace function private.protect_profile_access_fields()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor_is_admin boolean := (select private.is_company_admin());
  remaining_admins integer;
begin
  if new.company_id is distinct from old.company_id then
    raise exception 'Employee company cannot be changed';
  end if;

  if not actor_is_admin and (
    new.role is distinct from old.role
    or new.status is distinct from old.status
    or new.permissions is distinct from old.permissions
    or new.employee_id is distinct from old.employee_id
    or new.department is distinct from old.department
    or new.designation is distinct from old.designation
    or new.manager_id is distinct from old.manager_id
  ) then
    raise exception 'Administrator access required for employment or access changes';
  end if;

  if actor_is_admin
    and old.status = 'active'
    and old.role in ('admin', 'super_admin')
    and (new.status <> 'active' or new.role not in ('admin', 'super_admin')) then
    select count(*) into remaining_admins
    from public.profiles p
    where p.company_id = old.company_id
      and p.id <> old.id
      and p.status = 'active'
      and p.role in ('admin', 'super_admin')
      and p.deleted_at is null;
    if remaining_admins = 0 then
      raise exception 'The company must retain at least one active administrator';
    end if;
  end if;

  new.updated_by := (select auth.uid());
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.protect_profile_access_fields() from public, anon, authenticated;

drop trigger if exists protect_profile_access_fields on public.profiles;
create trigger protect_profile_access_fields
before update on public.profiles
for each row execute function private.protect_profile_access_fields();

create table public.employee_access_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  employee_id uuid not null references public.profiles(id),
  actor_id uuid references public.profiles(id),
  event_type text not null check (event_type in ('profile_updated', 'role_changed', 'status_changed')),
  summary text not null,
  details jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index employee_access_events_company_employee_idx
  on public.employee_access_events(company_id, employee_id, occurred_at desc);
create index employee_access_events_actor_idx
  on public.employee_access_events(actor_id);

alter table public.employee_access_events enable row level security;

create policy employee_access_events_read_own_company on public.employee_access_events
for select to authenticated
using (company_id = (select private.current_company_id()));

create policy employee_access_events_admin_insert_own_company on public.employee_access_events
for insert to authenticated
with check (
  company_id = (select private.current_company_id())
  and (select private.is_company_admin())
  and actor_id = (select auth.uid())
);

revoke all on public.employee_access_events from anon;
grant select, insert on public.employee_access_events to authenticated;

create or replace function public.admin_update_employee(
  p_employee_id uuid,
  p_full_name text,
  p_phone text,
  p_employee_number text,
  p_department text,
  p_designation text,
  p_joining_date date,
  p_role text,
  p_status text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  company uuid := (select private.current_company_id());
  actor uuid := (select auth.uid());
  previous_role text;
  previous_status text;
  event_kind text := 'profile_updated';
  event_summary text := 'Employee profile updated';
begin
  if actor is null or not (select private.is_company_admin()) then
    raise exception 'Administrator access required';
  end if;

  select role, status into previous_role, previous_status
  from public.profiles
  where id = p_employee_id
    and company_id = company
    and deleted_at is null;

  if not found then raise exception 'Employee not found or access denied'; end if;

  update public.profiles
  set full_name = p_full_name,
      phone = nullif(p_phone, ''),
      employee_id = nullif(p_employee_number, ''),
      department = nullif(p_department, ''),
      designation = nullif(p_designation, ''),
      joining_date = p_joining_date,
      role = p_role,
      status = p_status
  where id = p_employee_id and company_id = company;

  if p_role is distinct from previous_role then
    event_kind := 'role_changed';
    event_summary := format('Employee role changed from %s to %s', previous_role, p_role);
  elsif p_status is distinct from previous_status then
    event_kind := 'status_changed';
    event_summary := format('Employee status changed from %s to %s', previous_status, p_status);
  end if;

  insert into public.employee_access_events (
    company_id, employee_id, actor_id, event_type, summary, details
  ) values (
    company, p_employee_id, actor, event_kind, event_summary,
    jsonb_build_object(
      'previous_role', previous_role,
      'role', p_role,
      'previous_status', previous_status,
      'status', p_status
    )
  );
end;
$$;

revoke all on function public.admin_update_employee(uuid,text,text,text,text,text,date,text,text) from public, anon;
grant execute on function public.admin_update_employee(uuid,text,text,text,text,text,date,text,text) to authenticated;
