/**
 * Shared test helpers for admin E2E tests.
 *
 * Sign-in flow: submit the real /signin form (sets PKCE code_verifier cookie
 * server-side), then extract the magic link from Mailpit and navigate to it.
 * This mirrors the exact path a real user takes.
 */
import type { Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const envPath = resolve(process.cwd(), '.env.local');
if (existsSync(envPath)) process.loadEnvFile(envPath);

export const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';
export const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
export const BASE = 'http://localhost:5173';
export const MAILPIT = 'http://127.0.0.1:54324';

// Fixed UUIDs from supabase/seeds/test_users.sql
export const MEMBER_ID = '00000000-0000-0000-0000-000000000001';
export const ADMIN_ID = '00000000-0000-0000-0000-000000000002';
export const ADMIN_EMAIL = 'admin@test.toolclub';
export const MEMBER_EMAIL = 'member@test.toolclub';

export function adminClient() {
	return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
		auth: { autoRefreshToken: false, persistSession: false },
	});
}

export async function deleteAllMail() {
	await fetch(`${MAILPIT}/api/v1/messages`, { method: 'DELETE' });
}

async function getMagicLink(toEmail: string): Promise<string> {
	for (let i = 0; i < 20; i++) {
		await new Promise((r) => setTimeout(r, 500));
		const { messages } = (await fetch(`${MAILPIT}/api/v1/messages`).then((r) => r.json())) as {
			messages?: { ID: string; To: { Address: string }[] }[];
		};
		const msg = messages?.find((m) => m.To?.some((t) => t.Address === toEmail));
		if (!msg) continue;
		// The /body.html endpoint is unreliable locally — read from the full message JSON
		const full = (await fetch(`${MAILPIT}/api/v1/message/${msg.ID}`).then((r) => r.json())) as {
			HTML?: string;
			Text?: string;
		};
		const src = full.HTML ?? full.Text ?? '';
		const match = src.match(/href="(http:\/\/127\.0\.0\.1:54321\/auth\/v1\/verify[^"]+)"/);
		if (match) return match[1].replace(/&amp;/g, '&');
	}
	throw new Error(`No magic link found for ${toEmail} after 10 s`);
}

/**
 * Signs in via the real /signin form so the PKCE code_verifier cookie is set
 * by the server, then navigates to the Mailpit magic link to complete auth.
 * Leaves the page on /events after completing.
 */
export async function signInAs(page: Page, email: string): Promise<void> {
	await deleteAllMail();
	await page.goto(`${BASE}/signin`);
	await page.fill('input[type="email"]', email);
	await page.click('button[type="submit"]');
	await page.waitForSelector('text=Check your email', { timeout: 5000 });
	const link = await getMagicLink(email);
	await page.goto(link);
	await page.waitForURL(/\/events/, { timeout: 10000 });
}
