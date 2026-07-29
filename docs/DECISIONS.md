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
