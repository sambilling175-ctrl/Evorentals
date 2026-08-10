-- D10-01: authoritative, append-only receivables ledger.

create table public.receivable_invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  rental_id uuid not null references public.rentals(id),
  customer_id uuid not null references public.customers(id),
  invoice_number text not null,
  currency text not null default 'INR' check (currency = 'INR'),
  issued_at timestamptz not null,
  due_at timestamptz not null,
  subtotal numeric(12,2) not null check (subtotal >= 0),
  tax_amount numeric(12,2) not null default 0 check (tax_amount >= 0),
  total_amount numeric(12,2) not null check (total_amount >= 0),
  source_snapshot jsonb not null check (jsonb_typeof(source_snapshot) = 'object'),
  notes text check (notes is null or char_length(notes) <= 2000),
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.profiles(id) on delete set null,
  constraint receivable_invoices_company_number_key unique (company_id, invoice_number),
  constraint receivable_invoices_one_rental_key unique (rental_id),
  constraint receivable_invoices_due_check check (due_at >= issued_at),
  constraint receivable_invoices_total_check check (total_amount = subtotal + tax_amount)
);

create table public.receivable_invoice_lines (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  invoice_id uuid not null references public.receivable_invoices(id),
  line_type text not null check (line_type in ('rental','extension','damage','late_fee','adjustment')),
  description text not null check (char_length(btrim(description)) between 3 and 500),
  quantity numeric(12,3) not null default 1 check (quantity > 0),
  unit_amount numeric(12,2) not null,
  line_amount numeric(12,2) not null,
  source_entity_id uuid,
  source_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(source_metadata) = 'object'),
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.profiles(id) on delete set null,
  constraint receivable_invoice_lines_amount_check check (line_amount = round(quantity * unit_amount, 2))
);

create table public.receivable_payments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  customer_id uuid not null references public.customers(id),
  payment_number text not null,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'INR' check (currency = 'INR'),
  method text not null check (method in ('cash','upi','card','bank_transfer','other')),
  reference text check (reference is null or char_length(reference) <= 200),
  collected_at timestamptz not null,
  collector_id uuid references public.profiles(id) on delete set null,
  notes text check (notes is null or char_length(notes) <= 1000),
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.profiles(id) on delete set null,
  constraint receivable_payments_company_number_key unique (company_id, payment_number)
);

create table public.receivable_payment_allocations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  payment_id uuid not null references public.receivable_payments(id),
  invoice_id uuid not null references public.receivable_invoices(id),
  amount numeric(12,2) not null check (amount > 0),
  allocated_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.profiles(id) on delete set null,
  constraint receivable_payment_allocations_pair_key unique (payment_id, invoice_id)
);

create table public.receivable_deposit_movements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  rental_id uuid not null references public.rentals(id),
  customer_id uuid not null references public.customers(id),
  payment_id uuid references public.receivable_payments(id),
  movement_type text not null check (movement_type in ('received','applied','refunded','forfeited','reversed')),
  amount numeric(12,2) not null check (amount > 0),
  occurred_at timestamptz not null,
  reason text check (reason is null or char_length(reason) <= 1000),
  reverses_movement_id uuid references public.receivable_deposit_movements(id),
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.profiles(id) on delete set null,
  constraint receivable_deposit_reversal_key unique (reverses_movement_id),
  constraint receivable_deposit_reversal_check check ((movement_type = 'reversed') = (reverses_movement_id is not null))
);

create table public.receivable_refunds (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  customer_id uuid not null references public.customers(id),
  rental_id uuid references public.rentals(id),
  payment_id uuid references public.receivable_payments(id),
  refund_number text not null,
  amount numeric(12,2) not null check (amount > 0),
  method text not null check (method in ('cash','upi','card','bank_transfer','other')),
  reference text check (reference is null or char_length(reference) <= 200),
  refunded_at timestamptz not null,
  reason text not null check (char_length(btrim(reason)) between 3 and 1000),
  reverses_refund_id uuid references public.receivable_refunds(id),
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.profiles(id) on delete set null,
  constraint receivable_refunds_company_number_key unique (company_id, refund_number),
  constraint receivable_refund_reversal_key unique (reverses_refund_id)
);

create index receivable_invoices_company_due_idx on public.receivable_invoices(company_id, due_at, created_at desc);
create index receivable_invoices_customer_idx on public.receivable_invoices(company_id, customer_id, created_at desc);
create index receivable_invoice_lines_invoice_idx on public.receivable_invoice_lines(invoice_id, created_at);
create index receivable_invoice_lines_company_idx on public.receivable_invoice_lines(company_id, invoice_id);
create index receivable_payments_customer_idx on public.receivable_payments(company_id, customer_id, collected_at desc);
create index receivable_payments_collector_idx on public.receivable_payments(collector_id) where collector_id is not null;
create index receivable_allocations_invoice_idx on public.receivable_payment_allocations(company_id, invoice_id, allocated_at);
create index receivable_allocations_payment_idx on public.receivable_payment_allocations(payment_id, allocated_at);
create index receivable_deposits_rental_idx on public.receivable_deposit_movements(company_id, rental_id, occurred_at);
create index receivable_deposits_customer_idx on public.receivable_deposit_movements(company_id, customer_id, occurred_at);
create index receivable_refunds_customer_idx on public.receivable_refunds(company_id, customer_id, refunded_at desc);
create index receivable_refunds_rental_idx on public.receivable_refunds(rental_id, refunded_at desc) where rental_id is not null;

alter table public.receivable_invoices enable row level security;
alter table public.receivable_invoice_lines enable row level security;
alter table public.receivable_payments enable row level security;
alter table public.receivable_payment_allocations enable row level security;
alter table public.receivable_deposit_movements enable row level security;
alter table public.receivable_refunds enable row level security;

revoke all on table public.receivable_invoices, public.receivable_invoice_lines,
  public.receivable_payments, public.receivable_payment_allocations,
  public.receivable_deposit_movements, public.receivable_refunds from public, anon;
grant select, insert on table public.receivable_invoices, public.receivable_invoice_lines,
  public.receivable_payments, public.receivable_payment_allocations,
  public.receivable_deposit_movements, public.receivable_refunds to authenticated;

create policy receivable_invoices_company_select on public.receivable_invoices for select to authenticated using (company_id = (select private.current_company_id()));
create policy receivable_invoices_company_insert on public.receivable_invoices for insert to authenticated with check (company_id = (select private.current_company_id()));
create policy receivable_invoice_lines_company_select on public.receivable_invoice_lines for select to authenticated using (company_id = (select private.current_company_id()));
create policy receivable_invoice_lines_company_insert on public.receivable_invoice_lines for insert to authenticated with check (company_id = (select private.current_company_id()));
create policy receivable_payments_company_select on public.receivable_payments for select to authenticated using (company_id = (select private.current_company_id()));
create policy receivable_payments_company_insert on public.receivable_payments for insert to authenticated with check (company_id = (select private.current_company_id()));
create policy receivable_allocations_company_select on public.receivable_payment_allocations for select to authenticated using (company_id = (select private.current_company_id()));
create policy receivable_allocations_company_insert on public.receivable_payment_allocations for insert to authenticated with check (company_id = (select private.current_company_id()));
create policy receivable_deposits_company_select on public.receivable_deposit_movements for select to authenticated using (company_id = (select private.current_company_id()));
create policy receivable_deposits_company_insert on public.receivable_deposit_movements for insert to authenticated with check (company_id = (select private.current_company_id()));
create policy receivable_refunds_company_select on public.receivable_refunds for select to authenticated using (company_id = (select private.current_company_id()));
create policy receivable_refunds_company_insert on public.receivable_refunds for insert to authenticated with check (company_id = (select private.current_company_id()));

create or replace function private.protect_receivables_history()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  raise exception 'Receivables history is immutable; post a reversal instead';
end;
$$;

create trigger protect_receivable_invoices before update or delete on public.receivable_invoices for each row execute function private.protect_receivables_history();
create trigger protect_receivable_invoice_lines before update or delete on public.receivable_invoice_lines for each row execute function private.protect_receivables_history();
create trigger protect_receivable_payments before update or delete on public.receivable_payments for each row execute function private.protect_receivables_history();
create trigger protect_receivable_allocations before update or delete on public.receivable_payment_allocations for each row execute function private.protect_receivables_history();
create trigger protect_receivable_deposits before update or delete on public.receivable_deposit_movements for each row execute function private.protect_receivables_history();
create trigger protect_receivable_refunds before update or delete on public.receivable_refunds for each row execute function private.protect_receivables_history();

create view public.receivable_invoice_balances
with (security_invoker = true)
as
select i.id as invoice_id, i.company_id, i.rental_id, i.customer_id,
       i.invoice_number, i.issued_at, i.due_at, i.total_amount,
       coalesce(sum(a.amount), 0)::numeric(12,2) as allocated_amount,
       (i.total_amount - coalesce(sum(a.amount), 0))::numeric(12,2) as balance_due
from public.receivable_invoices i
left join public.receivable_payment_allocations a on a.invoice_id = i.id
group by i.id;

revoke all on table public.receivable_invoice_balances from public, anon;
grant select on table public.receivable_invoice_balances to authenticated;
