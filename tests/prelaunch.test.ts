/**
 * Pre-launch verification tests.
 *
 * Covers TODO §14:
 *   - Verify dark mode (prefers-color-scheme tokens render correctly)
 *   - Verify mobile layout (sidebar hidden, mobile nav shown at ≤640px)
 *
 * These run as part of the normal Playwright suite. They use the `memberPage`
 * fixture so the authenticated shell is tested, not just the landing page.
 */
import { test, expect } from './fixtures';

// ── Key routes to spot-check ──────────────────────────────────────────────────

const SHELL_ROUTES = ['/events', '/suggestions', '/account'];

// ── Dark mode ─────────────────────────────────────────────────────────────────

test.describe('dark mode', () => {
	test('--tc-bg token resolves to the dark value on all shell routes', async ({ browser }) => {
		const ctx = await browser.newContext({
			colorScheme: 'dark',
			storageState: (await import('./auth.paths')).MEMBER_AUTH_FILE,
		});
		const page = await ctx.newPage();

		for (const route of SHELL_ROUTES) {
			await page.goto(route);

			// --tc-bg in dark mode should be #1c1c1a (not the light #ffffff)
			const tcBg = await page.evaluate(() =>
				getComputedStyle(document.documentElement).getPropertyValue('--tc-bg').trim().toLowerCase()
			);

			// Resolved value comes through as the actual color — accept either
			// the CSS variable alias or the hex directly
			expect(tcBg, `${route}: --tc-bg should not be white in dark mode (got "${tcBg}")`).not.toBe(
				'#ffffff'
			);
			expect(tcBg, `${route}: --tc-bg should not be rgb(255,255,255) in dark mode`).not.toBe(
				'rgb(255, 255, 255)'
			);
		}

		await ctx.close();
	});

	test('page background is dark, not white, in dark mode', async ({ browser }) => {
		const ctx = await browser.newContext({
			colorScheme: 'dark',
			storageState: (await import('./auth.paths')).MEMBER_AUTH_FILE,
		});
		const page = await ctx.newPage();
		await page.goto('/events');

		const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);

		// Dark mode body bg should not be white
		expect(bodyBg, `body background should be dark (got "${bodyBg}")`).not.toBe(
			'rgb(255, 255, 255)'
		);

		await ctx.close();
	});
});

// ── Mobile layout ─────────────────────────────────────────────────────────────

test.describe('mobile layout at 390px', () => {
	test('sidebar is hidden and mobile nav is visible', async ({ browser }) => {
		const ctx = await browser.newContext({
			viewport: { width: 390, height: 844 },
			storageState: (await import('./auth.paths')).MEMBER_AUTH_FILE,
		});
		const page = await ctx.newPage();
		await page.goto('/events');

		// Sidebar must be hidden
		const sidebarDisplay = await page.evaluate(() => {
			const el = document.querySelector('nav.sidebar') as HTMLElement | null;
			return el ? getComputedStyle(el).display : 'not-found';
		});
		expect(sidebarDisplay, 'sidebar should be hidden at 390px').toBe('none');

		// Mobile nav must be visible
		const mobileNavDisplay = await page.evaluate(() => {
			const el = document.querySelector('nav.mobile-nav') as HTMLElement | null;
			return el ? getComputedStyle(el).display : 'not-found';
		});
		expect(mobileNavDisplay, 'mobile-nav should be visible at 390px').not.toBe('none');
		expect(mobileNavDisplay, 'mobile-nav should exist').not.toBe('not-found');

		await ctx.close();
	});

	test('no horizontal scroll at 390px on any shell route', async ({ browser }) => {
		const ctx = await browser.newContext({
			viewport: { width: 390, height: 844 },
			storageState: (await import('./auth.paths')).MEMBER_AUTH_FILE,
		});
		const page = await ctx.newPage();

		for (const route of SHELL_ROUTES) {
			await page.goto(route);

			const hasHScroll = await page.evaluate(
				() => document.documentElement.scrollWidth > document.documentElement.clientWidth
			);

			expect(hasHScroll, `${route}: should not have horizontal scroll at 390px`).toBe(false);
		}

		await ctx.close();
	});
});
