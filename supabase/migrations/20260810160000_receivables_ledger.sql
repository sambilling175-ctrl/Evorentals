-- D10-01: authoritative, append-only receivables ledger.

create unique index if not exists rentals_company_id_id_key on public.rentals(company_id, id);
create unique index if not exists customers_company_id_id_key on public.customers(company_id, id);

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
  constraint receivable_invoices_company_id_id_key unique (company_id, id),
  constraint receivable_invoices_one_rental_key unique (rental_id),
  constraint receivable_invoices_rental_company_fkey foreign key (company_id, rental_id) references public.rentals(company_id, id),
  constraint receivable_invoices_customer_company_fkey foreign key (company_id, customer_id) references public.customers(company_id, id),
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
  constraint receivable_invoice_lines_invoice_company_fkey foreign key (company_id, invoice_id) references public.receivable_invoices(company_id, id),
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
  constraint receivable_payments_company_number_key unique (company_id, payment_number),
  constraint receivable_payments_company_id_id_key unique (company_id, id),
  constraint receivable_payments_customer_company_fkey foreign key (company_id, customer_id) references public.customers(company_id, id)
);

create table public.receivable_payment_allocations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  payment_id uuid not null references public.receivable_payments(id),
  invoice_id uuid not null references public.receivable_invoices(id),
  amount numeric(12,2) not null check (amount > 0),
  allocated_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.profiles(id) on delete set null,
  constraint receivable_payment_allocations_pair_key unique (payment_id, invoice_id),
  constraint receivable_allocations_payment_company_fkey foreign key (company_id, payment_id) references public.receivable_payments(company_id, id),
  constraint receivable_allocations_invoice_company_fkey foreign key (company_id, invoice_id) references public.receivable_invoices(company_id, id)
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
  constraint receivable_deposits_rental_company_fkey foreign key (company_id, rental_id) references public.rentals(company_id, id),
  constraint receivable_deposits_customer_company_fkey foreign key (company_id, customer_id) references public.customers(company_id, id),
  constraint receivable_deposits_payment_company_fkey foreign key (company_id, payment_id) references public.receivable_payments(company_id, id),
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
  constraint receivable_refunds_rental_company_fkey foreign key (company_id, rental_id) references public.rentals(company_id, id),
  constraint receivable_refunds_customer_company_fkey foreign key (company_id, customer_id) references public.customers(company_id, id),
  constraint receivable_refunds_payment_company_fkey foreign key (company_id, payment_id) references public.receivable_payments(company_id, id),
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

create or replace function private.validate_receivable_allocation()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  v_payment_total numeric;
  v_payment_allocated numeric;
  v_invoice_total numeric;
  v_invoice_allocated numeric;
begin
  perform 1 from public.receivable_payments where id = new.payment_id for update;
  perform 1 from public.receivable_invoices where id = new.invoice_id for update;

  select amount into v_payment_total from public.receivable_payments where id = new.payment_id;
  select coalesce(sum(amount), 0) into v_payment_allocated
  from public.receivable_payment_allocations where payment_id = new.payment_id;
  if v_payment_allocated + new.amount > v_payment_total then
    raise exception 'Allocation exceeds unallocated payment amount';
  end if;

  select total_amount into v_invoice_total from public.receivable_invoices where id = new.invoice_id;
  select coalesce(sum(amount), 0) into v_invoice_allocated
  from public.receivable_payment_allocations where invoice_id = new.invoice_id;
  if v_invoice_allocated + new.amount > v_invoice_total then
    raise exception 'Allocation exceeds invoice balance';
  end if;
  return new;
end;
$$;

create trigger validate_receivable_allocation
before insert on public.receivable_payment_allocations
for each row execute function private.validate_receivable_allocation();

create or replace function public.issue_returned_rental_invoice(
  p_rental_id uuid,
  p_due_at timestamptz,
  p_notes text default null
)
returns table(invoice_id uuid, invoice_number text, total_amount numeric)
language plpgsql security invoker set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_company_id uuid;
  v_role text;
  v_rental public.rentals%rowtype;
  v_damage_total numeric := 0;
  v_invoice_id uuid := gen_random_uuid();
  v_invoice_number text;
  v_total numeric;
begin
  select p.company_id, p.role into v_company_id, v_role
  from public.profiles p
  where p.id = v_user_id and p.status = 'active' and p.deleted_at is null;
  if v_company_id is null then raise exception 'Active employee profile required'; end if;
  if v_role not in ('admin','super_admin') and not exists (
    select 1 from public.roles r where r.company_id = v_company_id and r.name = v_role
      and r.deleted_at is null
      and coalesce(r.permissions -> 'Payments', '[]'::jsonb) ?| array['Create','Edit','Manage']
  ) then raise exception 'You do not have permission to issue invoices'; end if;

  select * into v_rental from public.rentals r
  where r.id = p_rental_id and r.company_id = v_company_id and r.deleted_at is null
  for update;
  if not found then raise exception 'Rental not found'; end if;
  if v_rental.status <> 'returned' then raise exception 'Only returned rentals can be invoiced'; end if;
  if p_due_at < timezone('utc', now()) then raise exception 'Invoice due time cannot be in the past'; end if;
  if char_length(coalesce(p_notes, '')) > 2000 then raise exception 'Invoice notes cannot exceed 2000 characters'; end if;
  if not exists (select 1 from public.rental_return_inspections i where i.rental_id = v_rental.id and i.company_id = v_company_id) then
    raise exception 'Return inspection required before invoicing';
  end if;
  if exists (select 1 from public.receivable_invoices i where i.rental_id = v_rental.id) then
    raise exception 'Rental already has an invoice';
  end if;

  select coalesce(sum(d.amount), 0) into v_damage_total
  from public.rental_damage_charges d
  where d.rental_id = v_rental.id and d.company_id = v_company_id;
  v_total := round(coalesce(v_rental.total_amount, 0) + v_damage_total, 2);
  v_invoice_number := 'INV-' || to_char(timezone('Asia/Kolkata', now()), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.receivable_invoices(
    id, company_id, rental_id, customer_id, invoice_number, issued_at, due_at,
    subtotal, tax_amount, total_amount, source_snapshot, notes, created_by
  ) values (
    v_invoice_id, v_company_id, v_rental.id, v_rental.customer_id, v_invoice_number,
    timezone('utc', now()), p_due_at, v_total, 0, v_total,
    jsonb_build_object('version', 1, 'rentalAmount', v_rental.total_amount,
      'contractAmount', v_rental.contract_amount, 'extensionAmount', v_rental.extension_amount,
      'damageAmount', v_damage_total, 'rentalPricing', v_rental.pricing_snapshot),
    nullif(btrim(coalesce(p_notes, '')), ''), v_user_id
  );

  insert into public.receivable_invoice_lines(company_id, invoice_id, line_type, description, quantity, unit_amount, line_amount, source_entity_id, created_by)
  values (v_company_id, v_invoice_id, 'rental', 'Rental contract and extensions', 1, v_rental.total_amount, v_rental.total_amount, v_rental.id, v_user_id);

  insert into public.receivable_invoice_lines(company_id, invoice_id, line_type, description, quantity, unit_amount, line_amount, source_entity_id, source_metadata, created_by)
  select v_company_id, v_invoice_id, 'damage', d.description, 1, d.amount, d.amount, d.id,
         jsonb_build_object('inspectionId', d.inspection_id, 'evidenceMetadata', d.evidence_metadata), v_user_id
  from public.rental_damage_charges d where d.rental_id = v_rental.id and d.company_id = v_company_id;

  return query select v_invoice_id, v_invoice_number, v_total;
end;
$$;

create or replace function public.post_receivable_payment(
  p_customer_id uuid,
  p_amount numeric,
  p_method text,
  p_reference text,
  p_collected_at timestamptz,
  p_allocations jsonb,
  p_notes text default null
)
returns table(payment_id uuid, payment_number text, allocated_amount numeric)
language plpgsql security invoker set search_path = '' as $$
declare
  v_user_id uuid := auth.uid(); v_company_id uuid; v_role text;
  v_payment_id uuid := gen_random_uuid(); v_payment_number text;
  v_item jsonb; v_invoice_id uuid; v_amount numeric; v_allocated numeric := 0;
begin
  select p.company_id, p.role into v_company_id, v_role from public.profiles p
  where p.id = v_user_id and p.status = 'active' and p.deleted_at is null;
  if v_company_id is null then raise exception 'Active employee profile required'; end if;
  if v_role not in ('admin','super_admin') and not exists (
    select 1 from public.roles r where r.company_id = v_company_id and r.name = v_role and r.deleted_at is null
      and coalesce(r.permissions -> 'Payments', '[]'::jsonb) ?| array['Create','Edit','Manage']
  ) then raise exception 'You do not have permission to post payments'; end if;
  if p_amount <= 0 or round(p_amount, 2) <> p_amount then raise exception 'Payment amount must be positive with at most two decimals'; end if;
  if p_method not in ('cash','upi','card','bank_transfer','other') then raise exception 'Invalid payment method'; end if;
  if p_collected_at > now() + interval '15 minutes' then raise exception 'Collection time cannot be in the future'; end if;
  if jsonb_typeof(coalesce(p_allocations, '[]'::jsonb)) <> 'array' then raise exception 'Allocations must be an array'; end if;
  if not exists (select 1 from public.customers c where c.id = p_customer_id and c.company_id = v_company_id and c.deleted_at is null) then raise exception 'Customer not found'; end if;

  v_payment_number := 'PAY-' || to_char(timezone('Asia/Kolkata', now()), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  insert into public.receivable_payments(id, company_id, customer_id, payment_number, amount, method, reference, collected_at, collector_id, notes, created_by)
  values (v_payment_id, v_company_id, p_customer_id, v_payment_number, p_amount, p_method,
    nullif(btrim(coalesce(p_reference, '')), ''), p_collected_at, v_user_id,
    nullif(btrim(coalesce(p_notes, '')), ''), v_user_id);

  for v_item in select value from jsonb_array_elements(coalesce(p_allocations, '[]'::jsonb)) loop
    begin v_invoice_id := (v_item ->> 'invoiceId')::uuid; v_amount := (v_item ->> 'amount')::numeric;
    exception when others then raise exception 'Allocation invoice and amount are invalid'; end;
    if v_amount <= 0 or round(v_amount, 2) <> v_amount then raise exception 'Allocation amount must be positive with at most two decimals'; end if;
    if not exists (select 1 from public.receivable_invoices i where i.id = v_invoice_id and i.company_id = v_company_id and i.customer_id = p_customer_id) then raise exception 'Invoice is unavailable for this customer'; end if;
    insert into public.receivable_payment_allocations(company_id, payment_id, invoice_id, amount, created_by)
    values (v_company_id, v_payment_id, v_invoice_id, v_amount, v_user_id);
    v_allocated := v_allocated + v_amount;
  end loop;
  if v_allocated > p_amount then raise exception 'Allocations exceed payment amount'; end if;
  return query select v_payment_id, v_payment_number, v_allocated;
end;
$$;

revoke all on function public.issue_returned_rental_invoice(uuid,timestamptz,text) from public, anon;
grant execute on function public.issue_returned_rental_invoice(uuid,timestamptz,text) to authenticated;
revoke all on function public.post_receivable_payment(uuid,numeric,text,text,timestamptz,jsonb,text) from public, anon;
grant execute on function public.post_receivable_payment(uuid,numeric,text,text,timestamptz,jsonb,text) to authenticated;

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
