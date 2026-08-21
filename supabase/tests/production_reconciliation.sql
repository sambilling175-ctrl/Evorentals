-- D12-05: read-only production reconciliation.
-- Run in the Supabase SQL editor or through the Supabase SQL tool.
-- This query must remain read-only and must not create test/business records.

with open_rental_duplicates as (
  select bike_id
  from public.rentals
  where status in ('active', 'overdue')
    and deleted_at is null
  group by bike_id
  having count(*) > 1
),
open_rental_vehicle_mismatch as (
  select r.id
  from public.rentals r
  left join public.bikes b on b.id = r.bike_id
  where r.status in ('active', 'overdue')
    and r.deleted_at is null
    and (
      b.id is null
      or b.deleted_at is not null
      or b.status in ('maintenance', 'retired', 'reserved')
    )
),
settlement_missing_return as (
  select s.id
  from public.rental_settlements s
  left join public.rental_return_inspections i on i.rental_id = s.rental_id
  where i.id is null
),
settlement_bad_status as (
  select s.id
  from public.rental_settlements s
  join public.rentals r on r.id = s.rental_id
  where r.status <> 'completed'
),
invoice_allocation_over as (
  select i.id
  from public.receivable_invoices i
  left join (
    select invoice_id, sum(amount) as amount
    from public.receivable_payment_allocations
    group by invoice_id
  ) a on a.invoice_id = i.id
  where coalesce(a.amount, 0) > i.total_amount
),
payment_allocation_over as (
  select p.id
  from public.receivable_payments p
  left join (
    select payment_id, sum(amount) as amount
    from public.receivable_payment_allocations
    group by payment_id
  ) a on a.payment_id = p.id
  where coalesce(a.amount, 0) > p.amount
),
line_allocation_over as (
  select l.id
  from public.receivable_invoice_lines l
  left join (
    select invoice_line_id, sum(amount) as amount
    from public.receivable_payment_line_allocations
    group by invoice_line_id
  ) a on a.invoice_line_id = l.id
  where coalesce(a.amount, 0) > l.line_amount
)
select
  (select count(*) from public.rentals where status in ('active', 'overdue') and deleted_at is null) as open_rentals,
  (select count(*) from public.bikes where deleted_at is null) as bikes,
  (select count(*) from open_rental_duplicates) as duplicate_open_vehicle_groups,
  (select count(*) from open_rental_vehicle_mismatch) as open_vehicle_mismatches,
  (select count(*) from settlement_missing_return) as settlements_without_return_inspection,
  (select count(*) from settlement_bad_status) as settlements_with_bad_rental_status,
  (select count(*) from invoice_allocation_over) as invoices_over_allocated,
  (select count(*) from payment_allocation_over) as payments_over_allocated,
  (select count(*) from line_allocation_over) as invoice_lines_over_allocated,
  (select count(*) from public.receivable_invoices) as invoices,
  (select count(*) from public.receivable_payment_allocations) as invoice_allocations,
  (select count(*) from public.receivable_payments) as payments,
  (select count(*) from public.rental_settlements) as settlements;
