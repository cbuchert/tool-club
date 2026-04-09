# TODO.md — Tool Club

Last updated: 2026-04-09

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
- [ ] Add `ARCHITECTURE.md` CI diagram notes if pipeline diverges from spec

## 2. Database schema and RLS

- [ ] Write migration: `users` table
- [ ] Write migration: `invites` table
- [ ] Write migration: `events` table
- [ ] Write migration: `rsvps` table
- [ ] Write migration: `suggestions` table
- [ ] Write migration: `votes` table
- [ ] Write migration: `comments` table
- [ ] Write migration: `recaps` table
- [ ] Write migration: `photos` table
- [ ] Write migration: `feed_tokens` table
- [ ] Enable RLS on all tables
- [ ] Write RLS policies (reference permission table in ARCHITECTURE.md)
- [ ] Create `supabase/seeds/test_users.sql` with fixed UUIDs for pgTAP tests
- [ ] Create `supabase/seeds/dev_data.sql` with realistic dev seed data
- [ ] Write pgTAP tests for every RLS policy
  - [ ] `tests/rls_users.test.sql`
  - [ ] `tests/rls_events.test.sql`
  - [ ] `tests/rls_rsvps.test.sql`
  - [ ] `tests/rls_suggestions.test.sql`
  - [ ] `tests/rls_votes.test.sql`
  - [ ] `tests/rls_comments.test.sql`
  - [ ] `tests/rls_recaps.test.sql`
  - [ ] `tests/rls_photos.test.sql`
  - [ ] `tests/rls_invites.test.sql`
  - [ ] `tests/rls_feed_tokens.test.sql`
- [ ] Verify all pgTAP tests pass locally

## 3. SvelteKit foundation

- [ ] Create `src/app.css` with Tailwind import and full `@theme` token block
      (reference ARCHITECTURE.md design system section for all token values)
- [ ] Import font links (Fraunces, DM Mono) in `src/app.html`
- [ ] Create `src/lib/server/db.ts` — Supabase server client (service role +
      per-request anon client)
- [ ] Create `src/hooks.server.ts` — session validation, `locals.session`,
      `locals.user`
- [ ] Create root `+layout.server.ts` — load session, redirect unauthenticated
      users to `/signin` (except public routes)
- [ ] Create root `+layout.svelte` — shell, sidebar nav, mobile nav; import
      `src/app.css`
- [ ] Define public routes list (landing, signin, auth/callback, join/[token],
      feed/public)

## 4. Auth routes

- [ ] `/signin` — magic link request form and action
- [ ] `/auth/callback` — Supabase callback handler, new vs. existing user branch
- [ ] `/join/[token]` — invite validation, account setup form and action
- [ ] Expired/redeemed invite error states (see SPEC.md)
- [ ] Sign-out action

## 5. Events

- [ ] `/events` — list of published events, upcoming/past toggle
- [ ] `/events/[id]` — event detail, RSVP block, going list
- [ ] RSVP form action (yes / no, locked when past)
- [ ] Capacity enforcement (disable "Going" when full, per SPEC.md)

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

- [ ] Create `content/landing.md`
- [ ] Wire mdsvex to render it at `/`
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
