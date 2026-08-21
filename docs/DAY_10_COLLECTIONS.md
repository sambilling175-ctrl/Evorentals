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
- Migration: `20260814055140_returned_rental_collections.sql` created locally and
  pending application. No production schema or business data was changed.
- Supabase CLI database lint could not run because the sandboxed npm invocation
  could not reach the package registry. Run database advisors and an atomic
  rollback smoke after applying the migration to a non-production target.
- Required next action: apply the migration, run security/performance advisors,
  then post one authorized test collection and verify cross-company denial,
  line balances, receipt snapshot, audit event, and immutability rollback.
