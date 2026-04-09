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
 */
import { test, expect, type Page } from '@playwright/test';
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
let openSuggestionTitle: string;

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
	openSuggestionTitle = suggestion.title;
});

test.afterAll(async () => {
	// Guarantee test member is not suspended after this test run
	const admin = adminClient();
	await Promise.all([
		admin.auth.admin.updateUserById(MEMBER_ID, { ban_duration: 'none' }),
		admin.from('users').update({ is_suspended: false }).eq('id', MEMBER_ID),
	]);
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
	await adminPage.waitForLoadState('networkidle');
	await adminPage.selectOption('select[name="status"]', 'published');
	await adminPage.getByRole('button', { name: 'Save' }).click();
	await expect(adminPage.locator('[data-testid="save-success"]')).toBeVisible({ timeout: 5000 });
	await adminCtx.close();

	// Member can now see the event
	await deleteAllMail();
	const memberCtx = await browser.newContext();
	const memberPage = await memberCtx.newPage();
	await signInAs(memberPage, MEMBER_EMAIL);

	await memberPage.goto(`${BASE}/events`);
	await memberPage.waitForLoadState('networkidle');
	await expect(memberPage.locator(`text="${draftEventTitle}"`)).toBeVisible({ timeout: 5000 });
	await memberCtx.close();

	// Restore draft status
	await adminClient().from('events').update({ status: 'draft' }).eq('id', draftEventId);
});

// ── Suggestion promotion ──────────────────────────────────────────────────────

test('admin can promote an open suggestion to a draft event', async ({ page }) => {
	await signInAs(page, ADMIN_EMAIL);

	await page.goto(`${BASE}/suggestions/${openSuggestionId}`);
	await page.waitForLoadState('networkidle');

	// Admin controls visible
	await expect(page.locator('button[data-action="promote"]')).toBeVisible();

	// Promote
	await page.locator('button[data-action="promote"]').click();
	await expect(page).toHaveURL(/\/admin\/events\/[a-f0-9-]+$/, { timeout: 8000 });

	const eventId = page.url().split('/').pop()!;

	// New event is a draft
	await expect(page.locator('select[name="status"]')).toHaveValue('draft');

	// Suggestion shows promoted banner
	await page.goto(`${BASE}/suggestions/${openSuggestionId}`);
	await expect(page.locator('[data-testid="promoted-banner"]')).toBeVisible({ timeout: 5000 });

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
	await page.waitForLoadState('networkidle');

	const memberRow = page.locator(`[data-member-id="${MEMBER_ID}"]`);
	await expect(memberRow).toBeVisible();

	// Suspend
	await memberRow.locator('button[data-action="suspend"]').click();
	await expect(memberRow.locator('[data-testid="suspended-badge"]')).toBeVisible({
		timeout: 5000,
	});

	// Reinstate
	await memberRow.locator('button[data-action="reinstate"]').click();
	await expect(memberRow.locator('button[data-action="suspend"]')).toBeVisible({ timeout: 5000 });
});

// ── Suggestion close / reopen ─────────────────────────────────────────────────

test('admin can close and reopen voting on a suggestion', async ({ page }) => {
	await signInAs(page, ADMIN_EMAIL);
	await page.goto(`${BASE}/suggestions/${openSuggestionId}`);
	await page.waitForLoadState('networkidle');

	await page.locator('button[data-action="close"]').click();
	await expect(page.locator('button[data-action="reopen"]')).toBeVisible({ timeout: 5000 });

	await page.locator('button[data-action="reopen"]').click();
	await expect(page.locator('button[data-action="close"]')).toBeVisible({ timeout: 5000 });
});
