# Day 6 - Platform Operations

## D6-01 - Live Settings

Delivered:

- Replaced the Settings placeholder with live company, rental, payment, and
  regional configuration loaded through a typed server-only service.
- Added administrator-only Server Actions with Zod validation, explicit company
  scoping, zero-row failure detection, revalidation, and accessible feedback.
- Added responsive tabbed forms plus loading, error, and read-only role states.
- Removed branch configuration from Settings to preserve the single-branch model.
- Added company tenancy and unique company rows to `rental_settings`,
  `payment_settings`, and `system_preferences`.
- Replaced broad legacy settings policies with company-scoped SELECT and
  administrator-only UPDATE RLS policies.
- Normalized the existing preference row to `Asia/Kolkata`, `INR`, `en-IN`, KM,
  and Indian date/time defaults.

Database:

- Local/remote migration `20260804093529_company_scoped_operational_settings.sql`
- Local/remote migration `20260804093615_normalize_india_preferences.sql`
- Remote verification found one company-scoped row in each operational settings
  table and only the expected authenticated SELECT/admin UPDATE policies.
- Post-migration security advisors reported no warnings for the three changed
  settings tables. Existing unrelated legacy advisor findings remain.

Validation:

- `npm.cmd run validate` passed on 2026-08-04.
- Application commit: `0565b5a`.
- Production deployment `evorentals-funxxbs36-wephotons1.vercel.app` is Ready
  and aliased to `https://evorentals.vercel.app`.
- Authenticated mutation testing remains dependent on a working administrator
  identity; database structure, values, and policies were verified directly.

Next:

- Claim `D6-02` for live Employees and enforceable RBAC management.

## D6-02 - Live Employees and RBAC

Delivered:

- Replaced the Employees placeholder with a live company directory, active and
  disabled metrics, search/status filters, responsive records, role summaries,
  and access-history views.
- Added administrator-managed employee identity, assignment, role, and status
  editing while keeping the Supabase Auth email read-only.
- Added typed server-only services, permission checks, Zod-validated Server
  Actions, loading/error/read-only states, and atomic database updates.
- Company-scoped the legacy roles table and added a composite role assignment
  foreign key so profiles cannot reference another company’s role.
- Added a database trigger that blocks self-service privilege escalation,
  company reassignment, and removal of the final active administrator.
- Added append-only `employee_access_events` plus an administrator-only,
  security-invoker update RPC that writes profile and audit changes atomically.

Database and validation:

- Migration `20260804095824_company_scoped_employee_rbac.sql`
- Migration `20260804100044_employee_rbac_indexes.sql`
- A rollback-only authenticated administrator update exercised RLS, the guard
  trigger, RPC, and audit insert without changing production data.
- Remote verification found three company-scoped roles, the composite foreign
  key, guard trigger, RPC, expected RLS policies, and zero persisted test events.
- Post-migration advisors found no security warnings on changed RBAC objects.
- `npm.cmd run validate` passed on 2026-08-04.
- Application commit: `a6645bf`.
- Production deployment `evorentals-x0xd2tg64-wephotons1.vercel.app` is Ready
  and aliased to `https://evorentals.vercel.app`.

Deferred:

- Employee invitation/Auth provisioning is blocked until a server-only Supabase
  secret and custom SMTP are configured. Only public browser credentials exist,
  so this release intentionally manages existing Auth-backed profiles only.

Next:

- Claim `D7-01` for live Fleet and availability.
