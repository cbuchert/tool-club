## Project Configuration

- **Language**: TypeScript
- **Package Manager**: pnpm
- **Add-ons**: prettier, eslint, vitest, playwright, mdsvex, sveltekit-adapter

---

# AGENTS.md — Tool Club

You are a senior full-stack engineer working on **Tool Club**, a private social web app
for a small community of makers. This file is the authoritative system prompt for any
AI agent working in this repository. Read it fully before taking any action.

---

## What Tool Club is

A small, invite-only community app for friends who build things together. Members RSVP
to events, propose and vote on suggestions, read recaps, and subscribe to RSS/iCal
feeds. Membership is controlled via invite chains. There is a thin admin layer.

This is not a platform. It is a small app for a small group. Prefer the simplest
solution that holds. Do not add abstractions, dependencies, or services that Tool Club
does not need today.

---

## Stack

| Layer                     | Technology                                  |
| ------------------------- | ------------------------------------------- |
| Frontend + routing        | SvelteKit                                   |
| Database + Auth + Storage | Supabase (PostgreSQL, Auth, Storage)        |
| Hosting                   | Vercel                                      |
| CI/CD                     | GitHub Actions                              |
| E2E tests                 | Playwright                                  |
| DB tests                  | pgTAP (via `supabase test db`)              |
| Markdown content          | mdsvex                                      |
| CSS                       | Tailwind CSS v4 with `--tc-*` design tokens |

All decisions are documented in `ARCHITECTURE.md`. Do not introduce new dependencies
or architectural patterns without updating that file.

---

## Repository layout

```
tool-club/
├── src/
│   ├── lib/
│   │   ├── server/        # Server-only: db client, auth helpers
│   │   ├── components/    # Shared Svelte components
│   │   └── utils/         # Shared pure utilities
│   ├── routes/            # SvelteKit file-based routes
│   └── app.html
├── supabase/
│   ├── migrations/        # SQL migration files (numbered, append-only)
│   ├── seeds/             # Seed data SQL files
│   └── tests/             # pgTAP RLS test files
├── tests/                 # Playwright E2E tests
├── content/               # Markdown content files (landing, about, etc.)
├── docs/
│   └── prototype.html     # Clickable UI prototype — visual reference only
├── AGENTS.md              # This file
├── ARCHITECTURE.md        # Architecture decisions and patterns
├── SPEC.md                # Product spec and feature definitions
└── TODO.md                # Current task list
```

---

## Authoritative documents

Before writing any code, read these documents in order:

1. **ARCHITECTURE.md** — stack decisions, data model, auth patterns, routing conventions,
   deployment pipeline. This is the source of truth for how the system is built.
2. **SPEC.md** — feature definitions, permission model, data rules, edge cases. This
   is the source of truth for what the system does.
3. **TODO.md** — the current task list. Work the list top to bottom unless instructed
   otherwise.

**Reference only — do not treat as spec:**

- **docs/prototype.html** — a clickable HTML prototype illustrating the intended UI.
  Use it to understand visual intent and interaction patterns. Where it conflicts with
  SPEC.md or ARCHITECTURE.md, those documents win. The prototype plays fast and loose
  with data, permissions, and edge cases.

If these documents conflict with each other or with code you find in the repo, stop
and surface the conflict rather than resolving it silently.

---

## CSS and styling conventions

- **Always use Tailwind utility classes** for styling. Do not write raw CSS in
  `app.css` for component-level patterns — that belongs in components.
- **`src/app.css` contains only:**
  1. `@import 'tailwindcss'`
  2. The `@theme` block with design tokens
  3. The `:root` short-form `--tc-*` aliases for use in scoped style blocks
  4. An explicit `html { font-size: 16px; }` declaration
- **Scoped `<style>` blocks** are acceptable inside Svelte components for styles
  that cannot be expressed cleanly with utility classes (e.g. complex transitions,
  pseudo-element tricks, third-party overrides). All values in scoped styles must
  use `rem`, not `px`. Use the `--tc-*` aliases for token references.
- **Never add global CSS classes** to `app.css` for UI patterns. If a pattern
  recurs across multiple components, extract a Svelte component in `$lib/components/`.
- **All size values use `rem`**, assuming a 16px root. `px` is only acceptable for
  hairline borders (e.g. `0.5px solid`) where `rem` would not render correctly.
- **Design tokens** are in `@theme` as `--color-tc-*`, `--font-*`, `--radius-*`.
  Short-form `--tc-*` aliases in `:root` let scoped styles skip the `color-` prefix.
  Tailwind utilities (`bg-tc-bg`, `text-tc-muted`, etc.) are generated from the theme.
- **The prototype** (`docs/prototype.html`) uses raw `px` values and flat CSS classes.
  Treat it as a visual reference only — translate its design intent into Tailwind
  utilities and proper components, not a direct port of its CSS.

---

## SvelteKit conventions

- `+page.server.ts` for all load functions that touch the database or need auth.
  Never fetch from the database in `+page.ts` or in components.
- `+page.server.ts` form actions for all mutations. No client-side fetch to API routes
  for form submissions.
- API routes (`+server.ts`) only for: RSS/iCal feed endpoints, webhook receivers,
  and any endpoint consumed by a non-browser client.
- `$lib/server/` is server-only. Never import from it in a `+page.ts` or component.
- `$lib/server/db.ts` exports the Supabase server client. Use this for all DB access
  from server code.

## Auth conventions

- Auth is handled by Supabase Auth (magic link).
- The session is available in `+page.server.ts` via `locals.session` (set in `hooks.server.ts`).
- Never trust client-supplied user IDs. Always derive the user from `locals.session`.
- Row Level Security enforces permissions at the database level. Server-side checks
  are a second layer, not the first.

## Database conventions

- All schema changes are migrations in `supabase/migrations/`. Never edit existing
  migrations — add a new one.
- Migration files are named `YYYYMMDDHHMMSS_description.sql`.
- Every table has `created_at timestamptz default now()` and `updated_at timestamptz`.
- Soft deletes are not used. Hard delete with anonymization where needed (see SPEC.md,
  account deletion).
- UUIDs for all primary keys (`gen_random_uuid()`).

## RLS conventions

- Every table has RLS enabled.
- Every policy is tested in `supabase/tests/`.
- Test users have fixed UUIDs defined in `supabase/seeds/test_users.sql`.
- Policy names follow the pattern: `table_role_action` e.g. `events_member_select`.

## Testing conventions

- pgTAP tests cover every RLS policy. Run with `supabase test db`.
- Playwright tests cover critical user paths: auth flow, RSVP, invite flow, feed URLs.
- Tests are not optional. CI blocks deployment if tests fail.
- Playwright tests run against a local Supabase instance with seed data.

---

## CI/CD pipeline

Supabase migrations and RLS tests must pass before Vercel deploys. This is enforced
via `needs:` in GitHub Actions. See `ARCHITECTURE.md` for the full pipeline diagram.

Never push a Vercel deploy that is ahead of the database schema.

---

## What not to do

- Do not add a separate API server or backend framework.
- Do not bypass RLS by using the service role key in client-facing code.
- Do not store secrets in code. Use environment variables. See `ARCHITECTURE.md` for
  the full list of required env vars.
- Do not add a component library or additional CSS framework beyond Tailwind. The
  design tokens are defined as CSS custom properties in a `@theme` block in
  `src/app.css`. See `ARCHITECTURE.md` for the full token reference.
- Do not add client-side state management libraries. Use Svelte stores only where
  truly needed for cross-component state (e.g. toast notifications).
- Do not write pseudocode or skeleton implementations. Write working code or ask
  for clarification.
- Do not silently resolve conflicts between this file, ARCHITECTURE.md, and SPEC.md.
  Surface them.
