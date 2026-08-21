begin;

do $$
begin
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'service_job_card_assignments'
  ) then
    raise exception 'D13-04 assignment table is missing';
  end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'assign_service_job_card'
  ) then
    raise exception 'D13-04 assignment RPC is missing';
  end if;
end;
$$;

rollback;
