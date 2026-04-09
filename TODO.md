# TODO.md — Tool Club

Last updated: 2026-04-09 (evening)

Work this list top to bottom unless instructed otherwise. Before starting a task,
re-read AGENTS.md, ARCHITECTURE.md, and SPEC.md. Mark tasks `[x]` when done.
Add notes inline when a task reveals decisions that affect other tasks.

---

## 0. Repository and tooling

- [x] Initialize Git repository, push to GitHub (public)
- [x] Create SvelteKit project (`pnpm create svelte@latest`)
  - TypeScript: yes
  - ESLint + Prettier: yes
  - Playwright: yes
  - Vitest: yes
- [x] Install and configure `@sveltejs/adapter-vercel`
- [x] Install and configure Tailwind CSS v4 (`tailwindcss @tailwindcss/vite`)
- [x] Install and configure `mdsvex`
- [x] Install Zod and `@t3-oss/env-core` for env schema validation
- [x] Install `@supabase/supabase-js` and `@supabase/ssr`
- [x] Install Hono
- [x] Install `@js-temporal/polyfill`
- [x] Install `@faker-js/faker` and `tsx` (dev, for seed scripts)
- [x] Initialize Supabase project locally (`supabase init`)
- [x] Link local project to hosted Supabase project (`supabase link`)
- [x] Create `.env.local` with local Supabase keys (gitignored)
- [x] Create `.env.example` with variable names and no values (committed)
- [x] Configure Vercel project, connect to GitHub repo
- [x] Add secrets to GitHub Actions: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`,
      `SUPABASE_PROJECT_ID`, `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`,
      `SUPABASE_SERVICE_ROLE_KEY`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
      Note: `SUPABASE_JWT_SECRET` is not required — the app uses `@supabase/ssr` and
      never verifies JWTs directly. The project uses ECC P-256 signing keys.

## 1. CI/CD pipeline

- [x] Create `.github/workflows/deploy.yml`
  - `test-db` job: `supabase db start` → `supabase test db` → `supabase link` → `supabase db push`
  - `test-unit` job: `pnpm test:unit --run`
  - `deploy-vercel` job: `needs: [test-db, test-unit]` → `vercel pull` → `vercel build --prod` → `vercel deploy --prebuilt --prod`
- [x] Verify pipeline runs and gates correctly on a test push
- [x] Add `ARCHITECTURE.md` CI diagram notes if pipeline diverges from spec

## 2. Database schema and RLS

- [x] Write migration: `users` table
- [x] Write migration: `invites` table
- [x] Write migration: `events` table
- [x] Write migration: `rsvps` table
- [x] Write migration: `suggestions` table
- [x] Write migration: `votes` table
- [x] Write migration: `comments` table
- [x] Write migration: `recaps` table
- [x] Write migration: `photos` table
- [x] Write migration: `feed_tokens` table
- [x] Enable RLS on all tables
- [x] Write RLS policies (reference permission table in ARCHITECTURE.md)
- [x] Create `supabase/seeds/test_users.sql` — dev convenience seed for auth testing
      (pgTAP tests are self-contained; they do not depend on this seed)
- [ ] Create `supabase/seeds/dev_data.ts` with realistic Faker dev seed data
      (stub exists from bootstrap but not updated for current schema — see supabase/AGENTS.md)
- [x] Write pgTAP tests for every RLS policy (67 tests, all passing)
  - [x] `tests/rls_users.test.sql`
  - [x] `tests/rls_events.test.sql`
  - [x] `tests/rls_rsvps.test.sql`
  - [x] `tests/rls_suggestions.test.sql`
  - [x] `tests/rls_votes.test.sql`
  - [x] `tests/rls_comments.test.sql`
  - [x] `tests/rls_recaps.test.sql`
  - [x] `tests/rls_photos.test.sql`
  - [x] `tests/rls_invites.test.sql`
  - [x] `tests/rls_feed_tokens.test.sql`
- [x] Verify all pgTAP tests pass locally

## 3. SvelteKit foundation

- [x] Create `src/app.css` with Tailwind import and full `@theme` token block
      (info/warn/purple/radii tokens added to match prototype)
- [x] Import font links (Fraunces, DM Mono) in `src/app.html`
- [x] Create `src/lib/server/db.ts` — Supabase server client (service role +
      per-request anon client)
- [x] Create `src/hooks.server.ts` — session validation, `locals.session`,
      `locals.user` (uses `getUser()` not `getSession()` for server-side verification)
- [x] Create root `+layout.server.ts` — load session, redirect unauthenticated
      users to `/signin` (except public routes); fetches `public.users` profile
      for display name and role
- [x] Create root `+layout.svelte` — shell, sidebar nav, mobile nav; import
      `src/app.css`; public routes bypass shell
- [x] Define public routes list (landing, signin, auth/callback, join/[token],
      feed/public)

## 4. Auth routes

- [x] `/signin` — magic link form; always returns "check your email" to prevent
      email enumeration regardless of whether the address is registered
- [x] `/auth/callback` — code exchange, new vs. existing user branch, invite cookie flow
- [x] `/join/[token]` — invite validation (not_found/expired/redeemed/valid states),
      email + display name form, sets invite_setup cookie
- [x] Expired/redeemed invite error states
- [x] Sign-out action (`/signout` POST endpoint)

## 5. Events

- [x] `/events` — list with upcoming/past toggle, event cards, avatar stacks, badges
- [x] `/events/[id]` — detail with formatted date, host, location, links,
      markdown body (server-rendered via `marked`), RSVP block, going list
- [x] RSVP form action (yes / no, locked when past)
- [x] Capacity enforcement (going button disabled when full)

## 6. Suggestions

- [ ] `/suggestions` — list sorted by vote count, status sections
- [ ] `/suggestions/[id]` — detail, vote toggle, comments
- [ ] Vote form action (toggle)
- [ ] Comment form action (post, delete own)
- [ ] Propose suggestion form and action

## 7. Recaps and photos

- [ ] Recap write form action (host or admin only)
- [ ] Photo upload form action (any member, server-side to Supabase Storage)
- [ ] Photo visibility toggle action (host or admin only)
- [ ] Signed URL generation for private photos

## 8. Feed endpoints

- [ ] `/feed/rss` — authenticated RSS, token validation
- [ ] `/feed/ical` — authenticated iCal, token validation
- [ ] `/feed/public` — public RSS, no auth
- [ ] Token regeneration form action

## 9. Account

- [ ] `/account` — display name edit, avatar upload, invite section, feed links
- [ ] Display name update action
- [ ] Avatar upload action (Supabase Storage)
- [ ] Invite generation action (one pending max enforcement)
- [ ] Invite revoke action
- [ ] Feed token regeneration action
- [ ] Account deletion action (see SPEC.md for anonymization rules + host blocker)

## 10. Admin

- [ ] `/admin` — home with links to events and members
- [ ] `/admin/events` — all events (draft, upcoming, past)
- [ ] `/admin/events/[id]` — event edit form, headcount view, RSVP list
- [ ] Admin event create/edit/publish/delete actions
- [ ] Promote suggestion to event action
- [ ] `/admin/members` — member list, pending invites
- [ ] Suspend/reinstate member action
- [ ] Admin invite revoke action

## 11. Cron jobs

- [ ] Configure `vercel.json` with cron schedules
- [ ] `mark-past-events` function (service role, see ARCHITECTURE.md)
- [ ] `expire-invites` function (service role)

## 12. Content pages

- [x] Create `content/landing.md` (moved up — this is the public face of the app)
- [x] Wire mdsvex to render it at `/` (imported via `$content` alias)
- [ ] Create `content/about.md` (optional in v1)

## 13. Playwright E2E tests

Write tests after the feature is built and working locally.

- [ ] Auth: sign in → magic link → session established
- [ ] Auth: invite flow end to end (new member creation)
- [ ] Auth: expired invite shows correct error
- [ ] Events: member sees published events, not drafts
- [ ] Events: RSVP yes → count increments → RSVP no → count decrements
- [ ] Events: capacity enforcement (going button disabled when full)
- [ ] Suggestions: vote toggle
- [ ] Suggestions: propose → appears in list
- [ ] Feed: private RSS requires valid token
- [ ] Feed: public RSS returns no member data
- [ ] Admin: publish a draft event → visible to members
- [ ] Admin: promote suggestion → event created in draft

## 14. Pre-launch

- [ ] Verify dark mode (all `prefers-color-scheme` tokens render correctly)
- [ ] Verify mobile layout (sidebar hidden, mobile nav shown at ≤640px)
- [ ] Verify all pgTAP tests pass against hosted Supabase
- [ ] Verify Playwright tests pass in CI
- [ ] Seed production database with initial admin user
- [ ] Test invite flow end to end in production
- [ ] Set up custom domain on Vercel (if applicable)
