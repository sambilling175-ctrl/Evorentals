# Evo Rentals ERP - Project Context and Checkpoint

> Living checkpoint for every coding agent. Read this file before editing code.
> Update only with verified repository, database, or deployment facts.

## Checkpoint

| Field | Verified value |
| --- | --- |
| Updated | 2026-08-21 |
| Delivery position | D11-03 customer metadata import completed and verified; 32 conflict rows remain quarantined |
| Git branch | `agent/d11-03-customer-import-next` |
| Last verified application commit | `a99ea5d` - Merge PR #16 D11 customer migration |
| Continuity protocol baseline | `c171e65` - Add multi-agent continuity protocol |
| Production application | `https://evorentals.vercel.app` |
| Production deployment | `evorentals-3hu0csdp3-wephotons1.vercel.app` - READY; aliased to production |
| Supabase project | `ctpctcymjbtyxpdawrgh` |
| Latest migrations | D11-03 import migrations `20260818081120`, `20260818083023`, `20260818083445` are applied and verified; latest release indexes remain `20260821060601` and `20260821060716` |
| Last quality gate | `npm.cmd run validate` passed on 2026-08-21 |

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

Choose the next email/auth hardening task only after a stable SMTP provider and
test mailbox are available. D4-04 needs a mailbox for recovery and protected-route
Playwright coverage; D4-06 needs the provider decision and domain/template setup.
D6-03 remains blocked behind D4-06 and a protected server secret. No production
business records are required for these tasks.

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
| 12 | 2026-08-21 | Integration/release hardening checkpoint: D12-05 production reconciliation passed; D12-06 CI is next | `DAY_12_INTEGRATION_RELEASE.md` |

## Handoff rule

At the end of every task, update this checkpoint with:

- last verified commit and deployment;
- completed and remaining scope;
- migration status;
- validation evidence;
- blockers and exact next action.
