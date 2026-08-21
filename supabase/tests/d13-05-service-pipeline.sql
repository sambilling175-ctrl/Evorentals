-- D13-05: verify the live service pipeline contract without creating records.

begin;

do $$
declare
  v_status_check text;
  v_transition_function text;
  v_security_definer boolean;
  v_search_path text[];
  v_intake_trigger text;
  v_assignment_table boolean;
begin
  select pg_get_constraintdef(c.oid)
    into v_status_check
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'service_job_cards'
    and c.conname = 'service_job_cards_status_check';

  if v_status_check is null
    or v_status_check not like '%requested%'
    or v_status_check not like '%inspection%'
    or v_status_check not like '%in_service%'
    or v_status_check not like '%waiting_parts%'
    or v_status_check not like '%qc%'
    or v_status_check not like '%completed%' then
    raise exception 'D13-05 service job-card status contract is incomplete';
  end if;

  select pg_get_functiondef(p.oid), p.prosecdef, p.proconfig
    into v_transition_function, v_security_definer, v_search_path
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'transition_service_job_card'
    and pg_get_function_identity_arguments(p.oid) = 'p_job_card_id uuid, p_to_status text, p_notes text';

  if v_transition_function is null
    or v_security_definer
    or not ('search_path=""' = any(coalesce(v_search_path, array[]::text[])))
    or v_transition_function not like '%p_to_status not in%'
    or v_transition_function not like '%for update%' then
    raise exception 'D13-05 transition RPC is missing invoker, fixed-search-path, validation, or locking guards';
  end if;

  select string_agg(t.tgname, ', ' order by t.tgname)
    into v_intake_trigger
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'service_job_cards'
    and not t.tgisinternal
    and t.tgname in ('require_service_intake_before_inspection', 'service_job_cards_transition_guard');

  if v_intake_trigger is null
    or position('require_service_intake_before_inspection' in v_intake_trigger) = 0
    or position('service_job_cards_transition_guard' in v_intake_trigger) = 0 then
    raise exception 'D13-05 service pipeline transition guards are incomplete';
  end if;

  select exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'service_job_card_assignments'
  ) into v_assignment_table;

  if not v_assignment_table then
    raise exception 'D13-04 assignment dependency is missing from the pipeline';
  end if;
end;
$$;

rollback;
