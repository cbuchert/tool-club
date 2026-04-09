# ARCHITECTURE.md — Tool Club

Last updated: 2026-04-09
Status: Authoritative. Update this file when any architectural decision changes.

---

## System overview

Tool Club is a SvelteKit application backed by Supabase (PostgreSQL + Auth + Storage)
and deployed on Vercel. It is a private, invite-only social app for a small community.
There is no separate API server. SvelteKit server routes and form actions are the
backend layer.

```mermaid
graph LR
  Browser -->|HTTPS| Vercel["Vercel (SvelteKit)"]
  Vercel -->|supabase-js server client| Supabase["Supabase (Postgres + Auth + Storage)"]
  Vercel -->|reads| Content["content/*.md (mdsvex)"]
  RSS["RSS/iCal clients"] -->|HTTPS| Vercel
  GHA["GitHub Actions"] -->|supabase db push| Supabase
  GHA -->|vercel deploy| Vercel
```

---

## Stack decisions

### SvelteKit

Chosen to build Svelte fluency through a real project. All routing, SSR, and server
logic lives here. No separate backend framework.

### Supabase

Single vendor for database (PostgreSQL), auth (magic link), and file storage.
Chosen over separate services (e.g. PlanetScale + Clerk + S3) to minimize integration
surface. Local development runs the full stack via `supabase start` (Docker required).

### Vercel

Hosts the SvelteKit app via `@sveltejs/adapter-vercel`. Cron jobs run as Vercel
Functions with cron triggers. The SvelteKit adapter handles SSR, edge functions,
and static assets.

### Supabase Auth (not Clerk or Auth.js)

Magic-link auth is a first-class Supabase Auth feature. Session is in the same system
as all data, enabling Row Level Security policies that reference `auth.uid()` directly.
No JWT bridging between vendors.

### mdsvex

Markdown content (landing page, about page) is processed by mdsvex at build time.
Content lives in `content/` as `.md` files. No CMS.

### Tailwind CSS v4

Tailwind v4 is used for styling. The v4 integration model differs significantly from
v3 — do not apply v3 patterns:

- Install via `@tailwindcss/vite` (Vite plugin), not PostCSS.
- No `tailwind.config.js`. Configuration is CSS-first via a `@theme` block in
  `src/app.css`.
- Import with `@import "tailwindcss"` in `src/app.css`.
- Design tokens are defined as CSS custom properties inside `@theme`. This makes them
  available both as Tailwind utilities and as raw `var(--tc-*)` values in component
  styles.
- Dark mode token overrides are defined in a standard `@media (prefers-color-scheme: dark)`
  block targeting `:root`, not inside `@theme`. `@theme` is for static token
  registration only.
- Do not add UnoCSS, Bootstrap, or any other CSS framework alongside Tailwind.

---

## Environment variables

All secrets are environment variables. Never hardcode.

| Variable                    | Used in         | Purpose                              |
| --------------------------- | --------------- | ------------------------------------ |
| `PUBLIC_SUPABASE_URL`       | Client + server | Supabase project URL                 |
| `PUBLIC_SUPABASE_ANON_KEY`  | Client + server | Supabase anon key (safe to expose)   |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only     | Bypass RLS for admin/cron operations |
| `VERCEL_TOKEN`              | CI only         | Vercel deploy from GitHub Actions    |

Note: `SUPABASE_JWT_SECRET` is not used. The app uses `@supabase/ssr` and never
verifies JWTs directly. The hosted project uses ECC P-256 asymmetric signing keys.

`PUBLIC_` prefix makes variables available client-side in SvelteKit. Non-prefixed
variables are server-only.

The service role key bypasses RLS. It is used only in:

- Cron job functions
- Admin-only server actions (with a secondary role check in application code)

Never use the service role key in a load function or action reachable by non-admins.

---

## Data model

```mermaid
erDiagram
  users {
    uuid id PK
    text display_name
    text email
    text avatar_url
    text role
    uuid invited_by FK
    timestamptz created_at
    timestamptz updated_at
  }
  invites {
    uuid id PK
    text token
    uuid invited_by FK
    text email
    uuid redeemed_by FK
    timestamptz expires_at
    timestamptz redeemed_at
    timestamptz created_at
    timestamptz updated_at
  }
  events {
    uuid id PK
    text title
    text status
    timestamptz starts_at
    timestamptz ends_at
    text location_name
    text address
    text body_md
    jsonb links
    int capacity
    text host_name
    uuid host_id FK
    uuid promoted_from_id FK
    timestamptz created_at
    timestamptz updated_at
  }
  rsvps {
    uuid id PK
    uuid event_id FK
    uuid user_id FK
    text response
    timestamptz created_at
    timestamptz updated_at
  }
  suggestions {
    uuid id PK
    uuid author_id FK
    text host_name
    text title
    text body_md
    text status
    timestamptz voting_closes_at
    uuid promoted_to_event_id FK
    timestamptz created_at
    timestamptz updated_at
  }
  votes {
    uuid id PK
    uuid suggestion_id FK
    uuid user_id FK
    timestamptz created_at
    timestamptz updated_at
  }
  comments {
    uuid id PK
    uuid suggestion_id FK
    uuid user_id FK
    text body
    timestamptz created_at
    timestamptz updated_at
  }
  recaps {
    uuid id PK
    uuid event_id FK
    uuid author_id FK
    text body_md
    timestamptz created_at
    timestamptz updated_at
  }
  photos {
    uuid id PK
    uuid recap_id FK
    uuid uploaded_by FK
    text storage_path
    bool is_public
    timestamptz created_at
    timestamptz updated_at
  }
  feed_tokens {
    uuid id PK
    uuid user_id FK
    text token
    timestamptz created_at
    timestamptz updated_at
  }

  users ||--o{ invites : "invited_by"
  users ||--o{ invites : "redeemed_by"
  users o|--o{ users : "invited_by"
  users |o--o{ events : "host (member)"
  users ||--o{ rsvps : "makes"
  users ||--o{ suggestions : "authors"
  users ||--o{ votes : "casts"
  users ||--o{ comments : "writes"
  users ||--o{ recaps : "authors"
  users ||--o{ photos : "uploads"
  users ||--o| feed_tokens : "has"
  events ||--o{ rsvps : "receives"
  events ||--o| recaps : "has"
  events }o--o| suggestions : "promoted_from"
  recaps ||--o{ photos : "contains"
  suggestions ||--o{ votes : "receives"
  suggestions ||--o{ comments : "receives"
  suggestions }o--o| events : "promoted_to"
```

### Key field notes

**users.role**: `member` or `admin`. Admins are set directly in the database. There
is no self-service role elevation. RLS prevents members from updating their own role.

**users.invited_by**: FK to users. Set at account creation time. Preserved even if
the inviter later deletes their account (the inviter row is anonymized, not deleted).

**events.host_name**: Required freeform text. Allows external (non-member) hosts.

**events.host_id**: Optional FK to users. Set when the host is a member. Enables the
"host can write recap" rule. Queried with a left join — `host_name` is the display
value, `host_id` is for permission checks.

**events.links**: `jsonb` array of `{label: string, url: string}` objects. Nullable,
defaults to `[]`.

**events.status**: `draft` | `published` | `past`. Drafts are not visible to members.
`past` is set by a cron job when `starts_at` is more than 24 hours ago.

**events.promoted_from_id**: FK to suggestions. Set when an event is created from a
suggestion. Paired with `suggestions.promoted_to_event_id` — both are set atomically
in the promote action.

**suggestions.host_name**: Freeform text. The member who proposed the suggestion
nominates a host by name. Not a FK — the nominee may or may not be a member.

**suggestions.promoted_to_event_id**: FK to events. Set when status becomes `planned`.
Paired with `events.promoted_from_id`.

**suggestions.status**: `open` | `planned` | `closed`. `planned` means it was promoted
to an event. Admin sets status.

**rsvps.response**: `yes` | `no`. No "maybe." Members can change their RSVP until
the event starts. One RSVP per (event, user) pair — enforced by unique constraint.

**invites.token**: Random string generated by the application. Forms the invite URL.
Single-use, expires after 30 days. `redeemed_by` is null until used. Revoking
hard-deletes the row.

**feed_tokens**: One per user (unique constraint on user_id). Regenerating deletes
the old row and inserts a new one. Token is a random string, not a JWT.

**photos.is_public**: Controls whether a photo appears in the public RSS feed.
Toggled by the event host after upload.

---

## Permission model

```mermaid
graph TD
  anon["Anonymous"] -->|can read| PublicFeed["Public RSS feed (event titles + dates only)"]
  anon -->|can view| Landing["Landing page"]
  anon -->|can use| InviteLink["Valid invite link"]

  member["Member"] -->|inherits| anon
  member -->|can read| Events["Published events"]
  member -->|can read| Suggestions["Suggestions"]
  member -->|can read| Recaps["Recaps + public photos"]
  member -->|can write| OwnRSVP["Own RSVP"]
  member -->|can write| OwnVote["Own vote"]
  member -->|can write| OwnComment["Own comment"]
  member -->|can write| OwnSuggestion["Own suggestion"]
  member -->|can write| OwnPhoto["Upload photo to any recap"]
  member -->|can write| OwnProfile["Own display name + avatar"]
  member -->|can generate| InviteGen["Invite links (1 pending max)"]

  host["Member (as event host)"] -->|inherits| member
  host -->|can write| OwnRecap["Recap for their event"]
  host -->|can toggle| PhotoVisibility["Photo visibility on their event"]

  admin["Admin"] -->|inherits| member
  admin -->|can write| AllEvents["All events (CRUD)"]
  admin -->|can write| AllSuggestions["All suggestions (status changes)"]
  admin -->|can read| AllRSVPs["All RSVPs including 'no'"]
  admin -->|can write| MemberStatus["Member suspension"]
  admin -->|can revoke| AnyInvite["Any invite"]
  admin -->|uses service role| CronOps["Cron operations"]
```

### RLS policy summary

| Table       | anon | member                                  | admin |
| ----------- | ---- | --------------------------------------- | ----- |
| users       | none | select (active members)                 | all   |
| events      | none | select where status=published           | all   |
| rsvps       | none | select yes-responses; insert/update own | all   |
| suggestions | none | select all; insert own                  | all   |
| votes       | none | select all; insert/delete own           | all   |
| comments    | none | select all; insert own                  | all   |
| recaps      | none | select all                              | all   |
| photos      | none | select public; insert own               | all   |
| invites     | none | insert own; select own                  | all   |
| feed_tokens | none | select/update own                       | all   |

"no" RSVP responses are readable only by admins and the RSVP owner.

---

## Routing structure

```
src/routes/
├── +layout.server.ts        # Loads session, passes to all routes
├── +layout.svelte           # Shell, nav, auth guard
├── +page.svelte             # Landing (public)
├── about/
│   └── +page.svelte         # About page (mdsvex, public)
├── signin/
│   └── +page.svelte         # Magic link request
├── auth/
│   └── callback/
│       └── +server.ts       # Supabase auth callback handler
├── join/
│   └── [token]/
│       └── +page.server.ts  # Invite validation + account setup
├── events/
│   ├── +page.server.ts      # Load published events
│   ├── +page.svelte
│   └── [id]/
│       ├── +page.server.ts  # Load event + RSVP state
│       ├── +page.svelte
│       └── recap/
│           └── +page.server.ts  # Recap form action (host only)
├── suggestions/
│   ├── +page.server.ts
│   ├── +page.svelte
│   └── [id]/
│       ├── +page.server.ts
│       └── +page.svelte
├── feed/
│   ├── rss/
│   │   └── +server.ts       # Private RSS feed (token auth)
│   ├── ical/
│   │   └── +server.ts       # Private iCal feed (token auth)
│   └── public/
│       └── +server.ts       # Public RSS (titles + dates only)
├── account/
│   ├── +page.server.ts
│   └── +page.svelte
└── admin/
    ├── +layout.server.ts    # Admin role guard
    ├── events/
    │   ├── +page.server.ts
    │   ├── +page.svelte
    │   └── [id]/
    │       ├── +page.server.ts
    │       └── +page.svelte
    └── members/
        ├── +page.server.ts
        └── +page.svelte
```

Auth guard lives in the root `+layout.server.ts`. Routes under `/admin/` have a
second guard in `admin/+layout.server.ts` that checks `users.role = 'admin'`.

---

## Auth flow

```mermaid
sequenceDiagram
  participant Browser
  participant SvelteKit
  participant SupabaseAuth

  Browser->>SvelteKit: POST /signin (email)
  SvelteKit->>SupabaseAuth: signInWithOtp(email)
  SupabaseAuth-->>Browser: Magic link email

  Browser->>SvelteKit: GET /auth/callback?token=...
  SvelteKit->>SupabaseAuth: exchangeCodeForSession(token)
  SupabaseAuth-->>SvelteKit: session + user
  SvelteKit->>SvelteKit: Check users table for profile
  alt New user (invite flow)
    SvelteKit-->>Browser: Redirect to /join/[invite_token] (setup)
  else Existing user
    SvelteKit-->>Browser: Redirect to /events
  end
```

Session is set as a cookie in `hooks.server.ts` via Supabase's `setSession`. Every
request passes through `hooks.server.ts`, which validates the session and sets
`locals.session` and `locals.user`.

---

## Invite flow

```mermaid
sequenceDiagram
  participant Member
  participant SvelteKit
  participant NewUser

  Member->>SvelteKit: Generate invite (POST /account)
  SvelteKit->>DB: Insert invite row (token, expires_at, invited_by)
  SvelteKit-->>Member: toolclub.app/join/[token]

  NewUser->>SvelteKit: GET /join/[token]
  SvelteKit->>DB: Validate invite (exists, not expired, not redeemed)
  alt Invalid
    SvelteKit-->>NewUser: Expired/redeemed error page
  else Valid
    SvelteKit-->>NewUser: Account setup form (email + display name)
  end

  NewUser->>SvelteKit: POST /join/[token] (email, display_name)
  SvelteKit->>SupabaseAuth: signInWithOtp(email)
  NewUser->>SvelteKit: GET /auth/callback (from email)
  SvelteKit->>DB: Create users row, mark invite redeemed
  SvelteKit-->>NewUser: Redirect to /events
```

Invite tokens are separate from auth tokens. The invite token gates account creation;
Supabase Auth handles the actual authentication.

---

## Feed and calendar architecture

Feed URLs are authenticated via a per-user token stored in `feed_tokens`. The token
is a random string passed as a query parameter, not a session cookie. This allows
RSS readers and calendar apps to subscribe without a browser session.

```
/feed/rss?token=mk_7f3a9c...     → Authenticated RSS (all events, recaps)
/feed/ical?token=mk_7f3a9c...    → Authenticated iCal (event dates + details)
/feed/public                     → Public RSS (titles + dates only, no auth)
```

Token regeneration invalidates existing subscriptions. This is surfaced clearly in
the UI before the user confirms.

Feed endpoints are `+server.ts` routes that return `Response` objects with
appropriate `Content-Type` headers (`application/rss+xml`, `text/calendar`).

---

## Cron jobs

Cron jobs run as Vercel Functions with cron triggers, configured in `vercel.json`.

| Job                | Schedule   | Action                                                                       |
| ------------------ | ---------- | ---------------------------------------------------------------------------- |
| `mark-past-events` | Every hour | Set `events.status = 'past'` where `starts_at < now() - interval '24 hours'` |
| `expire-invites`   | Daily      | Hard-delete invites where `expires_at < now()` and `redeemed_at is null`     |

Cron functions use the Supabase service role key. They are not reachable by members.

---

## File storage

Photos are stored in Supabase Storage. Bucket: `recap-photos`.

- Upload is performed server-side in a form action, not directly from the browser.
- Storage path: `{event_id}/{photo_id}_{filename}`
- Public photos are served via Supabase's public URL. Private photos require a
  signed URL generated server-side.
- The `photos.is_public` flag is toggled by the event host. Toggling re-renders
  the recap page; no immediate storage change is needed.

---

## CI/CD pipeline

```mermaid
graph TD
  Push["git push to main"] --> TestDB["job: test-db"]
  Push --> TestUnit["job: test-unit"]
  TestDB --> StartLocal["supabase db start (Docker)"]
  StartLocal --> RunPgTAP["supabase test db (pgTAP)"]
  RunPgTAP --> LinkProject["supabase link --project-ref"]
  LinkProject --> PushMigrations["supabase db push"]
  TestDB --> Gate["job: deploy-vercel (needs: test-db, test-unit)"]
  TestUnit --> Gate
  Gate --> Pull["vercel pull --environment=production"]
  Pull --> Build["vercel build --prod"]
  Build --> Deploy["vercel deploy --prebuilt --prod"]

  RunPgTAP -->|fail| Block["Deploy blocked"]
  PushMigrations -->|fail| Block
  TestUnit -->|fail| Block
```

The `needs: [test-db, test-unit]` dependency in GitHub Actions is the hard enforcement
gate. Vercel never receives a deploy trigger if pgTAP tests, unit tests, or migrations
fail. Vercel build env vars are stored in the Vercel project dashboard and pulled via
`vercel pull` — they are not duplicated as GitHub secrets.

---

## Local development

Prerequisites: Node.js 20+, Docker Desktop, Supabase CLI.

```bash
# Start local Supabase stack (Postgres, Auth, Storage, Studio)
supabase start

# Apply migrations and seed data
supabase db reset   # runs migrations + seeds/

# Seed with realistic dev data
pnpm seed

# Start SvelteKit dev server
pnpm dev

# Run DB tests
supabase test db

# Run unit tests
pnpm test:unit

# Run Playwright tests (requires local Supabase running)
pnpm test:e2e
```

Local Supabase runs on `localhost:54321` (API) and `localhost:54323` (Studio UI).
Environment variables for local dev live in `.env.local` (gitignored).

---

## Design system

Tailwind CSS v4 is used for styling. Tokens are defined as CSS custom properties in
a `@theme` block in `src/app.css`, which makes them available both as Tailwind
utilities (e.g. `bg-tc-surface`, `text-tc-muted`) and as raw `var(--tc-*)` references
in component `<style>` blocks.

```css
/* src/app.css */
@import 'tailwindcss';

@theme {
	--color-tc-bg: #ffffff;
	--color-tc-surface: #f5f4f0;
	--color-tc-border: rgba(0, 0, 0, 0.1);
	--color-tc-border-mid: rgba(0, 0, 0, 0.2);
	--color-tc-text: #1a1a18;
	--color-tc-muted: #5f5e5a;
	--color-tc-hint: #888780;
	--color-tc-accent: #3b6d11;
	--color-tc-accent-bg: #eaf3de;
	--color-tc-accent-text: #27500a;
	--color-tc-accent-border: #97c459;
	--color-tc-danger: #a32d2d;
	--color-tc-danger-bg: #fcebeb;
	--color-tc-danger-border: #f09595;

	--font-display: 'Fraunces', serif;
	--font-mono: 'DM Mono', monospace;
	--font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

@media (prefers-color-scheme: dark) {
	:root {
		--color-tc-bg: #1c1c1a;
		--color-tc-surface: #242422;
		/* ... remaining dark tokens ... */
	}
}
```

All token names use the `--tc-` prefix (color tokens use `--color-tc-` to integrate
with Tailwind's color system). Do not hardcode color values in components — use tokens.

Core token reference:

| Token                            | Purpose                           |
| -------------------------------- | --------------------------------- |
| `tc-bg`                          | Page background                   |
| `tc-surface`                     | Elevated surface (sidebar, cards) |
| `tc-border`                      | Subtle border                     |
| `tc-border-mid`                  | Stronger border, inputs           |
| `tc-text`                        | Primary text                      |
| `tc-muted`                       | Secondary text                    |
| `tc-hint`                        | Tertiary text, labels             |
| `tc-accent`                      | Primary action color (green)      |
| `tc-accent-bg / -text / -border` | Accent surface variants           |
| `tc-danger / -bg / -border`      | Destructive action                |

Typography:

- `font-display`: Fraunces (serif, headings)
- `font-mono`: DM Mono (labels, metadata, monospace UI)
- `font-sans`: System sans-serif (body, inputs)
