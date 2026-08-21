# Sprint 12 - Integration and release hardening

## Status

| Task | Status | Evidence / next action |
| --- | --- | --- |
| D12-01 | Completed | D9-06 rental settlement was integrated and released through PR #12 (`3d3bcc8`). Live settlement schema, RLS, grants, rollback-only smoke, and authenticated preview checks passed. |
| D12-02 | Completed | D10-01 receivables ledger was integrated and released through PR #10 (`f361396`). Live migrations, advisors, rollback-only command smoke, and production deployment checks passed. |
| D12-03 | Completed | Re-reviewed on current `main`: PR #14 (`8dceed3`) is already integrated; live migrations/RLS/invoker boundary match the repository, and the rollback-only receipt/damage allocation acceptance test passed. No business records remain from tests. |
| D12-04 | In progress | D4-05 RLS isolation is merged through PR #11 (`c279387`). Non-email Playwright route coverage remains to be added; real-email recovery remains parked behind D4-04 SMTP. |
| D12-05 | Completed | Read-only production reconciliation passed on 2026-08-21. See `supabase/tests/production_reconciliation.sql`. All mismatch counters were zero. |
| D12-06 | Ready | Add CI checks for validation, Playwright route tests, migration checks, and SQL tests. This is the next implementation task after D12-05. |

## D12-05 reconciliation result

The live Supabase query returned:

- `open_rentals = 0`, `bikes = 5`
- `duplicate_open_vehicle_groups = 0`
- `open_vehicle_mismatches = 0`
- `settlements_without_return_inspection = 0`
- `settlements_with_bad_rental_status = 0`
- `invoices_over_allocated = 0`
- `payments_over_allocated = 0`
- `invoice_lines_over_allocated = 0`
- `invoices = 0`, `invoice_allocations = 0`, `payments = 0`, `settlements = 0`

This is a read-only check; it created no records.

## D12-03 re-review evidence

`supabase/tests/returned_rental_collections.sql` passed against the live
Supabase project on 2026-08-21. The transaction exercised a returned rental
with a ₹100 rental line and a ₹50 damage line, then verified:

- exact ₹150 allocation total and immutable receipt snapshot;
- two line-allocation rows and one issued receipt event;
- rejection of an allocation-total mismatch without adding a receipt; and
- rejection of receipt updates because no UPDATE policy crosses the RLS
  boundary.

The test is transaction-only and rolled back all setup and collection rows.

## Sprint 13 - Service and maintenance foundation (planned)

Service requests, job cards, intake inspection, employee/garage assignment,
controlled service pipeline, fleet availability transitions, dashboard metrics,
RLS, immutable history, advisors, and rollback-only SQL tests.

## Sprint 14 - Parts, vendors, QC, and service costing (planned)

Vendor/garage directory, spare-parts catalogue and movements, reservations,
labour/parts/battery/miscellaneous costs, QC rework, vehicle release, service
history, lifetime costs, and service analytics.

## Sprint 15 - Notifications and operational tasks (planned)

Live notification records and unread state, expiry/overdue/payment/service
alerts, employee tasks, realtime dashboard refresh, and notification settings.

## Sprint 16 - Legacy migration and production readiness (planned)

D11-03 customer metadata import is complete. Remaining planned work is KYC
asset migration design, performance/index review, security/RLS regression,
backup/rollback runbook, and final lifecycle acceptance testing.

Email work remains parked: D4-06 Resend SMTP, D4-04 real-email recovery, and
D6-03 employee invitation delivery.
