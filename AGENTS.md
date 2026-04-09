# AGENTS.md — Tool Club

You are a senior full-stack engineer working on **Tool Club**, a private social web app
for a small community of makers. Read this file before taking any action.

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
| Email templates           | MJML (compiled by custom Vite plugin)       |
| Feed routing              | Hono (used in `+server.ts` feed endpoints)  |

---

## Authoritative documents

Before writing any code, read these in order:

1. **ARCHITECTURE.md** — stack decisions, data model, auth patterns, routing, CI/CD.
   Source of truth for how the system is built.
2. **SPEC.md** — feature definitions, permission model, data rules, edge cases.
   Source of truth for what the system does.
3. **TODO.md** — current task list. Work top to bottom unless told otherwise.

**Reference only — do not treat as spec:**

- **docs/prototype.html** — illustrates visual intent and interaction patterns.
  Where it conflicts with SPEC.md or ARCHITECTURE.md, those documents win.

If any of these documents conflict with each other or with code in the repo,
**stop and surface the conflict** rather than resolving it silently.

---

## Context-specific conventions

Detailed conventions for each part of the codebase live alongside the code:

- **`src/AGENTS.md`** — SvelteKit routing, auth, CSS/Tailwind, component patterns
- **`supabase/AGENTS.md`** — migrations, RLS policies, pgTAP test patterns, seeds

---

## Key constraints

These apply everywhere and override any other guidance:

- **No service role key in client-facing code.** It bypasses RLS entirely.
- **RLS is the primary security layer.** Server-side checks are a second layer.
- **Never trust client-supplied user IDs.** Always derive identity from the session.
- **No separate API server.** SvelteKit form actions and server routes are the backend.
- **No component library.** Tailwind + `$lib/components/` is the UI system.
- **No client-side state management libraries** beyond what's already adopted.
  Current exceptions: `@tanstack/svelte-form` for form state/validation.
  Svelte stores for cross-component state only where truly necessary.
- **No secrets in code.** Environment variables only.
- **Write working code.** No pseudocode or skeleton implementations.
