-- D12-03: complete covering-index support for the receipt customer tenancy key.
create index if not exists receivable_receipts_company_customer_idx
  on public.receivable_receipts(company_id, customer_id);
