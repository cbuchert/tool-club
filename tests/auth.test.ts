/**
 * Auth E2E tests.
 *
 * Covers TODO §13:
 *   - Auth: sign in → magic link → session established
 *   - Auth: invite flow end to end (new member creation)
 *   - Auth: expired invite shows correct error
 *
 * These tests use an unauthenticated `page` because they're testing the
 * auth flow itself. They do NOT use the adminPage/memberPage fixtures.
 */
import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import {
	signInAs,
	getMagicLink,
	deleteAllMail,
	adminClient,
	BASE,
	ADMIN_ID,
	ADMIN_EMAIL,
} from './helpers';

// ── Sign-in flow ──────────────────────────────────────────────────────────────

test('sign in → magic link → session established', async ({ page }) => {
	await deleteAllMail();
	await page.goto('/signin');

	// Fill the sign-in form
	await page.getByLabel('Email address').fill(ADMIN_EMAIL);
	await page.getByRole('button', { name: 'Send sign-in link' }).click();

	// "Check your email" state is shown with the address echoed back
	await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
	await expect(page.getByText(ADMIN_EMAIL)).toBeVisible();

	// Navigate to the magic link → session is established
	const link = await getMagicLink(ADMIN_EMAIL);
	await page.goto(link);

	await expect(page).toHaveURL(/\/events/);
	// Sidebar shows the signed-in user's name
	await expect(page.getByText('Sam Chen')).toBeVisible();
});

// ── Invite flow ───────────────────────────────────────────────────────────────

test('invite flow: new member joins via invite link', async ({ page }) => {
	const newEmail = `invite-e2e-${Date.now()}@test.toolclub`;
	const displayName = 'E2E Invitee';
	const token = randomUUID().replace(/-/g, '');
	const admin = adminClient();

	// Create a fresh invite from the test admin
	await admin.from('invites').insert({ invited_by: ADMIN_ID, token });

	let newUserId: string | null = null;
	try {
		// ── Visit the invite page ──
		await page.goto(`${BASE}/join/${token}`);

		// Inviter name is shown in the banner
		await expect(page.getByText('Sam Chen')).toBeVisible();

		// ── Fill the join form ──
		await deleteAllMail();
		await page.getByLabel('Email address').fill(newEmail);
		await page.getByLabel('Your name').fill(displayName);
		await page.getByRole('button', { name: 'Send sign-in link' }).click();

		// "Check your email" confirmation is shown
		await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();

		// ── Follow the magic link ──
		const link = await getMagicLink(newEmail);
		await page.goto(link);

		// New member lands on /events
		await expect(page).toHaveURL(/\/events/);

		// ── Verify DB state ──
		const { data: profile } = await admin
			.from('users')
			.select('id, display_name')
			.eq('email', newEmail)
			.maybeSingle();

		expect(profile?.display_name).toBe(displayName);
		newUserId = profile?.id ?? null;

		// Invite should be marked as redeemed
		const { data: invite } = await admin
			.from('invites')
			.select('redeemed_at, redeemed_by')
			.eq('token', token)
			.maybeSingle();

		expect(invite?.redeemed_at).not.toBeNull();
		expect(invite?.redeemed_by).toBe(newUserId);
	} finally {
		// Hard-delete the test user (cascades to public.users via FK)
		if (newUserId) await admin.auth.admin.deleteUser(newUserId);
		// Delete the invite (may already be gone via cascade, ignore error)
		await admin.from('invites').delete().eq('token', token);
	}
});

// ── Expired invite ────────────────────────────────────────────────────────────

test('expired invite shows the expired error state', async ({ page }) => {
	const token = randomUUID().replace(/-/g, '');
	const yesterday = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
	const admin = adminClient();

	await admin.from('invites').insert({ invited_by: ADMIN_ID, token, expires_at: yesterday });

	try {
		await page.goto(`${BASE}/join/${token}`);

		// The expired state shows the correct heading and names the inviter
		await expect(page.getByRole('heading', { name: 'This invite has expired' })).toBeVisible();
		await expect(page.getByText('Sam Chen')).toBeVisible();
	} finally {
		await admin.from('invites').delete().eq('token', token);
	}
});
