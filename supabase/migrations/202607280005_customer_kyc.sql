create type public.kyc_status as enum ('pending', 'verified', 'rejected', 'expired');

alter table public.customers add column customer_number text;
alter table public.customers add column kyc_status public.kyc_status not null default 'pending';
alter table public.customers add column date_of_birth date;
alter table public.customers add column emergency_contact text;
alter table public.customers alter column email drop not null;

update public.customers
set customer_number = 'EV-C' || upper(substr(replace(id::text, '-', ''), 1, 8))
where customer_number is null;

alter table public.customers alter column customer_number set not null;
create unique index customers_company_number_key on public.customers(company_id, customer_number);
create unique index customers_company_phone_key on public.customers(company_id, phone)
where phone is not null and deleted_at is null;
create index customers_company_kyc_idx on public.customers(company_id, kyc_status)
where deleted_at is null;

create table public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  customer_id uuid not null references public.customers(id) on delete cascade,
  address_type text not null default 'home' check (address_type in ('home', 'work', 'other')),
  line_1 text not null,
  line_2 text,
  city text not null,
  state text not null,
  pin_code text not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customer_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  customer_id uuid not null references public.customers(id) on delete cascade,
  document_type text not null check (document_type in ('aadhaar', 'driving_licence', 'pan', 'address_proof', 'other')),
  document_number text,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  expires_on date,
  status public.kyc_status not null default 'pending',
  uploaded_by uuid references public.profiles(id),
  verified_by uuid references public.profiles(id),
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.kyc_reviews (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  customer_id uuid not null references public.customers(id) on delete cascade,
  status public.kyc_status not null,
  notes text,
  reviewed_by uuid not null references public.profiles(id),
  reviewed_at timestamptz not null default now()
);

create index customer_addresses_customer_idx on public.customer_addresses(customer_id);
create index customer_addresses_company_idx on public.customer_addresses(company_id);
create index customer_documents_customer_idx on public.customer_documents(customer_id);
create index customer_documents_company_status_idx on public.customer_documents(company_id, status);
create index customer_documents_uploaded_by_idx on public.customer_documents(uploaded_by);
create index customer_documents_verified_by_idx on public.customer_documents(verified_by);
create index kyc_reviews_customer_reviewed_idx on public.kyc_reviews(customer_id, reviewed_at desc);
create index kyc_reviews_company_idx on public.kyc_reviews(company_id);
create index kyc_reviews_reviewed_by_idx on public.kyc_reviews(reviewed_by);

alter table public.customer_addresses enable row level security;
alter table public.customer_documents enable row level security;
alter table public.kyc_reviews enable row level security;

create policy customer_addresses_company_access on public.customer_addresses
for all to authenticated
using (company_id = (select private.current_company_id()))
with check (company_id = (select private.current_company_id()));

create policy customer_documents_company_read on public.customer_documents
for select to authenticated
using (company_id = (select private.current_company_id()));

create policy customer_documents_company_insert on public.customer_documents
for insert to authenticated
with check (company_id = (select private.current_company_id()));

create policy customer_documents_admin_update on public.customer_documents
for update to authenticated
using (company_id = (select private.current_company_id()) and (select private.is_company_admin()))
with check (company_id = (select private.current_company_id()) and (select private.is_company_admin()));

create policy kyc_reviews_company_read on public.kyc_reviews
for select to authenticated
using (company_id = (select private.current_company_id()));

create policy kyc_reviews_company_insert on public.kyc_reviews
for insert to authenticated
with check (company_id = (select private.current_company_id()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'customer-documents',
  'customer-documents',
  false,
  5242880,
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy customer_documents_storage_read on storage.objects
for select to authenticated
using (
  bucket_id = 'customer-documents'
  and (storage.foldername(name))[1] = (select private.current_company_id())::text
);

create policy customer_documents_storage_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'customer-documents'
  and (storage.foldername(name))[1] = (select private.current_company_id())::text
);

create policy customer_documents_storage_update on storage.objects
for update to authenticated
using (
  bucket_id = 'customer-documents'
  and (storage.foldername(name))[1] = (select private.current_company_id())::text
)
with check (
  bucket_id = 'customer-documents'
  and (storage.foldername(name))[1] = (select private.current_company_id())::text
);
