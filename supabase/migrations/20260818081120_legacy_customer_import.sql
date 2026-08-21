-- D11-03: resumable, company-scoped import audit and a dry-run-first customer
-- import command. KYC/document binaries and structured addresses are out of scope.

create table public.legacy_customer_import_batches (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  source_system text not null check (source_system = 'evorentals_masterpanel'),
  source_checksum text not null check (source_checksum ~ '^[0-9a-f]{64}$'),
  source_row_count integer not null check (source_row_count > 0),
  eligible_row_count integer not null check (eligible_row_count >= 0),
  quarantined_row_count integer not null check (quarantined_row_count >= 0),
  imported_row_count integer not null default 0 check (imported_row_count >= 0),
  status text not null default 'processing' check (status in ('processing', 'completed')),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  constraint legacy_customer_import_batches_counts_check
    check (source_row_count = eligible_row_count + quarantined_row_count),
  constraint legacy_customer_import_batches_completion_check
    check (
      (status = 'processing' and completed_at is null)
      or (status = 'completed' and completed_at is not null and imported_row_count = eligible_row_count)
    ),
  constraint legacy_customer_import_batches_company_id_id_key unique (company_id, id),
  constraint legacy_customer_import_batches_source_key unique (company_id, source_system, source_checksum)
);

create table public.legacy_customer_mappings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  import_batch_id uuid not null,
  source_system text not null check (source_system = 'evorentals_masterpanel'),
  legacy_customer_id text not null check (legacy_customer_id ~ '^[0-9]+$'),
  customer_id uuid not null,
  source_payload jsonb not null check (jsonb_typeof(source_payload) = 'object'),
  imported_by uuid not null references public.profiles(id),
  imported_at timestamptz not null default timezone('utc', now()),
  constraint legacy_customer_mappings_batch_company_fkey
    foreign key (company_id, import_batch_id)
    references public.legacy_customer_import_batches(company_id, id),
  constraint legacy_customer_mappings_customer_company_fkey
    foreign key (company_id, customer_id)
    references public.customers(company_id, id),
  constraint legacy_customer_mappings_source_key
    unique (company_id, source_system, legacy_customer_id),
  constraint legacy_customer_mappings_customer_key
    unique (company_id, source_system, customer_id)
);

create index legacy_customer_import_batches_company_created_idx
  on public.legacy_customer_import_batches(company_id, created_at desc);
create index legacy_customer_mappings_batch_idx
  on public.legacy_customer_mappings(company_id, import_batch_id);
create index legacy_customer_mappings_customer_idx
  on public.legacy_customer_mappings(company_id, customer_id);

alter table public.legacy_customer_import_batches enable row level security;
alter table public.legacy_customer_mappings enable row level security;

create policy legacy_customer_import_batches_admin_read on public.legacy_customer_import_batches
for select to authenticated
using (
  company_id = (select private.current_company_id())
  and (select private.is_company_admin())
);

create policy legacy_customer_import_batches_admin_insert on public.legacy_customer_import_batches
for insert to authenticated
with check (
  company_id = (select private.current_company_id())
  and created_by = (select auth.uid())
  and (select private.is_company_admin())
);

create policy legacy_customer_import_batches_admin_update on public.legacy_customer_import_batches
for update to authenticated
using (
  company_id = (select private.current_company_id())
  and (select private.is_company_admin())
)
with check (
  company_id = (select private.current_company_id())
  and created_by = (select auth.uid())
  and (select private.is_company_admin())
);

create policy legacy_customer_mappings_admin_read on public.legacy_customer_mappings
for select to authenticated
using (
  company_id = (select private.current_company_id())
  and (select private.is_company_admin())
);

create policy legacy_customer_mappings_admin_insert on public.legacy_customer_mappings
for insert to authenticated
with check (
  company_id = (select private.current_company_id())
  and imported_by = (select auth.uid())
  and (select private.is_company_admin())
);

revoke all on public.legacy_customer_import_batches from public, anon, authenticated;
revoke all on public.legacy_customer_mappings from public, anon, authenticated;
grant select, insert on public.legacy_customer_import_batches to authenticated;
grant update (imported_row_count, status, completed_at) on public.legacy_customer_import_batches to authenticated;
grant select, insert on public.legacy_customer_mappings to authenticated;

create or replace function public.import_legacy_customer_batch(
  p_rows jsonb,
  p_source_checksum text,
  p_source_row_count integer,
  p_eligible_row_count integer,
  p_quarantined_row_count integer,
  p_batch_id uuid default null,
  p_finalize boolean default false,
  p_dry_run boolean default true
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  company uuid := (select private.current_company_id());
  actor uuid := (select auth.uid());
  effective_batch_id uuid := coalesce(p_batch_id, gen_random_uuid());
  item jsonb;
  legacy_id text;
  full_name text;
  normalized_email text;
  normalized_phone text;
  licence_number text;
  account_status text;
  customer_status text;
  legacy_kyc_status text;
  legacy_created_at timestamptz;
  customer_id uuid;
  existing_mapping public.legacy_customer_mappings%rowtype;
  errors jsonb := '[]'::jsonb;
  imported_count integer := 0;
  skipped_count integer := 0;
  batch_mapping_count integer := 0;
begin
  if actor is null or company is null or not (select private.is_company_admin()) then
    raise exception 'Administrator access required';
  end if;

  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'Rows must be a JSON array';
  end if;
  if jsonb_array_length(p_rows) < 1 or jsonb_array_length(p_rows) > 250 then
    raise exception 'Each import batch must contain between 1 and 250 rows';
  end if;
  if p_source_checksum is null or p_source_checksum !~ '^[0-9a-f]{64}$' then
    raise exception 'Source checksum must be a lowercase SHA-256 value';
  end if;
  if p_source_row_count <= 0
    or p_eligible_row_count < 0
    or p_quarantined_row_count < 0
    or p_source_row_count <> p_eligible_row_count + p_quarantined_row_count then
    raise exception 'Source reconciliation counts are invalid';
  end if;
  if p_finalize and p_dry_run then
    raise exception 'A dry run cannot finalize an import';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_rows) row_value
    group by row_value->>'legacyId'
    having count(*) > 1
  ) then
    raise exception 'The batch contains duplicate legacy customer IDs';
  end if;

  for item in select value from jsonb_array_elements(p_rows)
  loop
    legacy_id := nullif(btrim(item->>'legacyId'), '');
    full_name := nullif(btrim(item->>'fullName'), '');
    normalized_email := nullif(lower(btrim(item->>'email')), '');
    normalized_phone := nullif(btrim(item->>'phone'), '');
    licence_number := nullif(btrim(item->>'drivingLicenceNumber'), '');
    account_status := nullif(lower(btrim(item->>'status')), '');
    legacy_kyc_status := nullif(lower(btrim(item->>'kycStatus')), '');
    customer_id := null;
    existing_mapping := null;

    if jsonb_typeof(item) <> 'object' then
      errors := errors || jsonb_build_array(jsonb_build_object('legacyId', null, 'code', 'invalid_row'));
      continue;
    end if;
    if legacy_id is null or legacy_id !~ '^[0-9]+$' then
      errors := errors || jsonb_build_array(jsonb_build_object('legacyId', legacy_id, 'code', 'invalid_legacy_id'));
      continue;
    end if;
    if full_name is null then
      errors := errors || jsonb_build_array(jsonb_build_object('legacyId', legacy_id, 'code', 'missing_full_name'));
      continue;
    end if;
    if normalized_email is null or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then
      errors := errors || jsonb_build_array(jsonb_build_object('legacyId', legacy_id, 'code', 'invalid_email'));
      continue;
    end if;
    if normalized_phone is null or normalized_phone !~ '^\+91[0-9]{10}$' then
      errors := errors || jsonb_build_array(jsonb_build_object('legacyId', legacy_id, 'code', 'invalid_indian_phone'));
      continue;
    end if;
    if account_status not in ('active', 'inactive') then
      errors := errors || jsonb_build_array(jsonb_build_object('legacyId', legacy_id, 'code', 'invalid_status'));
      continue;
    end if;
    if legacy_kyc_status not in ('pending', 'verified', 'rejected', 'expired') then
      errors := errors || jsonb_build_array(jsonb_build_object('legacyId', legacy_id, 'code', 'invalid_kyc_status'));
      continue;
    end if;
    if coalesce(jsonb_array_length(coalesce(item->'issues', '[]'::jsonb)), 0) <> 0 then
      errors := errors || jsonb_build_array(jsonb_build_object('legacyId', legacy_id, 'code', 'row_is_quarantined'));
      continue;
    end if;

    begin
      legacy_created_at := (item->>'createdAt')::timestamp at time zone 'Asia/Kolkata';
    exception when others then
      errors := errors || jsonb_build_array(jsonb_build_object('legacyId', legacy_id, 'code', 'invalid_created_at'));
      continue;
    end;

    select * into existing_mapping
    from public.legacy_customer_mappings mapping
    where mapping.company_id = company
      and mapping.source_system = 'evorentals_masterpanel'
      and mapping.legacy_customer_id = legacy_id;

    if found then
      if existing_mapping.source_payload = item
        and existing_mapping.import_batch_id = effective_batch_id then
        skipped_count := skipped_count + 1;
        continue;
      end if;
      errors := errors || jsonb_build_array(jsonb_build_object('legacyId', legacy_id, 'code', 'legacy_id_already_mapped'));
      continue;
    end if;

    if exists (
      select 1 from public.customers customer
      where customer.company_id = company
        and customer.deleted_at is null
        and (
          customer.phone = normalized_phone
          or lower(customer.email) = normalized_email
          or customer.customer_number = 'LEG-C' || legacy_id
        )
    ) then
      errors := errors || jsonb_build_array(jsonb_build_object('legacyId', legacy_id, 'code', 'existing_customer_identity'));
      continue;
    end if;

  end loop;

  if jsonb_array_length(errors) > 0 then
    return jsonb_build_object(
      'ok', false,
      'dryRun', p_dry_run,
      'batchId', case when p_dry_run then null else effective_batch_id end,
      'validated', jsonb_array_length(p_rows) - jsonb_array_length(errors),
      'errors', errors
    );
  end if;

  if p_dry_run then
    return jsonb_build_object(
      'ok', true,
      'dryRun', true,
      'validated', jsonb_array_length(p_rows),
      'skipped', skipped_count,
      'errors', '[]'::jsonb
    );
  end if;

  insert into public.legacy_customer_import_batches (
    id, company_id, source_system, source_checksum, source_row_count,
    eligible_row_count, quarantined_row_count, created_by
  ) values (
    effective_batch_id, company, 'evorentals_masterpanel', p_source_checksum,
    p_source_row_count, p_eligible_row_count, p_quarantined_row_count, actor
  )
  on conflict (company_id, source_system, source_checksum) do nothing;

  if not exists (
    select 1 from public.legacy_customer_import_batches batch
    where batch.id = effective_batch_id
      and batch.company_id = company
      and batch.source_system = 'evorentals_masterpanel'
      and batch.source_checksum = p_source_checksum
      and batch.source_row_count = p_source_row_count
      and batch.eligible_row_count = p_eligible_row_count
      and batch.quarantined_row_count = p_quarantined_row_count
      and batch.created_by = actor
  ) then
    raise exception 'Import batch metadata conflicts with an existing batch';
  end if;

  -- Validation is complete and the batch audit row now exists. Apply this chunk
  -- atomically; a failed customer or mapping insert rolls back the whole call.
  for item in select value from jsonb_array_elements(p_rows)
  loop
    legacy_id := btrim(item->>'legacyId');

    select * into existing_mapping
    from public.legacy_customer_mappings mapping
    where mapping.company_id = company
      and mapping.source_system = 'evorentals_masterpanel'
      and mapping.legacy_customer_id = legacy_id;

    if found then
      skipped_count := skipped_count + 1;
      continue;
    end if;

    full_name := btrim(item->>'fullName');
    normalized_email := lower(btrim(item->>'email'));
    normalized_phone := btrim(item->>'phone');
    licence_number := nullif(btrim(item->>'drivingLicenceNumber'), '');
    account_status := lower(btrim(item->>'status'));
    legacy_kyc_status := lower(btrim(item->>'kycStatus'));
    legacy_created_at := (item->>'createdAt')::timestamp at time zone 'Asia/Kolkata';
    customer_status := case account_status when 'inactive' then 'suspended' else 'active' end;

    insert into public.customers (
      company_id, customer_number, full_name, email, phone, license_number,
      status, kyc_status, created_at, updated_at, created_by, updated_by
    ) values (
      company, 'LEG-C' || legacy_id, full_name, normalized_email, normalized_phone,
      licence_number, customer_status, legacy_kyc_status::public.kyc_status,
      legacy_created_at, legacy_created_at, actor, actor
    ) returning id into customer_id;

    insert into public.legacy_customer_mappings (
      company_id, import_batch_id, source_system, legacy_customer_id,
      customer_id, source_payload, imported_by
    ) values (
      company, effective_batch_id, 'evorentals_masterpanel', legacy_id,
      customer_id, item, actor
    );
    imported_count := imported_count + 1;
  end loop;

  select count(*) into batch_mapping_count
  from public.legacy_customer_mappings mapping
  where mapping.company_id = company and mapping.import_batch_id = effective_batch_id;

  update public.legacy_customer_import_batches
  set imported_row_count = batch_mapping_count,
      status = case when p_finalize and batch_mapping_count = p_eligible_row_count then 'completed' else 'processing' end,
      completed_at = case when p_finalize and batch_mapping_count = p_eligible_row_count then timezone('utc', now()) else null end
  where id = effective_batch_id and company_id = company;

  if p_finalize and batch_mapping_count <> p_eligible_row_count then
    raise exception 'Cannot finalize: imported % of % eligible rows', batch_mapping_count, p_eligible_row_count;
  end if;

  return jsonb_build_object(
    'ok', true,
    'dryRun', false,
    'batchId', effective_batch_id,
    'imported', imported_count,
    'skipped', skipped_count,
    'batchImported', batch_mapping_count,
    'completed', p_finalize and batch_mapping_count = p_eligible_row_count,
    'errors', '[]'::jsonb
  );
end;
$$;

revoke all on function public.import_legacy_customer_batch(jsonb,text,integer,integer,integer,uuid,boolean,boolean)
  from public, anon;
grant execute on function public.import_legacy_customer_batch(jsonb,text,integer,integer,integer,uuid,boolean,boolean)
  to authenticated;
