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
| D4-01 | P0 | Connect logout and real authenticated profile identity | Ready | Unassigned | Day 3 auth | Navigation, auth |
| D4-02 | P0 | Add customer editing with validation and timeline event | Ready | Unassigned | Customer service | Customers |
| D4-03 | P0 | Add signed KYC document view/download | Ready | Unassigned | Private storage | Customers, storage |
| D4-04 | P1 | Add auth recovery and protected-route Playwright coverage | Ready | Unassigned | Stable SMTP/test mailbox | Auth, tests |
| D4-05 | P1 | Add two-company RLS isolation integration test | Ready | Unassigned | Test identities | Supabase, tests |
| D4-06 | P1 | Configure production custom SMTP and branded Auth templates | Ready | Unassigned | SMTP provider decision | Supabase Auth |
| D5-01 | P1 | Align customer page with supplied design references | Ready | Unassigned | Day 4 customers | UI |
| D5-02 | P1 | Rebuild dashboard sections using reusable live-data contracts | Ready | Unassigned | Metrics services | Dashboard |
| D5-03 | P2 | Complete navigation actions, theme control, and mobile behavior | Ready | Unassigned | D4-01 | Navigation |

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
