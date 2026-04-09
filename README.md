# Tool Club

An invite-only community app for a small group of makers in Salt Lake City.
Members RSVP to events, propose and vote on ideas, and read recaps.
Built with SvelteKit, Supabase, and Tailwind CSS v4. Deployed on Vercel.

---

## Prerequisites

- [Node.js](https://nodejs.org/) ≥ 20
- [pnpm](https://pnpm.io/) — `npm install -g pnpm`
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for local Supabase)
- [Supabase CLI](https://supabase.com/docs/guides/cli) — `brew install supabase/tap/supabase`

---

## Local development

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start Supabase

```bash
supabase start
```

This starts a local Postgres instance, Auth server, Storage, and Mailpit (email
catcher) via Docker. First run takes a few minutes to pull images.

Useful local endpoints once running:

| Service                 | URL                                                       |
| ----------------------- | --------------------------------------------------------- |
| App (after `pnpm dev`)  | http://localhost:5173                                     |
| Supabase Studio         | http://localhost:54323                                    |
| Mailpit (caught emails) | http://localhost:54324                                    |
| Postgres                | `postgresql://postgres:postgres@localhost:54322/postgres` |

### 3. Configure environment

Copy the example env file and fill in the values printed by `supabase start`:

```bash
cp .env.example .env.local
```

`.env.local` needs:

```
PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
PUBLIC_SUPABASE_ANON_KEY=<anon key from supabase start>
SUPABASE_SERVICE_ROLE_KEY=<service role key from supabase start>
```

### 4. Seed dev data

Creates two test users and realistic fixture data (events, suggestions, votes, etc.):

```bash
pnpm seed
```

Test accounts (sign in via magic link — email is caught by Mailpit):

| Role   | Email                  |
| ------ | ---------------------- |
| Admin  | `admin@test.toolclub`  |
| Member | `member@test.toolclub` |

### 5. Start the dev server

```bash
pnpm dev
```

Open http://localhost:5173. Sign in with one of the test emails above, then check
Mailpit at http://localhost:54324 for the magic link.

---

## Testing

```bash
pnpm test:unit   # Vitest unit tests (fast, no Supabase needed)
pnpm test:db     # pgTAP RLS tests (requires supabase start)
pnpm test:e2e    # Playwright E2E tests (requires supabase start + pnpm dev)
pnpm test        # All three in sequence
```

E2E tests require the dev server running (`pnpm dev` in another terminal) and
dev seed data present (`pnpm seed`).

### pgTAP notes

pgTAP tests are self-contained and work against both a clean and a seeded DB —
no reset required.

---

## Useful commands

```bash
pnpm dev           # Start dev server
pnpm build         # Production build
pnpm check         # TypeScript + Svelte type checking
pnpm lint          # Prettier + ESLint
pnpm format        # Auto-format
pnpm seed          # Load dev fixture data
pnpm push:emails   # Push compiled email templates to production Supabase
```

---

## Project structure

```
src/
├── lib/
│   ├── components/   # Shared UI components (Avatar, Badge, Topbar, …)
│   ├── schemas/      # Zod validation schemas (shared client + server)
│   ├── server/       # Server-only modules (Supabase clients, env)
│   └── utils/        # Pure utilities (event card helpers, date formatting)
├── routes/           # SvelteKit file-based routes
│   ├── admin/        # Admin-only pages (events, members, suggestions)
│   ├── cron/         # Vercel cron job endpoints
│   ├── events/       # Event list + detail + RSVP
│   ├── suggestions/  # Suggestion list + detail + voting
│   ├── account/      # Member account, invites, feed tokens
│   └── feed/         # RSS + iCal endpoints (Hono)
supabase/
├── migrations/       # Postgres schema — append-only
├── seeds/            # test_users.sql (fixed UUIDs) + dev_data.ts (Faker)
└── tests/            # pgTAP RLS tests (one file per table)
tests/                # Playwright E2E tests
```

---

## Deployment

CI runs on every push to `main`:

1. **pgTAP** — RLS tests pass against a fresh local Supabase instance
2. **Unit tests** — Vitest passes
3. **Migrations pushed** — `supabase db push` applies any new migrations to production
4. **Deploy** — Vercel builds and deploys

E2E tests run locally only (`pnpm test:e2e`).

---

## Documentation

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — stack decisions, data model, auth, routing, CI/CD
- [`SPEC.md`](./SPEC.md) — feature definitions, permission model, edge cases
- [`TODO.md`](./TODO.md) — task list
- [`src/AGENTS.md`](./src/AGENTS.md) — SvelteKit conventions
- [`supabase/AGENTS.md`](./supabase/AGENTS.md) — migrations, RLS, pgTAP patterns
