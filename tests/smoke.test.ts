import { test, expect } from '@playwright/test';

test('landing page has correct title', async ({ page }) => {
	await page.goto('/');
	await expect(page).toHaveTitle(/Tool Club/);
});
