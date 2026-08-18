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
- Release: PR #6 merged as `9549929`; Vercel production deployment
  `evorentals-24vkie3qm-wephotons1.vercel.app` is Ready and aliased to
  `https://evorentals.vercel.app`.
- Post-release check: Vercel reported no `/rentals` runtime errors. The available
  browser session was signed out, so authenticated UI smoke testing was not claimed.

## D9-04 vehicle swaps

- Added a permission-gated vehicle swap form for active rentals with replacement
  selection, swap time, both odometers, returned-bike disposition, and reason.
- The original contract vehicle is preserved in immutable `original_bike_id`;
  `bike_id` represents the current assignment used by derived fleet availability.
- Every swap appends an immutable `rental_swaps` row containing both vehicles,
  both odometers, timing, disposition, reason, actor, and company scope.
- `swap_rental_vehicle` runs as invoker and locks the rental, conflicting future
  bookings, and both bikes in a consistent order. It rejects cross-company access,
  unavailable or already-rented replacements, booking conflicts, invalid timing,
  stale odometers, and non-active rentals.
- The transaction updates the returned bike odometer/status, replacement bike
  odometer, current rental assignment, and existing rental audit history together.
- Migrations `20260806132958_rental_vehicle_swaps.sql` and
  `20260806133028_rental_vehicle_swaps_hardening.sql` are applied and verified.
  RLS, explicit Data API grants, anonymous denial, invoker mode, fixed search path,
  foreign-key/query indexes, and original-assignment backfill were confirmed live.
- `npm.cmd run validate` passed on 2026-08-06. Production has no rentals or swap
  rows, so no persistent business data was fabricated for a swap smoke test.
- Release: PR #7 merged as `55fdc15`; Vercel production deployment
  `evorentals-bliivi816-wephotons1.vercel.app` is Ready and aliased to
  `https://evorentals.vercel.app`.
- Post-release check: Vercel reported no `/rentals` runtime errors. The available
  browser session was signed out, so authenticated UI smoke testing was not claimed.

## D9-05 return inspection

- Added a permission-gated return inspection form for active and overdue
  rentals. It captures India-local return time, odometer, battery level,
  condition, checklist values, notes, vehicle disposition, evidence metadata,
  and a validated JSON array of damage items.
- Migration `20260807082825_rental_return_inspection.sql` adds the
  company-scoped `rental_return_inspections` and `rental_damage_charges`
  tables, immutable-history triggers, explicit authenticated grants, and the
  `returned` rental state. No production business records were created.
- `record_rental_return` is a SECURITY INVOKER function with an empty fixed
  search path. It authorizes the employee, locks the open rental and current
  vehicle, rejects cross-company access, stale odometers, future/early returns,
  booking conflicts, invalid JSON, invalid states, and repeated inspections,
  then inserts inspection/charge history, updates vehicle telemetry and
  disposition, and marks the rental `returned` atomically.
- Damage charges remain separate operational facts; final settlement is not
  included in D9-05.
- Live verification: migration applied successfully; new tables have RLS,
  authenticated-only table access, company policies, and the RPC is invoker
  mode with `search_path = ""`. Security/performance advisors show only
  pre-existing project findings; no D9-05-specific finding. Initial inspection,
  damage-charge, and rental counts remain zero.
- `npm.cmd run validate` passed on 2026-08-07.
- Review fix `8fa0ad9` names the current bike foreign-key relationships in the
  rental and booking workspace queries. This resolves the live PostgREST error
  `Could not embed because more than one relationship was found for 'rentals'
  and 'bikes'`. The new READY preview has no runtime error logs.
- Release status: application fix commit `8fa0ad9` on feature branch
  `agent/d9-05-return-inspection`; draft PR #8 is open. Preview
  `evorentals-h7teszpz8-wephotons1.vercel.app` is READY. Authenticated browser
  smoke testing is still pending because the available preview access is
  protected and the current browser session is not authenticated.

## D9-06 rental settlement

- Status: Complete and released through PR #12, merge `3d3bcc8`.
- Migration `20260814052728_rental_settlements.sql` adds immutable,
  company-scoped settlement snapshots, explicit authenticated grants and RLS,
  and update/delete protection. Migration
  `20260818170000_rental_settlement_fk_index.sql` covers the composite rental
  foreign key identified by the performance advisor.
- `settle_returned_rental(uuid)` is SECURITY INVOKER with an empty search path.
  It locks the returned rental and its invoice, requires a return inspection,
  derives allocations, outstanding amount, deposit balance, damage total,
  amount due, and refund due from immutable ledger facts, inserts one snapshot,
  and marks the rental completed atomically.
- The browser submits only the rental ID through a Zod-validated server action;
  financial totals are never accepted from the UI. Repeated, unauthorized,
  cross-company, missing-invoice, and invalid-state settlement attempts are
  rejected.
- `npm.cmd run validate` passed. Live RLS, grants, trigger, invoker mode, fixed
  search path, migration presence, and zero settlement rows were verified.
  Security advisors have no settlement finding; only expected unused-index INFO
  notices remain on the empty table.
- The Vercel preview was READY and operator-authenticated. Production deployment
  `evorentals-3hu0csdp3-wephotons1.vercel.app` is READY on merge `3d3bcc8`,
  `/rentals` has the correct signed-out redirect, and the new deployment has no
  runtime error/fatal logs.
