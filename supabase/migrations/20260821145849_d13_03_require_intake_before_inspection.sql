-- D13-03: an intake inspection is the gate into the job-card inspection stage.

create or replace function private.require_service_intake_before_inspection()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.status = 'requested'
    and new.status = 'inspection'
    and not exists (
      select 1
      from public.service_intake_inspections i
      where i.job_card_id = new.id
        and i.company_id = new.company_id
    ) then
    raise exception 'Vehicle intake inspection is required before inspection stage';
  end if;
  return new;
end;
$$;

drop trigger if exists require_service_intake_before_inspection on public.service_job_cards;
create trigger require_service_intake_before_inspection
before update of status on public.service_job_cards
for each row execute function private.require_service_intake_before_inspection();
