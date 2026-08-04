# Day 4 - Operational Loose Ends

## Completed

- Authenticated profile identity in the top navigation using the live Supabase
  user and employee profile.
- Working logout that terminates the Supabase session and returns to login.
- Customer profile and primary-address editing with Zod validation and
  company-scoped authorization.
- Append-only customer timeline events for profile updates and document access.
- Private KYC document viewing through server-authorized, 60-second signed URLs.
- New company-scoped `customer_timeline_events` table with RLS and indexes.

## Migration

- `20260804075659_customer_timeline_events.sql`
- Applied to Supabase project `ctpctcymjbtyxpdawrgh` as migration
  `20260804080105_customer_timeline_events`.

## Verification

- `npm run validate` passed after each Day 4 implementation stage.
- Supabase security and performance advisors were run after the migration.
- No new advisor finding was introduced by `customer_timeline_events`.
- Existing legacy advisor warnings remain documented technical debt.

## Deferred Day 4 hardening

- Playwright auth recovery coverage requires a stable SMTP/test mailbox.
- Two-company RLS integration coverage requires isolated test identities.
- Production custom SMTP requires a provider decision and credentials.

## Next handoff

Move to Day 5 design alignment, beginning with `D5-01`.
