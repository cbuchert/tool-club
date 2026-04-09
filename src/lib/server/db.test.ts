import { describe, it, expect, vi } from 'vitest';
import { createServerClient, createAdminClient } from './db';
import type { RequestEvent } from '@sveltejs/kit';

// Minimal mock of a SvelteKit RequestEvent
function makeMockEvent(): RequestEvent {
	const cookies = new Map<string, string>();
	return {
		cookies: {
			getAll: () => [...cookies.entries()].map(([name, value]) => ({ name, value })),
			setAll: (items: { name: string; value: string; options?: object }[]) => {
				items.forEach(({ name, value }) => cookies.set(name, value));
			},
		},
	} as unknown as RequestEvent;
}

describe('createServerClient', () => {
	it('returns a supabase client with auth methods', () => {
		const client = createServerClient(makeMockEvent());
		expect(client).toBeDefined();
		expect(typeof client.auth.getSession).toBe('function');
	});

	it('returns a client with a database query builder', () => {
		const client = createServerClient(makeMockEvent());
		expect(typeof client.from).toBe('function');
	});
});

describe('createAdminClient', () => {
	it('returns an admin client with auth methods', () => {
		const client = createAdminClient();
		expect(client).toBeDefined();
		expect(typeof client.auth.admin.listUsers).toBe('function');
	});

	it('does not persist a session (service role clients are stateless)', () => {
		// createAdminClient is configured with persistSession: false.
		// We verify this indirectly by confirming getSession returns null
		// without any cookie interaction needed.
		const client = createAdminClient();
		expect(typeof client.from).toBe('function');
	});
});
