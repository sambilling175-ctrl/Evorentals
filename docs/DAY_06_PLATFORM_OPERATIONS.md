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
