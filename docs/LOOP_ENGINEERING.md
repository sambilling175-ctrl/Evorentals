# Loop engineering for task continuity

The shared queue in `docs/NEXT_STEPS.md` is the source of truth for the next
agent. The queue loop is intentionally deterministic:

```powershell
npm.cmd run task:next -- --json
```

The planner selects the highest-priority `Ready` task only when every named
task dependency is `Completed` and no external dependency text remains. It
reports unresolved `Ready` rows separately instead of guessing around SMTP,
business approvals, credentials, or production data decisions.

When a task is genuinely claimable, create a branch and claim it in one step:

```powershell
npm.cmd run task:claim -- --claim=D11-03 --owner=Codex --branch=agent/d11-03-import
```

The claim command updates the queue to `In progress`. The agent must then read
`docs/CONTEXT.md`, `docs/DECISIONS.md`, and the relevant day handoff before
editing. At handoff it must commit code and continuity updates, then set the
queue row to `Review`, `Completed`, or `Blocked` with exact validation and one
next action.

The loop never auto-approves migrations, Supabase writes, production deploys,
PII imports, duplicate merges, or missing-data placeholders. Those are explicit
decision gates. If no task is claimable, the runner should stop and surface the
blocked/review list rather than repeatedly retrying the same work.
