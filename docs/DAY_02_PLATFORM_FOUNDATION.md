# Day 2 — Platform Foundation

## Completed

- Reconciled the repository with the existing Supabase schema.
- Added a company tenant and branch scope to profiles, customers, bikes, and rentals.
- Added indexed tenant/branch foreign keys while preserving existing records.
- Added authenticated tenant helper functions with locked search paths.
- Replaced broad core-table policies with company and branch-aware RLS policies.
- Added a development-only seed entry point without adding fake data to production.

## Security model

- Every active employee resolves to one company and optionally one branch.
- Administrators can work across branches within their company.
- Other employees are restricted to their assigned branch for operational records.
- Tenant identity is read from the server-controlled profile linked to `auth.uid()`.
- Anonymous access is denied and policies target the `authenticated` role.

## Day 3 handoff

- Build customer registration, addresses, KYC reviews, and private document storage.
- Add typed customer and fleet services so UI code never queries Supabase directly.
- Add integration tests using two companies and two branches to prove isolation.
