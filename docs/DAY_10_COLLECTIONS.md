# Day 10 - Collections and settlement

## D10-03 returned-rental collections

Task: D10-03 - Returned-rental payment allocation and immutable receipts  
Owner: Codex / `agent/d12-03-returned-rental-collections`  
Status: Completed

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
- `npm.cmd run validate` passed on 2026-08-21. The integrated release is
  already merged; the current-main re-review and rollback-only acceptance test
  are recorded below. No business records were created.

### D12-03 integration re-review — 2026-08-21

- Current `main` already contains the D10-03 branch through PR #14 / merge
  `8dceed3`; no duplicate merge or migration replay is required.
- The hosted project contains all four repository migrations:
  `20260814060344`, `20260814073417`, `20260821060601`, and `20260821060716`.
  The live receipt, receipt-event, and line-allocation tables are RLS-enabled
  and have zero rows.
- The live `post_returned_rental_collection` function is `SECURITY INVOKER`
  with `search_path = ""`. The authenticated receipt tables have company
  SELECT/INSERT policies and no UPDATE policy; the immutable trigger boundary
  remains intact.
- `supabase/tests/returned_rental_collections.sql` is a rollback-only live
  acceptance test. It passed with a ₹150 split of ₹100 rental and ₹50 damage,
  preserved both lines in the receipt snapshot, emitted two allocation rows and
  one receipt event, rejected a mismatched allocation, and rejected receipt
  updates. The transaction rolled back and left no business records.
- Security advisors have no D10-03 finding. Performance advisors have no
  D10-03 missing-FK finding; remaining collection notices are expected unused
  index INFOs while the tables are empty.
