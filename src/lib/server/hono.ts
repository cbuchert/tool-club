import { Hono } from 'hono';

/**
 * Base Hono app factory for use in SvelteKit +server.ts routes.
 *
 * Usage in a +server.ts:
 *   import { createHonoApp } from '$lib/server/hono';
 *   const app = createHonoApp();
 *   app.get('/', (c) => c.text('hello'));
 *   export const GET = ({ request }) => app.fetch(request);
 */
export function createHonoApp() {
	return new Hono();
}
