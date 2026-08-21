-- D12-03: cover the foreign-key relationships introduced by D10-03.
-- The collection records are append-only. These indexes protect parent-row
-- deletes/joins and remove the advisor findings without changing business data.

create index if not exists receivable_line_allocations_company_payment_idx
  on public.receivable_payment_line_allocations(company_id, payment_id);
create index if not exists receivable_line_allocations_company_invoice_idx
  on public.receivable_payment_line_allocations(company_id, invoice_id);
create index if not exists receivable_line_allocations_payment_allocation_idx
  on public.receivable_payment_line_allocations(payment_allocation_id);
create index if not exists receivable_line_allocations_invoice_idx
  on public.receivable_payment_line_allocations(invoice_id);
create index if not exists receivable_line_allocations_invoice_line_idx
  on public.receivable_payment_line_allocations(invoice_line_id);
create index if not exists receivable_line_allocations_created_by_idx
  on public.receivable_payment_line_allocations(created_by);

create index if not exists receivable_receipts_company_payment_idx
  on public.receivable_receipts(company_id, payment_id);
create index if not exists receivable_receipts_customer_idx
  on public.receivable_receipts(customer_id);
create index if not exists receivable_receipts_rental_id_idx
  on public.receivable_receipts(rental_id);
create index if not exists receivable_receipts_created_by_idx
  on public.receivable_receipts(created_by);

create index if not exists receivable_receipt_events_receipt_id_idx
  on public.receivable_receipt_events(receipt_id);
create index if not exists receivable_receipt_events_actor_id_idx
  on public.receivable_receipt_events(actor_id);
