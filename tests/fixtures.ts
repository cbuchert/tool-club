/**
 * Custom Playwright fixtures for Tool Club tests.
 *
 * Import `test` and `expect` from this file instead of `@playwright/test`
 * in any test that needs pre-authenticated pages.
 *
 * Usage:
 *   import { test, expect } from './fixtures';
 *
 *   test('...', async ({ adminPage }) => { ... });
 *   test('...', async ({ memberPage }) => { ... });
 *
 * Each fixture opens a fresh browser context loaded with the saved storage
 * state (Supabase session cookies) from auth.setup.ts. The context is closed
 * automatically after the test — no manual cleanup required.
 */
import { test as base, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { ADMIN_AUTH_FILE, MEMBER_AUTH_FILE } from './auth.paths';

export { expect };

type ToolClubFixtures = {
	/** A page pre-authenticated as the test admin (Sam Chen). */
	adminPage: Page;
	/** A page pre-authenticated as the test member (Jordan Park). */
	memberPage: Page;
};

export const test = base.extend<ToolClubFixtures>({
	adminPage: async ({ browser }, use) => {
		const ctx = await browser.newContext({ storageState: ADMIN_AUTH_FILE });
		const page = await ctx.newPage();
		await use(page);
		await ctx.close();
	},

	memberPage: async ({ browser }, use) => {
		const ctx = await browser.newContext({ storageState: MEMBER_AUTH_FILE });
		const page = await ctx.newPage();
		await use(page);
		await ctx.close();
	},
});
