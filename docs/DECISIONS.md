# Evo Rentals ERP - Architecture Decision Log

This file records decisions that future agents must understand before changing
architecture. Add a dated entry when a task creates or reverses a durable choice.

## ADR-001 - Next.js 16 is authoritative

- Date: 2026-07-27
- Status: Accepted
- Decision: Use Next.js 16 App Router and the repository-bundled documentation.
- Consequence: Do not apply older Next.js 15 middleware or caching conventions
  without validating them against `node_modules/next/dist/docs`.

## ADR-002 - Company tenancy without branch tenancy

- Date: 2026-07-28
- Status: Accepted
- Decision: Isolate business data by `company_id`. Do not enforce branch tenancy
  while Evo Rentals operates a single branch.
- Consequence: Branch may be retained as operational metadata, but RLS and server
  authorization use company scope.

## ADR-003 - Typed service boundary for Supabase

- Date: 2026-07-28
- Status: Accepted
- Decision: UI components do not query Supabase directly. Server components and
  actions use typed services in `src/lib/services`.
- Consequence: Database mappings, filtering, and error translation belong in the
  service layer.

## ADR-004 - Private document storage

- Date: 2026-07-28
- Status: Accepted
- Decision: Customer and vehicle documents use private Supabase buckets with
  company-scoped object paths and short-lived signed URLs.
- Consequence: Never expose raw storage paths or make KYC buckets public.

## ADR-005 - Immutable operational history

- Date: 2026-07-28
- Status: Accepted
- Decision: Important business state transitions will produce append-only
  timeline/audit events; confirmed pricing snapshots will be immutable.
- Consequence: Future booking, rental, payment, and inspection work must preserve
  historical facts rather than rewrite them.

## ADR-006 - Dark operations-command-center design

- Date: 2026-07-27
- Status: Accepted
- Decision: Use the supplied dense dark dashboard references as the primary visual
  language, refined for accessibility and responsive use.
- Consequence: Validate contrast, keyboard access, focus states, responsive
  prioritization, and a supported light theme.

## ADR-007 - Supabase SSR Auth with browser-started PKCE recovery

- Date: 2026-07-29
- Status: Accepted
- Decision: Use `@supabase/ssr` for sessions and initiate password recovery in the
  browser so the PKCE verifier is available when the email callback is opened.
- Consequence: Recovery links should be opened once in the same browser that
  initiated recovery. Configure production custom SMTP before onboarding.

## ADR-008 - Browser-portable password recovery links

- Status: Accepted (2026-08-04)
- Context: Production recovery links repeatedly failed with a missing PKCE code
  verifier even when recovery was initiated in the application browser. Email
  clients and browser handoffs cannot reliably preserve a browser-bound verifier.
- Decision: Use Supabase's client-only implicit flow only when requesting a
  password recovery email. The callback consumes the returned fragment tokens
  immediately with the cookie-backed SSR client and removes them from the URL.
- Consequence: Recovery links work across browser/email handoffs. Normal login,
  session refresh, authorization, and all other authentication remain on SSR PKCE.

## ADR-009 - Company-scoped singleton operational settings

- Date: 2026-08-04
- Status: Accepted
- Decision: Rental, payment, and system-preference configuration use one row per
  company, protected by company-scoped read policies and administrator-only
  update policies. Branch configuration is excluded while branch tenancy is off.
- Consequence: New operational settings tables must carry `company_id`; global
  singleton policies and deprecated `auth.role()` authorization are not allowed.

## ADR-010 - Database-enforced employee role assignments

- Date: 2026-08-04
- Status: Accepted
- Decision: Role definitions are company-scoped and profile assignments use a
  composite company/role foreign key. A database trigger prevents non-admins
  from changing protected access fields and preserves one active administrator.
  Administrator changes run through an atomic, security-invoker RPC that appends
  an immutable access event.
- Consequence: UI visibility is not treated as authorization. Employee invites
  require a protected server secret and custom SMTP and must not be simulated
  with public keys or direct profile inserts.

## ADR-011 - Derived vehicle availability

- Date: 2026-08-04
- Status: Accepted
- Decision: Vehicle availability is derived, never stored. `bikes.status` holds
  only the base operational state (`available`, `reserved`, `maintenance`, or
  `retired`). A vehicle with an
  active rental (`rentals.status = 'active'`, not soft-deleted, same company) is
  `rented`; otherwise availability is the normalized `bikes.status`. `rented`
  is never written to `bikes.status` by hand. The D7-01 migration reconciles
  legacy stored `rented` rows to `available` before enforcing this invariant.
- Consequence: Booking/rental lifecycle work must maintain `rentals.status`
  accurately or fleet availability will drift. The dashboard's available count
  (`bikes.status = 'available'`) matches the fleet derivation only while rental
  and bike statuses stay consistent; reconcile both onto this rule when the
  rental lifecycle module lands.

## ADR-012 - Server-authoritative pricing quotes

- Date: 2026-08-04
- Status: Accepted
- Decision: Pricing plans are company-scoped rate-card definitions. Quote
  inputs contain only a plan reference, duration, and estimated distance; the
  server reloads the active plan and company tax settings and calculates every
  amount. Billing units round up to whole day/week/30-day-month units.
- Consequence: Browsers never submit trusted rates or totals. Booking
  confirmation must copy the calculated values into an immutable pricing
  snapshot instead of retaining a mutable plan reference as the financial fact.

## ADR-013 - Database-enforced booking conflicts

- Date: 2026-08-04
- Status: Accepted
- Decision: Pending and confirmed bookings reserve a half-open timestamp range.
  A GiST exclusion constraint prevents overlapping ranges for the same company
  vehicle, and the inserted pricing snapshot and total are immutable.
- Consequence: Availability searches improve UX but are not the concurrency
  boundary. Booking insertion remains authoritative and can reject a vehicle
  that another employee reserved after the search.

## ADR-014 - Atomic booking-to-rental activation

- Date: 2026-08-04
- Status: Accepted
- Decision: A confirmed booking becomes an active rental only through the
  invoker-mode `activate_confirmed_booking` database function. The function
  locks the booking and vehicle, validates company and Rentals permission,
  creates one numbered contract with copied immutable pricing, converts the
  booking, and advances the vehicle odometer in one transaction.
- Consequence: UI availability checks are advisory. Unique indexes prevent two
  open rentals for one vehicle and repeated conversion of one booking. Vehicle
  base status remains `available`; the active rental derives `rented` state.

## ADR-015 - Additive immutable rental extensions

- Date: 2026-08-04
- Status: Accepted
- Decision: Extensions never rewrite the original pricing snapshot or contract
  amount. Each accepted extension stores a new immutable pricing snapshot and
  charge, while the rental reconciles `total_amount = contract_amount +
  extension_amount`. The invoker-mode database function locks the contract and
  rejects conflicts with pending or confirmed future bookings.
- Consequence: Settlement can allocate and report extension charges separately
  without losing the agreed starting contract. All due-date changes must use the
  extension RPC; direct client updates are not an authorized workflow.

## ADR-016 - Current assignment with immutable vehicle swap history

- Date: 2026-08-06
- Status: Accepted
- Decision: `rentals.original_bike_id` preserves the contracted vehicle while
  `rentals.bike_id` is the current assignment used by availability. Each change
  is made only through the invoker-mode swap RPC and recorded in an immutable
  company-scoped swap row with both odometers and the returned-bike disposition.
- Consequence: Fleet availability remains derived from one open rental/current
  bike, while audit and settlement can reconstruct every assignment. An overdue
  rental must be extended before swapping so the replacement conflict horizon is
  explicit and protected against future bookings.

## ADR-017 - Atomic return inspection before settlement

- Date: 2026-08-07
- Status: Accepted
- Decision: An active or overdue rental can be returned only through the
  invoker-mode `record_rental_return` RPC. It locks the rental and its current
  vehicle, validates the return time and odometer, inserts one immutable return
  inspection plus immutable damage-charge rows, updates vehicle telemetry and
  disposition, and marks the rental `returned` in one transaction.
- Consequence: Return inspection is intentionally separate from settlement.
  Damage charges are historical operational facts and are not added to the
  rental contract total until a future settlement workflow allocates them.
  A unique rental inspection and immutable-history triggers reject repeats or
  edits, while company-scoped RLS protects both new tables.

## ADR-018 - Line-level returned-rental collection receipts

- Date: 2026-08-14
- Status: Accepted
- Decision: Returned-rental payments are posted through one invoker-mode RPC
  that locks the rental and invoice, requires allocations to immutable invoice
  lines, and atomically records the payment, invoice allocation, line
  allocations, receipt, and receipt audit event. The server derives the payment
  total from validated allocation inputs; the database revalidates tenant,
  permission, rental state, ownership, and remaining balances.
- Consequence: A receipt permanently identifies how much settled the rental line
  and each damage charge. Receipt and allocation rows cannot be edited or
  deleted; corrections require a future explicit reversal workflow. Settlement
  continues to derive totals from the authoritative invoice allocation ledger.

## ADR-019 - Conservative legacy customer conflict import

- Date: 2026-08-14
- Status: Accepted
- Decision: Import only normalized customer rows with complete identity fields
  and unique email/mobile values. Quarantine blank-name rows, duplicate-identity
  rows, and unparseable phone values by legacy ID; never invent names or merge
  accounts solely because contact values are shared.
- Consequence: D11-03 may import only rows that pass the complete local and
  remote dry-run gates. The current reconciliation is 13,760 eligible and 32
  quarantined rows. Quarantined rows remain traceable and require a separately
  approved correction workflow; KYC binaries and source-system mutations are
  out of scope.

## ADR-020 - CI checks without a synthetic Supabase baseline

- Date: 2026-08-21
- Status: Accepted
- Context: The production database contains a legacy remote base schema that is
  not represented by a complete rebuildable migration history. Running
  `supabase start` and applying the repository migrations in CI would therefore
  produce a false failure or require inventing a baseline.
- Decision: CI runs deterministic migration and SQL artifact checks locally,
  runs the existing rollback-only/read-only SQL files against Supabase during
  release review, and does not create synthetic business records. The checks
  reject duplicate/invalid migration versions, conflict markers, dangerous
  migration tokens, SQL test commits, and non-rollback test writes.
- Consequence: A future complete baseline can add semantic local migration
  tests, but until then CI remains safe and reproducible without pretending the
  legacy schema can be rebuilt from this repository.

## ADR-021 - Separate tenant-scoped service request foundation

- Date: 2026-08-21
- Status: Accepted
- Context: The live database contains a legacy `maintenance_records` table
  without `company_id`, controlled reasons, or the lifecycle fields required
  by the service roadmap. Reusing it would weaken tenant isolation and make
  later job-card transitions ambiguous.
- Decision: Add new company-scoped `service_reasons` and `service_requests`
  tables. Requests are created only through the invoker-mode
  `create_service_request` RPC, which validates the active actor, role
  permission, vehicle/reason ownership, optional customer/rental ownership,
  and the initial requested state. Seeded reason rows are configuration
  lookups, not production business records.
- Consequence: The legacy table remains available for future historical
  mapping, while D13-02 can extend the new request status model into job cards
  without rewriting or importing legacy maintenance data.

## ADR-022 - Immutable service vehicle intake gate

- Date: 2026-08-21
- Status: Accepted
- Context: Service job cards need a reliable vehicle baseline before work starts,
  while the fleet release and service-cost workflows are intentionally later
  milestones. Directly editing a bike's telemetry would bypass the service
  workflow and allow stale readings.
- Decision: Record one immutable, company-scoped `service_intake_inspections`
  row per job card through the invoker-mode
  `record_service_intake_inspection` RPC. The RPC locks the job card and bike,
  rejects an odometer below the live bike reading, records battery/condition/
  checklist/evidence metadata, updates bike telemetry atomically, and moves a
  requested job card into `inspection`. A database trigger prevents any other
  requested-to-inspection transition without the intake row.
- Consequence: Intake history cannot be edited or deleted, repeated intake is
  rejected, and fleet availability/status remains unchanged until D13-06.

## ADR-023 - Company-scoped service vendor directory

- Date: 2026-08-22
- Status: Accepted
- Context: Service assignments need a stable directory for garages, parts
  vendors, and service centers, but the legacy vendor tables do not provide the
  company isolation, controlled fields, or immutable archive semantics required
  by the new service workflow.
- Decision: Add a new `service_vendors` table scoped by `company_id`, with a
  controlled vendor type, normalized contact fields, soft archive timestamp,
  and a case-insensitive per-company/type name uniqueness rule. Mutations occur
  only through authenticated SECURITY INVOKER RPCs with a fixed empty search
  path and active-employee service permissions; directory reads remain typed
  service-layer queries under RLS.
- Consequence: D13-04 can reference an explicitly managed external garage
  directory in a later integration step, while this milestone creates no fake
  vendor records and leaves legacy vendor data untouched.

## ADR-024 - Immutable service-part stock ledger

- Date: 2026-08-22
- Status: Accepted
- Context: Service parts need a reliable quantity-on-hand calculation and
  traceable receipts/issues before job-card consumption is introduced. A
  mutable quantity field would make corrections and concurrent updates hard to
  audit.
- Decision: Store one company-scoped catalogue row per part and derive stock
  from an append-only signed movement ledger. A locked, authenticated
  SECURITY INVOKER RPC validates the movement type, computes before/after
  quantities, rejects negative stock, and records cost/reference metadata in
  one transaction. Catalogue and movement writes are guarded by transaction-
  local RPC markers; direct table mutation is not an application path.
- Consequence: D14-03 can reserve and consume parts by adding references to
  the same immutable ledger, while no stock or catalogue rows are seeded in
  production during this milestone.
