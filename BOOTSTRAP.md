# Tool Club — Bootstrap Checklist

You are bootstrapping **Tool Club**, a SvelteKit + Supabase web application.
Your job is to execute this checklist top to bottom, verifying each step before
moving to the next. Do not skip steps. Do not batch steps that have verification
gates.

Before you begin, read these documents in order. They are authoritative:

- `AGENTS.md` — your operating rules
- `ARCHITECTURE.md` — stack decisions, data model, routing, CI/CD
- `SPEC.md` — product behavior and feature definitions
- `TODO.md` — the post-bootstrap task list you will hand off

---

## Working rules

- Use **pnpm** for all package management. Never use npm or yarn.
- Write **TypeScript** everywhere. No `.js` files in `src/`.
- Run **red → green** on every test you write. Do not write a passing test from the
  start. Write the test, confirm it fails, write the implementation, confirm it passes.
- If a step produces an error, stop and resolve it before continuing. Do not paper
  over errors by skipping steps.
- After completing the checklist, verify the full stack runs locally end to end.
- Do not introduce any dependency not listed here without flagging it first.

---

## Phase 0 — Preflight

- [ ] Verify prerequisites are installed: `node >= 20`, `pnpm`, `docker`, `supabase`
      CLI, `git`
- [ ] Confirm Docker Desktop is running (required for local Supabase)
- [ ] Confirm the user has a hosted Supabase project created and has the project ref,
      URL, anon key, and service role key available
- [ ] Confirm the user has a Vercel account and the Vercel CLI is authenticated
      (`vercel whoami`)
- [ ] Confirm the user has a GitHub account and a new empty public repository created
      for this project

---

## Phase 1 — Repository

- [ ] Create project root directory: `tool-club/`
- [ ] `git init`
- [ ] Create `.gitignore`:
  - Node: `node_modules/`, `.pnpm-store/`
  - SvelteKit: `.svelte-kit/`, `build/`
  - Env: `.env`, `.env.local`, `.env.*.local`
  - Supabase: `supabase/.temp/`
  - OS: `.DS_Store`
- [ ] Create `package.json` with:
  - `"packageManager": "pnpm@latest"`
  - `"engines": { "node": ">=20" }`
- [ ] Create `.nvmrc` containing `20`
- [ ] Copy `AGENTS.md`, `ARCHITECTURE.md`, `SPEC.md`, `TODO.md` into the repo root
- [ ] Create `docs/` directory and copy `prototype.html` into it
- [ ] `git add -A && git commit -m "chore: init repo with project docs"`
- [ ] Add GitHub remote and push: `git remote add origin [repo-url] && git push -u origin main`

---

## Phase 2 — SvelteKit

- [ ] Scaffold SvelteKit into the repo root (not a subdirectory):
  ```
  pnpm create svelte@latest .
  ```
  Select: **Skeleton project**, **TypeScript**, **ESLint**, **Prettier**, **Playwright**,
  **Vitest**
- [ ] Install dependencies: `pnpm install`
- [ ] Install `@sveltejs/adapter-vercel` and configure in `svelte.config.js`:
  ```
  pnpm add -D @sveltejs/adapter-vercel
  ```
  Replace `adapter-auto` with `adapter-vercel` in `svelte.config.js`.
- [ ] Install and configure **Tailwind CSS v4**:

  ```
  pnpm add -D tailwindcss @tailwindcss/vite
  ```

  Add the Vite plugin to `vite.config.ts` — do NOT use the PostCSS approach from v3:

  ```ts
  import tailwindcss from '@tailwindcss/vite';
  export default defineConfig({ plugins: [tailwindcss(), sveltekit()] });
  ```

  Create `src/app.css` with:

  ```css
  @import 'tailwindcss';

  @theme {
  	/* Paste full token block from ARCHITECTURE.md design system section */
  }

  @media (prefers-color-scheme: dark) {
  	:root {
  		/* Paste dark token overrides from ARCHITECTURE.md */
  	}
  }
  ```

  Import `src/app.css` in `src/routes/+layout.svelte`.
  Do not create `tailwind.config.js` — v4 is configured entirely in CSS.

- [ ] Install and configure **mdsvex**:
  ```
  pnpm add -D mdsvex
  ```
  Add mdsvex as a preprocessor in `svelte.config.js`. Set extensions to
  `['.svelte', '.md']`.
- [ ] Verify SvelteKit runs: `pnpm dev` — confirm dev server starts with no errors
- [ ] Verify a Tailwind utility class (`class="bg-white"`) renders correctly on the
      scaffold page — confirms the Vite plugin is wired up
- [ ] `git add -A && git commit -m "chore: scaffold sveltekit with vercel adapter, tailwind v4, and mdsvex"`

---

## Phase 3 — Supabase

- [ ] Initialize Supabase in the repo root:
  ```
  supabase init
  ```
- [ ] Start local Supabase stack:
  ```
  supabase start
  ```
  Wait for all services to report healthy. Note the local API URL, anon key, and
  service role key printed in the output.
- [ ] Link to hosted Supabase project:
  ```
  supabase link --project-ref [project-ref]
  ```
- [ ] Create `supabase/tests/` directory (pgTAP test files will live here)
- [ ] Create `supabase/seeds/` directory
- [ ] Create `supabase/seeds/test_users.sql` — insert two users with fixed UUIDs:
      one with `role = 'member'`, one with `role = 'admin'`. These UUIDs are used in
      all pgTAP tests. Commit these UUIDs to `ARCHITECTURE.md` under a "Test fixtures"
      section.
- [ ] Verify Supabase Studio is accessible at `localhost:54323`
- [ ] `git add -A && git commit -m "chore: initialize supabase, add test user seeds"`

---

## Phase 4 — Environment variables

- [ ] Install **`@t3-oss/env-core`** for env schema validation:
  ```
  pnpm add @t3-oss/env-core zod
  ```
- [ ] Create `src/lib/env.ts` that validates all environment variables at build time
      using Zod. Required variables (reference `ARCHITECTURE.md` env var table):
  - `PUBLIC_SUPABASE_URL` (string, URL)
  - `PUBLIC_SUPABASE_ANON_KEY` (string, min 1)
  - `SUPABASE_SERVICE_ROLE_KEY` (string, min 1) — server only
  - `SUPABASE_JWT_SECRET` (string, min 1) — server only
- [ ] Create `.env.local` with local Supabase values (from `supabase start` output).
      This file is gitignored.
- [ ] Create `.env.example` with all variable names and empty values. Commit this file.
- [ ] Verify `pnpm build` fails with a clear error if a required env var is missing
      (test by temporarily removing one from `.env.local`)
- [ ] `git add -A && git commit -m "chore: env schema validation with zod"`

---

## Phase 5 — Supabase client

- [ ] Install Supabase packages:
  ```
  pnpm add @supabase/supabase-js @supabase/ssr
  ```
  Use `@supabase/ssr` for SvelteKit. Do not use `@supabase/auth-helpers-sveltekit`
  (deprecated).
- [ ] Create `src/lib/server/db.ts`:
  - Export a `createServerClient` function that returns a Supabase client using the
    anon key and cookies from the SvelteKit request event (for RLS-respecting queries)
  - Export a `createAdminClient` function that uses the service role key (for cron
    and admin operations only)
- [ ] Create `src/hooks.server.ts`:
  - Validate and refresh the Supabase session on every request
  - Set `locals.supabase`, `locals.session`, and `locals.user`
  - Return 401 for protected routes with no session
- [ ] Update `src/app.d.ts` to type `locals` correctly
- [ ] Write a **Vitest unit test** for the session logic in hooks:
  - Confirm the test fails first
  - Implement, confirm it passes
- [ ] `git add -A && git commit -m "feat: supabase client and session hooks"`

---

## Phase 6 — Linting and formatting

- [ ] Install ESLint plugins:
  ```
  pnpm add -D \
    eslint-plugin-svelte \
    @typescript-eslint/eslint-plugin \
    @typescript-eslint/parser \
    eslint-config-prettier
  ```
- [ ] Configure `.eslintrc.cjs` with:
  - TypeScript strict rules
  - Svelte plugin
  - Prettier compatibility (no formatting rules in ESLint)
  - Rules: `no-unused-vars` (error), `no-explicit-any` (error), `no-console` (warn)
- [ ] Configure `.prettierrc` with:
  - `singleQuote: true`
  - `trailingComma: 'es5'`
  - `printWidth: 100`
  - `useTabs: true` (matches SvelteKit default)
  - `plugins: ['prettier-plugin-svelte']`
- [ ] Install `prettier-plugin-svelte`:
  ```
  pnpm add -D prettier-plugin-svelte
  ```
- [ ] Verify ESLint and Prettier agree: `pnpm lint` and `pnpm format` should both
      pass with no errors on the scaffolded files
- [ ] Configure editor settings in `.vscode/settings.json`:
  - `"editor.formatOnSave": true`
  - `"editor.defaultFormatter": "esbenp.prettier-vscode"`
  - `"editor.codeActionsOnSave": { "source.fixAll.eslint": true }`
  - `"[svelte]": { "editor.defaultFormatter": "svelte.svelte-vscode" }`
- [ ] `git add -A && git commit -m "chore: eslint and prettier configuration"`

---

## Phase 7 — Testing infrastructure

- [ ] Verify Vitest config in `vite.config.ts` (scaffolded by create-svelte if Vitest
      was selected). Confirm `pnpm test:unit` runs.
- [ ] Install **Faker** for seed data generation:
  ```
  pnpm add -D @faker-js/faker
  ```
- [ ] Create `supabase/seeds/dev_data.ts` — a Node script that generates realistic
      seed data using Faker and inserts it via the Supabase client. Covers: members,
      events (draft + published + past), suggestions, votes, comments, one recap with
      photos.
  - Run with: `pnpm seed`
  - Add `"seed": "tsx supabase/seeds/dev_data.ts"` to `package.json` scripts
- [ ] Install `tsx` for running TypeScript scripts directly:
  ```
  pnpm add -D tsx
  ```
- [ ] Verify Playwright config (`playwright.config.ts`) is present and targets
      `localhost:5173` (SvelteKit dev server)
- [ ] Create `tests/smoke.test.ts` — a single Playwright test that:
  - Navigates to `localhost:5173`
  - Asserts the page title contains "Tool Club"
  - **Confirm it fails first** (page title won't match yet)
  - Update `src/app.html` to set the correct title
  - **Confirm it passes**
- [ ] `git add -A && git commit -m "chore: testing infrastructure, faker seed script"`

---

## Phase 8 — Temporal

- [ ] Install Temporal with polyfill:
  ```
  pnpm add @js-temporal/polyfill
  ```
- [ ] Create `src/lib/temporal.ts`:
  - Import and re-export `Temporal` from the polyfill
  - Export utility functions that will be used across the app:
    - `toPlainDate(date: Date): Temporal.PlainDate`
    - `formatEventDate(instant: Temporal.Instant, timeZone: string): string`
    - `isUpcoming(instant: Temporal.Instant): boolean`
    - `isPast(instant: Temporal.Instant): boolean`
  - Use Salt Lake City timezone (`America/Denver`) as the default
- [ ] Write Vitest unit tests for each utility function:
  - Confirm each test fails first
  - Implement, confirm each passes
- [ ] `git add -A && git commit -m "feat: temporal polyfill and date utilities"`

---

## Phase 9 — Hono

- [ ] Install Hono:
  ```
  pnpm add hono
  ```
- [ ] Create `src/lib/server/hono.ts` — a base Hono app instance configured for
      use in SvelteKit `+server.ts` routes. This will be used for the RSS, iCal, and
      public feed endpoints.
- [ ] Create a stub `src/routes/feed/public/+server.ts` that mounts the Hono app
      and returns a placeholder XML response with `Content-Type: application/rss+xml`
- [ ] Write a Playwright test that:
  - Fetches `/feed/public`
  - Asserts response status 200
  - Asserts `Content-Type` header contains `application/rss+xml`
  - **Confirm it fails first, then passes after implementation**
- [ ] `git add -A && git commit -m "feat: hono base app, public feed stub"`

---

## Phase 10 — Zod schemas

- [ ] Create `src/lib/schemas/` directory
- [ ] Create schema files (each exports Zod schemas and inferred TypeScript types):
  - `src/lib/schemas/user.ts` — User, UserRole
  - `src/lib/schemas/event.ts` — Event, EventStatus, CreateEvent, UpdateEvent
  - `src/lib/schemas/rsvp.ts` — Rsvp, RsvpResponse
  - `src/lib/schemas/suggestion.ts` — Suggestion, SuggestionStatus, CreateSuggestion
  - `src/lib/schemas/invite.ts` — Invite, CreateInvite
  - `src/lib/schemas/recap.ts` — Recap, CreateRecap
  - `src/lib/schemas/photo.ts` — Photo
  - `src/lib/schemas/feed_token.ts` — FeedToken
- [ ] Schemas must match the data model in `ARCHITECTURE.md`. If you find a
      discrepancy, stop and surface it — do not silently resolve it.
- [ ] Write Vitest tests for each schema:
  - At minimum: one valid parse test, one invalid parse test per schema
  - **Red before green**
- [ ] `git add -A && git commit -m "feat: zod schemas for all domain types"`

---

## Phase 11 — MCP servers

Install MCP servers for the tools this project uses. These enable AI agents working
in this repo to interact with live services.

- [ ] Install **Filesystem MCP** — for reading and writing files in the repo
- [ ] Install **GitHub MCP** — for creating issues, PRs, and reading repo state
- [ ] Install **Supabase MCP** — for querying the local and hosted Supabase project
- [ ] Install **Playwright MCP** (Chrome DevTools) — for browser automation and
      E2E test authoring
- [ ] Install **Vercel MCP** — for deployment status and project management
- [ ] Install **Fetch MCP** — for making HTTP requests to running services

Configure each MCP server in the project's `.mcp.json` or equivalent config file.
Verify each server connects successfully. Document any that require additional auth
setup in a `MCP.md` file in the repo root.

---

## Phase 12 — CI/CD

- [ ] Create `.github/workflows/deploy.yml`:

  ```yaml
  name: Test and Deploy

  on:
    push:
      branches: [main]

  jobs:
    test-db:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: supabase/setup-cli@v1
          with:
            version: latest
        - run: supabase db start
        - run: supabase test db
        - run: supabase db push --linked
          env:
            SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}

    test-unit:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: pnpm/action-setup@v4
        - uses: actions/setup-node@v4
          with:
            node-version: 20
            cache: pnpm
        - run: pnpm install
        - run: pnpm test:unit --run

    deploy-vercel:
      needs: [test-db, test-unit]
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: pnpm/action-setup@v4
        - uses: actions/setup-node@v4
          with:
            node-version: 20
            cache: pnpm
        - run: pnpm install
        - run: pnpm build
          env:
            PUBLIC_SUPABASE_URL: ${{ secrets.PUBLIC_SUPABASE_URL }}
            PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.PUBLIC_SUPABASE_ANON_KEY }}
            SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
            SUPABASE_JWT_SECRET: ${{ secrets.SUPABASE_JWT_SECRET }}
        - run: npx vercel --prod --token ${{ secrets.VERCEL_TOKEN }}
  ```

- [ ] Verify the workflow file is valid YAML (no syntax errors)
- [ ] Push to main and confirm GitHub Actions runs
- [ ] Confirm `deploy-vercel` is blocked when `test-db` or `test-unit` fails
      (test by introducing a deliberate failing test, then reverting)
- [ ] `git add -A && git commit -m "chore: github actions ci/cd pipeline"`

---

## Phase 13 — Verification

Run the full stack locally and confirm everything works together:

- [ ] `supabase start` — all services healthy
- [ ] `pnpm seed` — dev seed data inserts without errors
- [ ] `pnpm dev` — SvelteKit dev server starts, landing page loads
- [ ] `pnpm test:unit` — all Vitest tests pass
- [ ] `supabase test db` — all pgTAP tests pass (only test_users seed exists at
      this point — that's expected)
- [ ] `pnpm test:e2e` — Playwright smoke test and feed test pass
- [ ] `pnpm lint` — no ESLint errors
- [ ] `pnpm build` — production build succeeds
- [ ] Confirm Vercel preview deploy succeeded in GitHub Actions

If any of these fail, stop and resolve before marking the checklist complete.

---

## Handoff

When the checklist is complete:

1. Confirm all 13 phases are checked off
2. Post a summary of:
   - Any decisions made that are not reflected in the architecture docs
     (update the docs, then surface the change)
   - Any packages added beyond the spec (justify each)
   - Any steps that were skipped and why
3. The next agent picks up from `TODO.md` section 2 (Database schema and RLS)
