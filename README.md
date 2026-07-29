# Evo Rentals ERP

Operational command center for an electric two-wheeler rental business.

## Current status

The project contains the responsive application shell, dashboard, workflow
module foundations, realistic review data, a typed operations repository, and
the first core rental lifecycle migration. The application includes browser
and server Supabase clients; live repository queries and authentication are
activated during Sprint 1.

## Requirements

- Node.js 20 or newer
- npm
- A Supabase project from Sprint 1 / Day 3 onward

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Keep the placeholder Supabase values during UI-only development.
3. Install dependencies with `npm install`.
4. Start the application with `npm run dev`.
5. Open `http://localhost:3000`.

Never commit `.env.local` or a Supabase service-role key.

## Quality commands

| Command | Purpose |
| --- | --- |
| `npm run typecheck` | Validate TypeScript without emitting files |
| `npm run lint` | Run the Next.js ESLint rules |
| `npm run build` | Create the production build |
| `npm run validate` | Run type-checking, lint, and the production build |

## Application structure

- `src/app` — Next.js App Router pages and layouts
- `src/components` — reusable interface components
- `src/data` — temporary demonstration datasets
- `src/lib/services` — backend-agnostic repository contracts
- `supabase/migrations` — ordered database migrations

## Environment strategy

- `.env.local` — local developer values
- Supabase staging project — integration and acceptance testing
- Supabase production project — production data only

The application defaults to `Asia/Kolkata` and `INR`. Public environment values
use the `NEXT_PUBLIC_` prefix; privileged credentials remain server-only.

## Definition of done

A change is complete when TypeScript, ESLint, and the production build pass;
responsive states are usable; loading, empty, error, and permission states are
considered; and any database change includes an ordered migration.

## Coding-agent continuity

All coding agents must begin with [AGENTS.md](./AGENTS.md), then read:

- [Current checkpoint](./docs/CONTEXT.md)
- [Shared task queue](./docs/NEXT_STEPS.md)
- [Architecture decisions](./docs/DECISIONS.md)

Agents claim one task, preserve unrelated work, run `npm run validate`, and
update the checkpoint and handoff documentation before completing a task.
