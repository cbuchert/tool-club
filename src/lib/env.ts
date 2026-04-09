import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

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
	runtimeEnv: process.env,
});
