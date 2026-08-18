# Day 10 - Collections and settlement

## D10-01 receivables ledger release

- PR #10 merged to `main` as `f361396` on 2026-08-18 after its Vercel preview,
  live schema, RLS, RPC, advisor, rollback-only command, and authenticated UI
  evidence were reviewed.
- The production Vercel status for the merge commit is successful.
- Live verification after merge found zero invoices, payments, and settlement
  rows; no production financial record was created for the release.
- D9-06 settlement remains a separate delta and is the next integration task.

## D10-03 returned-rental collections

Task: D10-03 - Returned-rental payment allocation and immutable receipts  
Owner: Codex / `agent/d10-03-returned-rental-collections`  
Status: Review

### Delivered

- Added company-scoped, append-only payment-line allocations so rental and
  individual damage-charge settlement can be reconstructed independently.
- Added immutable receipts and append-only issuance audit events containing the
  exact allocation snapshot, actor, payment, rental, customer, method, and time.
- Added an atomic SECURITY INVOKER posting RPC with company, RBAC, lifecycle,
  ownership, currency precision, and over-allocation guards.
- Replaced the generic collection entry point in `/payments` with returned-rental
  charge allocation cards and an immutable receipt-history view.
- Preserved the typed service boundary and Zod Server Action validation pattern.

### Verification and release state

- `npm.cmd run validate` passed on 2026-08-14.
- Migration `20260814055140_returned_rental_collections.sql` was applied through
  Supabase as live version `20260814060344`; table/RLS/policy, index, trigger,
  grant, and invoker checks passed. New D10-03 table counts remain zero.
- Supabase CLI database lint was attempted but requires a `SUPABASE_ACCESS_TOKEN`;
  the Supabase advisors were run through the authenticated connector instead.
  They report only pre-existing legacy warnings and no D10-03-specific finding.
- Required next action: authenticated form smoke plus authorized test collection
  on a non-production test identity, cross-company denial, line-balance checks,
  receipt/audit snapshot verification, and immutability rollback verification.
- Preview `https://evorentals-git-agent-d10-03-returned-rental-c-5ca334-wephotons1.vercel.app`
  is READY. The preview host requires its own authenticated session. A first
  request can coincide with Supabase auth-cookie refresh; `/payments` is now
  force-dynamic and has a route-level retry boundary, and the authenticated
  empty-ledger smoke renders successfully after refresh. No business records
  were created.
