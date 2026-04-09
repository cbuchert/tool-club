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
│   ├── components/    # Shared Svelte components
│   └── utils/         # Shared pure utilities (no server imports)
├── routes/            # SvelteKit file-based routes
├── app.css            # Tailwind import, @theme tokens, :root aliases only
├── app.html           # HTML shell — font links live here
└── app.d.ts           # TypeScript ambient types for locals, PageData, etc.
```

---

## Routing conventions

- `+page.server.ts` for every load function that touches the DB or needs auth.
  Never query the DB in `+page.ts` or inside a component.
- `+page.server.ts` form actions for all mutations. No client-side fetch to API
  routes for form submissions.
- `+server.ts` only for: RSS/iCal feed endpoints, auth callback, webhook receivers,
  and any endpoint consumed by a non-browser client.
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
  `--tc-*` aliases, `html { font-size: 16px; }`.
- **Scoped `<style>` blocks** are acceptable for styles that cannot be expressed
  cleanly with utilities (transitions, pseudo-elements, third-party overrides).
  All values must use `rem`. Use `--tc-*` aliases for token references.
- **Never add global CSS classes** to `app.css`. Extract a shared Svelte component
  in `$lib/components/` instead.
- **`px` is only acceptable** for hairline borders (`0.5px solid`) where `rem`
  would not render correctly.
- The prototype (`docs/prototype.html`) uses `px` and flat CSS classes — treat it
  as visual reference only. Translate design intent into Tailwind utilities.

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
