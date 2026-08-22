-- D14-02 hardening: cover audit foreign keys and init-plan the RPC guards.

create index service_parts_created_by_idx on public.service_parts(created_by);
create index service_parts_updated_by_idx on public.service_parts(updated_by);
create index service_part_stock_movements_created_by_idx on public.service_part_stock_movements(created_by);

drop policy service_parts_insert_via_rpc on public.service_parts;
create policy service_parts_insert_via_rpc
  on public.service_parts for insert to authenticated
  with check (
    company_id = (select private.current_company_id())
    and (select current_setting('app.service_parts_rpc', true)) = 'true'
  );

drop policy service_parts_update_via_rpc on public.service_parts;
create policy service_parts_update_via_rpc
  on public.service_parts for update to authenticated
  using (
    company_id = (select private.current_company_id())
    and deleted_at is null
    and (select current_setting('app.service_parts_rpc', true)) = 'true'
  )
  with check (company_id = (select private.current_company_id()));

drop policy service_part_stock_movements_insert_via_rpc on public.service_part_stock_movements;
create policy service_part_stock_movements_insert_via_rpc
  on public.service_part_stock_movements for insert to authenticated
  with check (
    company_id = (select private.current_company_id())
    and (select current_setting('app.service_part_stock_rpc', true)) = 'true'
  );
