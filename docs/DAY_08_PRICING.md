# Day 8 - Pricing plans

Date: 2026-08-04
Task: D8-01 - Company-scoped pricing plans and server-calculated quote preview
Owner: Codex / branch `agent/d8-01-pricing-plans`
Status: Review (implementation and live migration verified; deployment pending)

## Delivered

- New `/pricing` workspace and sidebar destination with reference-aligned KPI
  cards, responsive rate-card table/mobile cards, active/inactive filtering,
  loading, empty, error, and view-only states.
- Create/edit plan workflows validated by Zod-backed Server Actions.
- Typed server-only Pricing service using the existing `Rentals` RBAC module:
  employees can view/quote, managers and administrators can manage plans.
- Server-authoritative quote preview for whole day/week/30-day-month billing,
  included and excess kilometres, inclusive/exclusive GST, and refundable
  deposits. Effective dates and duration bounds are enforced server-side.
- Migration `20260804120339_company_pricing_plans.sql`: company-scoped plans,
  amount/duration/date/status constraints, case-insensitive company/code
  uniqueness, audit columns/indexes, RLS, and operation-specific policies.

## Verification

- `npm.cmd run validate` passed (typecheck, lint, Next.js production build).
- Live schema verification passed: 22 columns, expected constraints/indexes,
  operation-specific company RLS policies, and zero initial rows.
- Supabase advisors: no Pricing security findings; only expected unused-index
  informational notices immediately after table creation.

## Remaining

- Deploy and smoke-test `/pricing` with an authenticated administrator.
- Create the first real Evo Rentals rate cards through the UI; no fabricated
  production prices were seeded.
- Booking confirmation must persist an immutable pricing snapshot per ADR-012.

Next: booking availability search and pricing snapshot foundation.
