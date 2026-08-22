-- D14-02: spare-parts catalogue and immutable stock movement contract.
-- Catalog-only rollback test; it must never create production business records.

begin;

do $$
declare
  v_missing text[];
begin
  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'service_parts' and c.relkind = 'r' and c.relrowsecurity
  ) then
    raise exception 'D14-02 service_parts is missing or RLS is disabled';
  end if;
  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'service_part_stock_movements' and c.relkind = 'r' and c.relrowsecurity
  ) then
    raise exception 'D14-02 stock movement table is missing or RLS is disabled';
  end if;
  if has_table_privilege('anon', 'public.service_parts', 'SELECT')
    or has_table_privilege('anon', 'public.service_part_stock_movements', 'SELECT') then
    raise exception 'D14-02 anonymous table access is unexpectedly granted';
  end if;

  select array_agg(required_name order by required_name) into v_missing
  from unnest(array[
    'service_parts_select_own_company',
    'service_parts_insert_via_rpc',
    'service_parts_update_via_rpc',
    'service_part_stock_movements_select_own_company',
    'service_part_stock_movements_insert_via_rpc'
  ]) as required(required_name)
  where not exists (
    select 1 from pg_policies p
    where p.schemaname = 'public' and p.policyname = required.required_name
  );
  if v_missing is not null then
    raise exception 'D14-02 part policies are missing: %', array_to_string(v_missing, ', ');
  end if;

  select array_agg(required_name order by required_name) into v_missing
  from unnest(array[
    'service_parts_company_number_idx',
    'service_parts_company_active_category_idx',
    'service_parts_company_updated_idx',
    'service_part_stock_movements_company_part_time_idx',
    'service_part_stock_movements_company_reference_idx'
  ]) as required(required_name)
  where not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = required.required_name and c.relkind = 'i'
  );
  if v_missing is not null then
    raise exception 'D14-02 part indexes are missing: %', array_to_string(v_missing, ', ');
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'service_parts'
      and column_name in ('company_id', 'part_number', 'name', 'category', 'unit', 'reorder_level', 'unit_cost', 'is_active', 'deleted_at')
    group by table_name having count(*) = 9
  ) then
    raise exception 'D14-02 parts catalogue columns are incomplete';
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'service_part_stock_movements'
      and column_name in ('company_id', 'part_id', 'movement_type', 'quantity_delta', 'quantity_before', 'quantity_after', 'unit_cost', 'occurred_at')
    group by table_name having count(*) = 8
  ) then
    raise exception 'D14-02 stock movement columns are incomplete';
  end if;

  if not exists (
    select 1 from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'service_part_stock_movements' and t.tgname = 'service_part_stock_movements_immutable'
  ) then
    raise exception 'D14-02 immutable stock trigger is missing';
  end if;
  if not exists (
    select 1 from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'service_part_stock_movements' and t.tgname = 'service_part_stock_rpc_guard'
  ) then
    raise exception 'D14-02 stock RPC guard is missing';
  end if;

  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('create_service_part', 'update_service_part', 'archive_service_part', 'record_service_part_stock_movement')
      and (p.prosecdef or not ('search_path=""' = any(coalesce(p.proconfig, array[]::text[]))))
  ) then
    raise exception 'D14-02 part routines must be SECURITY INVOKER with an empty search_path';
  end if;

  if has_function_privilege('anon', 'public.create_service_part(text,text,text,text,text,integer,numeric)'::regprocedure, 'EXECUTE')
    or has_function_privilege('anon', 'public.update_service_part(uuid,text,text,text,text,text,integer,numeric,boolean)'::regprocedure, 'EXECUTE')
    or has_function_privilege('anon', 'public.archive_service_part(uuid)'::regprocedure, 'EXECUTE')
    or has_function_privilege('anon', 'public.record_service_part_stock_movement(uuid,text,integer,numeric,text,uuid,text)'::regprocedure, 'EXECUTE') then
    raise exception 'D14-02 anonymous part RPC execution is unexpectedly granted';
  end if;
end;
$$;

rollback;
