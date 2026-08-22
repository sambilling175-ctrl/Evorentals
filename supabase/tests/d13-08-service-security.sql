-- D13-08: verify service isolation, immutable history, fixed-search-path
-- routines, and dashboard query contracts without creating records.

begin;

do $$
declare
  v_table text;
  v_missing_tables text[];
  v_missing_policies text[];
  v_missing_triggers text[];
  v_missing_routines text[];
  v_missing_indexes text[];
  v_has_rls boolean;
begin
  select array_agg(required_name order by required_name)
    into v_missing_tables
  from unnest(array[
    'service_reasons', 'service_requests', 'service_job_cards',
    'service_job_card_events', 'service_intake_inspections',
    'service_job_card_assignments'
  ]) as required(required_name)
  where not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = required.required_name
      and c.relkind = 'r'
  );
  if v_missing_tables is not null then
    raise exception 'D13-08 service tables are missing: %', array_to_string(v_missing_tables, ', ');
  end if;

  foreach v_table in array array[
    'service_reasons', 'service_requests', 'service_job_cards',
    'service_job_card_events', 'service_intake_inspections',
    'service_job_card_assignments'
  ] loop
    select c.relrowsecurity into v_has_rls
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = v_table;
    if not coalesce(v_has_rls, false) then
      raise exception 'D13-08 table public.% does not have RLS enabled', v_table;
    end if;
    if has_table_privilege('anon', format('public.%s', v_table), 'SELECT') then
      raise exception 'D13-08 anonymous SELECT is unexpectedly granted on public.%', v_table;
    end if;
  end loop;

  select array_agg(required_name order by required_name)
    into v_missing_policies
  from unnest(array[
    'service_reasons_select_own_company',
    'service_reasons_insert_admin',
    'service_reasons_update_admin',
    'service_requests_select_own_company',
    'service_requests_insert_own_company',
    'service_job_cards_select_own_company',
    'service_job_cards_insert_own_company',
    'service_job_cards_update_own_company',
    'service_job_card_events_select_own_company',
    'service_job_card_events_insert_own_company',
    'service_intake_inspections_select_own_company',
    'service_intake_inspections_insert_own_company',
    'service_job_card_assignments_select_own_company',
    'service_job_card_assignments_insert_own_company'
  ]) as required(required_name)
  where not exists (
    select 1 from pg_policies p
    where p.schemaname = 'public' and p.policyname = required.required_name
  );
  if v_missing_policies is not null then
    raise exception 'D13-08 required service policies are missing: %', array_to_string(v_missing_policies, ', ');
  end if;

  select array_agg(required_name order by required_name)
    into v_missing_triggers
  from unnest(array[
    'service_job_cards_transition_guard',
    'service_job_cards_event_history',
    'require_service_intake_before_inspection',
    'service_job_cards_fleet_status_sync',
    'service_intake_inspection_insert_guard',
    'protect_service_intake_inspection_history',
    'service_job_card_assignments_guard',
    'protect_service_job_card_assignments_history',
    'protect_service_job_card_events_history'
  ]) as required(required_name)
  where not exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and t.tgname = required.required_name
      and not t.tgisinternal
  );
  if v_missing_triggers is not null then
    raise exception 'D13-08 required service triggers are missing: %', array_to_string(v_missing_triggers, ', ');
  end if;

  select array_agg(required_name order by required_name)
    into v_missing_routines
  from unnest(array[
    'private.enforce_service_job_card_transition',
    'private.record_service_job_card_event',
    'private.require_service_intake_before_inspection',
    'private.sync_service_job_card_fleet_status',
    'private.enforce_service_intake_inspection_insert',
    'private.protect_service_intake_inspection_history',
    'private.enforce_service_job_card_assignment',
    'private.protect_service_job_card_assignment_history',
    'private.protect_service_job_card_history',
    'public.create_service_request',
    'public.create_service_job_card',
    'public.transition_service_job_card',
    'public.record_service_intake_inspection',
    'public.assign_service_job_card'
  ]) as required(required_name)
  where not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where format('%s.%s', n.nspname, p.proname) = required.required_name
  );
  if v_missing_routines is not null then
    raise exception 'D13-08 required service routines are missing: %', array_to_string(v_missing_routines, ', ');
  end if;

  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where ((n.nspname = 'private' and p.proname like '%service%')
       or (n.nspname = 'public' and p.proname in (
         'create_service_request', 'create_service_job_card',
         'transition_service_job_card', 'record_service_intake_inspection',
         'assign_service_job_card'
       )))
      and (p.prosecdef or not ('search_path=""' = any(coalesce(p.proconfig, array[]::text[]))))
  ) then
    raise exception 'D13-08 service routine security contract is incomplete';
  end if;

  select array_agg(required_name order by required_name)
    into v_missing_indexes
  from unnest(array[
    'service_reasons_company_active_idx',
    'service_requests_company_status_idx',
    'service_job_cards_company_status_idx',
    'service_job_card_events_job_card_idx',
    'service_intake_inspections_company_time_idx',
    'service_job_card_assignments_job_card_idx'
  ]) as required(required_name)
  where not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = required.required_name and c.relkind = 'i'
  );
  if v_missing_indexes is not null then
    raise exception 'D13-08 service dashboard/security indexes are missing: %', array_to_string(v_missing_indexes, ', ');
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'service_job_cards'
      and column_name in ('status', 'created_at', 'completed_at')
    group by table_name having count(*) = 3
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'service_requests'
      and column_name in ('priority', 'requested_at')
    group by table_name having count(*) = 2
  ) then
    raise exception 'D13-08 dashboard metric source columns are incomplete';
  end if;

  if has_function_privilege('anon', 'public.create_service_request(uuid,uuid,text,text,uuid,uuid,text)'::regprocedure, 'EXECUTE')
    or has_function_privilege('anon', 'public.create_service_job_card(uuid)'::regprocedure, 'EXECUTE')
    or has_function_privilege('anon', 'public.transition_service_job_card(uuid,text,text)'::regprocedure, 'EXECUTE')
    or has_function_privilege('anon', 'public.record_service_intake_inspection(uuid,integer,integer,text,jsonb,text,jsonb)'::regprocedure, 'EXECUTE')
    or has_function_privilege('anon', 'public.assign_service_job_card(uuid,text,uuid,text,text,text,text,text)'::regprocedure, 'EXECUTE') then
    raise exception 'D13-08 anonymous service routine execution is unexpectedly granted';
  end if;
end;
$$;

rollback;
