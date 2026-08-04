# Day 9 - Booking foundation

Date: 2026-08-04
Task: D9-01 - Availability search, booking creation, immutable pricing snapshots
Owner: Codex / `agent/d9-01-booking-foundation`
Status: Complete and released

## Delivered

- Live `/bookings` metrics, pipeline, India-local date-range search, and
  responsive available-vehicle booking forms.
- Availability excludes non-available fleet state, active/overdue rentals, and
  overlapping pending/confirmed bookings.
- Booking creation requires active verified customer, active plan, available
  vehicle, authorized Rentals permission, and valid plan duration.
- Server-calculated pricing snapshots include rate, units, distance, GST,
  deposit, total, and calculation time; browser-submitted prices are ignored.
- Migration `20260804122402_booking_foundation.sql`: company RLS, constraints,
  audit indexes, immutable-pricing trigger, and GiST overlap exclusion.

## Verification

- `npm.cmd run validate` passed.
- Live schema verification confirmed policies, trigger, overlap constraint, and
  zero initial bookings.

## Remaining

- Deploy and authenticated smoke-test after creating at least one real rate card.
- D9-02 converts confirmed bookings into active rental contracts.

## Release

- Application commit: `e59c882`
- Merge commit: `ccdcc72`
- Pull request: `#3`
- Production: `evorentals-3v1gyevew-wephotons1.vercel.app` (Ready and aliased)
- `/bookings` protected-route smoke test passed without console errors.

## D9-01-H1 render hotfix

- Production runtime evidence on 2026-08-04 showed three `/bookings` crashes:
  `TypeError: Cannot read properties of undefined (reading 'length')`.
- Supabase API logs showed the bookings, verified customers, and pricing-plan
  requests all returned HTTP 200, ruling out RLS, grants, and schema-cache faults.
- Root cause: the Client Component imported plain initial-state objects from a
  file-level `"use server"` module. Next.js treats every export in that module as
  a Server Function reference, so the initial state was unavailable at runtime.
- Resolution: shared form-state types and constants now live in
  `src/lib/bookings/action-state.ts`; the actions module exports async Server
  Functions only.
- Validation: `npm.cmd run validate` passed (typecheck, lint, production build).
- Database: no migration or data change required.
- Application commit: `8bc9681`; merge commit: `8e47251`; pull request: `#4`.
- Production: `evorentals-brphxc4zy-wephotons1.vercel.app` is Ready and aliased
  to `https://evorentals.vercel.app`.
- Authenticated browser smoke test was not run because the available browser
  session was signed out; re-open `/bookings` after the next authenticated login.

## D9-02 rental activation

- Replaced the mock `/rentals` page with a live company-scoped control board,
  confirmed-booking activation forms, due/overdue metrics, loading, and error states.
- Added immutable rental number, booking link, planned end, start odometer, and
  pricing snapshot contract facts to the legacy rentals table.
- `activate_confirmed_booking` authenticates and authorizes inside the database,
  locks booking and vehicle rows, rejects invalid timing/odometer/open-rental
  conflicts, inserts the contract, converts the booking, and updates odometer
  atomically. Existing rental audit triggers preserve the transition history.
- Unique partial indexes enforce one active/overdue rental per company vehicle
  and one live rental per booking. Rentals RLS now has one policy per operation.
- Migrations `20260804125633_rental_activation_contracts.sql` and
  `20260804125801_rental_activation_hardening.sql` are applied and verified.
- `npm.cmd run validate` passed before migration; live columns, indexes, RLS,
  invoker mode, fixed search path, and authenticated-only RPC execution verified.
- Operational gap: production has four available vehicles but zero verified
  customers and zero active pricing plans, so no persistent end-to-end activation
  was fabricated. Authenticated `/rentals` browser verification remains pending.
- Release: PR #5 merged as `68c8e26`; Vercel production deployment
  `evorentals-af4ifawj3-wephotons1.vercel.app` is Ready and aliased to
  `https://evorentals.vercel.app`.
- Post-release check: Vercel reported no `/rentals` runtime errors in the first
  hour. The available browser session was signed out, so authenticated UI smoke
  testing was not claimed.

## D9-03 rental extensions

- Added an extension form to every eligible active or overdue contract, guarded
  by Rentals `Edit`/`Manage` permissions.
- Each extension is an immutable `rental_extensions` record containing the old
  and new due dates, duration, billing units, reason, charge, and its own pricing
  snapshot. Original contract pricing remains unchanged.
- `extend_active_rental` runs as invoker, locks the rental and conflicting future
  bookings, calculates extension charges from the confirmed contract snapshot,
  and reconciles the contract, extension, and total amounts atomically.
- Future booking overlap, backward dates, incomplete pricing, excessive duration,
  cross-company access, invalid roles, and repeated concurrent edits are rejected
  in the database rather than trusted to the browser.
- The activation RPC was updated to initialize the new reconciled amount fields,
  preserving D9-02 compatibility for future contracts.
- Migrations `20260804131305_rental_extensions.sql`,
  `20260804131358_rental_extensions_hardening.sql`, and
  `20260804131557_rental_extension_activation_compatibility.sql` are applied and
  verified. Anonymous table/RPC access is explicitly revoked; authenticated RLS,
  invoker mode, fixed search paths, indexes, and zero reconciliation failures
  were confirmed live.
- `npm.cmd run validate` passed after the final application changes. Production
  contains no rentals, so no persistent business record was fabricated for a
  destructive extension smoke test.
