-- Cover actor foreign keys reported by the Supabase performance advisor.
create index legacy_customer_import_batches_created_by_idx
  on public.legacy_customer_import_batches(created_by);
create index legacy_customer_mappings_imported_by_idx
  on public.legacy_customer_mappings(imported_by);
