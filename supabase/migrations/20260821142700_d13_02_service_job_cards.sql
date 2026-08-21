-- D13-02: service job cards with a database-enforced status graph.

create table public.service_job_cards (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  job_card_number text not null,
  service_request_id uuid not null references public.service_requests(id),
  bike_id uuid not null references public.bikes(id),
  status text not null default 'requested'
    check (status in ('requested', 'inspection', 'in_service', 'waiting_parts', 'qc', 'completed')),
  started_at timestamptz,
  completed_at timestamptz,
  notes text check (notes is null or char_length(notes) <= 2000),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  constraint service_job_cards_company_number_key unique (company_id, job_card_number),
  constraint service_job_cards_request_key unique (service_request_id)
);

create table public.service_job_card_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  job_card_id uuid not null references public.service_job_cards(id) on delete cascade,
  from_status text check (from_status is null or from_status in ('requested', 'inspection', 'in_service', 'waiting_parts', 'qc', 'completed')),
  to_status text not null check (to_status in ('requested', 'inspection', 'in_service', 'waiting_parts', 'qc', 'completed')),
  notes text check (notes is null or char_length(notes) <= 1000),
  occurred_at timestamptz not null default timezone('utc', now()),
  occurred_by uuid references public.profiles(id) on delete set null
);

alter table public.service_job_cards enable row level security;
alter table public.service_job_card_events enable row level security;

revoke all on table public.service_job_cards from public, anon;
revoke all on table public.service_job_card_events from public, anon;
grant select, insert, update on table public.service_job_cards to authenticated;
grant select, insert on table public.service_job_card_events to authenticated;

create policy service_job_cards_select_own_company
  on public.service_job_cards for select to authenticated
  using (company_id = (select private.current_company_id()) and deleted_at is null);

create policy service_job_cards_insert_own_company
  on public.service_job_cards for insert to authenticated
  with check (company_id = (select private.current_company_id()));

create policy service_job_cards_update_own_company
  on public.service_job_cards for update to authenticated
  using (company_id = (select private.current_company_id()) and deleted_at is null)
  with check (company_id = (select private.current_company_id()));

create policy service_job_card_events_select_own_company
  on public.service_job_card_events for select to authenticated
  using (company_id = (select private.current_company_id()));

create policy service_job_card_events_insert_own_company
  on public.service_job_card_events for insert to authenticated
  with check (company_id = (select private.current_company_id()));

create index service_job_cards_company_status_idx
  on public.service_job_cards(company_id, status, updated_at desc)
  where deleted_at is null;
create index service_job_cards_request_idx
  on public.service_job_cards(company_id, service_request_id);
create index service_job_cards_bike_idx
  on public.service_job_cards(company_id, bike_id, updated_at desc)
  where deleted_at is null;
create index service_job_card_events_job_card_idx
  on public.service_job_card_events(company_id, job_card_id, occurred_at desc);
create index service_job_card_events_actor_idx
  on public.service_job_card_events(company_id, occurred_by, occurred_at desc)
  where occurred_by is not null;

create or replace function private.enforce_service_job_card_transition()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_allowed boolean := false;
begin
  if tg_op = 'INSERT' then
    if new.status <> 'requested' then raise exception 'New service job cards must start in requested state'; end if;
    if not exists (
      select 1 from public.service_requests r
      where r.id = new.service_request_id
        and r.company_id = new.company_id
        and r.bike_id = new.bike_id
        and r.status = 'requested'
        and r.deleted_at is null
    ) then raise exception 'Service request is invalid, closed, or belongs to another vehicle'; end if;
    return new;
  end if;

  if new.status is distinct from old.status then
    v_allowed := (old.status = 'requested' and new.status = 'inspection')
      or (old.status = 'inspection' and new.status = 'in_service')
      or (old.status = 'in_service' and new.status in ('waiting_parts', 'qc'))
      or (old.status = 'waiting_parts' and new.status in ('in_service', 'qc'))
      or (old.status = 'qc' and new.status in ('in_service', 'completed'));
    if not v_allowed then
      raise exception 'Invalid service job-card transition: % -> %', old.status, new.status;
    end if;
    if new.status = 'in_service' and old.status is distinct from 'in_service' then
      new.started_at := coalesce(new.started_at, timezone('utc', now()));
    end if;
    if new.status = 'completed' then
      new.completed_at := timezone('utc', now());
    end if;
  end if;
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

create trigger service_job_cards_transition_guard
before insert or update of status on public.service_job_cards
for each row execute function private.enforce_service_job_card_transition();

create or replace function private.record_service_job_card_event()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  insert into public.service_job_card_events(
    company_id, job_card_id, from_status, to_status, notes, occurred_by
  ) values (
    new.company_id, new.id, case when tg_op = 'INSERT' then null else old.status end,
    new.status, case when tg_op = 'INSERT' then null else new.notes end, auth.uid()
  );
  return new;
end;
$$;

create trigger service_job_cards_event_history
after insert or update of status on public.service_job_cards
for each row execute function private.record_service_job_card_event();

create or replace function private.protect_service_job_card_history()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'Service job-card history is immutable';
end;
$$;

create trigger protect_service_job_card_events_history
before update or delete on public.service_job_card_events
for each row execute function private.protect_service_job_card_history();

create or replace function public.create_service_job_card(p_service_request_id uuid)
returns table(job_card_id uuid, job_card_number text, status text)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_company_id uuid;
  v_role text;
  v_request public.service_requests%rowtype;
  v_job_card_id uuid := gen_random_uuid();
  v_job_card_number text;
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
  ) then raise exception 'You do not have permission to create service job cards'; end if;

  select r.* into v_request
  from public.service_requests r
  where r.id = p_service_request_id and r.company_id = v_company_id
    and r.status = 'requested' and r.deleted_at is null
  for update;
  if not found then raise exception 'Service request not found, closed, or access denied'; end if;
  if exists (select 1 from public.service_job_cards j where j.service_request_id = v_request.id) then
    raise exception 'A job card already exists for this service request';
  end if;

  v_job_card_number := 'JC-' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSMS') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  insert into public.service_job_cards(
    id, company_id, job_card_number, service_request_id, bike_id, status, created_by, updated_by
  ) values (
    v_job_card_id, v_company_id, v_job_card_number, v_request.id, v_request.bike_id,
    'requested', v_user_id, v_user_id
  );
  return query select v_job_card_id, v_job_card_number, 'requested'::text;
end;
$$;

revoke all on function public.create_service_job_card(uuid) from public, anon;
grant execute on function public.create_service_job_card(uuid) to authenticated;

create or replace function public.transition_service_job_card(
  p_job_card_id uuid,
  p_to_status text,
  p_notes text default null
)
returns table(job_card_id uuid, job_card_number text, previous_status text, status text)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_company_id uuid;
  v_role text;
  v_card public.service_job_cards%rowtype;
begin
  select p.company_id, p.role into v_company_id, v_role
  from public.profiles p
  where p.id = v_user_id and p.status = 'active' and p.deleted_at is null;
  if v_company_id is null then raise exception 'Active employee profile required'; end if;
  if v_role not in ('admin', 'super_admin') and not exists (
    select 1 from public.roles r
    where r.company_id = v_company_id and r.name = v_role and r.deleted_at is null
      and (
        coalesce(r.permissions -> 'Service', '[]'::jsonb) ?| array['Edit', 'Manage']
        or coalesce(r.permissions -> 'Service & Maintenance', '[]'::jsonb) ?| array['Edit', 'Manage']
        or coalesce(r.permissions -> 'Maintenance', '[]'::jsonb) ?| array['Edit', 'Manage']
      )
  ) then raise exception 'You do not have permission to transition service job cards'; end if;
  if p_to_status not in ('requested', 'inspection', 'in_service', 'waiting_parts', 'qc', 'completed') then
    raise exception 'Invalid service job-card status';
  end if;
  if char_length(coalesce(p_notes, '')) > 1000 then raise exception 'Transition notes cannot exceed 1000 characters'; end if;

  select j.* into v_card
  from public.service_job_cards j
  where j.id = p_job_card_id and j.company_id = v_company_id and j.deleted_at is null
  for update;
  if not found then raise exception 'Service job card not found or access denied'; end if;
  if p_to_status = v_card.status then raise exception 'Job card is already in that status'; end if;

  update public.service_job_cards
  set status = p_to_status, notes = coalesce(nullif(btrim(p_notes), ''), notes), updated_by = v_user_id
  where id = v_card.id;
  return query select v_card.id, v_card.job_card_number, v_card.status, p_to_status;
end;
$$;

revoke all on function public.transition_service_job_card(uuid, text, text) from public, anon;
grant execute on function public.transition_service_job_card(uuid, text, text) to authenticated;
