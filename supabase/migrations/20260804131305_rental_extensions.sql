alter table public.rentals
  add column if not exists contract_amount numeric(12,2),
  add column if not exists extension_amount numeric(12,2) not null default 0;

update public.rentals
set contract_amount = coalesce(total_amount, 0),
    total_amount = coalesce(total_amount, 0)
where contract_amount is null;

alter table public.rentals
  alter column contract_amount set not null,
  add constraint rentals_contract_amount_check check (contract_amount >= 0),
  add constraint rentals_extension_amount_check check (extension_amount >= 0),
  add constraint rentals_total_reconciliation_check
    check (total_amount = contract_amount + extension_amount);

create table public.rental_extensions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  rental_id uuid not null references public.rentals(id),
  previous_end_at timestamptz not null,
  extended_end_at timestamptz not null,
  duration_days integer not null check (duration_days > 0),
  billing_units integer not null check (billing_units > 0),
  pricing_snapshot jsonb not null check (jsonb_typeof(pricing_snapshot) = 'object'),
  amount numeric(12,2) not null check (amount >= 0),
  reason text check (reason is null or char_length(reason) between 3 and 500),
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.profiles(id) on delete set null,
  constraint rental_extensions_dates_check check (extended_end_at > previous_end_at)
);

alter table public.rental_extensions enable row level security;
grant select, insert on public.rental_extensions to authenticated;

create policy rental_extensions_select_own_company on public.rental_extensions
  for select to authenticated
  using (company_id = (select private.current_company_id()));

create policy rental_extensions_insert_own_company on public.rental_extensions
  for insert to authenticated
  with check (company_id = (select private.current_company_id()));

create index rental_extensions_rental_created_idx
  on public.rental_extensions(rental_id, created_at desc);
create index rental_extensions_company_created_idx
  on public.rental_extensions(company_id, created_at desc);

create or replace function private.protect_rental_contract_facts()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.booking_id is distinct from old.booking_id
     or new.rental_number is distinct from old.rental_number
     or new.customer_id is distinct from old.customer_id
     or new.bike_id is distinct from old.bike_id
     or new.started_at is distinct from old.started_at
     or new.start_odometer is distinct from old.start_odometer
     or new.pricing_snapshot is distinct from old.pricing_snapshot
     or new.contract_amount is distinct from old.contract_amount then
    raise exception 'Rental contract facts are immutable';
  end if;
  return new;
end;
$$;

create or replace function public.extend_active_rental(
  p_rental_id uuid,
  p_extended_end_at timestamptz,
  p_reason text default null
)
returns table(extension_id uuid, rental_number text, extension_amount numeric, new_total numeric)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_company_id uuid;
  v_role text;
  v_rental public.rentals%rowtype;
  v_previous_end timestamptz;
  v_duration_days integer;
  v_unit_days integer;
  v_billing_units integer;
  v_base_rate numeric;
  v_tax_rate numeric;
  v_tax_inclusive boolean;
  v_rental_amount numeric;
  v_tax_amount numeric;
  v_amount numeric;
  v_extension_id uuid := gen_random_uuid();
  v_snapshot jsonb;
begin
  select p.company_id, p.role into v_company_id, v_role
  from public.profiles p
  where p.id = v_user_id and p.status = 'active' and p.deleted_at is null;

  if v_company_id is null then raise exception 'Active employee profile required'; end if;
  if v_role not in ('admin','super_admin') and not exists (
    select 1 from public.roles r
    where r.company_id = v_company_id and r.name = v_role and r.deleted_at is null
      and coalesce(r.permissions -> 'Rentals', '[]'::jsonb) ?| array['Edit','Manage']
  ) then raise exception 'You do not have permission to extend rentals'; end if;

  select * into v_rental from public.rentals r
  where r.id = p_rental_id and r.company_id = v_company_id and r.deleted_at is null
  for update;
  if not found then raise exception 'Rental not found'; end if;
  if v_rental.status not in ('active','overdue') then raise exception 'Only open rentals can be extended'; end if;

  v_previous_end := v_rental.planned_end_at;
  if v_previous_end is null or p_extended_end_at <= v_previous_end then
    raise exception 'New due date must be after the current due date';
  end if;
  if p_extended_end_at > v_previous_end + interval '365 days' then
    raise exception 'A single extension cannot exceed 365 days';
  end if;
  if nullif(btrim(coalesce(p_reason,'')), '') is not null and char_length(btrim(p_reason)) not between 3 and 500 then
    raise exception 'Extension reason must be between 3 and 500 characters';
  end if;

  perform 1 from public.bookings b
  where b.company_id = v_company_id and b.bike_id = v_rental.bike_id
    and b.id is distinct from v_rental.booking_id and b.deleted_at is null
    and b.status in ('pending','confirmed')
    and b.starts_at < p_extended_end_at and b.ends_at > v_previous_end
  for update;
  if found then raise exception 'Vehicle has a conflicting future booking'; end if;

  v_duration_days := greatest(1, ceil(extract(epoch from (p_extended_end_at - v_previous_end)) / 86400.0)::integer);
  v_unit_days := case v_rental.pricing_snapshot ->> 'billingUnit' when 'week' then 7 when 'month' then 30 else 1 end;
  v_billing_units := ceil(v_duration_days::numeric / v_unit_days)::integer;
  v_base_rate := coalesce((v_rental.pricing_snapshot ->> 'baseRate')::numeric, 0);
  v_tax_rate := coalesce((v_rental.pricing_snapshot ->> 'taxPercentage')::numeric, 0);
  v_tax_inclusive := coalesce((v_rental.pricing_snapshot ->> 'taxInclusive')::boolean, false);
  if v_base_rate <= 0 then raise exception 'Rental pricing snapshot is incomplete'; end if;

  v_rental_amount := round(v_billing_units * v_base_rate, 2);
  v_tax_amount := case when v_tax_inclusive then round(v_rental_amount * v_tax_rate / (100 + v_tax_rate), 2) else round(v_rental_amount * v_tax_rate / 100, 2) end;
  v_amount := round(v_rental_amount + case when v_tax_inclusive then 0 else v_tax_amount end, 2);
  v_snapshot := jsonb_build_object(
    'version', 1, 'source', 'rental_extension', 'billingUnit', v_rental.pricing_snapshot ->> 'billingUnit',
    'durationDays', v_duration_days, 'billingUnits', v_billing_units, 'baseRate', v_base_rate,
    'rentalAmount', v_rental_amount, 'taxInclusive', v_tax_inclusive,
    'taxPercentage', v_tax_rate, 'taxAmount', v_tax_amount, 'totalPayable', v_amount,
    'calculatedAt', timezone('utc', now())
  );

  insert into public.rental_extensions(id, company_id, rental_id, previous_end_at, extended_end_at,
    duration_days, billing_units, pricing_snapshot, amount, reason, created_by)
  values(v_extension_id, v_company_id, v_rental.id, v_previous_end, p_extended_end_at,
    v_duration_days, v_billing_units, v_snapshot, v_amount, nullif(btrim(coalesce(p_reason,'')), ''), v_user_id);

  update public.rentals set planned_end_at = p_extended_end_at,
    extension_amount = extension_amount + v_amount,
    total_amount = contract_amount + extension_amount + v_amount,
    status = case when p_extended_end_at > now() then 'active' else status end,
    updated_by = v_user_id, updated_at = timezone('utc', now())
  where id = v_rental.id;

  return query select v_extension_id, v_rental.rental_number, v_amount,
    v_rental.contract_amount + v_rental.extension_amount + v_amount;
end;
$$;

revoke all on function public.extend_active_rental(uuid,timestamptz,text) from public, anon;
grant execute on function public.extend_active_rental(uuid,timestamptz,text) to authenticated;
