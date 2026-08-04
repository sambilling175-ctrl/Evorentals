# Evo Rentals ERP - Project Context and Checkpoint

> Living checkpoint for every coding agent. Read this file before editing code.
> Update only with verified repository, database, or deployment facts.

## Checkpoint

| Field | Verified value |
| --- | --- |
| Updated | 2026-08-04 |
| Delivery position | Day 5 complete; D6-01 Settings is next |
| Git branch | `main` |
| Last verified application commit | `bd0bbe6` - Complete accessible navigation controls |
| Continuity protocol baseline | `c171e65` - Add multi-agent continuity protocol |
| Production application | `https://evorentals.vercel.app` |
| Production deployment | `evorentals-ihk1029xf-wephotons1.vercel.app` - Ready; aliased to production |
| Supabase project | `ctpctcymjbtyxpdawrgh` |
| Latest migration | `20260804075659_customer_timeline_events.sql` |
| Last quality gate | `npm.cmd run validate` passed on 2026-08-04 |

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

## Live versus placeholder functionality

Live:

- Authentication and session protection
- Customer directory, customer details, creation, and KYC review
- Company-scoped customer data and policies
- Dashboard customer, KYC, fleet, availability, active-rental counts, recent
  customer records, and customer timeline

Mock or placeholder:

- Bookings, fleet, rentals, payments, and service operational data
- Drivers, employees, settings, reports, and notifications

Do not describe placeholder screens as backend-complete.

## Known issues and debt

- Supabase built-in email provider permits only two project-wide Auth emails per
  hour. Configure custom SMTP before production onboarding.
- Live notification counts are not wired; the shell links to the notifications
  module without displaying a fabricated badge.
- No automated tests currently cover auth, RLS isolation, or customer workflows.
- The legacy base schema has no rebuildable `0001` baseline migration.
- Audit events, full RBAC, and updated-at conventions remain incomplete.

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
- Continue migration numbering after `202607280006`.
- Only one active task may own a new migration sequence.

## Immediate next action

Claim `D6-01` from `docs/NEXT_STEPS.md` and replace the Settings placeholder with
live company and operational configuration, after verifying the remote schema.

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

## Progress log

| Day | Date | Delivered | Handoff |
| --- | --- | --- | --- |
| 1 | 2026-07-27 | UI shell and mock operations pages | Repository history |
| 2 | 2026-07-28 | Company tenancy and RLS | `DAY_02_PLATFORM_FOUNDATION.md` |
| 3 | 2026-07-28 to 2026-07-29 | Auth, customers/KYC, recovery fixes | `DAY_03_CUSTOMER_KYC.md` |
| 4 | 2026-08-04 | Identity/logout, customer edit/timeline, signed KYC access | `DAY_04_OPERATIONAL_LOOSE_ENDS.md` |
| 5 | 2026-08-04 | Customer UX, live dashboard, navigation/theme/mobile (D5-01 to D5-03) | `DAY_05_CUSTOMER_EXPERIENCE.md` |

## Handoff rule

At the end of every task, update this checkpoint with:

- last verified commit and deployment;
- completed and remaining scope;
- migration status;
- validation evidence;
- blockers and exact next action.
