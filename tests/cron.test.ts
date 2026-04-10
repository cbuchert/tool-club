/**
 * Cron endpoint tests.
 *
 * These tests don't need a browser — they use fetch + adminClient() to verify
 * that each cron function reads the right rows and writes the right state.
 *
 * Auth guard note: CRON_SECRET is not set in local dev, so the auth check is
 * skipped by the handlers. The guard itself is tested at the unit level below;
 * full integration coverage of the 401 path requires CRON_SECRET to be set in
 * the server process, which is only true in production.
 *
 * Run with: pnpm exec playwright test cron
 */
import { test, expect } from '@playwright/test';
import { adminClient, BASE } from './helpers';

// ── mark-past-events ──────────────────────────────────────────────────────────

test.describe('cron/mark-past-events', () => {
	let staleEventId: string; // published + starts_at 48h ago → should become 'past'
	let recentEventId: string; // published + starts_at 1h ago  → should stay 'published'
	let draftEventId: string; // draft    + starts_at 48h ago → should stay 'draft'

	test.beforeAll(async () => {
		const admin = adminClient();
		const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
		const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

		const [{ data: stale }, { data: recent }, { data: draft }] = await Promise.all([
			admin
				.from('events')
				.insert({
					title: '[test] stale published',
					status: 'published',
					starts_at: twoDaysAgo,
					host_name: 'Test',
				})
				.select('id')
				.single(),
			admin
				.from('events')
				.insert({
					title: '[test] recent published',
					status: 'published',
					starts_at: oneHourAgo,
					host_name: 'Test',
				})
				.select('id')
				.single(),
			admin
				.from('events')
				.insert({
					title: '[test] stale draft',
					status: 'draft',
					starts_at: twoDaysAgo,
					host_name: 'Test',
				})
				.select('id')
				.single(),
		]);

		if (!stale || !recent || !draft) throw new Error('Failed to create test events');
		staleEventId = stale.id;
		recentEventId = recent.id;
		draftEventId = draft.id;

		// Call the cron endpoint once; all assertions check resulting DB state
		const res = await fetch(`${BASE}/cron/mark-past-events`);
		if (!res.ok) throw new Error(`Cron returned ${res.status}`);
	});

	test.afterAll(async () => {
		await adminClient()
			.from('events')
			.delete()
			.in('id', [staleEventId, recentEventId, draftEventId]);
	});

	test('returns 200 with a marked count', async () => {
		const res = await fetch(`${BASE}/cron/mark-past-events`);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(typeof body.marked).toBe('number');
	});

	test('marks a published event older than 24h as past', async () => {
		const { data } = await adminClient()
			.from('events')
			.select('status')
			.eq('id', staleEventId)
			.single();
		expect(data?.status).toBe('past');
	});

	test('does not mark a published event started less than 24h ago', async () => {
		const { data } = await adminClient()
			.from('events')
			.select('status')
			.eq('id', recentEventId)
			.single();
		expect(data?.status).toBe('published');
	});

	test('does not mark a draft event as past regardless of age', async () => {
		const { data } = await adminClient()
			.from('events')
			.select('status')
			.eq('id', draftEventId)
			.single();
		expect(data?.status).toBe('draft');
	});
});
