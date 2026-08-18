-- Enforce the staging identity policy across RPC chunks and keep the legacy-ID
-- audit mapping append-only even for database roles with table privileges.
create unique index legacy_customer_mappings_email_key
  on public.legacy_customer_mappings (
    company_id,
    source_system,
    lower(source_payload->>'email')
  )
  where nullif(source_payload->>'email', '') is not null;

create or replace function private.prevent_legacy_customer_mapping_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'Legacy customer mappings are immutable';
end;
$$;

revoke all on function private.prevent_legacy_customer_mapping_mutation()
  from public, anon, authenticated;

create trigger legacy_customer_mappings_immutable
before update or delete on public.legacy_customer_mappings
for each row execute function private.prevent_legacy_customer_mapping_mutation();
