# AGENTS.md — src/

This directory is the SvelteKit application.
Read this file before touching anything in `src/`.

---

## Directory structure

```
src/
├── lib/
│   ├── server/        # Server-only modules — never import in +page.ts or components
│   │   ├── db.ts      # Supabase clients (createServerClient, createAdminClient)
│   │   └── env.ts     # Validated env schema (Zod + @t3-oss/env-core)
│   ├── components/    # Shared Svelte components (AuthShell, etc.)
│   ├── schemas/       # Zod form schemas — shared by TanStack Form + server actions
│   ├── utils/         # Shared pure utilities with unit tests (no server imports)
│   └── temporal.ts    # Temporal polyfill re-export + date helpers
├── routes/
│   ├── cron/          # Vercel cron job endpoints (GET, service-role, CRON_SECRET-guarded)
│   └── ...            # All other SvelteKit file-based routes
├── app.css            # Tailwind import, @theme tokens, :root --tc-* aliases, html base styles
├── app.html           # HTML shell — font <link> tags live here
└── app.d.ts           # TypeScript ambient types for locals, PageData, etc.
```

`$content` alias (defined in `svelte.config.js` `kit.alias`) maps to the root
`content/` directory for mdsvex content files.

---

## Routing conventions

- `+page.server.ts` for every load function that touches the DB or needs auth.
  Never query the DB in `+page.ts` or inside a component.
- `+page.server.ts` form actions for all mutations. No client-side fetch to API
  routes for form submissions.
- `+server.ts` only for: RSS/iCal feed endpoints, auth callback (`/auth/callback`),
  sign-out (`/signout`), Vercel cron jobs (`/cron/*`), and any endpoint consumed
  by a non-browser client.
- `$lib/server/` is server-only. SvelteKit will error if you import it in a
  `+page.ts` or component.

## Auth conventions

- `hooks.server.ts` calls `supabase.auth.getUser()` — never `getSession()`.
  `getSession()` reads the cookie without server validation and can be spoofed.
- `locals.user` is the verified Supabase `User` object (or null).
- `locals.session` is populated only when `user` is non-null.
- Never trust a user ID from form data or query params. Always use `locals.user.id`.
- The root `+layout.server.ts` enforces the auth guard and fetches `public.users`
  profile (display_name, role) for the shell. Public routes bypass the guard.
- Public routes: `/`, `/signin`, `/auth/callback`, `/join/[token]`, `/feed/public`.

## Mobile-first

**Always build mobile-first.** Base styles target the smallest viewport. Use `sm:`,
`md:` etc. to layer in larger-screen behaviour. A "responsive pass" after the fact is
a code smell — if it needs one, the base styles were written desktop-first.

Practical rules:

- Padding/spacing defaults should be tight (e.g. `p-4`); loosen at `sm:` (`sm:p-6`).
- Flex layouts that would be crowded at 390px need structural fixes, not breakpoint hacks.
  Move badges/secondary elements inside the content column rather than as siblings that
  steal horizontal space from the title.
- Test at 390px (iPhone SE) and 640px (breakpoint boundary) before calling anything done.
- The shell breakpoint is 40rem (640px): sidebar shows above, mobile nav shows below.

## CSS and styling conventions

- **Always use Tailwind utility classes.** No raw CSS in `app.css` for component
  patterns.
- **`src/app.css` contains only:** Tailwind import, `@theme` tokens, `:root`
  `--tc-*` aliases, and base `html` element styles (font-size, background, color,
  font-family). No component-level CSS classes.
- **Scoped `<style>` blocks** are acceptable for styles that cannot be expressed
  cleanly with utilities (transitions, pseudo-elements, third-party overrides).
  All values must use `rem`. Use `--tc-*` aliases for token references.
- **Never add global CSS classes** to `app.css`. Extract a shared Svelte component
  in `$lib/components/` instead.
- **`px` is only acceptable** for hairline borders (`0.5px solid`) where `rem`
  would not render correctly.
- The prototype (`docs/prototype.html`) uses `px` and flat CSS classes — treat it
  as visual reference only. Translate design intent into Tailwind utilities.

## TanStack Form + SvelteKit — known issue

**Do not use `fetch('?/default', ...)` for form action submissions.**
Use `fetch('/page-path', ...)` (the full page path) instead.

The `?/actionName` URL pattern triggers SvelteKit's JavaScript client action
path, which re-runs load functions and serializes the full page response after
the action completes. This causes Svelte 5 to re-render the page component
inside a reactive `branch`. TanStack Form calls `onMount` internally during
`createForm()`, and `onMount` is forbidden inside a Svelte 5 reactive branch —
it throws `lifecycle_outside_component`.

The full page path (`POST /signin`) uses SvelteKit's regular form submission
path, which does not trigger the reactive re-render.

Additionally, **do not call `applyAction`** from inside TanStack Form's
`onSubmit`. Handle the response manually in local `$state` instead. `applyAction`
updates `$page`, which triggers reactive re-renders and causes the same issue.

```typescript
// ✓ Correct
const response = await fetch('/signin', { method: 'POST', body: formData });
if (response.ok) {
	const result = deserialize(await response.text());
	if (result.type === 'success') {
		/* handle locally */
	}
}

// ✗ Wrong — triggers lifecycle_outside_component
const response = await fetch('?/default', { method: 'POST', body: formData });
await applyAction(deserialize(await response.text()));
```

## Page data refresh after mutations

After a successful action via bare `fetch` + `deserialize`, use `invalidateAll()`
from `$app/navigation` to re-run all load functions and update page data. Do NOT
use `applyAction` for this — it is designed for `use:enhance` forms and behaves
unreliably with bare fetch in Svelte 5 reactive branches.

```typescript
import { invalidateAll } from '$app/navigation';

const res = await fetch(`/events/${id}?/rsvp`, { method: 'POST', body: fd });
const result = deserialize(await res.text());
if (result.type === 'failure') error = result.data?.error;
else await invalidateAll(); // re-runs load, updates data reactive variable
```

`applyAction` is only appropriate inside `use:enhance` callbacks.

## Form conventions

- **TanStack Form** (`@tanstack/svelte-form`) handles client-side field validation and
  form state. Create forms with `createForm()` and use Zod schemas as validators via
  Standard Schema integration.
- **SvelteKit actions** (`+page.server.ts`) handle server-side validation and mutations.
  Always re-validate on the server — never trust client-side validation alone.
- **Submission flow**: TanStack's `onSubmit` posts via `fetch('/page-path', ...)`.
  Handle the response manually in local `$state` — do NOT call `applyAction` or use
  `fetch('?/actionName', ...)`. See the TanStack Form + SvelteKit known issue section
  above for the full explanation.
- **Do not use** `use:enhance` on TanStack-managed forms — they handle submission
  themselves. `use:enhance` is only for forms without TanStack Form.
- Zod schemas in `src/lib/schemas/` are shared between client validation (TanStack)
  and server validation (actions). Define the schema once, use it in both places.

## Component conventions

- Shared UI primitives live in `$lib/components/`.
- **If a pattern appears in 2+ pages, extract it as a component.** Do not copy-paste
  Tailwind class strings across routes — a change to the pattern should be one edit.
- Components use Svelte 5 runes syntax (`$props()`, `$derived()`, `$state()`).
- No `export let` prop syntax — use `$props()`.

### `$derived` vs `$derived(() => fn)` — Svelte 5 gotcha

Simple expressions use `$derived(expr)`. When you need imperative logic (loops,
early returns, accumulators), wrap in a function: `$derived(() => { ... return value; })`.
The result is called as `groupedData()` in the template — it is a getter, not a value.

```typescript
// ✓ For complex grouped/accumulated data
const grouped = $derived(() => {
	const result: Group[] = [];
	for (const item of items) { ... }
	return result;
});
// In template: {#each grouped() as g}

// ✓ For simple expressions
const count = $derived(items.filter((i) => i.active).length);
// In template: {count}
```

Do not use `$derived(() => fn)` when a simple expression works — the function form
is only for logic that cannot be expressed as a single expression.

Current components (add to this list when you create a new one):

| Component   | Purpose                                                                             |
| ----------- | ----------------------------------------------------------------------------------- |
| `AuthShell` | Centered full-height wrapper with "Tool Club" wordmark                              |
| `Avatar`    | Profile photo or initials fallback — `name` + `avatarUrl?` + `size` (sm/md/lg)      |
| `Badge`     | Status pill — `variant` (going/open/full/planned/past/closed/no) + optional `label` |
| `Topbar`    | Sticky page header — `left` snippet required, `right` optional                      |

## Markdown rendering

Server-rendered markdown (from `marked()`) is injected with `{@html}`. Apply the
`prose` Tailwind utility to the container to style the inner HTML elements:

```svelte
<div class="prose">
	{@html bodyHtml}
</div>
```

`prose` is defined as a `@utility` in `src/app.css`. It styles `p`, `h1–h3`,
`ul`, `ol`, `li`, `strong`, `a`, `code`, `pre`, `blockquote` using `--tc-*` tokens.
Do not use `@tailwindcss/typography` — the custom utility is intentional.

Always add a "Markdown supported" hint near markdown-accepting textareas:

```svelte
<div class="flex items-baseline justify-between mb-1.5">
	<label ...>Body</label>
	<span class="font-mono text-[0.6rem] text-tc-hint">Markdown supported</span>
</div>
```

## Utils

`src/lib/utils/` contains pure, server-import-free utilities:

| File             | Purpose                                                                     |
| ---------------- | --------------------------------------------------------------------------- |
| `events.ts`      | `cardDay`, `cardMonth`, `cardMeta`, `initials` — event card display helpers |
| `suggestions.ts` | `isVotingOpen`, `formatVotingCloses` — suggestion state/display helpers     |
| `datetime.ts`    | Admin event form datetime helpers — see below                               |

### `datetime.ts` — admin event form conventions

`EVENT_TIMEZONE = 'America/Denver'` is hardcoded as the community's local timezone
(Salt Lake City). All event start/end times are stored in UTC and displayed in Denver
time.

HTML `<input type="datetime-local">` values have no timezone info. The helpers
`toDatetimeLocal(utcTs)` and `fromDatetimeLocal(localStr)` convert between UTC and
the Denver timezone for the admin event form.

The `links` field is stored as `jsonb` (`{label, url}[]`). In the admin form it is
edited as a textarea with one `Label | URL` per line. `linksToText` and `parseLinks`
handle serialization/deserialization.

---

## E2E tests

E2E tests live in `tests/`. The shared helper module is `tests/helpers.ts`.

### `tests/helpers.ts`

Exports:

| Export                  | Purpose                                                                                                                                                                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `signInAs(page, email)` | Signs in via the real `/signin` form → Mailpit magic link. **Must use the real form** so the server sets the PKCE `code_verifier` cookie — navigating directly to a generated link without this cookie will fail `exchangeCodeForSession`. |
| `deleteAllMail()`       | Clears Mailpit via `DELETE /api/v1/messages` before triggering an OTP.                                                                                                                                                                     |
| `adminClient()`         | Supabase client with service role key — for DB setup/teardown in tests.                                                                                                                                                                    |
| `BASE`                  | `http://localhost:5173`                                                                                                                                                                                                                    |
| `MAILPIT`               | `http://127.0.0.1:54324`                                                                                                                                                                                                                   |
| `MEMBER_ID`             | Fixed UUID from `supabase/seeds/test_users.sql` for the test member.                                                                                                                                                                       |
| `ADMIN_ID`              | Fixed UUID for the test admin.                                                                                                                                                                                                             |
| `MEMBER_EMAIL`          | `member@test.toolclub`                                                                                                                                                                                                                     |
| `ADMIN_EMAIL`           | `admin@test.toolclub`                                                                                                                                                                                                                      |

**Mailpit API note:** The `/api/v1/message/{id}/body.html` endpoint returns empty
locally. Read the magic link from the full message JSON at `/api/v1/message/{id}`
(`.HTML` field contains the anchor href).

### Ad-hoc browser validation (when Playwright MCP is unavailable)

When the Playwright browser MCP server crashes or is unavailable, use a throwaway
`npx tsx` script at the project root (where `node_modules` are available):

```typescript
// validate_something.ts  — delete after use, never commit
import { chromium } from '@playwright/test';
import { signInAs, BASE } from './tests/helpers';

async function run() {
	const browser = await chromium.launch({ headless: true });
	const ctx = await browser.newContext();
	const page = await ctx.newPage();
	await signInAs(page, 'admin@test.toolclub');
	// ... your checks ...
	await browser.close();
}
run().catch((e) => {
	console.error('FAIL:', e.message);
	process.exit(1);
});
```

Run with: `npx tsx validate_something.ts`

**Key gotcha — sidebar Sign Out button:** `page.click('button[type="submit"]')` will
hit the sidebar's Sign Out form before the page's own submit button (it appears first
in DOM order). Always use `page.getByRole('button', { name: 'Button text' })` or
`button[data-action="..."]` attributes.

### Playwright config (`playwright.config.ts`)

Global timeouts are configured once and override all defaults — no inline
`{ timeout: N }` overrides are needed in test files:

| Setting              | Value      | Why                                                      |
| -------------------- | ---------- | -------------------------------------------------------- |
| `expect.timeout`     | 10 s       | Web-first assertions auto-retry until this expires       |
| `actionTimeout`      | 15 s       | Covers slow CI machines for click/fill/check             |
| `navigationTimeout`  | 30 s       | page.goto() and redirects                                |
| `timeout` (per test) | 60 s       | Wall-clock guard against infinite hangs                  |
| `retries`            | CI ? 1 : 0 | Absorbs one transient CI flake; zero locally for clarity |

Prefer `expect(locator).toBeVisible()` over `waitForLoadState('networkidle')` —
`networkidle` is a brittle signal that can trigger early or late depending on
background polling.

### Sharing constants between test files

Playwright raises "should not import test file" if a test file imports from
another test file. Put any shared constants (e.g. auth file paths) in a plain
`.ts` module (no `test`/`setup` calls) and import from there. See
`tests/auth.paths.ts` for the pattern.

### `getByLabel` with nested `<span>` children

`getByLabel('Title')` fails when the label contains nested elements like
`<span class="text-danger">*</span>`. Use `getByPlaceholder` or `locator('#id')`
instead — both are stable and avoid the text-matching ambiguity.

### No-browser tests (API / cron endpoints)

Not all Playwright tests need a browser. For pure HTTP endpoints (e.g. cron jobs),
use `fetch` + `adminClient()` directly — no `page` fixture required. Set up DB
state in `beforeAll`, call the endpoint once, then assert DB state in individual
`test()` blocks. See `tests/cron.test.ts` for the pattern.

---

## Commit discipline

One logical change per commit. If a commit message needs "and" to describe what it
does, split the commit. Batch commits hide regressions and make targeted reverts
expensive. Examples of correct scope:

- `feat: extract Avatar component` ← one component
- `refactor: wire Avatar into events pages` ← one set of pages
- `fix: mobile nav flex-direction bug` ← one bug

## Environment variables

- Import env vars from `$lib/server/env.ts` (validated at build time).
  Never read `process.env` or `$env/static/private` directly in app code.
- The validated env schema currently requires:
  - `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY` (client + server)
  - `SUPABASE_SERVICE_ROLE_KEY` (server only)
- **Exception — `CRON_SECRET`:** cron handlers read `process.env.CRON_SECRET`
  directly at request time (not through `env.ts`). This is intentional: the var
  is optional in local dev (the auth check is skipped when absent), so adding it
  to the Zod schema would break local builds. Do not move it to `env.ts`.
