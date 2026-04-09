import { createServerClient } from '$lib/server/db';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const supabase = createServerClient(event);
	event.locals.supabase = supabase;

	const {
		data: { session },
	} = await supabase.auth.getSession();

	event.locals.session = session;
	event.locals.user = session?.user ?? null;

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			// Required for Supabase to pass auth headers through SSR
			return name === 'content-range' || name === 'x-supabase-api-version';
		},
	});
};
