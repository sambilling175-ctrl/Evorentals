-- Scope legacy singleton operational settings by company and replace broad
-- authenticated policies with the same company/admin model used elsewhere.

alter table public.rental_settings
  add column if not exists company_id uuid references public.companies(id);
alter table public.payment_settings
  add column if not exists company_id uuid references public.companies(id);
alter table public.system_preferences
  add column if not exists company_id uuid references public.companies(id);

update public.rental_settings
set company_id = (select id from public.companies order by created_at limit 1)
where company_id is null;
update public.payment_settings
set company_id = (select id from public.companies order by created_at limit 1)
where company_id is null;
update public.system_preferences
set company_id = (select id from public.companies order by created_at limit 1)
where company_id is null;

alter table public.rental_settings alter column company_id set not null;
alter table public.payment_settings alter column company_id set not null;
alter table public.system_preferences alter column company_id set not null;

create unique index if not exists rental_settings_company_key
  on public.rental_settings(company_id);
create unique index if not exists payment_settings_company_key
  on public.payment_settings(company_id);
create unique index if not exists system_preferences_company_key
  on public.system_preferences(company_id);

drop policy if exists "Enable select for all authenticated users on rental_settings" on public.rental_settings;
drop policy if exists "Enable write operations for admins only on rental_settings" on public.rental_settings;
drop policy if exists "Enable select for all authenticated users on payment_settings" on public.payment_settings;
drop policy if exists "Enable write operations for admins only on payment_settings" on public.payment_settings;
drop policy if exists "Enable select for all authenticated users on system_preferences" on public.system_preferences;
drop policy if exists "Enable write operations for admins only on system_preferences" on public.system_preferences;

create policy rental_settings_read_own_company on public.rental_settings
for select to authenticated
using (company_id = (select private.current_company_id()));
create policy rental_settings_admin_update_own_company on public.rental_settings
for update to authenticated
using (company_id = (select private.current_company_id()) and (select private.is_company_admin()))
with check (company_id = (select private.current_company_id()) and (select private.is_company_admin()));

create policy payment_settings_read_own_company on public.payment_settings
for select to authenticated
using (company_id = (select private.current_company_id()));
create policy payment_settings_admin_update_own_company on public.payment_settings
for update to authenticated
using (company_id = (select private.current_company_id()) and (select private.is_company_admin()))
with check (company_id = (select private.current_company_id()) and (select private.is_company_admin()));

create policy system_preferences_read_own_company on public.system_preferences
for select to authenticated
using (company_id = (select private.current_company_id()));
create policy system_preferences_admin_update_own_company on public.system_preferences
for update to authenticated
using (company_id = (select private.current_company_id()) and (select private.is_company_admin()))
with check (company_id = (select private.current_company_id()) and (select private.is_company_admin()));

grant select, update on public.rental_settings to authenticated;
grant select, update on public.payment_settings to authenticated;
grant select, update on public.system_preferences to authenticated;
