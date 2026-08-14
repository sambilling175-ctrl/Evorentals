-- D10-01: rollback-only receivables command smoke.
--
-- Uses the existing authenticated bootstrap actor and one company customer.
-- The payment is posted through the SECURITY INVOKER RPC as `authenticated`,
-- verified, and rolled back before the script exits. No financial records are
-- retained and no invoice/allocation fixture is required.

begin;

do $$
declare
  actor_id uuid;
  actor_company_id uuid;
  customer_id uuid;
  payment_id uuid;
  payment_number text;
  allocated_amount numeric;
  suffix text := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  visible_count integer;
  denied boolean := false;
begin
  select p.id, p.company_id into actor_id, actor_company_id
  from public.profiles p
  where p.status = 'active' and p.deleted_at is null
  order by p.created_at
  limit 1;
  if actor_id is null or actor_company_id is null then
    raise exception 'D10-01 requires an existing active employee profile';
  end if;

  select c.id into customer_id
  from public.customers c
  where c.company_id = actor_company_id and c.deleted_at is null
  order by c.created_at
  limit 1;
  if customer_id is null then
    raise exception 'D10-01 requires an existing company customer';
  end if;

  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', actor_id::text, true);
  execute 'set local role authenticated';

  select p.payment_id, p.payment_number, p.allocated_amount
    into payment_id, payment_number, allocated_amount
  from public.post_receivable_payment(
    customer_id,
    1.25,
    'upi',
    'D10-01-ROLLBACK-' || suffix,
    now(),
    '[]'::jsonb,
    'D10-01 rollback-only command smoke'
  ) p;

  if payment_id is null or payment_number is null or allocated_amount <> 0 then
    raise exception 'D10-01 payment RPC returned an invalid result';
  end if;
  select count(*) into visible_count
  from public.receivable_payments rp
  where rp.id = payment_id and rp.company_id = actor_company_id and rp.amount = 1.25;
  if visible_count <> 1 then
    raise exception 'D10-01 payment was not visible to its authenticated actor';
  end if;

  begin
    perform public.post_receivable_payment(
      customer_id,
      0,
      'upi',
      'D10-01-INVALID-' || suffix,
      now(),
      '[]'::jsonb,
      'D10-01 invalid amount rejection'
    );
  exception when others then
    denied := true;
  end;
  if not denied then
    raise exception 'D10-01 accepted an invalid zero payment amount';
  end if;
end;
$$;

rollback;
