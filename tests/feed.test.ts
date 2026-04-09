import { test, expect } from '@playwright/test';

test('GET /feed/public returns 200 with RSS content-type', async ({ request }) => {
	const response = await request.get('/feed/public');
	expect(response.status()).toBe(200);
	expect(response.headers()['content-type']).toContain('application/rss+xml');
});
