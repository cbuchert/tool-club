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
	},
});
