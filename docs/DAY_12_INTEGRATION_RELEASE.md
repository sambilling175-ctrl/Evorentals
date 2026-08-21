# Sprint 12 - Integration and release hardening

## Status

| Task | Status | Evidence / next action |
| --- | --- | --- |
| D12-01 | Completed | D9-06 rental settlement was integrated and released through PR #12 (`3d3bcc8`). Live settlement schema, RLS, grants, rollback-only smoke, and authenticated preview checks passed. |
| D12-02 | Completed | D10-01 receivables ledger was integrated and released through PR #10 (`f361396`). Live migrations, advisors, rollback-only command smoke, and production deployment checks passed. |
| D12-03 | Completed | D10-03 returned-rental collections were integrated through PR #14 (`8dceed3`), including H1 RLS and FK-index hardening. No business records remain from tests. |
| D12-04 | Completed | D4-05 RLS isolation is merged through PR #11 (`c279387`). Added `playwright.config.ts` and `tests/e2e/auth-routes.spec.ts`; all 10 non-email route/auth boundary checks pass without submitting credentials or creating records. Real-email recovery remains parked behind D4-04 SMTP. |
| D12-05 | Completed | Read-only production reconciliation passed on 2026-08-21. See `supabase/tests/production_reconciliation.sql`. All mismatch counters were zero. |
| D12-06 | Completed | Branch `agent/d12-06-ci-hardening`; `.github/workflows/ci.yml` adds validation, the D12-04 Playwright route suite, and Supabase artifact checks. GitHub Actions run `32489569334` passed all jobs and Vercel preview; local gates also passed (`check:supabase`: 33 migrations/2 SQL tests, Playwright: 10 passed, `npm.cmd run validate`); no records created. |

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

## Sprint 13 - Service and maintenance foundation (planned)

Service requests, job cards, intake inspection, employee/garage assignment,
controlled service pipeline, fleet availability transitions, dashboard metrics,
RLS, immutable history, advisors, and rollback-only SQL tests.

### D13-01 checkpoint - service request intake

Status: Review on `agent/d13-01-service-requests` (draft PR #20).

- Live schema verification found only the legacy `maintenance_records` table;
  it has no `company_id`, so it is not reused for the new workflow.
- Migration `20260821141140_d13_01_service_requests` adds company-scoped
  `service_reasons` and `service_requests`, RLS, explicit grants, indexes, and
  the invoker-mode `create_service_request` RPC with an empty search path.
- Eight controlled service-reason lookups were seeded for the existing company;
  no service requests or other business records were created.
- The service page now loads through `src/lib/services/service.ts`, validates
  requests with a Zod server action, and provides an accessible request form
  plus live recent-request state. D13-02 will add job cards and status flow.
- Security/performance advisors were run after migration. Findings are
  pre-existing project-wide lints; no D13-01 object finding was reported.
- GitHub CI passed typecheck/lint/build, Supabase artifact checks, and the
  11-route Playwright suite. The Vercel preview check is green/READY. Do not
  merge until product review accepts the request-intake workflow.

### D13-02 checkpoint - service job cards

Status: Review on `agent/d13-02-service-job-cards` (stacked on draft PR #20).

- This task is stacked on D13-01 because the request/reason migration remains
  in draft PR #20 pending product review; D13-02 will not merge independently.
- Scope is limited to job-card creation from service requests and controlled
  `requested -> inspection -> in_service -> waiting_parts -> qc -> completed`
  transitions. No parts, vendor, QC-detail, or fleet-release workflow is being
  invented ahead of its planned sprint item.
- Live migrations `20260821143147_d13_02_service_job_cards`,
  `20260821143345_d13_02_service_job_card_fk_indexes`,
  `20260821144218_d13_02_service_job_card_actor_guard`,
  `20260821144303_d13_02_service_job_card_index_cleanup`, and
  `20260821144335_d13_02_service_job_card_fk_index_restore` add
  company-scoped job cards, immutable transition events, explicit grants, FK
  indexes, actor authorization, and invoker-mode create/transition RPCs with
  fixed empty search paths.
- The service page uses typed service methods and Zod server actions for job
  card creation and transitions. No job-card or other business records were
  created. The performance advisor reports no D13-02 unindexed-FK findings;
  its remaining D13-02 messages are expected unused-index INFO notices while
  the tables are empty. Security advisor reported no D13-02 finding.
- Local `npm.cmd run validate`, `npm.cmd run check:supabase`, `git diff
  --check`, and the 11-route Playwright suite passed. The Playwright process
  was stopped after all 11 tests reported `ok` because the Windows webserver
  cleanup did not exit.

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

## D12-06 CI boundary

The repository does not contain a rebuildable baseline migration for its legacy
remote schema, so CI does not attempt `supabase start` or apply migrations to a
synthetic database. `scripts/check-supabase-artifacts.mjs` validates migration
filenames, duplicate versions, conflict markers, dangerous migration tokens,
and SQL test transaction safety. The existing rollback-only and read-only SQL
files remain available for authenticated Supabase execution during release
review.
