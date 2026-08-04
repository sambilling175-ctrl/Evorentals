# Day 7 - Fleet and availability

Date: 2026-08-04
Task: D7-01 - Replace Fleet placeholder with live vehicle directory and
availability state
Owner: Kimi + Codex / branch `agent/d7-01-fleet-directory`
Status: Complete and released

## Delivered

- Live vehicle directory at `/fleet` backed by `public.bikes` through the typed
  service `src/lib/services/fleet.ts` (server-only, actor gate, explicit
  snake_case to camelCase mapping).
- Derived availability (ADR-011): a vehicle with an active rental is `rented`;
  otherwise availability is the normalized `bikes.status`
  (`available`/`reserved`/`maintenance`/`retired`). Unknown legacy status
  values pass through unbucketed and render with a neutral badge; they appear
  under "All vehicles" only.
- KPI row (total, available, rented, reserved, maintenance), search, and
  availability filters; desktop table and mobile card layouts.
- Register/edit vehicle dialogs via Zod-validated Server Actions
  (`src/app/(dashboard)/fleet/actions.ts`), `useActionState` feedback,
  `revalidatePath("/fleet")`. `rented` is never set manually.
- Permission model follows employees: DB enforces company tenancy (existing
  `bikes` RLS), the service enforces the existing `Vehicles` module permission
  (`View`/`Manage`/`Edit`; `admin`/`super_admin` bypass). `canManage=false`
  renders the directory view-only.
- `loading.tsx`/`error.tsx` matching the employees module; `retired` added to
  `STATUS_CONFIG`.

## Live schema discovery (2026-08-04, Supabase SQL editor)

`public.bikes` columns before the migration: `id`, `serial_number`, `model`,
`status` (text, default `'available'`), `battery_level`, `location_lat`,
`location_lng`, `last_serviced_at`, `created_at`, `updated_at`, `created_by`,
`updated_by`, `deleted_at`, `company_id`. Live verification found 5 vehicles:
3 `available`, 1 `maintenance`, and 1 legacy stored `rented`, with no active
rentals. The migration reconciles that legacy `rented` row to `available`.

## Migration

`20260804112443_fleet_directory.sql` (applied to project
`ctpctcymjbtyxpdawrgh`):

- Adds `registration_number`, `manufacturer`, `variant`, `color`, `category`,
  `vin_number`, `manufacturing_year`, `purchase_date`, `current_odometer`,
  `notes` to `public.bikes` (all `if not exists`).
- Drops the legacy San Francisco demo defaults on `location_lat`/`location_lng`.
- Replaces the legacy status constraint with the base-state invariant
  (`available`/`reserved`/`maintenance`/`retired`) and reconciles stored
  `rented` values to `available`.
- Adds year/odometer check constraints, case-insensitive registration/VIN
  uniqueness, and a partial
  `(company_id, status) where deleted_at is null` index.
- No RLS change: existing company-scoped read/write policies on `bikes` are
  retained (DB enforces tenancy; module permission is enforced in the service).

`20260804112716_fleet_directory_hardening.sql` (applied and verified):

- Splits the legacy catch-all write policy into INSERT, UPDATE, and DELETE
  policies so reads use only the dedicated company-scoped SELECT policy.
- Adds covering indexes for `created_by` and `updated_by` audit foreign keys.

## Validation

- `npm run validate` (typecheck, lint, build) passed on 2026-08-04.
- Live database verification passed: new columns and indexes exist; the status
  constraint accepts only base states; 5 vehicles reconcile to 4 `available`
  and 1 `maintenance`; 0 active rentals; company-scoped RLS remains enabled.

## Remaining

- Post-release role/theme interaction testing remains part of the broader
  acceptance suite; the production protected-route smoke test passed.

## Release

- Application commit: `de4873f`
- Merge commit: `f201cf5`
- Pull request: `#1`
- Production deployment: `evorentals-7ohtvsvh1-wephotons1.vercel.app` (Ready,
  aliased to `https://evorentals.vercel.app`)
- Production `/fleet` correctly redirects unauthenticated users to
  `/login?next=%2Ffleet`.
- Non-admin access uses the existing `Vehicles` role module. Employees are
  view-only; managers can edit because their existing role includes `Edit`.

Next:

- Claim the Pricing module (next in the planned module sequence).
