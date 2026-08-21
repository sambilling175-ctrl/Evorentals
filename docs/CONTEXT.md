# Evo Rentals ERP - Project Context and Checkpoint

> Living checkpoint for every coding agent. Read this file before editing code.
> Update only with verified repository, database, or deployment facts.

## Checkpoint

| Field | Verified value |
| --- | --- |
| Updated | 2026-08-21 |
| Delivery position | D13-07 service dashboard metrics implemented on a branch stacked on D13-06 draft PR #25; 32 D11-03 conflict rows remain quarantined |
| Git branch | `agent/d13-06-service-fleet-availability` |
| Last verified application commit | pending - D13-07 service dashboard metrics; D13-06 fleet synchronization remains in the stacked base |
| Continuity protocol baseline | `c171e65` - Add multi-agent continuity protocol |
| Production application | `https://evorentals.vercel.app` |
| Production deployment | `evorentals-3hu0csdp3-wephotons1.vercel.app` - READY; aliased to production |
| Supabase project | `ctpctcymjbtyxpdawrgh` |
| Latest migrations | D13-01 `20260821141140_d13_01_service_requests`; D13-02 `20260821143147_d13_02_service_job_cards`, `20260821143345_d13_02_service_job_card_fk_indexes`, `20260821144218_d13_02_service_job_card_actor_guard`, `20260821144303_d13_02_service_job_card_index_cleanup`, and `20260821144335_d13_02_service_job_card_fk_index_restore`; D13-03 `20260821145735_d13_03_vehicle_intake_inspection` and `20260821145849_d13_03_require_intake_before_inspection`; D13-04 assignment objects are applied and verified; D13-06 migration `20260821165156_d13_06_service_fleet_availability` is applied and verified; no service business records created |
| Last quality gate | D13-05 live rollback-only SQL verification, local `check:supabase` (42 migrations, 4 SQL tests), and prior `npm.cmd run validate` passed on 2026-08-21; advisors show only pre-existing project-wide findings |

## Product

Evo Rentals is an India-focused electric two-wheeler rental ERP covering
customers, KYC, fleet, bookings, rentals, collections, inspections, settlement,
service, reporting, employees, notifications, and settings.

The first production lifecycle is:

`Customer/KYC -> availability -> booking -> rental -> collection -> return -> settlement`

Product source material is under `D:\Evo Rentals`. Treat aspirational design
documents as requirements, but verify the live schema before implementing them.

## Technology

- Next.js 16.2.10 App Router and React 19
- TypeScript and Tailwind CSS 4
- Radix/shadcn-style components, TanStack Table, Recharts, Zod
- Supabase Postgres, Auth, Storage, Realtime, and RLS
- Vercel production deployment from GitHub `main`
- INR, Indian formats, `Asia/Kolkata`

Read the bundled Next.js documentation under `node_modules/next/dist/docs`
before using framework APIs. This project uses `src/proxy.ts`.

## Verified completed work

### Day 1 - application foundation

- Responsive dashboard shell, sidebar, top navigation, cards, charts, tables,
  loading/error primitives, and dark-first theme
- Dashboard and operational module foundations using demonstration data

### Day 2 - platform and tenancy

- Company-scoped tenancy and RLS
- Tenant helper functions in the private schema
- Branch tenancy deliberately removed; branch may remain operational metadata
- Migrations `202607280002` through `202607280004`

### Day 3 - authentication and customers

- Supabase email/password login and protected dashboard routes
- Forgot-password, PKCE callback, new-password, session proxy, and error states
- Browser-side recovery initiation so the PKCE verifier survives the email flow
- Live customer directory, detail, creation, addresses, KYC reviews, timeline
- Private `customer-documents` storage structure and policies
- Migrations `202607280005` and `202607280006`

### Day 4 - operational loose ends

- Live authenticated profile identity and working logout
- Customer profile and primary-address editing
- Append-only customer timeline events
- Private KYC viewing through short-lived signed URLs
- Migration `20260804075659_customer_timeline_events.sql`

### Day 5 - experience alignment

- Reference-aligned live customer directory and customer detail workspace
- Responsive KYC filters, operational status signals, mobile customer cards,
  signed-document access, review actions, and timeline retained
- No migration for D5-01; validation recorded in `DAY_05_CUSTOMER_EXPERIENCE.md`
- Live dashboard service contracts and operational KPI sections (D5-02)
- Single-branch navigation, real route actions, persisted sidebar state,
  accessible keyboard/mobile behavior, and reliable theme selection (D5-03)

### Day 6 - platform operations (in progress)

- Live company profile, rental defaults, payment controls, and India regional
  preferences under typed Settings services and administrator-only actions
- Company-scoped rental, payment, and preference rows with hardened RLS
- Migrations `20260804093529` and `20260804093615`
- Live employee directory, role summaries, administrator-managed employment and
  access state, and append-only access history
- Company-scoped role definitions, composite profile-role integrity, database
  privilege-escalation guard, last-administrator protection, and atomic update RPC
- Migrations `20260804095824` and `20260804100044`

## Live versus placeholder functionality

Live:

- Authentication and session protection
- Customer directory, customer details, creation, and KYC review
- Company-scoped customer data and policies
- Dashboard customer, KYC, fleet, availability, active-rental counts, recent
  customer records, and customer timeline

Mock or placeholder:

- Service operational data
- Drivers, reports, and notifications

Live: company-scoped receivables ledger, payment/deposit/refund commands, and
atomic returned-rental settlement (D10-01 and D9-06, merges `f361396` and
`3d3bcc8`).

Live: fleet directory and derived availability (D7-01), released from merge
commit `f201cf5`.

Live: company-scoped pricing plans and server-calculated quote preview (D8-01,
merge commit `5e83ef0`).

Live: date-range availability search, conflict-safe booking creation, and
immutable pricing snapshots (D9-01, merge `ccdcc72`).

Live: confirmed-booking activation into immutable active rental contracts
(D9-02, merge `68c8e26`).

Live: immutable, conflict-aware rental extensions with additive contract totals
(D9-03, merge `9549929`).

Live: atomic vehicle swaps with immutable assignment history and odometer
reconciliation (D9-04, merge `55fdc15`).

Live: atomic return inspection with immutable inspection and damage-charge
history (D9-05, merge `e3893a9`).
The first preview exposed a PostgREST ambiguous relationship error because
`rentals` has both current and original bike foreign keys. The rental workspace
now names the `rentals_bike_id_fkey` and `bookings_bike_id_fkey` relationships
explicitly. The fix is `8fa0ad9`; its READY preview is
`https://evorentals-h7teszpz8-wephotons1.vercel.app` and the deployment has no
runtime error logs.
Migration `20260807082825_rental_return_inspection.sql` is applied to Supabase;
no production business records were created. The READY preview is
`https://evorentals-q9imvfwwi-wephotons1.vercel.app`.
The refreshed branch preview was authenticated and smoke-tested on 2026-08-10:
`/rentals` loaded the live control board, zero-record metrics, activation empty
state, and contracts empty state without the prior relationship failure. No
business record was created.

Do not describe placeholder screens as backend-complete.

## Known issues and debt

- Supabase built-in email provider permits only two project-wide Auth emails per
  hour. Configure custom SMTP before production onboarding.
- Live notification counts are not wired; the shell links to the notifications
  module without displaying a fabricated badge.
- No automated tests currently cover auth, RLS isolation, or customer workflows.
- The legacy base schema has no rebuildable `0001` baseline migration.
- Audit events, full RBAC, and updated-at conventions remain incomplete.
- Employee invitations are blocked until a protected Supabase server secret and
  custom SMTP are configured; no privileged Auth key is present in the app.

## Mandatory implementation patterns

1. UI components must use typed domain services rather than query Supabase.
2. Server actions authenticate with `getActor()`, authorize company scope, and
   validate FormData with Zod.
3. Business tables carry `company_id`; policies enforce company isolation.
4. Database snake_case maps explicitly to TypeScript camelCase.
5. Private storage paths use `{company_id}/{entity_id}/...`.
6. Never expose storage paths or privileged keys to browser code.
7. Validate Indian phone, address, PIN, INR, and timezone conventions.
8. Match the supplied dark operations-dashboard design language and verify both
   dark and light themes.

## Schema reality

- Existing base tables are legacy remote tables and are not represented by a
  complete baseline migration.
- Product database documents outside the app may describe an aspirational schema.
- Verify live columns, constraints, enum values, and RLS before new migrations.
- Continue migration numbering after `20260821060716`.
- Only one active task may own a new migration sequence.

## Immediate next action

D13-07 service dashboard metrics are implemented on
`agent/d13-07-service-dashboard` and await preview/review. The next service
checkpoint is D13-08: RLS/history/advisor verification and rollback-only SQL
tests. Email/auth work remains parked until D4-04 has a stable test mailbox and
D4-06 has an SMTP provider decision. No production business records are
required for these tasks.

### D10-01 database checkpoint

- Migrations `20260810160000_receivables_ledger.sql` and
  `20260810160100_receivables_indexes.sql` are applied to the live project.
- Six company-scoped ledger tables have RLS, explicit authenticated policies,
  immutable-history triggers, composite tenancy constraints, and covering
  foreign-key indexes. Initial row counts remain zero.
- Invoice, payment, deposit, and refund posting functions are SECURITY INVOKER,
  use `search_path = ""`, deny anonymous execution, and allow authenticated execution.
- Security advisors report no D10-01 findings. Performance advisors report no
  missing D10-01 foreign-key indexes; unused-index INFO notices are expected
  until real ledger traffic exists.
- `/payments` now uses a server-only typed receivables service and live invoice,
  allocation, payment, refund, outstanding, and overdue totals. The former mock
  collections dataset has been removed. `npm.cmd run validate` passes.
- PR #10 merged as `f361396`. Its production deployment succeeded, and an
  unauthenticated `/payments` request correctly resolves to `/login?next=/payments`.
- The receivables module now exposes typed invoice, payment, and deposit-refund
  commands through Zod-validated server actions and guarded forms. Collection
  totals are calculated from all posted payments; the recent list remains
  limited to the latest 20 rows. No migration or business records were created.
- The refreshed D10-01 preview is READY; unauthenticated `/payments` still
  resolves to `/login`. Authenticated smoke now renders the ledger KPIs,
  posting forms, and empty invoice/collection states with zero console errors
  or warnings. Financial command submission remains intentionally unexecuted
  because it requires non-production test records.
- `supabase/tests/receivables_commands.sql` now provides a rollback-only live
  command smoke. As the authenticated actor it successfully posts an
  unallocated ₹1.25 payment through `post_receivable_payment`, rejects a zero
  amount, and rolls back both paths. Post-test verification found zero rows
  with the test references; `npm.cmd run validate` passes.
- Runtime investigation on 2026-08-14 found the authenticated preview 500 was
  caused by an ambiguous PostgREST `customers` embed on `receivable_payments`.
  The workspace now selects customer IDs and resolves names through the
  company-scoped customer map; returned-rental options use the same seam and
  no longer embed `customers`. `npm.cmd run validate` passes after the fix.
- Live Supabase schema verification confirms the required customer ID and
  status/deletion columns. Security/performance advisors were rerun; current
  warnings are pre-existing legacy functions/policies and unrelated indexes,
  not the D10-01 receivables objects.

### D9-06 settlement checkpoint

- Migration `20260814052728_rental_settlements.sql` is applied to the live
  project. It adds an immutable company-scoped settlement snapshot table,
  explicit RLS/grants, and fixed-search-path immutable-history protection.
- `settle_returned_rental(uuid)` is live as `SECURITY INVOKER`. It locks the
  returned rental and invoice, derives invoice allocation, deposit balance,
  damage, amount due, and deposit refund due from ledger facts, inserts one
  immutable snapshot, and atomically marks the rental `completed`.
- The rentals service, Zod server action, and rental control board now expose
  settlement without accepting manual financial totals. No business records
  were created. `npm.cmd run validate` passes.
- Supabase security advisors have no settlement-specific finding. The missing
  composite settlement-to-rental foreign-key index found by the performance
  advisor was added by `20260818170000_rental_settlement_fk_index.sql`; remaining
  unused-index notices are expected while the table contains zero rows.
- PR #12 merged as `3d3bcc8`. The READY preview was authenticated by the operator,
  Vercel reported no preview error/fatal logs, and production deployment
  `evorentals-3hu0csdp3-wephotons1.vercel.app` is READY on the merge commit.
  Production `/rentals` correctly redirects signed-out users to
  `/login?next=/rentals`; the new production deployment has no error/fatal logs.
- D10-03-H1 adds authenticated company-scoped UPDATE policies and UPDATE
  grants for `receivable_invoices` and `receivable_invoice_lines`. Existing
  immutable-history triggers remain in place; the policies exist only so
  SECURITY INVOKER RPCs can lock rows with `FOR UPDATE`.

### D10-03 returned-rental collections checkpoint

- Migration `20260814060344_returned_rental_collections.sql` adds immutable,
  company-scoped payment-line allocations, receipts, and receipt audit events
  with explicit RLS, grants, indexes, and immutable-history triggers.
- `post_returned_rental_collection` is a SECURITY INVOKER RPC that revalidates
  the actor, company, Payments permission, returned rental, invoice, charge
  ownership, and remaining balances. It atomically posts the payment and exact
  rental/damage allocations and issues the receipt/audit snapshot.
- `/payments` exposes typed returned-rental charge cards, Zod-validated server
  actions, allocation inputs, and immutable receipt history. UI code does not
  query Supabase directly and does not accept a trusted payment total.
- Live migration history records `20260814060344_returned_rental_collections`
  and `20260814073417_d10_03_h1_invoice_lock_rls`; these exact repository
  versions are present on the clean integration branch.
- The H1 migration adds only company-scoped authenticated UPDATE policies and
  grants for `receivable_invoices` and `receivable_invoice_lines`; their
  immutable-history triggers remain active so SECURITY INVOKER RPCs can lock
  those rows with `FOR UPDATE`.
- Isolated temporary-company acceptance previously covered stale-odometer
  rejection and atomicity, cross-company denial, valid return inspection and
  damage snapshot, invoice snapshot, allocation mismatch rejection, payment
  and receipt history, paid settlement closure, and repeated-settlement
  rejection. All test writes were rolled back.
- `/payments` is force-dynamic and has a route-level retry state to avoid a
  first-request Supabase auth-cookie refresh race. No business records were
  created.
- D12-03 added the two live index-only hardening migrations above after the
  performance advisor identified missing foreign-key coverage. Re-running the
  advisors found no D10-03 security or unindexed-foreign-key notices; the
  remaining D10-03 notices are expected unused-index INFOs while row counts are
  zero. `npm.cmd run validate` passed on 2026-08-21.

### D12-03 integration checkpoint

- PR #14 (`agent/d12-03-returned-rental-collections`) was promoted from draft
  and merged into `main` as `8dceed3` on 2026-08-21.
- The merge includes the immutable returned-rental collection workflow, H1
  invoice-lock RLS, payment auth-refresh retry boundary, and the two D10-03
  foreign-key index hardening migrations.
- PR checks passed and Vercel reported a READY preview. No production business
  records were created. `npm.cmd run validate` passed on the clean integration
  branch before merge.
- D10-03 remains the delivered feature behind this release; D10-02 is the next
  acceptance gate.

### D10-02 reports checkpoint

- `src/lib/services/reports.ts` now provides a typed, company-scoped report
  projection for customers, fleet, open/overdue rentals, invoice balances, and
  immutable settlements. It resolves customer and vehicle labels through ID
  maps rather than ambiguous PostgREST relationship embeds.
- `src/components/reports/reports-workspace.tsx` replaces the reports
  placeholder with live KPI cards, searchable operational rows, and a client
  CSV export. The UI does not query Supabase directly and no business records
  were created.
- `npm.cmd run validate` passes on 2026-08-21. No migration was required.
  The clean integration refresh is commit `e496583` on
  `agent/d10-02-live-reports-clean`; it includes merged D12-03 changes.
  PR #15 (`https://github.com/sambilling175-ctrl/Evorentals/pull/15`) merged into
  `main` as `b53a961`. Preview
  `https://evorentals-git-agent-d10-02-live-reports-clean-wephotons1.vercel.app/reports`
  was authenticated by the operator and loaded the empty operational state;
  Vercel reported no runtime errors and no production business records were
  created.

### D4-05 RLS isolation checkpoint

- The existing PR #11 branch was refreshed onto current `main` using a backup
  ref `backup/d4-05-before-main-merge`; stale overlapping application changes
  were resolved in favor of `main` while retaining the test-only change.
- `supabase/tests/rls_isolation.sql` runs in one transaction, reuses the first
  existing profiled actor, creates a temporary second company, verifies scoped
  customer/bike/rental visibility and cross-company insert denial, then rolls
  back every write.
- The live Supabase execution returned success. A follow-up query found zero
  `rls-test-b-*` companies, `RLS-*` customers/bikes, and current-date `RLS`
  rentals. The live schema has RLS enabled on all three tables and 10 policies.
- `npm.cmd run validate` passes after the merge repair. No migration or production
  data change was created. Security/performance advisor output contains only
  pre-existing legacy warnings and no D4-05 object finding.
- PR #11 was promoted and merged into `main` as `c279387`; the final PR diff
  contains only the RLS test and continuity-document updates.

### Architecture deepening checkpoint

- The Availability module (`src/lib/services/availability.ts`) is the shared
  interface for date-window vehicle search, transactional reservation checks,
  and open-rental occupancy. Booking search/creation and fleet availability use
  this seam; the database booking exclusion constraint remains the write-time
  race guard.
- This refactor has no migration and creates no business records.
- `npm.cmd run validate` passes after the refactor.

Legacy data discovery and migration constraints are recorded in
`docs/LEGACY_DATA_MIGRATION.md`. Do not import the partial customer snapshot;
obtain a complete export or implement a resumable batched extractor first.

## 2026-08-04 password recovery hotfix

- Production evidence: recovery callbacks returned `PKCE code verifier not found
  in storage` after the email link was opened.
- Resolution: recovery-email requests use Supabase's client-only implicit flow;
  `/auth/callback` immediately consumes fragment tokens into the cookie-backed
  SSR session and removes them from the URL.
- Scope: normal login and session management remain on SSR PKCE.
- Validation: `npm.cmd run typecheck`, `npm.cmd run lint`, and
  `npm.cmd run build` pass locally.
- Operational next step: after deployment, request one new reset email. Previously
  generated recovery links retain their original PKCE flow and must not be reused.

## 2026-08-10 password recovery callback follow-up

- Production evidence: Supabase accepted the newest recovery link and created a
  valid implicit recovery session, but its fragment credentials landed on
  `/login` instead of being consumed by `/auth/callback`.
- Resolution in review: the login page forwards recovery fragments to the
  callback; the callback verifies the authenticated user and hard-navigates only
  after the cookie-backed SSR session is established.
- Validation: `npm.cmd run validate` passed locally on 2026-08-10.
- Preview: Vercel deployment `2Pj83VsxqFFD42SLDj9SxjPkPRe7` is READY;
  browser smoke testing verified `/login#type=recovery` forwards through the
  callback, removes fragment credentials, and reaches the expected error state
  when no real recovery tokens are supplied.
- No database migration or production business data change is involved.

## Progress log

### 2026-08-21 - D13-01 service request intake

- Live schema verification found only legacy `maintenance_records` without
  `company_id`; new service tables were added rather than reusing it.
- `service_reasons` and `service_requests` are company-scoped with RLS,
  explicit grants, indexes, and the invoker-mode `create_service_request`
  function using an empty search path.
- The service route now uses typed server services and a Zod server action;
  it has no mock business records. Eight controlled reasons are seeded and
  live request count remains zero.
- Validation passed: `npm.cmd run validate`, `npm.cmd run check:supabase`,
  and 11 unauthenticated Playwright route checks. D13-02 is the next task:
  service job cards and controlled status transitions.
- Draft PR #20 CI passed quality, migration, and Playwright jobs; its Vercel
  preview check is green/READY. Merge remains a product-review decision.

### 2026-08-21 - D13-02 service job cards

- Claimed `agent/d13-02-service-job-cards` as the sole migration owner.
- The branch is intentionally stacked on D13-01 review because job cards
  depend on its live company-scoped service request/reason schema.
- Added company-scoped service job cards with database-enforced transitions,
  immutable event history, explicit authenticated grants, FK indexes, and
  invoker-mode create/transition RPCs using fixed empty search paths.
- Live migrations `20260821143147`, `20260821143345`, `20260821144218`,
  `20260821144303`, and `20260821144335` applied successfully; job-card and
  event counts remain zero. Advisors report no D13-02 security or unindexed-FK
  findings (only expected unused-index INFO notices on empty tables).
  `npm.cmd run validate`, `npm.cmd run check:supabase`, and all 11
  Playwright route checks passed locally. Draft PR #21 is open and clean;
  GitHub Actions run `32493896245` passed all three jobs, and the Vercel
  preview is READY at `https://evorentals-baf1lh1p3-wephotons1.vercel.app`.
  Do not merge before D13-01 PR #20 is accepted and the product review is
  complete.

### 2026-08-21 - D13-03 vehicle intake inspection

- Claimed `agent/d13-03-vehicle-intake-inspection` as the sole migration owner,
  stacked on the D13-02 review branch.
- Scope is one immutable intake inspection per job card, non-stale odometer and
  battery capture, and a controlled move into the job-card `inspection` stage.
  Parts, vendors, QC detail, and fleet release remain later Sprint 13/14 work.
- Live migrations `20260821145735` and `20260821145849` are applied; the new
  intake table is RLS-protected with explicit grants, invoker RPCs, immutable
  history, and FK indexes. Intake count remains zero. Security/performance
  advisors report no D13-03 finding other than expected unused-index INFOs on
  the empty table. Local validate, Supabase artifact checks, and 11 Playwright
  route checks passed. Draft PR #22 is open and clean; GitHub Actions run
  `32496034939` passed all three jobs, and the Vercel preview is READY at
  `https://evorentals-qno1gweaz-wephotons1.vercel.app`. Do not merge before
  the stacked D13-02 and D13-01 reviews.

### 2026-08-21 - Dashboard preview runtime hardening

- The D13-03 preview `https://evorentals-nw7bqhtlt-wephotons1.vercel.app` was
  READY at build time but rendered the generic 500 page for an authenticated
  dashboard request. Vercel runtime logs and Supabase API logs showed one
  `customers?kyc_status=pending` request returning HTTP 401 while the other
  dashboard queries returned 200; this was surfaced as `Unable to load
  dashboard` because the service failed the entire page on one query error.
- `src/lib/services/dashboard.ts` now retries auth-related PostgREST failures
  once after refreshing the user session, logs the structured query error, and
  keeps the dashboard in a degraded state if the transient 401 persists.
  Structural database errors still fail loudly. A second authenticated check
  on the refreshed preview showed that the fragile unfiltered customer `HEAD`
  count could still return HTTP 401 even while `/auth/v1/user` and normal
  customer `GET` requests returned 200. The count queries now use bounded
  one-row `GET` requests with exact counts, avoiding the failing `HEAD` path.
  Local `npm.cmd run validate` passed; the fix is commit `cc89d1e` and the
  READY preview is `https://evorentals-3adi0a5t6-wephotons1.vercel.app`.

### 2026-08-21 - D13-04 service job-card assignment

- D13-04 adds `service_job_card_assignments` as an append-only, company-scoped
  history table. A signed-in employee can assign an active internal employee or
  record an external-garage snapshot without creating a vendor master record.
  Reassignment inserts a new row; prior assignment history is immutable.
- The invoker RPC `public.assign_service_job_card` and insert trigger enforce
  active employee identity, service permissions, same-company job cards and
  targets, non-completed job cards, valid target shape, and bounded notes. RLS,
  grants, indexes, and a rollback-only SQL artifact are included.
- The service workspace now loads active employees and the latest assignment per
  job card, with Zod-validated server actions for internal or external routing.
  Migration application, rollback-only SQL verification, security/performance
  advisors, `check:supabase`, typecheck, lint, and production build passed.
  Draft PR #23 is open and the Vercel preview is READY at
  `https://evorentals-h3jg9mvnl-wephotons1.vercel.app`.
- A preview login also exposed one transient `JWT issued at future` profile
  query after a successful password login. `src/lib/services/auth.ts` now
  refreshes the session once and retries the profile query when the error is
  token-related; persistent profile/database failures still fail normally.

### 2026-08-21 - D13-05 service pipeline verification

- The requested pipeline `requested -> inspection -> in_service ->
  waiting_parts -> qc -> completed` was already implemented by D13-02's
  invoker transition RPC and immutable event trigger. D13-03 adds the intake
  gate before `inspection`, and D13-04 provides the assignment dependency.
- Added `supabase/tests/d13-05-service-pipeline.sql`, a rollback-only catalog
  contract test that verifies the complete status constraint, invoker/fixed
  search-path transition RPC with row locking, intake and transition guards,
  and the D13-04 assignment table. It creates no records.
- Live Supabase execution passed and confirmed zero service job cards/events.
  No migration or application schema change was needed; D13-06 is the next
  database-changing task for fleet availability transitions.
- The first D13-05 preview authenticated successfully but the dashboard failed
  because the `bikes_total` PostgREST `HEAD` count returned 401 immediately
  after login. The API logs showed the matching bounded `GET` queries succeeded.
  Dashboard bike and active-rental counts now use bounded exact-count `GET`
  queries like the customer counts, avoiding the transient HEAD failure.

### 2026-08-21 - D13-06 service fleet availability

- D13-06 adds an invoker, fixed-search-path `AFTER UPDATE OF status` trigger on
  service job cards. Entering `in_service` locks the same-company bike,
  rejects retired vehicles and active/overdue rentals, and updates the base
  fleet status to `maintenance` atomically. Completing service releases a
  non-retired bike to `available` while preserving retired status.
- Live migration `20260821165156_d13_06_service_fleet_availability` is applied.
  Catalog verification confirms the trigger, invoker function, fixed search
  path, bike status constraint, and zero job-card records. The rollback-only
  SQL test passed without creating business records.
- Fleet status updates remain company-scoped through existing bike RLS and
  authenticated UPDATE grants; D14 QC/rework may later refine the final
  release disposition.

### 2026-08-21 - D13-07 service dashboard metrics

- Added typed, company-scoped service dashboard projections for all six job-card
  stages, average turnaround from job-card creation to completion, overdue
  active jobs, and completed jobs whose vehicle is actually available for
  deployment.
- Overdue age uses the documented operational SLA of urgent/high one day,
  medium two days, and low three days from the request timestamp (falling back
  to job-card creation when needed). The overdue list is sorted by age and the
  UI shows the first five records without creating or mutating data.
- The service workspace now presents a responsive pipeline, turnaround,
  overdue, and readiness dashboard while continuing to use typed services and
  server actions; no migration or business records were created. `validate`
  passed and live service-job-card count remains zero.

| Day | Date | Delivered | Handoff |
| --- | --- | --- | --- |
| 1 | 2026-07-27 | UI shell and mock operations pages | Repository history |
| 2 | 2026-07-28 | Company tenancy and RLS | `DAY_02_PLATFORM_FOUNDATION.md` |
| 3 | 2026-07-28 to 2026-07-29 | Auth, customers/KYC, recovery fixes | `DAY_03_CUSTOMER_KYC.md` |
| 4 | 2026-08-04 | Identity/logout, customer edit/timeline, signed KYC access | `DAY_04_OPERATIONAL_LOOSE_ENDS.md` |
| 5 | 2026-08-04 | Customer UX, live dashboard, navigation/theme/mobile (D5-01 to D5-03) | `DAY_05_CUSTOMER_EXPERIENCE.md` |
| 6 | 2026-08-04 | Live Settings and company-scoped operational configuration (D6-01) | `DAY_06_PLATFORM_OPERATIONS.md` |
| 7 | 2026-08-04 | Live fleet directory and derived availability (D7-01, released) | `DAY_07_FLEET_AVAILABILITY.md` |
| 8 | 2026-08-04 | Company pricing plans and server quote preview (D8-01, released) | `DAY_08_PRICING.md` |
| 9 | 2026-08-04 | Availability search and booking foundation (D9-01, released) | `DAY_09_BOOKING_FOUNDATION.md` |
| 9 | 2026-08-07 | Return inspection, immutable damage charges, and atomic return transition (D9-05, in review) | `DAY_09_BOOKING_FOUNDATION.md` |
| 10 | 2026-08-18 | Receivables ledger and atomic returned-rental settlement released (D10-01, D9-06, D12-02) | `DAY_09_BOOKING_FOUNDATION.md` |
| 11 | 2026-08-21 | D11-03 local reconciliation, authenticated dry-run, and checksum-confirmed import completed; 13,760 rows imported and 32 quarantined | `DAY_11_DATA_MIGRATION.md` |
| 12 | 2026-08-21 | Integration/release hardening checkpoint: D12-04 route suite passed (10 checks), D12-05 reconciliation passed, and D12-06 CI hardening completed | `DAY_12_INTEGRATION_RELEASE.md` |
| 13 | 2026-08-21 | D13-07 service dashboard metrics implemented on a stacked feature branch; D13-06 fleet sync remains in review | `DAY_12_INTEGRATION_RELEASE.md` |

## Handoff rule

At the end of every task, update this checkpoint with:

- last verified commit and deployment;
- completed and remaining scope;
- migration status;
- validation evidence;
- blockers and exact next action.
