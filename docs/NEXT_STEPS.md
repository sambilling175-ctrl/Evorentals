# Evo Rentals ERP - Shared Task Queue

> Every agent must claim one task before editing. Update owner, branch, status,
> validation, and handoff notes as part of the same commit as the code.

## Status values

- `Ready` - unblocked and available
- `In progress` - claimed by one owner
- `Blocked` - cannot proceed; blocker must be recorded
- `Review` - implementation complete, awaiting integration or acceptance
- `Completed` - merged, validated, documented, and deployed when applicable

## Active delivery queue

| ID | Priority | Task | Status | Owner / branch | Dependencies | Primary area |
| --- | --- | --- | --- | --- | --- | --- |
| D4-01 | P0 | Connect logout and real authenticated profile identity | Completed | Codex / `main` | Day 3 auth | Navigation, auth |
| D4-02 | P0 | Add customer editing with validation and timeline event | Completed | Codex / `main` | Customer service | Customers |
| D4-03 | P0 | Add signed KYC document view/download | Completed | Codex / `main` | Private storage | Customers, storage |
| D4-04 | P1 | Add auth recovery and protected-route Playwright coverage | Blocked | Requires stable SMTP/test mailbox; no implementation should fabricate email delivery | Stable SMTP/test mailbox | Auth, tests |
| D4-05 | P1 | Add two-company RLS isolation integration test | Completed | Codex; PR #11 merged as `c279387`; live transaction-only test passed; rollback query returned zero temporary rows; `npm.cmd run validate` passed; no migration or production records | Existing authenticated actor; temporary second company | Supabase, tests |
| D4-06 | P1 | Configure production custom SMTP and branded Auth templates | Blocked | Requires SMTP provider decision and verified sending domain | SMTP provider decision | Supabase Auth |
| D5-01 | P1 | Align customer page with supplied design references | Completed | Codex / `main`; app commit `109f3b0`; validate passed; production Ready; no migration | Day 4 customers | UI |
| D5-02 | P1 | Rebuild dashboard sections using reusable live-data contracts | Completed | Codex / `main`; app commit `4e3af21`; validate/Supabase query passed; production Ready; no migration | Metrics services | Dashboard |
| D5-03 | P2 | Complete navigation actions, theme control, and mobile behavior | Completed | Codex / `main`; app commit `bd0bbe6`; validate passed; production Ready; no migration | D4-01 | Navigation |
| D6-01 | P1 | Replace settings foundation with live company and operational configuration | Completed | Codex / `agent/d6-01-live-settings`; app commit `0565b5a`; validate/database verification passed; production Ready | D5-03 | Settings |
| D6-02 | P1 | Replace Employees placeholder and establish enforceable RBAC management | Completed | Codex / `agent/d6-02-employees-rbac`; app commit `a6645bf`; validate/database verification passed; production Ready | D6-01 | Employees, RBAC |
| D6-03 | P1 | Add secure employee invitation and Auth provisioning | Blocked | Unassigned; requires server secret and custom SMTP | D4-06, D6-02 | Employees, Auth |
| D7-01 | P1 | Replace Fleet placeholder with live vehicle directory and availability state | Completed | Kimi + Codex; app `de4873f`, merge `f201cf5`; migrations `20260804112443` and `20260804112716`; production Ready | D6-02 | Fleet |
| D8-01 | P1 | Add company-scoped pricing plans and server-calculated quote preview | Completed | Codex; app `8fe805d`, merge `5e83ef0`; migration `20260804120339`; production Ready | D7-01, D6-01 | Pricing, Rentals |
| D9-01 | P0 | Add availability search, conflict-safe booking creation, and immutable pricing snapshots | Completed | Codex; app `e59c882`, merge `ccdcc72`; migration `20260804122402`; production Ready | D7-01, D8-01 | Bookings, Pricing |
| D9-01-H1 | P0 | Fix bookings client crash caused by importing initial state from a server-actions module | Completed | Codex; app `8bc9681`, merge `8e47251`; validate passed; production Ready; no migration | D9-01 | Bookings |
| D9-02 | P0 | Convert confirmed bookings into immutable active rental contracts | Completed | Codex; app `65358ab`, merge `68c8e26`; migrations `20260804125633` and `20260804125801`; validate and live schema verification passed; production Ready | D9-01 | Rentals, Bookings, Fleet |
| D9-03 | P0 | Extend active rentals with immutable pricing and audit history | Completed | Codex; app `5f065dc`, merge `9549929`; migrations `20260804131305`, `20260804131358`, `20260804131557`; validate/live schema passed; production Ready | D9-02 | Rentals, Pricing, Fleet |
| D9-04 | P0 | Swap vehicles on open rentals with odometer reconciliation and immutable history | Completed | Codex; app `7041d0a`, merge `55fdc15`; migrations `20260806132958` and `20260806133028`; validate/live schema passed; production Ready | D9-03 | Rentals, Fleet, Bookings |
| D9-05 | P0 | Return inspection with immutable damage history and atomic rental/vehicle transition | Completed | Codex; merge `e3893a9`; migration `20260807082825`; validate/advisors passed; authenticated preview and production `/rentals` smoke tests passed; production READY; no records created | D9-04 | Rentals, Fleet |
| D9-06 | P0 | Finalize returned rentals with immutable settlement snapshots and atomic closure | Completed | Codex; PR #12 merged as `3d3bcc8`; migrations `20260814052728` and `20260818170000`; validate, schema/RLS/grants, advisors, authenticated preview, production redirect, and deployment-log checks passed; no settlement rows created | D9-05, D10-01 | Rentals, Collections |
| D10-01 | P0 | Establish company-scoped receivables ledger for invoices, payments, allocations, deposits, refunds, and dues | Completed | Codex; PR #10 merged as `f361396`; Vercel production deployment succeeded; migrations, advisors, rollback-only command smoke, authenticated preview, and live zero-row verification passed | D9-05, payment settings | Collections, Finance |
| D10-02 | P1 | Replace reports placeholder with live operational summaries and CSV export | Completed | Codex; PR #15 merged as `b53a961`; refreshed branch included merged D12-03; `npm.cmd run validate` passed; READY preview authenticated and empty-state smoke-tested; no migration or business records | D9-06, D10-01 | Reports, dashboard |
| D10-03 | P0 | Record returned-rental collections with damage allocations and immutable receipt history | Completed | Codex / `agent/d12-03-returned-rental-collections`; live migrations `20260814060344`, `20260814073417`, `20260821060601`, and `20260821060716`; validate, advisors, preview, and release checks passed; merged via PR #14 as `8dceed3`; no business records | D9-05, D10-01 | Collections, settlement |
| D12-03 | P0 | Review and integrate D10-03 returned-rental collections | Completed | Codex; clean integration, H1 RLS, payment refresh guard, FK-index hardening, validation, live checks, READY preview, and PR #14 merge `8dceed3` complete; no business records | D9-06, D10-01 | Collections, release |
| D12-01 | P0 | Review and integrate D9-06 rental settlement | Completed | PR #12 merged as `3d3bcc8`; schema/RLS/grants, rollback-only smoke, authenticated preview, production redirect, and deployment checks passed | D9-06 | Release |
| D12-02 | P0 | Review and integrate D10-01 receivables ledger | Completed | PR #10 merged as `f361396`; migrations, advisors, rollback-only command smoke, authenticated preview, and production deployment checks passed | D10-01 | Release |
| D12-04 | P0 | Integrate D4-05 RLS isolation and non-email Playwright coverage | Completed | D4-05 RLS integration is merged as `c279387`; added `playwright.config.ts` and `tests/e2e/auth-routes.spec.ts` with 10 passing non-email route/auth boundary checks; no credentials submitted and no business records created; real-email recovery stays parked behind D4-04 | D4-05 | Release, tests |
| D12-05 | P0 | Reconcile production rentals, receivables, settlements, dashboards, and reports | Completed | Read-only `supabase/tests/production_reconciliation.sql` passed live with zero mismatch counters; no records created | D12-01, D12-02, D12-03 | Release, reconciliation |
| D12-06 | P1 | Add CI validation, Playwright route tests, migration checks, and SQL tests | Completed | Owner: Codex; branch `agent/d12-06-ci-hardening`; GitHub Actions run `32489569334` passed quality, 10-route Playwright, Supabase artifact, and Vercel preview checks; local `check:supabase`, Playwright (10 passed), and `validate` also passed; no records created | D12-04, D12-05 | CI, tests |
| D13-01 | P1 | Add company-scoped service reasons and service request intake | Review | Codex / `agent/d13-01-service-requests`; draft PR #20; migration `20260821141140_d13_01_service_requests` applied; 8 controlled reasons seeded, 0 service requests; local validation, 11-route Playwright, CI, Vercel preview, and advisors passed | D12 release | Service, maintenance |
| D13-02 | P1 | Add service job cards and controlled status transitions | Review | Codex / `agent/d13-02-service-job-cards`; draft PR #21; five live migrations (`20260821143147`, `20260821143345`, `20260821144218`, `20260821144303`, `20260821144335`); company-scoped RLS, invoker RPCs, immutable event history, actor guard, local validate/checks passed, 11-route Playwright passed, CI run `32493896245` passed, Vercel preview READY at `https://evorentals-baf1lh1p3-wephotons1.vercel.app`; stacked on D13-01 draft PR #20; no job-card records | D13-01 | Service, maintenance |
| D13-03 | P1 | Add vehicle intake inspection with odometer and battery capture | Review | Codex / `agent/d13-03-vehicle-intake-inspection`; migrations `20260821145735_d13_03_vehicle_intake_inspection` and `20260821145849_d13_03_require_intake_before_inspection` applied; immutable intake history, stale-odometer guard, atomic bike telemetry reconciliation, and inspection-stage gate; local validate/checks and 11-route Playwright passed; stacked on D13-02 review branch; no intake records | D13-02 | Service, fleet |
| D11-01 | P1 | Stage and reconcile complete legacy customer metadata export without database writes | Completed | Codex; staging scripts, complete CSV reconciliation, ID-only conflict manifest, and conservative quarantine review merged via PR #16; no KYC binaries or source-system mutations | Complete customer CSV export | Migration, customers |
| D11-02 | P1 | Approve legacy customer conflict policy before import | Completed | ADR-019 accepted: quarantine blank-name, duplicate-identity, and unparseable-phone rows; never invent names or merge solely on shared contact values | D11-01 | Migration, customers |
| D11-03 | P1 | Dry-run and import conflict-free legacy customer metadata | Completed | Codex / `agent/d11-03-customer-import-next`; local reconciliation, authenticated 69-chunk dry-run, and checksum-confirmed apply completed; 13,760 eligible rows imported into one completed batch with immutable mappings; 32 rows quarantined; no KYC binaries or source mutations | D11-02 | Migration, customers |
| AUTH-H2 | P0 | Make implicit password recovery resilient when Supabase falls back to the login Site URL | Completed | Codex; merge `c7a4956`; validate passed; production READY and fallback smoke-tested; no migration | Day 3 auth | Auth |

## Planned module sequence

After Day 5:

1. Settings
2. Employees and RBAC
3. Fleet and availability
4. Pricing
5. Booking and rental lifecycle
6. Collections and settlement
7. Live dashboard and reports

## Task claim template

When starting:

```text
Status: In progress
Owner: <agent/tool name>
Branch: agent/<task-id>-<description>
Started: YYYY-MM-DD HH:MM Asia/Kolkata
Files/area: <expected ownership>
Migration owner: yes/no
```

When handing off:

```text
Status: Review or Completed
Commit: <sha>
Validation: <commands and results>
Deployment: <URL/status or not applicable>
Migrations: <names/status or none>
Remaining: <precise unfinished work>
Next action: <one executable step>
```

## Coordination rules

- One owner per in-progress task.
- One migration owner at a time.
- Do not silently broaden a task into another module.
- If two tasks need the same file, coordinate ownership before editing.
- Do not mark a task completed until code, validation, and documentation agree.
