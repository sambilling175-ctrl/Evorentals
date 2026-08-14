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

The current ID-only review manifest identifies 30 affected rows (10 missing
names and 20 duplicate-identity rows). The next task is to review those rows
and approve the legacy-ID mapping/import design. No migration has been created
and no business records have been written.

The authenticated source edit forms confirmed that all 10 missing names are
blank in the legacy system itself; they are not a CSV rendering omission. Those
records must remain quarantined or receive an explicitly approved placeholder
policy. Duplicate email/mobile groups are also retained as separate legacy IDs
until the business confirms whether they represent shared contact details or
duplicate accounts. D11-01 is now in `Review`; ADR-019 resolves D11-02 by
quarantining all 30 conflict rows. D11-03 is the next task and may only import
the 13,762 conflict-free metadata rows after its dry-run and mapping checks.
