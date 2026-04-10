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

Before writing any code, read this:

1. **ARCHITECTURE.md** — stack decisions, data model, auth patterns, routing, CI/CD.
   Source of truth for how the system is built.

If this document conflicts with code in the repo,
**stop and surface the conflict** rather than resolving it silently.

---

## Archived documents

The documents below were authoritative during the MVP build. The MVP is shipped.
They live in `docs/` for reference — you do not need to read them before working,
but they are useful if you need to understand _why_ something was designed a certain
way or what the original plan was.

```
docs/
├── spec.md        — original feature spec and permission model
├── todo.md        — MVP task list (all items complete)
├── bootstrap.md   — project bootstrap checklist (all phases complete)
└── prototype.html — static HTML prototype showing visual intent
```

**Discovery pattern:** when you need historical context, scan `docs/` first. If a
question can't be answered by `ARCHITECTURE.md` or the `AGENTS.md` files, the answer
is probably in one of these archived files.

**The archive rule:** when a phase of work is done and its planning documents are no
longer needed for active development, move them to `docs/` and strip references to
them from the `AGENTS.md` files. Agents read `AGENTS.md` files before every task —
keeping those lean means less noise. Archived docs stay findable without cluttering
the agent's required reading.

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
- **Mobile first, always.** Base styles target 390px. `sm:` adds desktop behaviour.
  A "responsive pass" after the fact means the base styles were wrong.
- **No component library.** Tailwind + `$lib/components/` is the UI system.
- **No client-side state management libraries** beyond what's already adopted.
  Current exceptions: `@tanstack/svelte-form` for form state/validation.
  Svelte stores for cross-component state only where truly necessary.
- **No secrets in code.** Environment variables only.
- **Write working code.** No pseudocode or skeleton implementations.
- **Microcommits.** One logical change per commit. Do not batch unrelated work.
  If a commit message needs "and" to describe what it does, split it.
