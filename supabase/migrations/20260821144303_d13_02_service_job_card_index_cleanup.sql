-- D13-02 hardening: the composite operational indexes already cover these
-- foreign keys; remove redundant single-column copies from the prior guard.

drop index if exists public.service_job_cards_service_request_fk_idx;
drop index if exists public.service_job_cards_bike_fk_idx;
drop index if exists public.service_job_card_events_job_card_fk_idx;
