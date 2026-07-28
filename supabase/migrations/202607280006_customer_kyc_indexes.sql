create index if not exists customer_documents_uploaded_by_idx
on public.customer_documents(uploaded_by);

create index if not exists customer_documents_verified_by_idx
on public.customer_documents(verified_by);

create index if not exists kyc_reviews_reviewed_by_idx
on public.kyc_reviews(reviewed_by);
