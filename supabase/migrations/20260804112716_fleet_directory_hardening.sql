-- D7-01 follow-up: avoid overlapping SELECT policies and cover audit FKs.

drop policy if exists bikes_write_own_company on public.bikes;

create policy bikes_insert_own_company on public.bikes
  for insert to authenticated
  with check (company_id = (select private.current_company_id()));

create policy bikes_update_own_company on public.bikes
  for update to authenticated
  using (company_id = (select private.current_company_id()))
  with check (company_id = (select private.current_company_id()));

create policy bikes_delete_own_company on public.bikes
  for delete to authenticated
  using (company_id = (select private.current_company_id()));

create index if not exists bikes_created_by_idx
  on public.bikes (created_by)
  where created_by is not null;

create index if not exists bikes_updated_by_idx
  on public.bikes (updated_by)
  where updated_by is not null;
