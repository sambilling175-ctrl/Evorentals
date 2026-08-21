-- D12-03: rollback-only returned-rental collection acceptance test.
--
-- Run with the Supabase SQL editor / SQL tool as a database owner. The setup
-- rows and the successful collection are all rolled back before this script
-- returns. The RPC is exercised as the existing authenticated admin actor so
-- the test covers the production RLS and SECURITY INVOKER boundary.

begin;

create temporary table d12_03_result (
  check_name text primary key,
  observed text not null
);
grant insert, select on d12_03_result to authenticated;

do $$
declare
  v_actor_id uuid;
  v_company_id uuid;
  v_customer_id uuid;
  v_bike_id uuid;
  v_rental_id uuid;
  v_inspection_id uuid;
  v_damage_id uuid;
  v_invoice_id uuid;
  v_rental_line_id uuid;
  v_damage_line_id uuid;
  v_payment_id uuid;
  v_receipt_id uuid;
  v_receipt_number text;
  v_snapshot jsonb;
  v_result record;
  v_count integer;
  v_updated integer := 0;
  v_rejected boolean := false;
  v_suffix text := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
begin
  select p.id, p.company_id
    into v_actor_id, v_company_id
  from public.profiles p
  where p.status = 'active' and p.deleted_at is null and p.role in ('admin', 'super_admin')
  order by p.created_at
  limit 1;

  if v_actor_id is null or v_company_id is null then
    raise exception 'D12-03 requires an active profiled admin actor';
  end if;

  insert into public.customers(full_name, status, company_id, customer_number, created_by)
  values ('D12-03 Rollback Customer ' || v_suffix, 'active', v_company_id,
          'D12-' || v_suffix, v_actor_id)
  returning id into v_customer_id;

  insert into public.bikes(serial_number, model, status, company_id, current_odometer, created_by)
  values ('D12-03-' || v_suffix, 'D12-03 acceptance vehicle', 'available', v_company_id, 100, v_actor_id)
  returning id into v_bike_id;

  insert into public.rentals(
    bike_id, customer_id, started_at, ended_at, status, total_amount, company_id,
    rental_number, start_odometer, pricing_snapshot, contract_amount,
    extension_amount, original_bike_id, created_by
  ) values (
    v_bike_id, v_customer_id, now() - interval '2 hours', now() - interval '1 hour',
    'returned', 100, v_company_id, 'RNT-' || to_char(current_date, 'YYYYMMDD') || '-' || v_suffix,
    100, '{}'::jsonb, 100, 0, v_bike_id, v_actor_id
  ) returning id into v_rental_id;

  insert into public.rental_return_inspections(
    company_id, rental_id, bike_id, returned_at, return_odometer, battery_level,
    condition, checklist, vehicle_disposition, evidence_metadata, created_by
  ) values (
    v_company_id, v_rental_id, v_bike_id, now() - interval '1 hour', 120, 80,
    'damaged', '{"battery":true}'::jsonb, 'maintenance', '[]'::jsonb, v_actor_id
  ) returning id into v_inspection_id;

  insert into public.rental_damage_charges(
    company_id, rental_id, inspection_id, description, amount, evidence_metadata, created_by
  ) values (
    v_company_id, v_rental_id, v_inspection_id, 'D12-03 acceptance damage', 50, '[]'::jsonb, v_actor_id
  ) returning id into v_damage_id;

  insert into public.receivable_invoices(
    company_id, rental_id, customer_id, invoice_number, issued_at, due_at,
    subtotal, tax_amount, total_amount, source_snapshot, created_by
  ) values (
    v_company_id, v_rental_id, v_customer_id, 'INV-D12-' || v_suffix,
    now() - interval '30 minutes', now() + interval '7 days',
    150, 0, 150, '{"source":"D12-03 acceptance"}'::jsonb, v_actor_id
  ) returning id into v_invoice_id;

  insert into public.receivable_invoice_lines(
    company_id, invoice_id, line_type, description, quantity, unit_amount,
    line_amount, source_entity_id, source_metadata, created_by
  ) values (
    v_company_id, v_invoice_id, 'rental', 'D12-03 acceptance rental', 1, 100,
    100, v_rental_id, '{}'::jsonb, v_actor_id
  ) returning id into v_rental_line_id;

  insert into public.receivable_invoice_lines(
    company_id, invoice_id, line_type, description, quantity, unit_amount,
    line_amount, source_entity_id, source_metadata, created_by
  ) values (
    v_company_id, v_invoice_id, 'damage', 'D12-03 acceptance damage', 1, 50,
    50, v_damage_id, '{}'::jsonb, v_actor_id
  ) returning id into v_damage_line_id;

  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', v_actor_id::text, true);
  execute 'set local role authenticated';

  select * into v_result
  from public.post_returned_rental_collection(
    v_rental_id, 150, 'upi', 'D12-03-ROLLBACK-' || v_suffix, now(),
    jsonb_build_array(
      jsonb_build_object('invoiceLineId', v_rental_line_id, 'amount', 100),
      jsonb_build_object('invoiceLineId', v_damage_line_id, 'amount', 50)
    ), 'D12-03 rollback acceptance'
  );

  v_payment_id := v_result.payment_id;
  v_receipt_id := v_result.receipt_id;
  v_receipt_number := v_result.receipt_number;

  if v_result.allocated_amount <> 150 then
    raise exception 'D12-03 allocation amount mismatch: %', v_result.allocated_amount;
  end if;
  insert into d12_03_result values ('allocation total', v_result.allocated_amount::text);

  select r.allocation_snapshot into v_snapshot
  from public.receivable_receipts r
  where r.id = v_receipt_id;
  if jsonb_array_length(v_snapshot) <> 2
     or not exists (select 1 from jsonb_array_elements(v_snapshot) item where item ->> 'lineType' = 'rental' and (item ->> 'amount')::numeric = 100)
     or not exists (select 1 from jsonb_array_elements(v_snapshot) item where item ->> 'lineType' = 'damage' and (item ->> 'amount')::numeric = 50) then
    raise exception 'D12-03 receipt snapshot did not preserve rental and damage allocations';
  end if;
  insert into d12_03_result values ('receipt snapshot', 'rental=100; damage=50');

  select count(*) into v_count
  from public.receivable_payment_line_allocations
  where payment_id = v_payment_id;
  if v_count <> 2 then raise exception 'D12-03 expected two line allocations, got %', v_count; end if;
  select count(*) into v_count
  from public.receivable_receipt_events
  where receipt_id = v_receipt_id and event_type = 'issued';
  if v_count <> 1 then raise exception 'D12-03 expected one receipt event, got %', v_count; end if;
  insert into d12_03_result values ('history rows', 'line_allocations=2; receipt_events=1');

  begin
    perform public.post_returned_rental_collection(
      v_rental_id, 151, 'upi', null, now(),
      jsonb_build_array(jsonb_build_object('invoiceLineId', v_rental_line_id, 'amount', 150)), null
    );
  exception when others then
    v_rejected := true;
  end;
  if not v_rejected then raise exception 'D12-03 allocation mismatch was accepted'; end if;
  select count(*) into v_count from public.receivable_receipts;
  if v_count <> 1 then raise exception 'D12-03 rejected collection changed receipt count to %', v_count; end if;
  insert into d12_03_result values ('mismatch rejection', 'rejected; receipt_count=1');

  perform set_config('request.jwt.claim.role', 'authenticated', true);
  if not has_table_privilege('authenticated', 'public.receivable_receipts', 'SELECT') then
    raise exception 'D12-03 authenticated receipt SELECT grant is missing';
  end if;
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'receivable_receipts' and cmd = 'UPDATE'
  ) then
    raise exception 'D12-03 receipt UPDATE policy must remain absent';
  end if;
  begin
    update public.receivable_receipts set reference = 'D12-03-UNAUTHORIZED' where id = v_receipt_id;
    get diagnostics v_updated = row_count;
  exception when others then
    v_updated := 0;
  end;
  if v_updated <> 0 then raise exception 'D12-03 receipt update crossed the RLS boundary'; end if;
  insert into d12_03_result values ('receipt write boundary', 'UPDATE rejected; no UPDATE policy');
end;
$$;

select * from d12_03_result order by check_name;

rollback;
