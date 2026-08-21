-- D4-05: two-company company-scope integration test.
--
-- The test is intentionally transaction-only. It reuses the existing
-- authenticated actor, creates a temporary second company, exercises the
-- exposed RLS tables under the actor's JWT claims, and rolls every write back.

begin;

do $$
declare
  company_a uuid;
  company_b uuid;
  user_a uuid;
  customer_a uuid;
  customer_b uuid;
  bike_a uuid;
  bike_b uuid;
  rental_a uuid;
  rental_b uuid;
  suffix text := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  visible_count integer;
  denied boolean;
begin
  -- Reuse the existing bootstrap actor/company for the in-scope side. This
  -- avoids creating Auth users (the hosted SQL role cannot own auth.users).
  select id, company_id into user_a, company_a
  from public.profiles
  order by created_at
  limit 1;
  if user_a is null or company_a is null then
    raise exception 'D4-05 requires an existing profiled company actor';
  end if;

  insert into public.companies(name, slug)
    values ('RLS Test Company B ' || suffix, 'rls-test-b-' || lower(suffix))
    returning id into company_b;

  insert into public.customers(full_name, status, company_id, customer_number, created_by)
    values ('RLS Customer A', 'active', company_a, 'RLS-CUST-A-' || suffix, user_a)
    returning id into customer_a;
  insert into public.customers(full_name, status, company_id, customer_number, created_by)
    values ('RLS Customer B', 'active', company_b, 'RLS-CUST-B-' || suffix, user_a)
    returning id into customer_b;

  insert into public.bikes(serial_number, model, status, company_id, current_odometer, created_by)
    values ('RLS-BIKE-A-' || suffix, 'RLS Test EV', 'available', company_a, 10, user_a)
    returning id into bike_a;
  insert into public.bikes(serial_number, model, status, company_id, current_odometer, created_by)
    values ('RLS-BIKE-B-' || suffix, 'RLS Test EV', 'available', company_b, 10, user_a)
    returning id into bike_b;

  insert into public.rentals(
    bike_id, customer_id, started_at, status, total_amount, company_id,
    rental_number, start_odometer, pricing_snapshot, contract_amount,
    extension_amount, original_bike_id, created_by
  ) values (
    bike_a, customer_a, now() - interval '1 hour', 'active', 100, company_a,
    'RNT-' || to_char(current_date, 'YYYYMMDD') || '-RLSA01', 10, '{}'::jsonb, 100, 0, bike_a, user_a
  ) returning id into rental_a;

  insert into public.rentals(
    bike_id, customer_id, started_at, status, total_amount, company_id,
    rental_number, start_odometer, pricing_snapshot, contract_amount,
    extension_amount, original_bike_id, created_by
  ) values (
    bike_b, customer_b, now() - interval '1 hour', 'active', 100, company_b,
    'RNT-' || to_char(current_date, 'YYYYMMDD') || '-RLSB01', 10, '{}'::jsonb, 100, 0, bike_b, user_a
  ) returning id into rental_b;

  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', user_a::text, true);
  execute 'set local role authenticated';

  select count(*) into visible_count from public.customers where id = customer_a;
  if visible_count <> 1 then raise exception 'D4-05 customer isolation failed for company A: %', visible_count; end if;
  select count(*) into visible_count from public.bikes where id = bike_a;
  if visible_count <> 1 then raise exception 'D4-05 bike isolation failed for company A: %', visible_count; end if;
  select count(*) into visible_count from public.rentals where id = rental_a;
  if visible_count <> 1 then raise exception 'D4-05 rental isolation failed for company A: %', visible_count; end if;
  select count(*) into visible_count from public.customers where id = customer_b;
  if visible_count <> 0 then raise exception 'D4-05 cross-company customer became visible to A'; end if;

  denied := false;
  begin
    insert into public.customers(full_name, status, company_id, customer_number, created_by)
      values ('RLS Should Be Denied', 'active', company_b, 'RLS-DENIED-' || suffix, user_a);
  exception when others then
    denied := true;
  end;
  if not denied then raise exception 'D4-05 cross-company customer insert was not denied'; end if;

  -- The same authenticated actor must never see the second company's rows.
  select count(*) into visible_count from public.customers where id = customer_b;
  if visible_count <> 0 then raise exception 'D4-05 company B customer became visible to A'; end if;
  select count(*) into visible_count from public.bikes where id = bike_b;
  if visible_count <> 0 then raise exception 'D4-05 company B bike became visible to A'; end if;
  select count(*) into visible_count from public.rentals where id = rental_b;
  if visible_count <> 0 then raise exception 'D4-05 company B rental became visible to A'; end if;
end;
$$;

rollback;
