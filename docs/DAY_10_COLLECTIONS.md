# Day 10 - Collections and settlement

## D10-03 returned-rental collections

Task: D10-03 - Returned-rental payment allocation and immutable receipts  
Owner: Codex / `agent/d12-03-returned-rental-collections`  
Status: Review

### Delivered

- Added company-scoped, append-only payment-line allocations so rental and
  individual damage-charge settlement can be reconstructed independently.
- Added immutable receipts and append-only issuance audit events containing the
  exact allocation snapshot, actor, payment, rental, customer, method, and time.
- Added an atomic SECURITY INVOKER posting RPC with company, RBAC, lifecycle,
  ownership, currency precision, and over-allocation guards.
- Added returned-rental charge allocation cards and an immutable receipt-history
  view while retaining the existing general collection entry point.
- Preserved the typed service boundary and Zod Server Action validation pattern.

### Verification and release state

- `npm.cmd run validate` passed on 2026-08-14.
- Live migration versions are `20260814060344_returned_rental_collections` and
  `20260814073417_d10_03_h1_invoice_lock_rls`; table/RLS/policy, trigger,
  grant, and invoker checks passed. New D10-03 table counts remain zero.
- The Supabase advisors have no D10-03 security finding. D12-03 applied
  `20260821060601_d10_03_collection_fk_indexes.sql` and
  `20260821060716_d10_03_receipt_customer_fk_index.sql`; the performance
  advisor now reports no D10-03 missing-foreign-key finding. Expected unused
  index INFOs remain while the new immutable tables contain zero rows.
- `/payments` is force-dynamic and includes a route-level retry boundary for
  first-request Supabase auth-cookie refresh races.
- `npm.cmd run validate` passed on 2026-08-21. Required next action: deploy the
  clean branch, verify the preview, and run the authenticated empty-ledger smoke.
  No business records were created.
