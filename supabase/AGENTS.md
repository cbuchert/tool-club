# AGENTS.md — supabase/

This directory contains all Supabase-managed database artifacts.
Read this file before touching anything in `supabase/`.

---

## What lives here

```
supabase/
├── migrations/   # SQL migration files — append-only, never edited
├── seeds/        # Seed data loaded on db reset
│   ├── test_users.sql   # Fixed-UUID users for pgTAP tests
│   └── dev_data.ts      # Faker-generated dev data (run via pnpm seed)
├── tests/        # pgTAP RLS test files (one per table)
└── config.toml   # Local Supabase configuration
```

---

## Migration inventory

| File                                     | What it creates                                                                             |
| ---------------------------------------- | ------------------------------------------------------------------------------------------- |
| `20260409000001_create_users.sql`        | `public.users`, `public.set_updated_at()` trigger function, `public.is_admin()` helper, RLS |
| `20260409000002_create_invites.sql`      | `public.invites`, RLS                                                                       |
| `20260409000003_create_events.sql`       | `public.events`, RLS                                                                        |
| `20260409000004_create_rsvps.sql`        | `public.rsvps`, RLS                                                                         |
| `20260409000005_create_suggestions.sql`  | `public.suggestions`, resolves `events ↔ suggestions` circular FK, RLS                      |
| `20260409000006_create_votes.sql`        | `public.votes`, unique constraint, RLS                                                      |
| `20260409000007_create_comments.sql`     | `public.comments`, RLS                                                                      |
| `20260409000008_create_recaps.sql`       | `public.recaps`, RLS                                                                        |
| `20260409000009_create_photos.sql`       | `public.photos`, RLS                                                                        |
| `20260409000010_create_feed_tokens.sql`  | `public.feed_tokens`, RLS                                                                   |
| `20260409000011_add_user_suspension.sql` | `users.is_suspended boolean` + index (mirrors Supabase Auth ban state for admin UI)         |

---

## Migration conventions

- **Never edit an existing migration.** Always add a new file.
- File naming: `YYYYMMDDHHMMSS_description.sql` (sequential within a day is fine).
- Every table must have `created_at timestamptz not null default now()` and
  `updated_at timestamptz not null default now()`.
- All primary keys use `gen_random_uuid()`.
- Soft deletes are not used. Hard delete with anonymization where needed.
- Enable RLS on every table in the same migration that creates it.
- Add indexes for every FK column and any column used in WHERE clauses.

## RLS conventions

- Every table has RLS enabled.
- The `public.is_admin()` function (defined in `20260409000001_create_users.sql`)
  is `security definer` — use it in all admin-check policies to avoid recursive
  RLS evaluation on `public.users`.
- No policy grants the `anon` role access to any table. All access requires
  an authenticated session. The public RSS feed is handled at the application
  layer, not through anon DB access.
- Policy naming: `{table}_{role}_{action}` — e.g. `events_member_select`,
  `invites_admin_all`.

## Running pgTAP tests

pgTAP tests are self-contained and pass against both a clean and a seeded DB:

```bash
pnpm exec supabase test db    # works regardless of whether pnpm seed has run
```

No reset needed. Each test file handles pre-existing seed data in its fixture
setup (see fixture template below).

## pgTAP test conventions

- One test file per table: `tests/rls_{table}.test.sql`.
- Every test file wraps in `begin; ... rollback;` — no persistent state.
- Test fixture UUIDs must use valid hex only (`0-9`, `a-f`).
  Bad: `ssssssss-...` Good: `b1000000-...`
- Switch roles with `set local role authenticated` and
  `set local request.jwt.claims to '{"sub":"...","role":"authenticated"}'`.
- For "cannot update" tests: run the DML, then read back the value to confirm
  it didn't change. Do NOT use DML inside `is()` subqueries.
- For "cannot insert/delete" tests that should throw: use `throws_ok()` with
  error code `42501` (RLS violation) or `23505` (unique constraint).
- Reset to `set local role postgres` before verification reads.

### Fixture template — canonical copy

Every test file starts with this fixture block (after `select plan(N);`).
**This is the single source of truth for fixture inserts.** When a migration
adds a column to `auth.users` or `public.users`, update this template AND
every test file that copies it.

```sql
set local role postgres;

-- auth.users: need the rows for FK constraints; specific values don't matter.
-- on conflict do nothing is safe — we don't assert on auth.users fields.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin)
values
  ('00000000-0000-0000-0000-000000000000',
   '00000000-0000-0000-0000-000000000001',
   'authenticated', 'authenticated', 'member@test.toolclub',
   crypt('t', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}', false),
  ('00000000-0000-0000-0000-000000000000',
   '00000000-0000-0000-0000-000000000002',
   'authenticated', 'authenticated', 'admin@test.toolclub',
   crypt('t', gen_salt('bf')), now(), now(), now(),
   '{"provider":"email","providers":["email"]}', '{}', false)
on conflict (id) do nothing;

-- public.users: DO UPDATE SET so fixture values are enforced even when
-- dev seed data (e.g. "Sam Chen") is already present. Rolls back on finish.
insert into public.users (id, display_name, email, role)
values
  ('00000000-0000-0000-0000-000000000001', 'Test Member', 'member@test.toolclub', 'member'),
  ('00000000-0000-0000-0000-000000000002', 'Test Admin',  'admin@test.toolclub',  'admin')
on conflict (id) do update set display_name = excluded.display_name, role = excluded.role;
```

For tables with a `user_id` FK and a unique constraint (e.g. `feed_tokens`):
use `delete … where user_id in (…)` followed by a plain `insert` — this
guarantees fixture IDs are exactly what the tests assert on, regardless of
what seed rows exist.

## Seed conventions

- `seeds/test_users.sql` is a **dev convenience seed** for local auth testing
  (magic link sign-in flow). It is NOT a dependency for pgTAP tests — those are
  fully self-contained. Do not change the fixed UUIDs; they are used by the dev
  seed and referenced in comments, but pgTAP tests insert their own fixtures:
  - member: `00000000-0000-0000-0000-000000000001`
  - admin: `00000000-0000-0000-0000-000000000002`
- `seeds/dev_data.ts` is a Faker-based script for realistic local dev data.
  Run with `pnpm seed`. Uses the Supabase JS client (requires local stack running).
  Covers: 2 users, 6 events (published/draft/past), RSVPs, 1 recap + photos,
  6 suggestions (open/planned/closed), votes, comments, feed tokens.
- Seeds load in glob order (`seeds/*.sql`). The test_users seed runs before
  dev_data because SQL files sort before `.ts` — but dev_data.ts is a script,
  not a SQL seed, so there is no conflict.

## Email templates

Source of truth: `supabase/email-templates/*.mjml`
Compiled output: `supabase/templates/*.html` (committed — always present without a build step)

The Vite plugin in `vite.config.ts` compiles MJML → HTML automatically on
`pnpm dev` and `pnpm build`. To push compiled templates to the production
Supabase project, run manually:

```bash
SUPABASE_ACCESS_TOKEN=sbp_... SUPABASE_PROJECT_ID=itxysfxdkicwkqtsuilv pnpm push:emails
```

Never automate this in CI. Email template changes break authentication flows if
deployed incorrectly and are not easily rolled back.

Go template variables (`{{ .ConfirmationURL }}`, `{{ .SiteURL }}`) pass through
MJML v4 href attributes unchanged — this was a v3 bug, fixed in v4.0.0-beta.2
(mjmlio/mjml#664). `{{ .Token }}` is intentionally excluded from all templates
(no `/verify` page exists to enter the code).

## Auth user seeding — lessons learned

For GoTrue (Supabase Auth) to accept a seeded user for magic link / OTP:

1. **`instance_id` and `aud` must be set** — GoTrue's `FindUserByEmailAndAudience`
   query filters by both. NULL values mean the user is never found, returning
   `otp_disabled` ("Signups not allowed for otp").
   - `instance_id = '00000000-0000-0000-0000-000000000000'` (all zeros = local instance)
   - `aud = 'authenticated'`

2. **Token columns must be empty strings, not NULL** — GoTrue's Go scanner
   cannot convert NULL to string for `confirmation_token`, `recovery_token`,
   `email_change_token_new`, `email_change`. Produces "Database error finding user".
   Set all to `''`.

3. **`auth.identities` is required** — Without a matching identity row (`provider = 'email'`,
   `provider_id = email`), GoTrue cannot process OTP requests.

4. **pgTAP tests do not need any of the above** — pgTAP RLS tests use
   `set local request.jwt.claims` to simulate authentication and never call GoTrue.
   pgTAP fixture inserts only need `id` and `email` in `auth.users`.

5. **For application-level testing**, create users via `supabase.auth.admin.createUser()`
   (the JS admin client), not direct SQL. GoTrue sets up all required fields correctly.

## pgTAP test independence

Every test file is self-contained — fixture data is set up within each
`begin;...rollback;` transaction and rolled back automatically. Tests pass
whether or not the dev seed has been applied.

Do not add test fixture setup to seed files. Seeds are for dev convenience only.

## Storage

Two buckets are defined in `config.toml`:

### `avatars` — public, 2 MB, JPEG/PNG/WebP

User profile photos. One file per user: `{user_id}/avatar.{ext}`.

- Uploads are server-side only (account page action).
- Use `createAdminClient()` for uploads (upsert: true overwrites any existing avatar).
- Public bucket — served via `getPublicUrl(path)`. Append `?v={Date.now()}` to bust
  browser cache after upload.
- On account deletion, remove all three extension variants explicitly:
  `{user_id}/avatar.jpg`, `{user_id}/avatar.png`, `{user_id}/avatar.webp`.

### `recap-photos` — private, 5 MB, JPEG/PNG/WebP/GIF

Event recap photos. Path convention: `{event_id}/{photo_uuid}.{ext}`.

- Photo uploads are server-side only — never upload directly from the browser.
- Use `createAdminClient()` for uploads (service role bypasses storage RLS).
- Public photos → `getPublicUrl(path)`. Private photos → `createSignedUrl(path, 3600)`.

## Running tests locally

```bash
supabase db reset          # apply migrations + seeds
supabase test db           # run all pgTAP tests
```

Both commands require Docker Desktop to be running.
