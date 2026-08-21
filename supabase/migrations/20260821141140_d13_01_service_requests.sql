-- D13-01: company-scoped service request intake and controlled reasons.
-- The legacy maintenance_records table is intentionally left untouched: it
-- predates tenant isolation and cannot safely represent this workflow.

create table public.service_reasons (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  code text not null check (code ~ '^[a-z][a-z0-9_]{1,59}$'),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  description text check (description is null or char_length(description) <= 500),
  category text not null default 'general'
    check (category in ('mechanical', 'electrical', 'battery', 'body', 'scheduled', 'general')),
  sort_order integer not null default 0 check (sort_order >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  constraint service_reasons_company_code_key unique (company_id, code)
);

create table public.service_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  request_number text not null,
  bike_id uuid not null references public.bikes(id),
  reason_id uuid not null references public.service_reasons(id),
  customer_id uuid references public.customers(id),
  rental_id uuid references public.rentals(id),
  description text not null check (char_length(btrim(description)) between 5 and 2000),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  status text not null default 'requested' check (status in ('requested', 'cancelled')),
  source text not null default 'employee' check (source in ('employee', 'customer', 'system')),
  requested_at timestamptz not null default timezone('utc', now()),
  requested_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  constraint service_requests_company_number_key unique (company_id, request_number)
);

alter table public.service_reasons enable row level security;
alter table public.service_requests enable row level security;

revoke all on table public.service_reasons from public, anon;
revoke all on table public.service_requests from public, anon;
grant select on table public.service_reasons to authenticated;
grant insert, update on table public.service_reasons to authenticated;
grant select, insert on table public.service_requests to authenticated;

create policy service_reasons_select_own_company
  on public.service_reasons for select to authenticated
  using (company_id = (select private.current_company_id()) and deleted_at is null);

create policy service_reasons_insert_admin
  on public.service_reasons for insert to authenticated
  with check (company_id = (select private.current_company_id()) and (select private.is_company_admin()));

create policy service_reasons_update_admin
  on public.service_reasons for update to authenticated
  using (company_id = (select private.current_company_id()) and (select private.is_company_admin()))
  with check (company_id = (select private.current_company_id()));

create policy service_requests_select_own_company
  on public.service_requests for select to authenticated
  using (company_id = (select private.current_company_id()) and deleted_at is null);

create policy service_requests_insert_own_company
  on public.service_requests for insert to authenticated
  with check (company_id = (select private.current_company_id()));

create index service_reasons_company_active_idx
  on public.service_reasons(company_id, is_active, sort_order, name)
  where deleted_at is null;
create index service_requests_company_status_idx
  on public.service_requests(company_id, status, requested_at desc)
  where deleted_at is null;
create index service_requests_bike_requested_idx
  on public.service_requests(company_id, bike_id, requested_at desc)
  where deleted_at is null;
create index service_requests_reason_idx
  on public.service_requests(company_id, reason_id, requested_at desc)
  where deleted_at is null;
create index service_requests_customer_idx
  on public.service_requests(company_id, customer_id, requested_at desc)
  where customer_id is not null and deleted_at is null;
create index service_requests_created_by_idx
  on public.service_requests(company_id, created_by, created_at desc)
  where created_by is not null;

-- These are controlled lookup values, not customer, rental, or financial data.
insert into public.service_reasons(company_id, code, name, category, sort_order)
select c.id, v.code, v.name, v.category, v.sort_order
from public.companies c
cross join (values
  ('battery_issue', 'Battery issue', 'battery', 10),
  ('brake_noise', 'Brake noise', 'mechanical', 20),
  ('tyre_puncture', 'Tyre puncture', 'mechanical', 30),
  ('display_not_working', 'Display not working', 'electrical', 40),
  ('charging_fault', 'Charging fault', 'electrical', 50),
  ('routine_service', 'Routine service', 'scheduled', 60),
  ('accident_damage', 'Accident damage', 'body', 70),
  ('other', 'Other', 'general', 80)
) as v(code, name, category, sort_order)
where not exists (
  select 1 from public.service_reasons existing
  where existing.company_id = c.id and existing.code = v.code
);

create or replace function public.create_service_request(
  p_bike_id uuid,
  p_reason_id uuid,
  p_description text,
  p_priority text default 'medium',
  p_customer_id uuid default null,
  p_rental_id uuid default null,
  p_source text default 'employee'
)
returns table(request_id uuid, request_number text)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_company_id uuid;
  v_role text;
  v_request_id uuid := gen_random_uuid();
  v_request_number text;
  v_bike_company_id uuid;
  v_bike_status text;
  v_reason_company_id uuid;
  v_rental_bike_id uuid;
begin
  select p.company_id, p.role into v_company_id, v_role
  from public.profiles p
  where p.id = v_user_id and p.status = 'active' and p.deleted_at is null;
  if v_company_id is null then raise exception 'Active employee profile required'; end if;

  if v_role not in ('admin', 'super_admin') and not exists (
    select 1 from public.roles r
    where r.company_id = v_company_id and r.name = v_role and r.deleted_at is null
      and (
        coalesce(r.permissions -> 'Service', '[]'::jsonb) ?| array['Create', 'Edit', 'Manage']
        or coalesce(r.permissions -> 'Service & Maintenance', '[]'::jsonb) ?| array['Create', 'Edit', 'Manage']
        or coalesce(r.permissions -> 'Maintenance', '[]'::jsonb) ?| array['Create', 'Edit', 'Manage']
      )
  ) then raise exception 'You do not have permission to create service requests'; end if;

  if char_length(btrim(coalesce(p_description, ''))) not between 5 and 2000 then
    raise exception 'Service request description must be between 5 and 2000 characters';
  end if;
  if p_priority not in ('low', 'medium', 'high', 'urgent') then raise exception 'Invalid service request priority'; end if;
  if p_source not in ('employee', 'customer', 'system') then raise exception 'Invalid service request source'; end if;

  select b.company_id, b.status into v_bike_company_id, v_bike_status
  from public.bikes b
  where b.id = p_bike_id and b.deleted_at is null;
  if v_bike_company_id is null or v_bike_company_id <> v_company_id then raise exception 'Vehicle not found or access denied'; end if;
  if v_bike_status = 'retired' then raise exception 'Retired vehicles cannot receive service requests'; end if;

  select sr.company_id into v_reason_company_id
  from public.service_reasons sr
  where sr.id = p_reason_id and sr.is_active and sr.deleted_at is null;
  if v_reason_company_id is null or v_reason_company_id <> v_company_id then raise exception 'Service reason not found or inactive'; end if;

  if p_customer_id is not null and not exists (
    select 1 from public.customers c where c.id = p_customer_id and c.company_id = v_company_id and c.deleted_at is null
  ) then raise exception 'Customer not found or access denied'; end if;

  if p_rental_id is not null then
    select r.bike_id into v_rental_bike_id
    from public.rentals r
    where r.id = p_rental_id and r.company_id = v_company_id and r.deleted_at is null;
    if v_rental_bike_id is null then raise exception 'Rental not found or access denied'; end if;
    if v_rental_bike_id <> p_bike_id then raise exception 'Rental does not belong to the selected vehicle'; end if;
  end if;

  v_request_number := 'SR-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  insert into public.service_requests(
    id, company_id, request_number, bike_id, reason_id, customer_id, rental_id,
    description, priority, status, source, requested_by, created_by, updated_by
  ) values (
    v_request_id, v_company_id, v_request_number, p_bike_id, p_reason_id, p_customer_id, p_rental_id,
    btrim(p_description), p_priority, 'requested', p_source, v_user_id, v_user_id, v_user_id
  );

  return query select v_request_id, v_request_number;
end;
$$;

revoke all on function public.create_service_request(uuid, uuid, text, text, uuid, uuid, text) from public, anon;
grant execute on function public.create_service_request(uuid, uuid, text, text, uuid, uuid, text) to authenticated;
