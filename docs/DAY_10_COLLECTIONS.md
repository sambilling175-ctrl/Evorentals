# Day 10 - Collections and settlement

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
  is READY and Vercel reports no `/payments` runtime errors. The preview host
  requires its own authenticated session.
