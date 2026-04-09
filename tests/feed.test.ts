/**
 * E2E tests for feed endpoints.
 *
 * Requires: local Supabase running + `pnpm seed` applied.
 * The member feed token is fetched from the DB in beforeAll so tests are not
 * coupled to whatever random value Faker generated at seed time.
 */
import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Load .env.local so we have the local Supabase credentials
const envPath = resolve(process.cwd(), '.env.local');
if (existsSync(envPath)) process.loadEnvFile(envPath);

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

// Fixed UUID from test_users.sql
const MEMBER_ID = '00000000-0000-0000-0000-000000000001';

let validToken: string;

test.beforeAll(async () => {
	const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
		auth: { autoRefreshToken: false, persistSession: false },
	});

	const { data } = await admin
		.from('feed_tokens')
		.select('token')
		.eq('user_id', MEMBER_ID)
		.maybeSingle();

	if (!data?.token) {
		throw new Error('No feed token found for the test member. Run `pnpm seed` before E2E tests.');
	}

	validToken = data.token;
});

// ── Public feed ───────────────────────────────────────────────────────────────

test.describe('GET /feed/public', () => {
	test('returns 200 with RSS content-type', async ({ request }) => {
		const res = await request.get('/feed/public');
		expect(res.status()).toBe(200);
		expect(res.headers()['content-type']).toContain('application/rss+xml');
	});

	test('returns valid RSS XML structure', async ({ request }) => {
		const body = await (await request.get('/feed/public')).text();
		expect(body).toContain('<?xml version="1.0" encoding="UTF-8"?>');
		expect(body).toContain('<rss version="2.0"');
		expect(body).toContain('<channel>');
		expect(body).toContain('<title>Tool Club</title>');
		expect(body).toContain('</rss>');
	});

	test('is beautifully indented', async ({ request }) => {
		const body = await (await request.get('/feed/public')).text();
		expect(body).toContain('\n  <channel>');
		expect(body).toContain('\n    <item>');
	});

	test('items contain title and pubDate', async ({ request }) => {
		const body = await (await request.get('/feed/public')).text();
		expect(body).toContain('<title>');
		expect(body).toContain('<pubDate>');
	});

	test('items do NOT contain location or body (spec: titles + dates only)', async ({ request }) => {
		const body = await (await request.get('/feed/public')).text();
		// Slice to only the items section so we exclude the channel <description>
		const itemsSection = body.includes('<item>') ? body.slice(body.indexOf('<item>')) : '';
		expect(itemsSection).not.toContain('<description>');
		expect(itemsSection).not.toContain('<location>');
	});

	test('requires no authentication', async ({ request }) => {
		// No token, no session — must still return 200
		const res = await request.get('/feed/public');
		expect(res.status()).toBe(200);
	});
});

// ── Private RSS feed ──────────────────────────────────────────────────────────

test.describe('GET /feed/rss', () => {
	test('returns 401 with no token', async ({ request }) => {
		expect((await request.get('/feed/rss')).status()).toBe(401);
	});

	test('returns 401 with an invalid token', async ({ request }) => {
		expect((await request.get('/feed/rss?token=not-a-real-token')).status()).toBe(401);
	});

	test('returns 401 with a plausible but non-existent token', async ({ request }) => {
		expect((await request.get(`/feed/rss?token=${'a'.repeat(32)}`)).status()).toBe(401);
	});

	test('returns 200 with a valid token', async ({ request }) => {
		expect((await request.get(`/feed/rss?token=${validToken}`)).status()).toBe(200);
	});

	test('returns RSS content-type with a valid token', async ({ request }) => {
		const res = await request.get(`/feed/rss?token=${validToken}`);
		expect(res.headers()['content-type']).toContain('application/rss+xml');
	});

	test('is beautifully indented with a valid token', async ({ request }) => {
		const body = await (await request.get(`/feed/rss?token=${validToken}`)).text();
		expect(body).toContain('\n  <channel>');
		expect(body).toContain('\n    <item>');
	});

	test('Cache-Control is private', async ({ request }) => {
		const res = await request.get(`/feed/rss?token=${validToken}`);
		expect(res.headers()['cache-control']).toContain('private');
	});
});

// ── Private iCal feed ─────────────────────────────────────────────────────────

test.describe('GET /feed/ical/toolclub.ics', () => {
	test('returns 401 with no token', async ({ request }) => {
		expect((await request.get('/feed/ical/toolclub.ics')).status()).toBe(401);
	});

	test('returns 401 with an invalid token', async ({ request }) => {
		expect((await request.get('/feed/ical/toolclub.ics?token=bogus')).status()).toBe(401);
	});

	test('returns 401 with a plausible but non-existent token', async ({ request }) => {
		expect((await request.get(`/feed/ical/toolclub.ics?token=${'b'.repeat(32)}`)).status()).toBe(
			401
		);
	});

	test('returns 200 with a valid token', async ({ request }) => {
		expect((await request.get(`/feed/ical/toolclub.ics?token=${validToken}`)).status()).toBe(200);
	});

	test('returns iCal content-type with a valid token', async ({ request }) => {
		const res = await request.get(`/feed/ical/toolclub.ics?token=${validToken}`);
		expect(res.headers()['content-type']).toContain('text/calendar');
	});

	test('returns a valid VCALENDAR structure', async ({ request }) => {
		const body = await (await request.get(`/feed/ical/toolclub.ics?token=${validToken}`)).text();
		expect(body).toContain('BEGIN:VCALENDAR');
		expect(body).toContain('VERSION:2.0');
		expect(body).toContain('END:VCALENDAR');
	});

	test('VEVENT entries contain required iCal fields', async ({ request }) => {
		const body = await (await request.get(`/feed/ical/toolclub.ics?token=${validToken}`)).text();
		expect(body).toContain('BEGIN:VEVENT');
		expect(body).toContain('DTSTART:');
		expect(body).toContain('SUMMARY:');
		expect(body).toContain('UID:');
		expect(body).toContain('END:VEVENT');
	});

	test('content-disposition is an attachment with .ics filename', async ({ request }) => {
		const res = await request.get(`/feed/ical/toolclub.ics?token=${validToken}`);
		const disposition = res.headers()['content-disposition'] ?? '';
		expect(disposition).toContain('attachment');
		expect(disposition).toContain('.ics');
	});

	test('Cache-Control is private', async ({ request }) => {
		const res = await request.get(`/feed/ical/toolclub.ics?token=${validToken}`);
		expect(res.headers()['cache-control']).toContain('private');
	});
});

// ── Cross-feed contract ───────────────────────────────────────────────────────

test.describe('feed content contract', () => {
	test('private RSS contains more detail than public RSS', async ({ request }) => {
		const [pub, priv] = await Promise.all([
			request.get('/feed/public').then((r) => r.text()),
			request.get(`/feed/rss?token=${validToken}`).then((r) => r.text()),
		]);
		expect(pub).toContain('<item>');
		expect(priv).toContain('<item>');
		// Private feed has more content (location, CDATA description, etc.)
		expect(priv.length).toBeGreaterThan(pub.length);
	});

	test('public RSS pubDate is RFC 2822 formatted', async ({ request }) => {
		const body = await (await request.get('/feed/public')).text();
		expect(body).toMatch(
			/<pubDate>(Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{2} \w{3} \d{4} \d{2}:\d{2}:\d{2} \+0000<\/pubDate>/
		);
	});

	test('iCal DTSTART is UTC ISO 8601 formatted', async ({ request }) => {
		const body = await (await request.get(`/feed/ical/toolclub.ics?token=${validToken}`)).text();
		expect(body).toMatch(/DTSTART:\d{8}T\d{6}Z/);
	});

	test('tokens are not interchangeable — one member cannot use another member token', async ({
		request,
	}) => {
		// A token that does not belong to the DB will be rejected
		const res = await request.get(`/feed/rss?token=completely-wrong-token`);
		expect(res.status()).toBe(401);
	});
});
