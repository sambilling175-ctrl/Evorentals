drop policy if exists rentals_write_own_company on public.rentals;

create policy rentals_insert_own_company on public.rentals
  for insert to authenticated
  with check (company_id = (select private.current_company_id()));

create policy rentals_update_own_company on public.rentals
  for update to authenticated
  using (company_id = (select private.current_company_id()))
  with check (company_id = (select private.current_company_id()));

create policy rentals_delete_own_company on public.rentals
  for delete to authenticated
  using (company_id = (select private.current_company_id()));

create index if not exists rentals_created_by_idx
  on public.rentals(created_by)
  where created_by is not null;

create index if not exists rentals_updated_by_idx
  on public.rentals(updated_by)
  where updated_by is not null;
