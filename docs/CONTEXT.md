# Evo Rentals ERP - Project Context and Checkpoint

> Living checkpoint for every coding agent. Read this file before editing code.
> Update only with verified repository, database, or deployment facts.

## Checkpoint

| Field | Verified value |
| --- | --- |
| Updated | 2026-08-10 |
| Delivery position | D10-01 receivables ledger in progress; D9-06 blocked pending it |
| Git branch | `agent/d10-01-receivables-ledger` |
| Last verified application commit | `e3893a9` - Merge D9-05 return inspection |
| Continuity protocol baseline | `c171e65` - Add multi-agent continuity protocol |
| Production application | `https://evorentals.vercel.app` |
| Production deployment | `evorentals-bliivi816-wephotons1.vercel.app` - Ready; aliased to production |
| Supabase project | `ctpctcymjbtyxpdawrgh` |
| Latest migration | `20260807082825_rental_return_inspection.sql` (applied and verified) |
| Last quality gate | `npm.cmd run validate` passed on 2026-08-10 |

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

Implement D10-01 on `agent/d10-01-receivables-ledger` before resuming D9-06. Live verification found no
invoice, payment, allocation, deposit, refund, dues, or settlement tables, while
`rentals.total_amount` already includes the quoted deposit component. The system
therefore cannot determine collected rent, held deposit, outstanding balance, or
refund due from authoritative facts. Do not accept manual paid/deposit totals or
close a returned rental until the immutable receivables ledger exists.

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

## Handoff rule

At the end of every task, update this checkpoint with:

- last verified commit and deployment;
- completed and remaining scope;
- migration status;
- validation evidence;
- blockers and exact next action.
