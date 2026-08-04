create table public.customer_timeline_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  customer_id uuid not null references public.customers(id) on delete cascade,
  event_type text not null check (event_type in ('profile_updated', 'document_accessed', 'note')),
  summary text not null,
  details jsonb not null default '{}'::jsonb,
  actor_id uuid references public.profiles(id),
  occurred_at timestamptz not null default now()
);

create index customer_timeline_customer_occurred_idx
  on public.customer_timeline_events(customer_id, occurred_at desc);
create index customer_timeline_company_idx on public.customer_timeline_events(company_id);
create index customer_timeline_actor_idx on public.customer_timeline_events(actor_id);

alter table public.customer_timeline_events enable row level security;

create policy customer_timeline_company_read on public.customer_timeline_events
for select to authenticated
using (company_id = (select private.current_company_id()));

create policy customer_timeline_company_insert on public.customer_timeline_events
for insert to authenticated
with check (company_id = (select private.current_company_id()));
