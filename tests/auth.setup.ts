/**
 * Auth setup — runs once before all tests in the `chromium` project.
 *
 * Authenticates as both the test admin and the test member, then saves
 * their browser storage state (Supabase session cookies) to disk.
 * The `chromium` project declares `dependencies: ['setup']`, so every
 * test that uses `adminPage` or `memberPage` fixtures starts already
 * authenticated without touching the magic-link flow.
 *
 * Files are written to playwright/.auth/ which is gitignored.
 */
import { test as setup, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { signInAs, ADMIN_EMAIL, MEMBER_EMAIL } from './helpers';
import { AUTH_DIR, ADMIN_AUTH_FILE, MEMBER_AUTH_FILE } from './auth.paths';

export { ADMIN_AUTH_FILE, MEMBER_AUTH_FILE };

// Ensure the directory exists before Playwright tries to write to it
mkdirSync(AUTH_DIR, { recursive: true });

setup('admin auth state', async ({ page }) => {
	await signInAs(page, ADMIN_EMAIL);
	await expect(page).toHaveURL(/\/events/);
	await page.context().storageState({ path: ADMIN_AUTH_FILE });
});

setup('member auth state', async ({ page }) => {
	await signInAs(page, MEMBER_EMAIL);
	await expect(page).toHaveURL(/\/events/);
	await page.context().storageState({ path: MEMBER_AUTH_FILE });
});
