import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: {
		command: 'pnpm dev',
		port: 5173,
		reuseExistingServer: !process.env.CI,
	},
	testDir: 'tests',
	testMatch: '**/*.{test,spec,e2e}.{ts,js}',
	use: {
		baseURL: 'http://localhost:5173',
		// How long Playwright waits for each action (click, fill, etc.) to
		// find an actionable element. Default is no timeout, which can hang
		// indefinitely on broken locators. 15s covers slow CI machines.
		actionTimeout: 15_000,
		// How long page.goto() and other navigation actions wait for the
		// page to load. 30s is comfortable for local + CI.
		navigationTimeout: 30_000,
	},
	// Per-assertion retry window. Web-first assertions (toBeVisible, toHaveText,
	// toHaveURL, etc.) automatically retry until this timeout is reached.
	// 10s removes the need for any inline { timeout: N } overrides — the
	// assertion itself keeps retrying until the condition is true or 10s pass.
	expect: {
		timeout: 10_000,
	},
	// Per-test wall-clock limit. Keeps the suite from hanging on a broken test.
	timeout: 60_000,
	// Retry once in CI to absorb transient flakes (network hiccups, cold starts).
	// Zero retries locally so failures are obvious during development.
	retries: process.env.CI ? 1 : 0,
});
