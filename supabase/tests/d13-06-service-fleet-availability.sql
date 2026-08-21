-- D13-06: verify the fleet synchronization trigger contract without writes.

begin;

do $$
declare
  v_function text;
  v_security_definer boolean;
  v_search_path text[];
  v_trigger_exists boolean;
  v_bike_status_check text;
begin
  select pg_get_functiondef(p.oid), p.prosecdef, p.proconfig
    into v_function, v_security_definer, v_search_path
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'private'
    and p.proname = 'sync_service_job_card_fleet_status'
    and pg_get_function_identity_arguments(p.oid) = '';

  if v_function is null
    or v_security_definer
    or not ('search_path=""' = any(coalesce(v_search_path, array[]::text[])))
    or v_function not like '%''maintenance''%'
    or v_function not like '%''available''%'
    or v_function not like '%for update%' then
    raise exception 'D13-06 fleet sync function is missing invoker, fixed-search-path, locking, or status guards';
  end if;

  select exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'service_job_cards'
      and t.tgname = 'service_job_cards_fleet_status_sync'
      and not t.tgisinternal
  ) into v_trigger_exists;

  if not v_trigger_exists then
    raise exception 'D13-06 fleet status sync trigger is missing';
  end if;

  select pg_get_constraintdef(c.oid)
    into v_bike_status_check
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'bikes'
    and c.conname = 'bikes_status_check';

  if v_bike_status_check is null
    or v_bike_status_check not like '%available%'
    or v_bike_status_check not like '%maintenance%'
    or v_bike_status_check not like '%retired%' then
    raise exception 'D13-06 bike status contract does not support fleet release states';
  end if;
end;
$$;

rollback;
