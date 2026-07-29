<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Evo Rentals agent protocol

These rules apply to every coding agent working in this repository.

## Required startup sequence

Before editing code:

1. Read `docs/CONTEXT.md`.
2. Read `docs/NEXT_STEPS.md`.
3. Read `docs/DECISIONS.md`.
4. Read the relevant `docs/DAY_XX_*.md` handoff.
5. Run `git status -sb` and preserve unrelated or uncommitted work.
6. Claim one ready task in `docs/NEXT_STEPS.md` before making changes.

Do not rely on chat history as the project record. Repository documentation is
the source of truth.

## Coordination

- Use a branch named `agent/<task-id>-<short-description>` for planned work.
- Record the agent/task owner and branch in `docs/NEXT_STEPS.md`.
- Do not edit files claimed by another in-progress task without coordination.
- Only one task may own Supabase migrations at a time.
- Never overwrite, revert, stage, or commit another agent's unrelated changes.
- Keep commits focused on one task and include its documentation updates.

## Architecture and database rules

- UI components do not query Supabase directly. Use typed services under
  `src/lib/services`.
- Treat Server Actions as public endpoints: authenticate, authorize, and
  validate untrusted input.
- Company tenancy is required; branch tenancy is intentionally disabled.
- Every exposed business table requires company isolation and RLS.
- Store documents in private buckets and return only short-lived signed URLs.
- Never expose or commit service-role keys, access tokens, or `.env.local`.
- Create ordered migrations for schema changes; do not leave production-only
  schema edits without migration history.

## Required handoff sequence

Before marking a task complete:

1. Run `npm run validate`.
2. Record validation results and any untested behavior.
3. Update the task status in `docs/NEXT_STEPS.md`.
4. Update the verified checkpoint in `docs/CONTEXT.md`.
5. Add or update the relevant `docs/DAY_XX_*.md` handoff.
6. Record new decisions in `docs/DECISIONS.md`.
7. Record migrations, commit, deployment, blockers, and the precise next action.

A code change without an updated checkpoint is not fully handed off.
