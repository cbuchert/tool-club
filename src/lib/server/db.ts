import { createServerClient as _createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import type { RequestEvent } from '@sveltejs/kit';
import { env } from './env';

/**
 * Creates a Supabase client that respects the user's session cookie.
 * Use this in load functions and form actions for RLS-respecting queries.
 */
export function createServerClient(event: RequestEvent) {
	return _createServerClient(env.PUBLIC_SUPABASE_URL, env.PUBLIC_SUPABASE_ANON_KEY, {
		cookies: {
			getAll: () => event.cookies.getAll(),
			setAll: (cookies) => {
				cookies.forEach(({ name, value, options }) => {
					event.cookies.set(name, value, { ...options, path: '/' });
				});
			},
		},
	});
}

/**
 * Creates a Supabase admin client using the service role key.
 * Bypasses RLS. Use ONLY in cron jobs and admin-only server actions.
 * Never use in load functions or actions reachable by non-admins.
 */
export function createAdminClient() {
	return createClient(env.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
		auth: {
			autoRefreshToken: false,
			persistSession: false,
		},
	});
}
