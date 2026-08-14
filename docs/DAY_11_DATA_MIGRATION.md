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

The command reads `legacy-data/customers.csv` and writes the ignored file
`legacy-data/customers.staging.json`. It normalizes email, Indian phone numbers,
account status, and KYC status, then reports missing identity fields, duplicate
email/mobile identities, malformed timestamps, document-link presence, and
source-count mismatches.

The command exits with code `2` when the dataset is not safe to import. This is
intentional: a complete count match and zero identity/timestamp issues are
required before any future import command is allowed to write Supabase rows.
Use `--allow-partial` only for investigation, never for production import.

## Current export observation

The uploaded export contains 13,792 customer rows. Its `Documents` column is a
link marker, not the document binary; KYC/photo extraction remains a separate
future workstream.

## Handoff

After validation, the next task is to review the staging report and approve the
legacy-ID mapping/import design. No migration has been created and no business
records have been written.
