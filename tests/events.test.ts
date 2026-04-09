/**
 * Events E2E tests.
 *
 * Covers TODO §13:
 *   - Events: member sees published events, not drafts
 *   - Events: RSVP yes → count increments → RSVP no → count decrements
 *   - Events: capacity enforcement (Going button disabled when full)
 *
 * Uses `memberPage` and `adminPage` fixtures from fixtures.ts — pages that
 * start pre-authenticated via saved storage state from auth.setup.ts.
 */
import { test, expect } from './fixtures';
import { adminClient, ADMIN_ID, MEMBER_ID } from './helpers';

// ── Visibility ────────────────────────────────────────────────────────────────

test.describe('event visibility', () => {
	let draftEventId: string;
	let draftEventTitle: string;

	test.beforeAll(async () => {
		const { data } = await adminClient()
			.from('events')
			.select('id, title')
			.eq('status', 'draft')
			.limit(1)
			.maybeSingle();
		if (!data) throw new Error('No draft event in seed. Run `pnpm seed`.');
		draftEventId = data.id;
		draftEventTitle = data.title;
	});

	test('member sees at least one published event on /events', async ({ memberPage }) => {
		await memberPage.goto('/events');
		// At least one event card link is visible
		await expect(memberPage.locator('a[href^="/events/"]').first()).toBeVisible();
	});

	test('draft event returns 404 for a member', async ({ memberPage }) => {
		const response = await memberPage.goto(`/events/${draftEventId}`);
		expect(response?.status()).toBe(404);
		// The draft event title should not appear anywhere on the page
		await expect(memberPage.getByText(draftEventTitle)).not.toBeVisible();
	});
});

// ── RSVP ─────────────────────────────────────────────────────────────────────

test.describe('RSVP toggle', () => {
	let eventId: string;

	test.beforeAll(async () => {
		const { data } = await adminClient()
			.from('events')
			.insert({
				title: '[test] RSVP toggle',
				status: 'published',
				starts_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
				host_name: 'Test Host',
			})
			.select('id')
			.single();
		if (!data) throw new Error('Failed to create test event');
		eventId = data.id;
	});

	test.afterAll(async () => {
		await adminClient().from('events').delete().eq('id', eventId);
	});

	test('RSVP yes → member name appears; RSVP no → member name disappears', async ({
		memberPage,
	}) => {
		await memberPage.goto(`/events/${eventId}`);
		await expect(memberPage.getByText('Are you going?')).toBeVisible();

		const attendees = memberPage.getByTestId('attendees');

		// RSVP Going — member's name appears in the attendee list
		await memberPage.getByRole('button', { name: 'Going' }).click();
		await expect(attendees.getByText('Jordan Park')).toBeVisible();

		// RSVP Can't make it — member's name disappears from the attendee list
		await memberPage.getByRole('button', { name: "Can't make it" }).click();
		await expect(attendees).not.toBeVisible(); // list hides when 0 attendees
	});
});

// ── Capacity enforcement ──────────────────────────────────────────────────────

test.describe('capacity enforcement', () => {
	let eventId: string;

	test.beforeAll(async () => {
		const admin = adminClient();

		// Create a published event with capacity 1
		const { data } = await admin
			.from('events')
			.insert({
				title: '[test] Capacity enforcement',
				status: 'published',
				starts_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
				host_name: 'Test Host',
				capacity: 1,
			})
			.select('id')
			.single();
		if (!data) throw new Error('Failed to create test event');
		eventId = data.id;

		// Admin takes the one spot via DB — fills capacity without going through UI
		await admin.from('rsvps').insert({ event_id: eventId, user_id: ADMIN_ID, response: 'yes' });
	});

	test.afterAll(async () => {
		await adminClient().from('events').delete().eq('id', eventId);
	});

	test('Going button is disabled and full message shown when event is at capacity', async ({
		memberPage,
	}) => {
		await memberPage.goto(`/events/${eventId}`);
		await expect(memberPage.getByText(/This event is full/)).toBeVisible();
		await expect(memberPage.getByRole('button', { name: 'Going' })).toBeDisabled();
	});
});
