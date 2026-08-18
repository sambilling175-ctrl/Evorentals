# Evo Rentals ERP - Project Context and Checkpoint

> Living checkpoint for every coding agent. Read this file before editing code.
> Update only with verified repository, database, or deployment facts.

## Checkpoint

| Field | Verified value |
| --- | --- |
| Updated | 2026-08-18 |
| Delivery position | D11-03 import infrastructure applied; authenticated data dry-run/apply pending |
| Git branch | `agent/d11-03-customer-import` |
| Last verified application commit | `e8383e0` - Add guarded legacy customer import |
| Continuity protocol baseline | `c171e65` - Add multi-agent continuity protocol |
| Production application | `https://evorentals.vercel.app` |
| Production deployment | `evorentals-bliivi816-wephotons1.vercel.app` - Ready; aliased to production |
| Supabase project | `ctpctcymjbtyxpdawrgh` |
| Latest migration | `20260818083524` - D11-03 legacy customer import hardening (applied and verified) |
| Last quality gate | `npm.cmd run validate` passed on 2026-08-18 |

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

- Payments and service operational data
- Drivers, reports, and notifications

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
- Continue migration numbering after `20260807082825`.
- Only one active task may own a new migration sequence.

## Immediate next action

Begin D12-01 by reviewing and integrating the D9-06 rental-settlement branch.
Email-dependent tasks are parked. D11-03 remains safely paused before its first
remote write while the authenticated administrator token and explicit import
confirmation are unavailable; no quarantined row or KYC binary may be imported.

The approved D12-D16 sequence is recorded in `docs/SPRINT_12_16_ROADMAP.md`.
The shared task-loop resolves D12-01 as the next claimable P0 item; every later
roadmap item remains dependency-blocked to prevent agents from skipping the
integration baseline.

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
- Draft PR #10 is open. Its Vercel preview is READY, and an unauthenticated
  `/payments` request correctly resolves to `/login?next=/payments`.
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
  were created. `npm.cmd run validate` passes. An authenticated preview smoke
  on `/rentals` renders the empty rental control board and captures zero
  console errors or warnings.
- D10-03-H1 adds authenticated company-scoped UPDATE policies and UPDATE
  grants for `receivable_invoices` and `receivable_invoice_lines`. Existing
  immutable-history triggers remain in place; the policies exist only so
  SECURITY INVOKER RPCs can lock rows with `FOR UPDATE`.

### D10-02 reports checkpoint

- `src/lib/services/reports.ts` now provides a typed, company-scoped report
  projection for customers, fleet, open/overdue rentals, invoice balances, and
  immutable settlements. It resolves customer and vehicle labels through ID
  maps rather than ambiguous PostgREST relationship embeds.
- `src/components/reports/reports-workspace.tsx` replaces the reports
  placeholder with live KPI cards, searchable operational rows, and a client
  CSV export. The UI does not query Supabase directly and no business records
  were created.
- `npm.cmd run validate` passes on 2026-08-14. No migration was required.
  Preview `https://evorentals-git-agent-d10-02-live-reports-wephotons1.vercel.app`
  serves `/reports` and correctly redirects unauthenticated requests to login.
  An authenticated smoke passed with live KPIs, the empty operational table,
  and the CSV action; the browser captured zero console errors or warnings.
  No production business records were created.

### D10-03 returned-rental collections checkpoint

- Migration `20260814055140_returned_rental_collections.sql` adds immutable,
  company-scoped payment-line allocations, receipts, and receipt audit events
  with explicit RLS, grants, indexes, and immutable-history triggers.
- `post_returned_rental_collection` is a SECURITY INVOKER RPC that revalidates
  the actor, company, Payments permission, returned rental, invoice, charge
  ownership, and remaining balances. It atomically posts the payment and exact
  rental/damage allocations and issues the receipt/audit snapshot.
- `/payments` exposes typed returned-rental charge cards, Zod-validated server
  actions, allocation inputs, and immutable receipt history. UI code does not
  query Supabase directly and does not accept a trusted payment total.
- `npm.cmd run validate` passes on 2026-08-14. The migration was applied through
  Supabase as live version `20260814060344` and verified with table/RLS/policy,
  index, trigger, grant, and invoker checks. Security and performance advisors
  show pre-existing legacy warnings plus informational unindexed-FK notices
  for the new receipt/allocation tables. New allocation, receipt, and
  receipt-event row counts are zero.
  READY preview `https://evorentals-git-agent-d10-03-returned-rental-c-5ca334-wephotons1.vercel.app`
  has no persistent `/payments` runtime errors. A fresh authenticated smoke
  reconfirmed the zero-balance empty state and captured zero console errors or
  warnings. A first-request auth refresh
  race was observed as `Active employee profile required`; `/payments` is now
  forced dynamic and has a route-level retry state, and a fresh authenticated
  smoke renders the empty live ledger correctly. Transactional denial tests
  now pass with the H1 RLS lock policies. No business records were created.

### D10-03-H1 acceptance checkpoint (2026-08-14)

- `20260814073417_d10_03_h1_invoice_lock_rls.sql` is applied to Supabase.
  It adds only company-scoped authenticated UPDATE policies and grants for
  the two immutable invoice tables; their protection triggers remain active.
- Isolated temporary-company acceptance passed end to end: stale-odometer
  rejection and atomicity, cross-company denial, valid return inspection and
  damage snapshot, invoice snapshot, allocation mismatch rejection, payment
  and receipt history, paid settlement closure, and repeated-settlement
  rejection.
- All test writes were rolled back. Post-test verification found zero dummy
  companies, Auth users, profiles, customers, bikes, rentals, inspections,
  invoices, settlements, audit rows, or temporary policies.

### D4-05 RLS isolation checkpoint (2026-08-14)

- `supabase/tests/rls_isolation.sql` is a transaction-only integration test;
  it reuses the existing authenticated bootstrap actor, creates a temporary
  second company, and inserts temporary customer, bike, and rental rows for
  both companies before switching to the authenticated role.
- The live test passed: the actor can read only its own company rows and a
  cross-company customer insert is denied. The second-company customer, bike,
  and rental are all hidden under the actor's JWT claims.
- Rollback verification returned zero temporary companies, customers, bikes,
  or rentals. No migration or production business data was created.

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

### D11-01 legacy customer staging checkpoint

- The complete legacy customer CSV is present locally at
  `legacy-data/customers.csv` (13,792 rows; Git-ignored PII).
- `npm.cmd run legacy:customers:stage` normalizes the metadata and writes only
  `legacy-data/customers.staging.json` plus the ID-only
  `legacy-data/customers.identity-review.json`; it never calls Supabase.
- Current validation findings are 10 missing names, 2 duplicate email groups,
  10 duplicate mobile groups, and 2 unparseable Indian phone values affecting
  32 rows. The staging report remains `safeToImport: false`; ADR-019 requires
  every affected row to stay quarantined.
- The authenticated legacy edit forms confirmed that all 10 missing names are
  blank in the source system, so they are not an export rendering artifact.
- The CSV contains document-link markers only. KYC/photo binary transfer is a
  separate private-storage task and has not started.

### D11-03 legacy customer import checkpoint

- The ignored local import plan reconciles 13,792 source rows into 13,760
  eligible rows and 32 quarantined rows. Its deterministic SHA-256 is
  `6511d29d20dca127fa75f0324b43cc62046090ee7d64f2c5af6b8e438422728c`.
- Live migrations `20260818083006`, `20260818083053`, and `20260818083524`
  add admin-only, company-scoped import batches, immutable legacy-ID mappings,
  the SECURITY INVOKER batch import RPC, covering actor indexes, cross-chunk
  imported-email uniqueness, and append-only mapping enforcement.
- SQL compilation, valid/invalid dry-run behavior, and atomic apply/finalize
  behavior passed against live schema inside forced rollback transactions.
- Supabase advisors have no D11-03 security warning or missing foreign-key
  index. Unused-index INFO notices are expected before the first import.
- Import batches and mappings remain at zero rows; existing customer count is
  still four. No production customer metadata or KYC binary has been imported.
- Remaining gate: run the full authenticated administrator remote dry-run, then
  supply the checksum-derived confirmation to the CLI for explicit apply.

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

## Handoff rule

At the end of every task, update this checkpoint with:

- last verified commit and deployment;
- completed and remaining scope;
- migration status;
- validation evidence;
- blockers and exact next action.

## 2026-08-18 D4-06 Resend SMTP checkpoint

- Branch: `agent/d4-06-resend-smtp`.
- Resend is the selected Supabase Auth SMTP provider. Branded recovery and
  confirmation templates live in `supabase/auth-templates/`, and the complete
  safe dashboard handoff is `docs/RESEND_SMTP_SETUP.md`.
- Temporary sender: `Evo Rentals <onboarding@resend.dev>` for one controlled
  mailbox test only. The user must enter the Resend API key directly in
  Supabase; no key is stored in this project or Vercel.
- Repository implementation is in review. Remaining gate: save the SMTP
  configuration, complete one password-recovery smoke test, then record the
  result and decide whether to verify the production sender domain before
  production onboarding.

## 2026-08-18 D4-04 Playwright checkpoint

- Branch: `agent/d4-04-auth-coverage`.
- `playwright.config.ts` starts the local Next.js server and uses the locally
  installed Chrome channel. `npm.cmd run test:e2e` passes four tests covering
  protected-route login redirects, public recovery access, invalid callback
  rejection, and fallback recovery-fragment forwarding.
- The test suite does not submit a reset request and therefore creates no Auth
  emails. The sole remaining D4-04 gate is a controlled real reset-email test
  after the D4-06 Supabase SMTP configuration is saved.
