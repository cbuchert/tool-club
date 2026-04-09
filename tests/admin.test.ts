/**
 * Admin E2E tests.
 *
 * Covers TODO section 13:
 *   - Admin: publish a draft event → visible to members
 *   - Admin: promote suggestion → event created in draft
 *
 * Plus access control and member management smoke tests.
 *
 * Requires: local Supabase running + `pnpm seed` applied.
 *
 * Timeouts: all assertions use the global expect.timeout (10s) configured in
 * playwright.config.ts — no inline { timeout } overrides needed.
 * waitForLoadState('networkidle') is replaced with assertions against
 * specific visible content, which is more reliable and self-documenting.
 */
import { test, expect } from '@playwright/test';
import {
	signInAs,
	deleteAllMail,
	adminClient,
	BASE,
	MEMBER_ID,
	ADMIN_EMAIL,
	MEMBER_EMAIL,
} from './helpers';

// ── Data fixtures (resolved once in beforeAll) ────────────────────────────────

let draftEventId: string;
let draftEventTitle: string;
let openSuggestionId: string;

test.beforeAll(async () => {
	const admin = adminClient();

	const { data: draft } = await admin
		.from('events')
		.select('id, title')
		.eq('status', 'draft')
		.limit(1)
		.maybeSingle();
	if (!draft) throw new Error('No draft event found. Run `pnpm seed` before admin tests.');
	draftEventId = draft.id;
	draftEventTitle = draft.title;

	const { data: suggestion } = await admin
		.from('suggestions')
		.select('id, title')
		.eq('status', 'open')
		.limit(1)
		.maybeSingle();
	if (!suggestion) throw new Error('No open suggestion found. Run `pnpm seed` before admin tests.');
	openSuggestionId = suggestion.id;
});

test.afterAll(async () => {
	// Guarantee test member is not suspended after this test run
	const admin = adminClient();
	await Promise.all([
		admin.auth.admin.updateUserById(MEMBER_ID, { ban_duration: 'none' }),
		admin.from('users').update({ is_suspended: false }).eq('id', MEMBER_ID),
	]);
	// Suspending a member deletes their feed token (so feeds stop immediately).
	// Recreate it after reinstatement so subsequent test runs have a valid token.
	await admin
		.from('feed_tokens')
		.upsert({ user_id: MEMBER_ID, token: 'e2e-member-feed-token' }, { onConflict: 'user_id' });
});

// ── Access control ────────────────────────────────────────────────────────────

test('non-admin is redirected from /admin to /events', async ({ page }) => {
	await signInAs(page, MEMBER_EMAIL);
	await page.goto(`${BASE}/admin`);
	await expect(page).toHaveURL(/\/events/);
});

// ── Event management ──────────────────────────────────────────────────────────

test('admin can publish a draft event and member sees it in /events', async ({ browser }) => {
	// Admin publishes the draft event
	const adminCtx = await browser.newContext();
	const adminPage = await adminCtx.newPage();
	await signInAs(adminPage, ADMIN_EMAIL);

	await adminPage.goto(`${BASE}/admin/events/${draftEventId}`);
	// Wait for the form to be ready — status select is a reliable anchor
	await expect(adminPage.locator('select[name="status"]')).toBeVisible();

	await adminPage.selectOption('select[name="status"]', 'published');
	await adminPage.getByRole('button', { name: 'Save' }).click();
	await expect(adminPage.locator('[data-testid="save-success"]')).toBeVisible();
	await adminCtx.close();

	// Member can now see the event in /events
	await deleteAllMail();
	const memberCtx = await browser.newContext();
	const memberPage = await memberCtx.newPage();
	await signInAs(memberPage, MEMBER_EMAIL);

	await memberPage.goto(`${BASE}/events`);
	await expect(memberPage.getByText(draftEventTitle)).toBeVisible();
	await memberCtx.close();

	// Restore draft status so subsequent runs still have a draft to test with
	await adminClient().from('events').update({ status: 'draft' }).eq('id', draftEventId);
});

// ── Suggestion promotion ──────────────────────────────────────────────────────

test('admin can promote an open suggestion to a draft event', async ({ page }) => {
	await signInAs(page, ADMIN_EMAIL);

	await page.goto(`${BASE}/suggestions/${openSuggestionId}`);
	await expect(page.locator('button[data-action="promote"]')).toBeVisible();

	await page.locator('button[data-action="promote"]').click();
	// Redirect to admin event edit page
	await expect(page).toHaveURL(/\/admin\/events\/[a-f0-9-]+$/);

	const eventId = page.url().split('/').pop()!;

	// New event is a draft
	await expect(page.locator('select[name="status"]')).toHaveValue('draft');

	// Suggestion shows the promoted banner linking to the event
	await page.goto(`${BASE}/suggestions/${openSuggestionId}`);
	await expect(page.locator('[data-testid="promoted-banner"]')).toBeVisible();

	// Cleanup
	const admin = adminClient();
	await admin.from('events').delete().eq('id', eventId);
	await admin
		.from('suggestions')
		.update({ status: 'open', promoted_to_event_id: null })
		.eq('id', openSuggestionId);
});

// ── Member management ─────────────────────────────────────────────────────────

test('admin can suspend and reinstate a member', async ({ page }) => {
	await signInAs(page, ADMIN_EMAIL);
	await page.goto(`${BASE}/admin/members`);

	const memberRow = page.locator(`[data-member-id="${MEMBER_ID}"]`);
	await expect(memberRow).toBeVisible();

	// Suspend
	await memberRow.locator('button[data-action="suspend"]').click();
	await expect(memberRow.locator('[data-testid="suspended-badge"]')).toBeVisible();

	// Reinstate
	await memberRow.locator('button[data-action="reinstate"]').click();
	await expect(memberRow.locator('button[data-action="suspend"]')).toBeVisible();
});

// ── Suggestion close / reopen ─────────────────────────────────────────────────

test('admin can close and reopen voting on a suggestion', async ({ page }) => {
	await signInAs(page, ADMIN_EMAIL);
	await page.goto(`${BASE}/suggestions/${openSuggestionId}`);
	await expect(page.locator('button[data-action="close"]')).toBeVisible();

	await page.locator('button[data-action="close"]').click();
	await expect(page.locator('button[data-action="reopen"]')).toBeVisible();

	await page.locator('button[data-action="reopen"]').click();
	await expect(page.locator('button[data-action="close"]')).toBeVisible();
});
