# Day 2 — Platform Foundation

## Completed

- Reconciled the repository with the existing Supabase schema.
- Added company tenancy to profiles, customers, bikes, and rentals.
- Added indexed company foreign keys while preserving existing records.
- Added authenticated tenant helper functions with locked search paths.
- Replaced broad core-table policies with company-aware RLS policies.
- Added a development-only seed entry point without adding fake data to production.

## Security model

- Every active employee resolves to one company.
- All employees can work with operational records belonging to their company.
- The existing branch remains available as operational metadata, without tenant enforcement.
- Tenant identity is read from the server-controlled profile linked to `auth.uid()`.
- Anonymous access is denied and policies target the `authenticated` role.

## Day 3 handoff

- Build customer registration, addresses, KYC reviews, and private document storage.
- Add typed customer and fleet services so UI code never queries Supabase directly.
- Add integration tests using two companies to prove isolation.
