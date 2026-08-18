-- D10-01 advisor hardening: cover every receivables foreign key.

create index receivable_invoices_rental_company_idx on public.receivable_invoices(company_id, rental_id);
create index receivable_invoices_customer_id_idx on public.receivable_invoices(customer_id);
create index receivable_invoices_created_by_idx on public.receivable_invoices(created_by) where created_by is not null;

create index receivable_invoice_lines_created_by_idx on public.receivable_invoice_lines(created_by) where created_by is not null;

create index receivable_payments_customer_id_idx on public.receivable_payments(customer_id);
create index receivable_payments_created_by_idx on public.receivable_payments(created_by) where created_by is not null;

create index receivable_allocations_payment_company_idx on public.receivable_payment_allocations(company_id, payment_id);
create index receivable_allocations_invoice_id_idx on public.receivable_payment_allocations(invoice_id);
create index receivable_allocations_created_by_idx on public.receivable_payment_allocations(created_by) where created_by is not null;

create index receivable_deposits_rental_id_idx on public.receivable_deposit_movements(rental_id);
create index receivable_deposits_customer_id_idx on public.receivable_deposit_movements(customer_id);
create index receivable_deposits_payment_id_idx on public.receivable_deposit_movements(payment_id) where payment_id is not null;
create index receivable_deposits_payment_company_idx on public.receivable_deposit_movements(company_id, payment_id) where payment_id is not null;
create index receivable_deposits_created_by_idx on public.receivable_deposit_movements(created_by) where created_by is not null;

create index receivable_refunds_customer_id_idx on public.receivable_refunds(customer_id);
create index receivable_refunds_payment_id_idx on public.receivable_refunds(payment_id) where payment_id is not null;
create index receivable_refunds_payment_company_idx on public.receivable_refunds(company_id, payment_id) where payment_id is not null;
create index receivable_refunds_rental_company_idx on public.receivable_refunds(company_id, rental_id) where rental_id is not null;
create index receivable_refunds_created_by_idx on public.receivable_refunds(created_by) where created_by is not null;
