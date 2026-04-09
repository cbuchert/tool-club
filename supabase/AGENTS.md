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

## Seed conventions

- `seeds/test_users.sql` inserts into both `auth.users` AND `public.users`.
  Do not change the fixed UUIDs — they are load-bearing in pgTAP assertions:
  - member: `00000000-0000-0000-0000-000000000001`
  - admin: `00000000-0000-0000-0000-000000000002`
- `seeds/dev_data.ts` is a Faker-based script for realistic local dev data.
  Run with `pnpm seed`. Uses the Supabase JS client (requires local stack running).
  **Note:** this file is a stub from the bootstrap phase and has not been updated
  for the current schema. Update it before relying on it for dev seeding.
- Seeds load in glob order (`seeds/*.sql`). The test_users seed runs before
  dev_data because SQL files sort before `.ts` — but dev_data.ts is a script,
  not a SQL seed, so there is no conflict.

## Running tests locally

```bash
supabase db reset          # apply migrations + seeds
supabase test db           # run all pgTAP tests
```

Both commands require Docker Desktop to be running.
