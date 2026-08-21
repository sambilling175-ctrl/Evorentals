-- D13-02: retain single-column FK coverage alongside company-scoped
-- operational indexes. PostgreSQL's FK advisor requires the FK column to be
-- the leading column of a covering index.

create index service_job_cards_service_request_fk_idx
  on public.service_job_cards(service_request_id);
create index service_job_cards_bike_fk_idx
  on public.service_job_cards(bike_id);
create index service_job_card_events_job_card_fk_idx
  on public.service_job_card_events(job_card_id);
