-- D10-03-H1: allow authenticated transactional RPCs to lock immutable
-- receivable facts without weakening company isolation or history protection.

grant update on table public.receivable_invoices,
  public.receivable_invoice_lines to authenticated;

create policy receivable_invoices_company_update
  on public.receivable_invoices
  for update to authenticated
  using (company_id = (select private.current_company_id()))
  with check (company_id = (select private.current_company_id()));

create policy receivable_invoice_lines_company_update
  on public.receivable_invoice_lines
  for update to authenticated
  using (company_id = (select private.current_company_id()))
  with check (company_id = (select private.current_company_id()));
