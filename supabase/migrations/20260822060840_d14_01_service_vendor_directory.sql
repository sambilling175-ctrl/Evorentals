-- D14-01: company-scoped vendor and garage directory.
-- No seed rows are created; production vendors are entered by authorized staff.

create table public.service_vendors (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  vendor_type text not null check (vendor_type in ('garage', 'parts_vendor', 'service_center')),
  name text not null check (char_length(btrim(name)) between 2 and 200),
  contact_name text check (contact_name is null or char_length(btrim(contact_name)) <= 160),
  phone text check (phone is null or char_length(btrim(phone)) <= 40),
  email text check (email is null or char_length(btrim(email)) <= 254),
  address text check (address is null or char_length(btrim(address)) <= 500),
  gstin text check (gstin is null or char_length(btrim(gstin)) <= 30),
  notes text check (notes is null or char_length(btrim(notes)) <= 1000),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz
);

alter table public.service_vendors enable row level security;

revoke all on table public.service_vendors from public, anon;
grant select, insert, update on table public.service_vendors to authenticated;

create policy service_vendors_select_own_company
  on public.service_vendors for select to authenticated
  using (company_id = (select private.current_company_id()) and deleted_at is null);

create policy service_vendors_insert_own_company
  on public.service_vendors for insert to authenticated
  with check (company_id = (select private.current_company_id()));

create policy service_vendors_update_own_company
  on public.service_vendors for update to authenticated
  using (company_id = (select private.current_company_id()) and deleted_at is null)
  with check (company_id = (select private.current_company_id()));

create unique index service_vendors_company_type_name_idx
  on public.service_vendors(company_id, vendor_type, lower(name))
  where deleted_at is null;

create index service_vendors_company_active_type_idx
  on public.service_vendors(company_id, is_active, vendor_type, name)
  where deleted_at is null;

create index service_vendors_company_updated_idx
  on public.service_vendors(company_id, updated_at desc)
  where deleted_at is null;

create or replace function public.create_service_vendor(
  p_vendor_type text,
  p_name text,
  p_contact_name text default null,
  p_phone text default null,
  p_email text default null,
  p_address text default null,
  p_gstin text default null,
  p_notes text default null
)
returns table(vendor_id uuid, vendor_type text, name text)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_company_id uuid;
  v_role text;
  v_vendor_id uuid := gen_random_uuid();
begin
  select p.company_id, p.role into v_company_id, v_role
  from public.profiles p
  where p.id = v_user_id and p.status = 'active' and p.deleted_at is null;
  if v_company_id is null then raise exception 'Active employee profile required'; end if;
  if v_role not in ('admin', 'super_admin') and not exists (
    select 1 from public.roles r
    where r.company_id = v_company_id and r.name = v_role and r.deleted_at is null
      and (
        coalesce(r.permissions -> 'Service', '[]'::jsonb) ?| array['Create', 'Edit', 'Manage']
        or coalesce(r.permissions -> 'Service & Maintenance', '[]'::jsonb) ?| array['Create', 'Edit', 'Manage']
        or coalesce(r.permissions -> 'Maintenance', '[]'::jsonb) ?| array['Create', 'Edit', 'Manage']
      )
  ) then raise exception 'You do not have permission to manage service vendors'; end if;
  if p_vendor_type not in ('garage', 'parts_vendor', 'service_center') then raise exception 'Invalid service vendor type'; end if;
  if char_length(btrim(coalesce(p_name, ''))) not between 2 and 200 then raise exception 'Vendor name must be between 2 and 200 characters'; end if;
  if char_length(coalesce(p_notes, '')) > 1000 then raise exception 'Vendor notes cannot exceed 1000 characters'; end if;
  insert into public.service_vendors(id, company_id, vendor_type, name, contact_name, phone, email, address, gstin, notes, created_by, updated_by)
  values (v_vendor_id, v_company_id, p_vendor_type, btrim(p_name), nullif(btrim(p_contact_name), ''), nullif(btrim(p_phone), ''), nullif(lower(btrim(p_email)), ''), nullif(btrim(p_address), ''), nullif(upper(btrim(p_gstin)), ''), nullif(btrim(p_notes), ''), v_user_id, v_user_id);
  return query select v_vendor_id, p_vendor_type, btrim(p_name);
end;
$$;

create or replace function public.update_service_vendor(
  p_vendor_id uuid,
  p_vendor_type text,
  p_name text,
  p_contact_name text default null,
  p_phone text default null,
  p_email text default null,
  p_address text default null,
  p_gstin text default null,
  p_notes text default null,
  p_is_active boolean default true
)
returns table(vendor_id uuid, vendor_type text, name text, is_active boolean)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_company_id uuid;
  v_role text;
  v_vendor public.service_vendors%rowtype;
begin
  select p.company_id, p.role into v_company_id, v_role
  from public.profiles p
  where p.id = v_user_id and p.status = 'active' and p.deleted_at is null;
  if v_company_id is null then raise exception 'Active employee profile required'; end if;
  if v_role not in ('admin', 'super_admin') and not exists (
    select 1 from public.roles r
    where r.company_id = v_company_id and r.name = v_role and r.deleted_at is null
      and (
        coalesce(r.permissions -> 'Service', '[]'::jsonb) ?| array['Create', 'Edit', 'Manage']
        or coalesce(r.permissions -> 'Service & Maintenance', '[]'::jsonb) ?| array['Create', 'Edit', 'Manage']
        or coalesce(r.permissions -> 'Maintenance', '[]'::jsonb) ?| array['Create', 'Edit', 'Manage']
      )
  ) then raise exception 'You do not have permission to manage service vendors'; end if;
  if p_vendor_type not in ('garage', 'parts_vendor', 'service_center') then raise exception 'Invalid service vendor type'; end if;
  if char_length(btrim(coalesce(p_name, ''))) not between 2 and 200 then raise exception 'Vendor name must be between 2 and 200 characters'; end if;
  select * into v_vendor from public.service_vendors v where v.id = p_vendor_id and v.company_id = v_company_id and v.deleted_at is null for update;
  if not found then raise exception 'Service vendor not found or access denied'; end if;
  update public.service_vendors
  set vendor_type = p_vendor_type, name = btrim(p_name), contact_name = nullif(btrim(p_contact_name), ''), phone = nullif(btrim(p_phone), ''), email = nullif(lower(btrim(p_email)), ''), address = nullif(btrim(p_address), ''), gstin = nullif(upper(btrim(p_gstin)), ''), notes = nullif(btrim(p_notes), ''), is_active = coalesce(p_is_active, true), updated_at = timezone('utc', now()), updated_by = v_user_id
  where id = p_vendor_id;
  return query select p_vendor_id, p_vendor_type, btrim(p_name), coalesce(p_is_active, true);
end;
$$;

create or replace function public.archive_service_vendor(p_vendor_id uuid)
returns table(vendor_id uuid)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_company_id uuid;
  v_role text;
begin
  select p.company_id, p.role into v_company_id, v_role
  from public.profiles p
  where p.id = v_user_id and p.status = 'active' and p.deleted_at is null;
  if v_company_id is null then raise exception 'Active employee profile required'; end if;
  if v_role not in ('admin', 'super_admin') and not exists (
    select 1 from public.roles r
    where r.company_id = v_company_id and r.name = v_role and r.deleted_at is null
      and (
        coalesce(r.permissions -> 'Service', '[]'::jsonb) ?| array['Edit', 'Manage']
        or coalesce(r.permissions -> 'Service & Maintenance', '[]'::jsonb) ?| array['Edit', 'Manage']
        or coalesce(r.permissions -> 'Maintenance', '[]'::jsonb) ?| array['Edit', 'Manage']
      )
  ) then raise exception 'You do not have permission to archive service vendors'; end if;
  update public.service_vendors
  set is_active = false, deleted_at = timezone('utc', now()), updated_at = timezone('utc', now()), updated_by = v_user_id
  where id = p_vendor_id and company_id = v_company_id and deleted_at is null;
  if not found then raise exception 'Service vendor not found or already archived'; end if;
  return query select p_vendor_id;
end;
$$;

revoke all on function public.create_service_vendor(text, text, text, text, text, text, text, text) from public, anon;
grant execute on function public.create_service_vendor(text, text, text, text, text, text, text, text) to authenticated;
revoke all on function public.update_service_vendor(uuid, text, text, text, text, text, text, text, text, boolean) from public, anon;
grant execute on function public.update_service_vendor(uuid, text, text, text, text, text, text, text, text, boolean) to authenticated;
revoke all on function public.archive_service_vendor(uuid) from public, anon;
grant execute on function public.archive_service_vendor(uuid) to authenticated;
