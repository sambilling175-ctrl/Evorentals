create index if not exists profiles_company_role_idx
  on public.profiles(company_id, role)
  where deleted_at is null;

create index if not exists employee_access_events_employee_idx
  on public.employee_access_events(employee_id);
