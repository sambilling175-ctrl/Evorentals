-- D13-02 hardening: cover every new foreign key with a leading-column index.

create index service_job_cards_service_request_fk_idx
  on public.service_job_cards(service_request_id);
create index service_job_cards_bike_fk_idx
  on public.service_job_cards(bike_id);
create index service_job_cards_created_by_fk_idx
  on public.service_job_cards(created_by)
  where created_by is not null;
create index service_job_cards_updated_by_fk_idx
  on public.service_job_cards(updated_by)
  where updated_by is not null;
create index service_job_card_events_job_card_fk_idx
  on public.service_job_card_events(job_card_id);
create index service_job_card_events_occurred_by_fk_idx
  on public.service_job_card_events(occurred_by)
  where occurred_by is not null;
