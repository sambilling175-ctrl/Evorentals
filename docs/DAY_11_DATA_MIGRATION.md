# Day 11 - Legacy customer metadata staging

## D11-01 status

- Branch: `agent/d11-01-legacy-customer-staging`
- Scope: validate and normalize the complete legacy customer CSV locally.
- Explicitly out of scope: Supabase inserts, KYC binary uploads, profile photos,
  and source-system mutations.

## Staging command

```powershell
npm.cmd run legacy:customers:stage
```

The command reads `legacy-data/customers.csv` and writes the ignored files
`legacy-data/customers.staging.json` and
`legacy-data/customers.identity-review.json`. It normalizes email, Indian phone
numbers, account status, and KYC status, then reports missing identity fields,
duplicate email/mobile identities, malformed timestamps, document-link presence,
and source-count mismatches. The identity-review file contains only source row
numbers, legacy IDs, and issue codes so it can be reviewed without duplicating
customer contact data.

The command exits with code `2` when the dataset is not safe to import. This is
intentional: a complete count match and zero identity/timestamp issues are
required before any future import command is allowed to write Supabase rows.
Use `--allow-partial` only for investigation, never for production import.

## Current export observation

The uploaded export contains 13,792 customer rows. Its `Documents` column is a
link marker, not the document binary; KYC/photo extraction remains a separate
future workstream.

## Handoff

The first ID-only review manifest identified 30 affected rows (10 missing
names and 20 duplicate-identity rows). D11-03's stricter import gate identified
two additional malformed Indian phone values that cannot be corrected without
guessing digits. Legacy IDs `2` and `638` are therefore quarantined too.

The authenticated source edit forms confirmed that all 10 missing names are
blank in the legacy system itself; they are not a CSV rendering omission. Those
records must remain quarantined or receive an explicitly approved placeholder
policy. Duplicate email/mobile groups are also retained as separate legacy IDs
until the business confirms whether they represent shared contact details or
duplicate accounts. D11-01 is now in `Review`; ADR-019 resolves D11-02 and its
conservative rule also quarantines the two unparseable phones. The reconciled
D11-03 totals are 13,760 eligible and 32 quarantined rows.

## D11-03 checkpoint

- Branch: `agent/d11-03-customer-import-next`.
- `npm.cmd run legacy:customers:import` creates an ignored, PII-free import
  plan. It recomputes identity uniqueness, validates `+91` phone and email
  formats, reconciles exact counts, hashes the canonical eligible payload, and
  derives a deterministic batch ID for safe resume.
- Current plan: 13,792 source rows, 13,760 eligible rows, 32 quarantined rows,
  69 chunks of at most 200 rows, SHA-256
  `6511d29d20dca127fa75f0324b43cc62046090ee7d64f2c5af6b8e438422728c`.
- Migrations `20260818081120_legacy_customer_import.sql`,
  `20260818083023_legacy_customer_import_indexes.sql`, and
  `20260818083445_legacy_customer_import_hardening.sql` are applied live as
  versions `20260818083006`, `20260818083053`, and `20260818083524`.
- The migrations add company-scoped import batches and immutable legacy-ID
  mappings, admin-only RLS, explicit grants, cross-chunk imported-email
  uniqueness, an append-only mapping trigger, and the fixed-search-path
  SECURITY INVOKER `import_legacy_customer_batch` RPC.
- Live transaction-only verification passed for valid dry-run, malformed-phone
  rejection, and atomic apply/mapping/finalization. Every verification write
  rolled back.
- Supabase security advisors report no D11-03 finding. Performance advisors
  report only expected unused-index INFO notices because the tables are empty;
  both actor foreign keys have covering indexes.
- Live row counts remain zero import batches and zero mappings; the four
  pre-existing demo customers are unchanged. No legacy customer record or KYC
  binary has been written.

### D11-03 current sprint checkpoint (2026-08-21)

- Local staging reports 13,792 source rows, 13,760 eligible rows, and 32
  quarantined rows. The generated plan is ignored and contains no customer
  contact fields.
- `npm.cmd run legacy:customers:import` passed locally with checksum
  `6511d29d20dca127fa75f0324b43cc62046090ee7d64f2c5af6b8e438422728c` and
  confirmation `IMPORT_13760_6511D29D20DC`.
- `npm.cmd run validate` passed (typecheck, lint, and production build).
- Remote dry-run is gated on an authenticated administrator JWT. The command
  accepts the repository's publishable Supabase key, but currently stops with
  the exact missing input `EVORENTALS_IMPORT_JWT`.

The remaining D11-03 gate is an authenticated administrator remote dry-run and
explicit apply. The CLI deliberately requires `EVORENTALS_IMPORT_JWT` and a
checksum-derived `EVORENTALS_IMPORT_CONFIRM`; it never accepts or prints a
privileged service-role key.
