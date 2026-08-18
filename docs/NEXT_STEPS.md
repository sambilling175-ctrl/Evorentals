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
| D4-04 | P1 | Add auth recovery and protected-route Playwright coverage | Blocked | Unassigned; route/invalid-token coverage can run without mail, but end-to-end recovery remains gated | Stable SMTP/test mailbox or Supabase admin-generated test link | Auth, tests |
| D4-05 | P1 | Add two-company RLS isolation integration test | Review | Codex / `agent/d4-05-rls-isolation`; draft PR #11; transaction-only `supabase/tests/rls_isolation.sql` passed against live Supabase; validates scoped customer/bike/rental visibility and cross-company insert denial; rollback verification returned zero test rows; no migration | Existing authenticated actor; temporary second company | Supabase, tests |
| D4-06 | P1 | Configure production custom SMTP and branded Auth templates | Review | Codex / `agent/d4-06-resend-smtp`; commit `ba571ee`; templates/setup handoff and validation complete | User must enter the Resend API key in Supabase Auth SMTP, then complete one mailbox smoke test | Supabase Auth |
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
| D9-06 | P0 | Finalize returned rentals with immutable settlement snapshots and atomic closure | Review | Codex / `agent/d9-06-rental-settlement`; migration `20260814052728_rental_settlements.sql` applied; isolated paid-settlement smoke passed with no persisted records; authenticated preview `/rentals` rechecked 2026-08-14 and renders the empty control board without a 500/runtime error; remaining action is PR/release acceptance | D9-05, D10-01 | Rentals, Collections |
| D10-01 | P0 | Establish company-scoped receivables ledger for invoices, payments, allocations, deposits, refunds, and dues | Review | Codex / `agent/d10-01-receivables-ledger`; draft PR #10; migrations/advisors verified; authenticated preview `/payments` rechecked 2026-08-14 and renders ledger forms/empty states without a 500/runtime error; financial command submission remains intentionally unexecuted and requires isolated test records | D9-05, payment settings | Collections, Finance |
| D10-02 | P1 | Replace reports placeholder with live rental, fleet, customer, and collections summaries plus CSV export | Completed | Codex / `agent/d10-02-live-reports`; commit `d6de2b2`; `npm.cmd run validate` passed; authenticated preview `/reports` rechecked 2026-08-14 with live KPIs, empty-state table, CSV action, and no 500/runtime error; no production records created | D9-06, D10-01 | Reports, dashboard |
| D10-03 | P0 | Record returned-rental collections with damage allocations and immutable receipt/audit history | Review | Codex / `agent/d10-03-h1-rpc-rls-locks`; migrations `20260814060344` and `20260814073417` applied; isolated collection/receipt smoke passed with no persisted records; authenticated preview `/payments` rechecked 2026-08-14 and renders returned-rental collection/receipt empty states without a 500/runtime error; remaining action is PR/release acceptance | D9-05, D10-01 | Collections, settlement |
| D10-03-H1 | P0 | Add company-scoped UPDATE RLS policies required by immutable invoice/line lock paths | Completed | Codex / `agent/d10-03-h1-rpc-rls-locks`; migration `20260814073417_d10_03_h1_invoice_lock_rls.sql`; `npm.cmd run validate` passed; Supabase migration, policies, grants, triggers, advisors, and isolated end-to-end acceptance verified; no dummy rows remain | D10-03, D9-06 | Supabase, RLS |
| D11-01 | P1 | Stage and reconcile complete legacy customer metadata export without database writes | Review | Codex / `agent/d11-01-legacy-customer-staging`; commits `f3a8347`, `641fc89`, `91d83ae`; staging output and ID-only conflict manifest generated; `npm.cmd run validate` passed; no Supabase records or KYC binaries created; ADR-019 now resolves the conflict-policy gate | Complete customer CSV export | Migration, customers |
| D11-02 | P1 | Approve legacy customer conflict policy before import | Completed | Codex; ADR-019 accepted: quarantine blank-name and duplicate-identity rows, never invent names or merge solely on shared contact values | D11-01 | Migration, customers |
| D11-03 | P1 | Dry-run and import conflict-free legacy customer metadata | In progress | Codex / `agent/d11-03-customer-import`; commits `e8383e0`, `0430eee` pushed; schema/RPC applied and rollback tests/advisors passed; stricter validation yields 13,760 eligible and 32 quarantined rows; zero records imported; authenticated admin remote dry-run/apply token is the remaining gate; no KYC binaries in scope | D11-02 | Migration, customers |
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
