-- D13-06: synchronize fleet base availability with service job-card stages.
-- A service job entering work puts its vehicle into maintenance; completing
-- service releases non-retired vehicles to available in the same transaction.

create or replace function private.sync_service_job_card_fleet_status()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_bike public.bikes%rowtype;
begin
  if new.status is not distinct from old.status
    or new.status not in ('in_service', 'completed') then
    return new;
  end if;

  select b.*
    into v_bike
  from public.bikes b
  where b.id = new.bike_id
    and b.company_id = new.company_id
    and b.deleted_at is null
  for update;

  if not found then
    raise exception 'Service vehicle not found or access denied';
  end if;

  if new.status = 'in_service' then
    if v_bike.status = 'retired' then
      raise exception 'Retired vehicles cannot enter service';
    end if;
    if exists (
      select 1
      from public.rentals r
      where r.company_id = new.company_id
        and r.bike_id = new.bike_id
        and r.status in ('active', 'overdue')
        and r.deleted_at is null
    ) then
      raise exception 'Vehicles with an active rental cannot enter service';
    end if;

    update public.bikes
    set status = 'maintenance',
        updated_by = v_user_id,
        updated_at = timezone('utc', now())
    where id = v_bike.id;
  else
    update public.bikes
    set status = case when v_bike.status = 'retired' then 'retired' else 'available' end,
        updated_by = v_user_id,
        updated_at = timezone('utc', now())
    where id = v_bike.id;
  end if;

  return new;
end;
$$;

drop trigger if exists service_job_cards_fleet_status_sync on public.service_job_cards;
create trigger service_job_cards_fleet_status_sync
after update of status on public.service_job_cards
for each row execute function private.sync_service_job_card_fleet_status();
