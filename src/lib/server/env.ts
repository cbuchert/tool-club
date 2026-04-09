import { createEnv } from '@t3-oss/env-core';
import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_JWT_SECRET } from '$env/static/private';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { z } from 'zod';

// Validated env — server only. Importing $env/static/private makes this
// file ineligible for use in client-side code (SvelteKit will warn).
export const env = createEnv({
	clientPrefix: 'PUBLIC_',
	client: {
		PUBLIC_SUPABASE_URL: z.string().url(),
		PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
	},
	server: {
		SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
		SUPABASE_JWT_SECRET: z.string().min(32),
	},
	runtimeEnv: {
		PUBLIC_SUPABASE_URL,
		PUBLIC_SUPABASE_ANON_KEY,
		SUPABASE_SERVICE_ROLE_KEY,
		SUPABASE_JWT_SECRET,
	},
});
