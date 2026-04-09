import { createHonoApp } from '$lib/server/hono';
import type { RequestHandler } from '@sveltejs/kit';

const app = createHonoApp();

// SvelteKit has already resolved the route; match any path that reaches here.
app.get('*', (c) => {
	return c.body(
		`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Tool Club</title>
    <link>https://toolclub.app</link>
    <description>Upcoming events from Tool Club.</description>
  </channel>
</rss>`,
		200,
		{ 'Content-Type': 'application/rss+xml; charset=utf-8' }
	);
});

export const GET: RequestHandler = ({ request }) => app.fetch(request);
