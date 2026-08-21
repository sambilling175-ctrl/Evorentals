-- D13-02 hardening: prevent direct table writes from bypassing actor checks or
-- changing the immutable job-card/request/vehicle identity after creation.

create or replace function private.enforce_service_job_card_transition()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_allowed boolean := false;
  v_user_id uuid := auth.uid();
  v_company_id uuid;
  v_role text;
  v_actions text[];
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

  v_actions := case when tg_op = 'INSERT'
    then array['Create', 'Edit', 'Manage']
    else array['Edit', 'Manage']
  end;

  if v_role not in ('admin', 'super_admin') and not exists (
    select 1
    from public.roles r
    where r.company_id = v_company_id
      and r.name = v_role
      and r.deleted_at is null
      and (
        coalesce(r.permissions -> 'Service', '[]'::jsonb) ?| v_actions
        or coalesce(r.permissions -> 'Service & Maintenance', '[]'::jsonb) ?| v_actions
        or coalesce(r.permissions -> 'Maintenance', '[]'::jsonb) ?| v_actions
      )
  ) then
    raise exception 'You do not have permission to modify service job cards';
  end if;

  if tg_op = 'UPDATE' and (
    new.company_id is distinct from old.company_id
    or new.job_card_number is distinct from old.job_card_number
    or new.service_request_id is distinct from old.service_request_id
    or new.bike_id is distinct from old.bike_id
    or new.created_by is distinct from old.created_by
  ) then
    raise exception 'Job-card identity fields are immutable';
  end if;

  if tg_op = 'INSERT' then
    if new.status <> 'requested' then
      raise exception 'New service job cards must start in requested state';
    end if;
    if not exists (
      select 1
      from public.service_requests r
      where r.id = new.service_request_id
        and r.company_id = new.company_id
        and r.bike_id = new.bike_id
        and r.status = 'requested'
        and r.deleted_at is null
    ) then
      raise exception 'Service request is invalid, closed, or belongs to another vehicle';
    end if;
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

drop trigger if exists service_job_cards_transition_guard on public.service_job_cards;
create trigger service_job_cards_transition_guard
before insert or update on public.service_job_cards
for each row execute function private.enforce_service_job_card_transition();
