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
├── routes/            # SvelteKit file-based routes
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
  sign-out (`/signout`), and any endpoint consumed by a non-browser client.
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
- If a layout pattern appears in 2+ pages, extract it as a component.
- Components use Svelte 5 runes syntax (`$props()`, `$derived()`, `$state()`).
- No `export let` prop syntax — use `$props()`.

## Environment variables

- Import env vars from `$lib/server/env.ts` (validated at build time).
  Never read `process.env` or `$env/static/private` directly in app code.
- The validated env schema currently requires:
  - `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY` (client + server)
  - `SUPABASE_SERVICE_ROLE_KEY` (server only)
