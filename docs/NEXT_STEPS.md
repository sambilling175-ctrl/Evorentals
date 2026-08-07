# Evo Rentals ERP - Shared Task Queue

> Every agent must claim one task before editing. Update owner, branch, status,
> validation, and handoff notes as part of the same commit as the code.

## Status values

- `Ready` - unblocked and available
- `In progress` - claimed by one owner
- `Blocked` - cannot proceed; blocker must be recorded
- `Review` - implementation complete, awaiting integration or acceptance
- `Completed` - merged, validated, documented, and deployed when applicable

## Active delivery queue

| ID | Priority | Task | Status | Owner / branch | Dependencies | Primary area |
| --- | --- | --- | --- | --- | --- | --- |
| D4-01 | P0 | Connect logout and real authenticated profile identity | Completed | Codex / `main` | Day 3 auth | Navigation, auth |
| D4-02 | P0 | Add customer editing with validation and timeline event | Completed | Codex / `main` | Customer service | Customers |
| D4-03 | P0 | Add signed KYC document view/download | Completed | Codex / `main` | Private storage | Customers, storage |
| D4-04 | P1 | Add auth recovery and protected-route Playwright coverage | Ready | Unassigned | Stable SMTP/test mailbox | Auth, tests |
| D4-05 | P1 | Add two-company RLS isolation integration test | Ready | Unassigned | Test identities | Supabase, tests |
| D4-06 | P1 | Configure production custom SMTP and branded Auth templates | Ready | Unassigned | SMTP provider decision | Supabase Auth |
| D5-01 | P1 | Align customer page with supplied design references | Completed | Codex / `main`; app commit `109f3b0`; validate passed; production Ready; no migration | Day 4 customers | UI |
| D5-02 | P1 | Rebuild dashboard sections using reusable live-data contracts | Completed | Codex / `main`; app commit `4e3af21`; validate/Supabase query passed; production Ready; no migration | Metrics services | Dashboard |
| D5-03 | P2 | Complete navigation actions, theme control, and mobile behavior | Completed | Codex / `main`; app commit `bd0bbe6`; validate passed; production Ready; no migration | D4-01 | Navigation |
| D6-01 | P1 | Replace settings foundation with live company and operational configuration | Completed | Codex / `agent/d6-01-live-settings`; app commit `0565b5a`; validate/database verification passed; production Ready | D5-03 | Settings |
| D6-02 | P1 | Replace Employees placeholder and establish enforceable RBAC management | Completed | Codex / `agent/d6-02-employees-rbac`; app commit `a6645bf`; validate/database verification passed; production Ready | D6-01 | Employees, RBAC |
| D6-03 | P1 | Add secure employee invitation and Auth provisioning | Blocked | Unassigned; requires server secret and custom SMTP | D4-06, D6-02 | Employees, Auth |
| D7-01 | P1 | Replace Fleet placeholder with live vehicle directory and availability state | Completed | Kimi + Codex; app `de4873f`, merge `f201cf5`; migrations `20260804112443` and `20260804112716`; production Ready | D6-02 | Fleet |
| D8-01 | P1 | Add company-scoped pricing plans and server-calculated quote preview | Completed | Codex; app `8fe805d`, merge `5e83ef0`; migration `20260804120339`; production Ready | D7-01, D6-01 | Pricing, Rentals |
| D9-01 | P0 | Add availability search, conflict-safe booking creation, and immutable pricing snapshots | Completed | Codex; app `e59c882`, merge `ccdcc72`; migration `20260804122402`; production Ready | D7-01, D8-01 | Bookings, Pricing |
| D9-01-H1 | P0 | Fix bookings client crash caused by importing initial state from a server-actions module | Completed | Codex; app `8bc9681`, merge `8e47251`; validate passed; production Ready; no migration | D9-01 | Bookings |
| D9-02 | P0 | Convert confirmed bookings into immutable active rental contracts | Completed | Codex; app `65358ab`, merge `68c8e26`; migrations `20260804125633` and `20260804125801`; validate and live schema verification passed; production Ready | D9-01 | Rentals, Bookings, Fleet |
| D9-03 | P0 | Extend active rentals with immutable pricing and audit history | Completed | Codex; app `5f065dc`, merge `9549929`; migrations `20260804131305`, `20260804131358`, `20260804131557`; validate/live schema passed; production Ready | D9-02 | Rentals, Pricing, Fleet |
| D9-04 | P0 | Swap vehicles on open rentals with odometer reconciliation and immutable history | Completed | Codex; app `7041d0a`, merge `55fdc15`; migrations `20260806132958` and `20260806133028`; validate/live schema passed; production Ready | D9-03 | Rentals, Fleet, Bookings |
| D9-05 | P0 | Return inspection with immutable damage history and atomic rental/vehicle transition | Review | Codex; `agent/d9-05-return-inspection`; commit `1b6a6c4`; draft PR #8; migration owner: yes; validate and live schema/advisors passed; preview READY `evorentals-q9imvfwwi-wephotons1.vercel.app`; authenticated smoke test pending | D9-04 | Rentals, Fleet |

## Planned module sequence

After Day 5:

1. Settings
2. Employees and RBAC
3. Fleet and availability
4. Pricing
5. Booking and rental lifecycle
6. Collections and settlement
7. Live dashboard and reports

## Task claim template

When starting:

```text
Status: In progress
Owner: <agent/tool name>
Branch: agent/<task-id>-<description>
Started: YYYY-MM-DD HH:MM Asia/Kolkata
Files/area: <expected ownership>
Migration owner: yes/no
```

When handing off:

```text
Status: Review or Completed
Commit: <sha>
Validation: <commands and results>
Deployment: <URL/status or not applicable>
Migrations: <names/status or none>
Remaining: <precise unfinished work>
Next action: <one executable step>
```

## Coordination rules

- One owner per in-progress task.
- One migration owner at a time.
- Do not silently broaden a task into another module.
- If two tasks need the same file, coordinate ownership before editing.
- Do not mark a task completed until code, validation, and documentation agree.
