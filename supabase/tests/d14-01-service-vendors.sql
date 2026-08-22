-- D14-01: vendor/garage directory security and RPC contract.
-- This is catalog-only and must never create production business records.

begin;

do $$
declare
  v_missing text[];
begin
  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'service_vendors' and c.relkind = 'r' and c.relrowsecurity
  ) then
    raise exception 'D14-01 service_vendors is missing or RLS is disabled';
  end if;

  if has_table_privilege('anon', 'public.service_vendors', 'SELECT') then
    raise exception 'D14-01 anonymous SELECT is unexpectedly granted on service_vendors';
  end if;

  select array_agg(required_name order by required_name)
    into v_missing
  from unnest(array[
    'service_vendors_select_own_company',
    'service_vendors_insert_own_company',
    'service_vendors_update_own_company'
  ]) as required(required_name)
  where not exists (
    select 1 from pg_policies p
    where p.schemaname = 'public' and p.policyname = required.required_name
  );
  if v_missing is not null then
    raise exception 'D14-01 vendor policies are missing: %', array_to_string(v_missing, ', ');
  end if;

  select array_agg(required_name order by required_name)
    into v_missing
  from unnest(array[
    'service_vendors_company_type_name_idx',
    'service_vendors_company_active_type_idx',
    'service_vendors_company_updated_idx'
  ]) as required(required_name)
  where not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = required.required_name and c.relkind = 'i'
  );
  if v_missing is not null then
    raise exception 'D14-01 vendor indexes are missing: %', array_to_string(v_missing, ', ');
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'service_vendors'
      and column_name in ('company_id', 'vendor_type', 'name', 'phone', 'email', 'address', 'gstin', 'is_active', 'deleted_at')
    group by table_name having count(*) = 9
  ) then
    raise exception 'D14-01 vendor directory columns are incomplete';
  end if;

  if exists (
    select 1
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('create_service_vendor', 'update_service_vendor', 'archive_service_vendor')
      and (p.prosecdef or not ('search_path=""' = any(coalesce(p.proconfig, array[]::text[]))))
  ) then
    raise exception 'D14-01 vendor routines must be SECURITY INVOKER with an empty search_path';
  end if;

  if has_function_privilege('anon', 'public.create_service_vendor(text,text,text,text,text,text,text,text)'::regprocedure, 'EXECUTE')
    or has_function_privilege('anon', 'public.update_service_vendor(uuid,text,text,text,text,text,text,text,text,boolean)'::regprocedure, 'EXECUTE')
    or has_function_privilege('anon', 'public.archive_service_vendor(uuid)'::regprocedure, 'EXECUTE') then
    raise exception 'D14-01 anonymous vendor RPC execution is unexpectedly granted';
  end if;
end;
$$;

rollback;
