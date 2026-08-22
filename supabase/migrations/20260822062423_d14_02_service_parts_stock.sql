-- D14-02: company-scoped spare-parts catalogue and immutable stock movements.
-- No seed rows are created; stock is changed only through the guarded RPC.

create table public.service_parts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  part_number text not null check (char_length(btrim(part_number)) between 2 and 80),
  name text not null check (char_length(btrim(name)) between 2 and 200),
  category text check (category is null or char_length(btrim(category)) <= 120),
  unit text not null default 'piece' check (char_length(btrim(unit)) between 1 and 32),
  description text check (description is null or char_length(btrim(description)) <= 500),
  reorder_level integer not null default 0 check (reorder_level >= 0),
  unit_cost numeric(12,2) not null default 0 check (unit_cost >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  constraint service_parts_company_id_id_key unique (company_id, id)
);

create table public.service_part_stock_movements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  part_id uuid not null,
  movement_type text not null check (movement_type in ('receipt', 'issue', 'return', 'adjustment')),
  quantity_delta integer not null check (quantity_delta <> 0),
  quantity_before integer not null check (quantity_before >= 0),
  quantity_after integer not null check (quantity_after >= 0),
  unit_cost numeric(12,2) not null default 0 check (unit_cost >= 0),
  reference_type text check (reference_type is null or char_length(btrim(reference_type)) <= 80),
  reference_id uuid,
  notes text check (notes is null or char_length(btrim(notes)) <= 1000),
  occurred_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.profiles(id) on delete set null,
  constraint service_part_stock_movements_part_fk
    foreign key (company_id, part_id) references public.service_parts(company_id, id)
);

alter table public.service_parts enable row level security;
alter table public.service_part_stock_movements enable row level security;

revoke all on table public.service_parts, public.service_part_stock_movements from public, anon;
grant select, insert, update on table public.service_parts to authenticated;
grant select, insert on table public.service_part_stock_movements to authenticated;

create policy service_parts_select_own_company
  on public.service_parts for select to authenticated
  using (company_id = (select private.current_company_id()) and deleted_at is null);

create policy service_parts_insert_via_rpc
  on public.service_parts for insert to authenticated
  with check (
    company_id = (select private.current_company_id())
    and current_setting('app.service_parts_rpc', true) = 'true'
  );

create policy service_parts_update_via_rpc
  on public.service_parts for update to authenticated
  using (
    company_id = (select private.current_company_id())
    and deleted_at is null
    and current_setting('app.service_parts_rpc', true) = 'true'
  )
  with check (company_id = (select private.current_company_id()));

create policy service_part_stock_movements_select_own_company
  on public.service_part_stock_movements for select to authenticated
  using (company_id = (select private.current_company_id()));

create policy service_part_stock_movements_insert_via_rpc
  on public.service_part_stock_movements for insert to authenticated
  with check (
    company_id = (select private.current_company_id())
    and current_setting('app.service_part_stock_rpc', true) = 'true'
  );

create unique index service_parts_company_number_idx
  on public.service_parts(company_id, upper(part_number))
  where deleted_at is null;

create index service_parts_company_active_category_idx
  on public.service_parts(company_id, is_active, category, name)
  where deleted_at is null;

create index service_parts_company_updated_idx
  on public.service_parts(company_id, updated_at desc)
  where deleted_at is null;

create index service_part_stock_movements_company_part_time_idx
  on public.service_part_stock_movements(company_id, part_id, occurred_at desc);

create index service_part_stock_movements_company_reference_idx
  on public.service_part_stock_movements(company_id, reference_type, reference_id)
  where reference_id is not null;

create or replace function private.guard_service_part_catalog_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_setting('app.service_parts_rpc', true) <> 'true' then
    raise exception 'Service parts must be changed through the authorized RPC';
  end if;
  return new;
end;
$$;

create trigger service_parts_rpc_guard
before insert or update on public.service_parts
for each row execute function private.guard_service_part_catalog_mutation();

create or replace function private.protect_service_part_stock_history()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op <> 'INSERT' then
    raise exception 'Service-part stock history is immutable';
  end if;
  return new;
end;
$$;

create trigger service_part_stock_movements_immutable
before update or delete on public.service_part_stock_movements
for each row execute function private.protect_service_part_stock_history();

create or replace function private.guard_service_part_stock_insert()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_setting('app.service_part_stock_rpc', true) <> 'true' then
    raise exception 'Service-part stock must be changed through the authorized RPC';
  end if;
  return new;
end;
$$;

create trigger service_part_stock_rpc_guard
before insert on public.service_part_stock_movements
for each row execute function private.guard_service_part_stock_insert();

create or replace function public.create_service_part(
  p_part_number text,
  p_name text,
  p_category text default null,
  p_unit text default 'piece',
  p_description text default null,
  p_reorder_level integer default 0,
  p_unit_cost numeric default 0
)
returns table(part_id uuid, part_number text, name text)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_company_id uuid;
  v_role text;
  v_part_id uuid := gen_random_uuid();
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
  ) then raise exception 'You do not have permission to manage service parts'; end if;
  if char_length(btrim(coalesce(p_part_number, ''))) not between 2 and 80 then raise exception 'Part number must be between 2 and 80 characters'; end if;
  if char_length(btrim(coalesce(p_name, ''))) not between 2 and 200 then raise exception 'Part name must be between 2 and 200 characters'; end if;
  if char_length(btrim(coalesce(p_unit, ''))) not between 1 and 32 then raise exception 'Part unit is invalid'; end if;
  if p_reorder_level is null or p_reorder_level < 0 then raise exception 'Reorder level cannot be negative'; end if;
  if p_unit_cost is null or p_unit_cost < 0 then raise exception 'Unit cost cannot be negative'; end if;
  perform set_config('app.service_parts_rpc', 'true', true);
  insert into public.service_parts(id, company_id, part_number, name, category, unit, description, reorder_level, unit_cost, created_by, updated_by)
  values (v_part_id, v_company_id, upper(btrim(p_part_number)), btrim(p_name), nullif(btrim(p_category), ''), btrim(p_unit), nullif(btrim(p_description), ''), p_reorder_level, p_unit_cost, v_user_id, v_user_id);
  return query select v_part_id, upper(btrim(p_part_number)), btrim(p_name);
end;
$$;

create or replace function public.update_service_part(
  p_part_id uuid,
  p_part_number text,
  p_name text,
  p_category text default null,
  p_unit text default 'piece',
  p_description text default null,
  p_reorder_level integer default 0,
  p_unit_cost numeric default 0,
  p_is_active boolean default true
)
returns table(part_id uuid, part_number text, name text, is_active boolean)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_company_id uuid;
  v_role text;
  v_part public.service_parts%rowtype;
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
  ) then raise exception 'You do not have permission to manage service parts'; end if;
  if char_length(btrim(coalesce(p_part_number, ''))) not between 2 and 80 then raise exception 'Part number must be between 2 and 80 characters'; end if;
  if char_length(btrim(coalesce(p_name, ''))) not between 2 and 200 then raise exception 'Part name must be between 2 and 200 characters'; end if;
  if p_reorder_level is null or p_reorder_level < 0 then raise exception 'Reorder level cannot be negative'; end if;
  if p_unit_cost is null or p_unit_cost < 0 then raise exception 'Unit cost cannot be negative'; end if;
  select * into v_part from public.service_parts p
  where p.id = p_part_id and p.company_id = v_company_id and p.deleted_at is null
  for update;
  if not found then raise exception 'Service part not found or access denied'; end if;
  perform set_config('app.service_parts_rpc', 'true', true);
  update public.service_parts
  set part_number = upper(btrim(p_part_number)), name = btrim(p_name), category = nullif(btrim(p_category), ''), unit = btrim(p_unit), description = nullif(btrim(p_description), ''), reorder_level = p_reorder_level, unit_cost = p_unit_cost, is_active = coalesce(p_is_active, true), updated_at = timezone('utc', now()), updated_by = v_user_id
  where id = p_part_id;
  return query select p_part_id, upper(btrim(p_part_number)), btrim(p_name), coalesce(p_is_active, true);
end;
$$;

create or replace function public.archive_service_part(p_part_id uuid)
returns table(part_id uuid)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_company_id uuid;
  v_role text;
  v_part public.service_parts%rowtype;
  v_quantity integer;
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
  ) then raise exception 'You do not have permission to archive service parts'; end if;
  select * into v_part from public.service_parts p
  where p.id = p_part_id and p.company_id = v_company_id and p.deleted_at is null
  for update;
  if not found then raise exception 'Service part not found or already archived'; end if;
  select coalesce(sum(m.quantity_delta), 0)::integer into v_quantity
  from public.service_part_stock_movements m
  where m.company_id = v_company_id and m.part_id = p_part_id;
  if v_quantity <> 0 then raise exception 'A part can only be archived when stock is zero'; end if;
  perform set_config('app.service_parts_rpc', 'true', true);
  update public.service_parts
  set is_active = false, deleted_at = timezone('utc', now()), updated_at = timezone('utc', now()), updated_by = v_user_id
  where id = p_part_id;
  return query select p_part_id;
end;
$$;

create or replace function public.record_service_part_stock_movement(
  p_part_id uuid,
  p_movement_type text,
  p_quantity_delta integer,
  p_unit_cost numeric default null,
  p_reference_type text default null,
  p_reference_id uuid default null,
  p_notes text default null
)
returns table(movement_id uuid, part_id uuid, quantity_before integer, quantity_after integer, quantity_delta integer)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_company_id uuid;
  v_role text;
  v_part public.service_parts%rowtype;
  v_before integer;
  v_after integer;
  v_movement_id uuid := gen_random_uuid();
  v_unit_cost numeric(12,2);
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
  ) then raise exception 'You do not have permission to manage service-part stock'; end if;
  if p_movement_type not in ('receipt', 'issue', 'return', 'adjustment') then raise exception 'Invalid stock movement type'; end if;
  if p_quantity_delta is null or p_quantity_delta = 0 then raise exception 'Stock movement cannot be zero'; end if;
  if p_movement_type in ('receipt', 'return') and p_quantity_delta < 1 then raise exception 'Receipt and return quantities must be positive'; end if;
  if p_movement_type = 'issue' and p_quantity_delta > -1 then raise exception 'Issue quantities must be negative'; end if;
  if p_unit_cost is not null and p_unit_cost < 0 then raise exception 'Unit cost cannot be negative'; end if;
  select * into v_part from public.service_parts p
  where p.id = p_part_id and p.company_id = v_company_id and p.deleted_at is null and p.is_active
  for update;
  if not found then raise exception 'Active service part not found or access denied'; end if;
  select coalesce(sum(m.quantity_delta), 0)::integer into v_before
  from public.service_part_stock_movements m
  where m.company_id = v_company_id and m.part_id = p_part_id;
  v_after := v_before + p_quantity_delta;
  if v_after < 0 then raise exception 'Stock movement would make quantity negative'; end if;
  v_unit_cost := coalesce(p_unit_cost, v_part.unit_cost, 0);
  perform set_config('app.service_part_stock_rpc', 'true', true);
  insert into public.service_part_stock_movements(id, company_id, part_id, movement_type, quantity_delta, quantity_before, quantity_after, unit_cost, reference_type, reference_id, notes, created_by)
  values (v_movement_id, v_company_id, p_part_id, p_movement_type, p_quantity_delta, v_before, v_after, v_unit_cost, nullif(btrim(p_reference_type), ''), p_reference_id, nullif(btrim(p_notes), ''), v_user_id);
  if p_movement_type = 'receipt' and p_unit_cost is not null then
    perform set_config('app.service_parts_rpc', 'true', true);
    update public.service_parts
    set unit_cost = p_unit_cost, updated_at = timezone('utc', now()), updated_by = v_user_id
    where id = p_part_id;
  end if;
  return query select v_movement_id, p_part_id, v_before, v_after, p_quantity_delta;
end;
$$;

revoke all on function public.create_service_part(text, text, text, text, text, integer, numeric) from public, anon;
grant execute on function public.create_service_part(text, text, text, text, text, integer, numeric) to authenticated;
revoke all on function public.update_service_part(uuid, text, text, text, text, text, integer, numeric, boolean) from public, anon;
grant execute on function public.update_service_part(uuid, text, text, text, text, text, integer, numeric, boolean) to authenticated;
revoke all on function public.archive_service_part(uuid) from public, anon;
grant execute on function public.archive_service_part(uuid) to authenticated;
revoke all on function public.record_service_part_stock_movement(uuid, text, integer, numeric, text, uuid, text) from public, anon;
grant execute on function public.record_service_part_stock_movement(uuid, text, integer, numeric, text, uuid, text) to authenticated;
