-- D9-06: immutable settlement snapshots and atomic returned-rental closure.

create table public.rental_settlements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  rental_id uuid not null,
  customer_id uuid not null,
  invoice_id uuid not null,
  settlement_number text not null,
  settled_at timestamptz not null default timezone('utc', now()),
  invoice_total numeric(12,2) not null,
  allocated_amount numeric(12,2) not null,
  outstanding_amount numeric(12,2) not null,
  deposit_balance numeric(12,2) not null default 0,
  damage_amount numeric(12,2) not null default 0,
  amount_due numeric(12,2) not null default 0,
  deposit_refund_due numeric(12,2) not null default 0,
  snapshot jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid,
  constraint rental_settlements_company_id_id_key unique (company_id, id),
  constraint rental_settlements_company_number_key unique (company_id, settlement_number),
  constraint rental_settlements_one_rental_key unique (rental_id),
  constraint rental_settlements_rental_company_fkey foreign key (company_id, rental_id) references public.rentals(company_id, id),
  constraint rental_settlements_customer_company_fkey foreign key (company_id, customer_id) references public.customers(company_id, id),
  constraint rental_settlements_invoice_company_fkey foreign key (company_id, invoice_id) references public.receivable_invoices(company_id, id),
  constraint rental_settlements_money_check check (
    invoice_total >= 0 and allocated_amount >= 0 and outstanding_amount >= 0 and
    deposit_balance >= 0 and damage_amount >= 0 and amount_due >= 0 and deposit_refund_due >= 0
  ),
  constraint rental_settlements_snapshot_object_check check (jsonb_typeof(snapshot) = 'object')
);

create index rental_settlements_company_settled_idx on public.rental_settlements(company_id, settled_at desc);
create index rental_settlements_customer_idx on public.rental_settlements(company_id, customer_id, settled_at desc);
create index rental_settlements_invoice_idx on public.rental_settlements(company_id, invoice_id);

alter table public.rental_settlements enable row level security;
revoke all on table public.rental_settlements from public, anon;
grant select, insert on table public.rental_settlements to authenticated;

create policy rental_settlements_company_select on public.rental_settlements
  for select to authenticated
  using (company_id = (select private.current_company_id()));
create policy rental_settlements_company_insert on public.rental_settlements
  for insert to authenticated
  with check (company_id = (select private.current_company_id()));

create or replace function private.protect_rental_settlement_history()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  raise exception 'Rental settlement history is immutable';
end;
$$;

create trigger protect_rental_settlement_history
before update or delete on public.rental_settlements
for each row execute function private.protect_rental_settlement_history();

create or replace function public.settle_returned_rental(p_rental_id uuid)
returns table(
  settlement_id uuid,
  settlement_number text,
  rental_number text,
  invoice_number text,
  amount_due numeric,
  deposit_refund_due numeric
)
language plpgsql security invoker set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_company_id uuid;
  v_role text;
  v_rental public.rentals%rowtype;
  v_invoice public.receivable_invoices%rowtype;
  v_settlement_id uuid := gen_random_uuid();
  v_settlement_number text;
  v_allocated numeric := 0;
  v_outstanding numeric := 0;
  v_deposit_balance numeric := 0;
  v_damage_total numeric := 0;
  v_amount_due numeric := 0;
  v_deposit_refund_due numeric := 0;
  v_snapshot jsonb;
begin
  select p.company_id, p.role into v_company_id, v_role
  from public.profiles p
  where p.id = v_user_id and p.status = 'active' and p.deleted_at is null;
  if v_company_id is null then raise exception 'Active employee profile required'; end if;
  if v_role not in ('admin', 'super_admin') and not exists (
    select 1 from public.roles r
    where r.company_id = v_company_id and r.name = v_role and r.deleted_at is null
      and coalesce(r.permissions -> 'Rentals', '[]'::jsonb) ?| array['Edit','Manage']
  ) then raise exception 'You do not have permission to settle rentals'; end if;

  select * into v_rental from public.rentals r
  where r.id = p_rental_id and r.company_id = v_company_id and r.deleted_at is null
  for update;
  if not found then raise exception 'Rental not found'; end if;
  if v_rental.status <> 'returned' then raise exception 'Only returned rentals can be settled'; end if;
  if not exists (
    select 1 from public.rental_return_inspections i
    where i.rental_id = v_rental.id and i.company_id = v_company_id
  ) then raise exception 'Return inspection required before settlement'; end if;
  if exists (select 1 from public.rental_settlements s where s.rental_id = v_rental.id) then
    raise exception 'Rental has already been settled';
  end if;

  select * into v_invoice from public.receivable_invoices i
  where i.rental_id = v_rental.id and i.company_id = v_company_id
  for update;
  if not found then raise exception 'Issue the rental invoice before settlement'; end if;
  if v_invoice.customer_id <> v_rental.customer_id then raise exception 'Invoice customer does not match rental'; end if;

  select coalesce(sum(a.amount), 0) into v_allocated
  from public.receivable_payment_allocations a
  where a.invoice_id = v_invoice.id and a.company_id = v_company_id;
  v_outstanding := greatest(round(v_invoice.total_amount - v_allocated, 2), 0);

  select coalesce(sum(
    case when m.movement_type = 'reversed' then
      -private.deposit_movement_effect(original.movement_type, original.amount)
    else private.deposit_movement_effect(m.movement_type, m.amount) end
  ), 0) into v_deposit_balance
  from public.receivable_deposit_movements m
  left join public.receivable_deposit_movements original on original.id = m.reverses_movement_id
  where m.rental_id = v_rental.id and m.company_id = v_company_id;
  v_deposit_balance := greatest(round(v_deposit_balance, 2), 0);

  select coalesce(sum(d.amount), 0) into v_damage_total
  from public.rental_damage_charges d
  where d.rental_id = v_rental.id and d.company_id = v_company_id;
  v_amount_due := greatest(round(v_outstanding - v_deposit_balance, 2), 0);
  v_deposit_refund_due := greatest(round(v_deposit_balance - v_outstanding, 2), 0);
  v_settlement_number := 'SET-' || to_char(timezone('Asia/Kolkata', now()), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  v_snapshot := jsonb_build_object(
    'version', 1,
    'rental', jsonb_build_object('id', v_rental.id, 'number', v_rental.rental_number, 'status', v_rental.status, 'totalAmount', v_rental.total_amount, 'pricingSnapshot', v_rental.pricing_snapshot),
    'invoice', jsonb_build_object('id', v_invoice.id, 'number', v_invoice.invoice_number, 'totalAmount', v_invoice.total_amount, 'allocatedAmount', v_allocated, 'outstandingAmount', v_outstanding),
    'returnInspection', (select to_jsonb(i) from public.rental_return_inspections i where i.rental_id = v_rental.id and i.company_id = v_company_id),
    'damageAmount', v_damage_total,
    'depositBalance', v_deposit_balance,
    'amountDue', v_amount_due,
    'depositRefundDue', v_deposit_refund_due,
    'settledAt', timezone('utc', now())
  );

  insert into public.rental_settlements(
    id, company_id, rental_id, customer_id, invoice_id, settlement_number, settled_at,
    invoice_total, allocated_amount, outstanding_amount, deposit_balance, damage_amount,
    amount_due, deposit_refund_due, snapshot, created_by
  ) values (
    v_settlement_id, v_company_id, v_rental.id, v_rental.customer_id, v_invoice.id,
    v_settlement_number, timezone('utc', now()), v_invoice.total_amount, v_allocated,
    v_outstanding, v_deposit_balance, v_damage_total, v_amount_due, v_deposit_refund_due,
    v_snapshot, v_user_id
  );

  update public.rentals
  set status = 'completed', ended_at = coalesce(ended_at, timezone('utc', now())), updated_at = timezone('utc', now()), updated_by = v_user_id
  where id = v_rental.id and company_id = v_company_id and status = 'returned';
  if not found then raise exception 'Rental changed before settlement could close'; end if;

  return query select v_settlement_id, v_settlement_number, v_rental.rental_number,
    v_invoice.invoice_number, v_amount_due, v_deposit_refund_due;
end;
$$;

revoke all on function public.settle_returned_rental(uuid) from public, anon;
grant execute on function public.settle_returned_rental(uuid) to authenticated;
