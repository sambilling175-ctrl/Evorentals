-- D10-03: returned-rental line allocations with immutable receipts and audit history.

create unique index receivable_invoice_lines_company_id_id_key on public.receivable_invoice_lines(company_id, id);

create table public.receivable_payment_line_allocations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  payment_id uuid not null references public.receivable_payments(id),
  payment_allocation_id uuid not null references public.receivable_payment_allocations(id),
  invoice_id uuid not null references public.receivable_invoices(id),
  invoice_line_id uuid not null references public.receivable_invoice_lines(id),
  amount numeric(12,2) not null check (amount > 0),
  allocated_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.profiles(id) on delete set null,
  constraint receivable_line_allocations_payment_line_key unique (payment_id, invoice_line_id),
  constraint receivable_line_allocations_payment_company_fkey foreign key (company_id, payment_id) references public.receivable_payments(company_id, id),
  constraint receivable_line_allocations_invoice_company_fkey foreign key (company_id, invoice_id) references public.receivable_invoices(company_id, id),
  constraint receivable_line_allocations_line_company_fkey foreign key (company_id, invoice_line_id) references public.receivable_invoice_lines(company_id, id)
);

create table public.receivable_receipts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  payment_id uuid not null references public.receivable_payments(id),
  rental_id uuid not null references public.rentals(id),
  customer_id uuid not null references public.customers(id),
  receipt_number text not null,
  issued_at timestamptz not null,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'INR' check (currency = 'INR'),
  method text not null check (method in ('cash','upi','card','bank_transfer','other')),
  reference text check (reference is null or char_length(reference) <= 200),
  allocation_snapshot jsonb not null check (jsonb_typeof(allocation_snapshot) = 'array'),
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.profiles(id) on delete set null,
  constraint receivable_receipts_company_number_key unique (company_id, receipt_number),
  constraint receivable_receipts_payment_key unique (payment_id),
  constraint receivable_receipts_payment_company_fkey foreign key (company_id, payment_id) references public.receivable_payments(company_id, id),
  constraint receivable_receipts_rental_company_fkey foreign key (company_id, rental_id) references public.rentals(company_id, id),
  constraint receivable_receipts_customer_company_fkey foreign key (company_id, customer_id) references public.customers(company_id, id)
);

create unique index receivable_receipts_company_id_id_key on public.receivable_receipts(company_id, id);

create table public.receivable_receipt_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  receipt_id uuid not null references public.receivable_receipts(id),
  event_type text not null check (event_type in ('issued')),
  occurred_at timestamptz not null default timezone('utc', now()),
  actor_id uuid references public.profiles(id) on delete set null,
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  constraint receivable_receipt_events_receipt_company_fkey foreign key (company_id, receipt_id) references public.receivable_receipts(company_id, id)
);

create index receivable_line_allocations_line_idx on public.receivable_payment_line_allocations(company_id, invoice_line_id, allocated_at);
create index receivable_line_allocations_payment_idx on public.receivable_payment_line_allocations(payment_id, allocated_at);
create index receivable_receipts_rental_idx on public.receivable_receipts(company_id, rental_id, issued_at desc);
create index receivable_receipt_events_receipt_idx on public.receivable_receipt_events(company_id, receipt_id, occurred_at);

alter table public.receivable_payment_line_allocations enable row level security;
alter table public.receivable_receipts enable row level security;
alter table public.receivable_receipt_events enable row level security;

revoke all on table public.receivable_payment_line_allocations, public.receivable_receipts, public.receivable_receipt_events from public, anon;
grant select, insert on table public.receivable_payment_line_allocations, public.receivable_receipts, public.receivable_receipt_events to authenticated;

create policy receivable_line_allocations_company_select on public.receivable_payment_line_allocations for select to authenticated
  using (company_id = (select private.current_company_id()));
create policy receivable_line_allocations_company_insert on public.receivable_payment_line_allocations for insert to authenticated
  with check (company_id = (select private.current_company_id()));
create policy receivable_receipts_company_select on public.receivable_receipts for select to authenticated
  using (company_id = (select private.current_company_id()));
create policy receivable_receipts_company_insert on public.receivable_receipts for insert to authenticated
  with check (company_id = (select private.current_company_id()));
create policy receivable_receipt_events_company_select on public.receivable_receipt_events for select to authenticated
  using (company_id = (select private.current_company_id()));
create policy receivable_receipt_events_company_insert on public.receivable_receipt_events for insert to authenticated
  with check (company_id = (select private.current_company_id()));

create trigger protect_receivable_payment_line_allocations before update or delete on public.receivable_payment_line_allocations
for each row execute function private.protect_receivables_history();
create trigger protect_receivable_receipts before update or delete on public.receivable_receipts
for each row execute function private.protect_receivables_history();
create trigger protect_receivable_receipt_events before update or delete on public.receivable_receipt_events
for each row execute function private.protect_receivables_history();

create or replace function private.validate_receivable_line_allocation()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare v_line public.receivable_invoice_lines%rowtype; v_payment_allocation public.receivable_payment_allocations%rowtype; v_allocated numeric;
begin
  select * into v_line from public.receivable_invoice_lines where id = new.invoice_line_id for update;
  select * into v_payment_allocation from public.receivable_payment_allocations where id = new.payment_allocation_id;
  if v_line.id is null or v_line.company_id <> new.company_id or v_line.invoice_id <> new.invoice_id then raise exception 'Invoice line is unavailable'; end if;
  if v_payment_allocation.id is null or v_payment_allocation.company_id <> new.company_id or v_payment_allocation.payment_id <> new.payment_id or v_payment_allocation.invoice_id <> new.invoice_id then raise exception 'Payment allocation is unavailable'; end if;
  select coalesce(sum(amount), 0) into v_allocated from public.receivable_payment_line_allocations where invoice_line_id = new.invoice_line_id;
  if v_allocated + new.amount > v_line.line_amount then raise exception 'Line allocation exceeds the remaining line balance'; end if;
  return new;
end;
$$;

create trigger validate_receivable_line_allocation before insert on public.receivable_payment_line_allocations
for each row execute function private.validate_receivable_line_allocation();

create or replace function public.post_returned_rental_collection(
  p_rental_id uuid, p_amount numeric, p_method text, p_reference text,
  p_collected_at timestamptz, p_line_allocations jsonb, p_notes text default null
)
returns table(payment_id uuid, payment_number text, receipt_id uuid, receipt_number text, allocated_amount numeric)
language plpgsql security invoker set search_path = '' as $$
declare
  v_user_id uuid := auth.uid(); v_company_id uuid; v_role text;
  v_rental public.rentals%rowtype; v_invoice public.receivable_invoices%rowtype;
  v_payment_id uuid := gen_random_uuid(); v_payment_allocation_id uuid := gen_random_uuid(); v_receipt_id uuid := gen_random_uuid();
  v_payment_number text; v_receipt_number text; v_item jsonb; v_line_id uuid; v_line_amount numeric; v_allocated numeric := 0; v_snapshot jsonb;
begin
  select p.company_id, p.role into v_company_id, v_role from public.profiles p
  where p.id = v_user_id and p.status = 'active' and p.deleted_at is null;
  if v_company_id is null then raise exception 'Active employee profile required'; end if;
  if v_role not in ('admin','super_admin') and not exists (
    select 1 from public.roles r where r.company_id = v_company_id and r.name = v_role and r.deleted_at is null
      and coalesce(r.permissions -> 'Payments', '[]'::jsonb) ?| array['Create','Edit','Manage']
  ) then raise exception 'You do not have permission to post returned-rental collections'; end if;
  if p_amount <= 0 or round(p_amount, 2) <> p_amount then raise exception 'Payment amount must be positive with at most two decimals'; end if;
  if p_method not in ('cash','upi','card','bank_transfer','other') then raise exception 'Invalid payment method'; end if;
  if p_collected_at > now() + interval '15 minutes' then raise exception 'Collection time cannot be in the future'; end if;
  if char_length(coalesce(p_reference, '')) > 200 or char_length(coalesce(p_notes, '')) > 1000 then raise exception 'Collection text is too long'; end if;
  if jsonb_typeof(coalesce(p_line_allocations, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_line_allocations, '[]'::jsonb)) = 0 then raise exception 'At least one line allocation is required'; end if;

  select * into v_rental from public.rentals r where r.id = p_rental_id and r.company_id = v_company_id and r.deleted_at is null for update;
  if not found then raise exception 'Rental not found'; end if;
  if v_rental.status <> 'returned' then raise exception 'Only returned rentals can receive lifecycle collections'; end if;
  select * into v_invoice from public.receivable_invoices i where i.rental_id = v_rental.id and i.company_id = v_company_id for update;
  if not found then raise exception 'Issue the returned-rental invoice before collecting payment'; end if;

  for v_item in select value from jsonb_array_elements(p_line_allocations) loop
    begin v_line_id := (v_item ->> 'invoiceLineId')::uuid; v_line_amount := (v_item ->> 'amount')::numeric;
    exception when others then raise exception 'Line allocation is invalid'; end;
    if v_line_amount <= 0 or round(v_line_amount, 2) <> v_line_amount then raise exception 'Line allocations must be positive with at most two decimals'; end if;
    if not exists (select 1 from public.receivable_invoice_lines l where l.id = v_line_id and l.invoice_id = v_invoice.id and l.company_id = v_company_id) then raise exception 'Invoice line is unavailable for this rental'; end if;
    v_allocated := v_allocated + v_line_amount;
  end loop;
  if v_allocated <> p_amount then raise exception 'Payment amount must equal the line allocations'; end if;

  v_payment_number := 'PAY-' || to_char(timezone('Asia/Kolkata', now()), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  v_receipt_number := 'RCT-' || to_char(timezone('Asia/Kolkata', now()), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  insert into public.receivable_payments(id, company_id, customer_id, payment_number, amount, method, reference, collected_at, collector_id, notes, created_by)
  values (v_payment_id, v_company_id, v_rental.customer_id, v_payment_number, p_amount, p_method, nullif(btrim(coalesce(p_reference,'')),''), p_collected_at, v_user_id, nullif(btrim(coalesce(p_notes,'')),''), v_user_id);
  insert into public.receivable_payment_allocations(id, company_id, payment_id, invoice_id, amount, allocated_at, created_by)
  values (v_payment_allocation_id, v_company_id, v_payment_id, v_invoice.id, p_amount, p_collected_at, v_user_id);

  for v_item in select value from jsonb_array_elements(p_line_allocations) loop
    v_line_id := (v_item ->> 'invoiceLineId')::uuid; v_line_amount := (v_item ->> 'amount')::numeric;
    insert into public.receivable_payment_line_allocations(company_id, payment_id, payment_allocation_id, invoice_id, invoice_line_id, amount, allocated_at, created_by)
    values (v_company_id, v_payment_id, v_payment_allocation_id, v_invoice.id, v_line_id, v_line_amount, p_collected_at, v_user_id);
  end loop;

  select jsonb_agg(jsonb_build_object('invoiceLineId', l.id, 'lineType', l.line_type, 'description', l.description, 'sourceEntityId', l.source_entity_id, 'amount', a.amount) order by l.created_at, l.id)
  into v_snapshot from public.receivable_payment_line_allocations a join public.receivable_invoice_lines l on l.id = a.invoice_line_id where a.payment_id = v_payment_id;
  insert into public.receivable_receipts(id, company_id, payment_id, rental_id, customer_id, receipt_number, issued_at, amount, method, reference, allocation_snapshot, created_by)
  values (v_receipt_id, v_company_id, v_payment_id, v_rental.id, v_rental.customer_id, v_receipt_number, p_collected_at, p_amount, p_method, nullif(btrim(coalesce(p_reference,'')),''), v_snapshot, v_user_id);
  insert into public.receivable_receipt_events(company_id, receipt_id, event_type, occurred_at, actor_id, snapshot)
  values (v_company_id, v_receipt_id, 'issued', timezone('utc', now()), v_user_id, jsonb_build_object('receiptNumber', v_receipt_number, 'paymentNumber', v_payment_number, 'rentalId', v_rental.id, 'customerId', v_rental.customer_id, 'amount', p_amount, 'method', p_method, 'allocations', v_snapshot));
  return query select v_payment_id, v_payment_number, v_receipt_id, v_receipt_number, v_allocated;
end;
$$;

revoke all on function public.post_returned_rental_collection(uuid,numeric,text,text,timestamptz,jsonb,text) from public, anon;
grant execute on function public.post_returned_rental_collection(uuid,numeric,text,text,timestamptz,jsonb,text) to authenticated;
