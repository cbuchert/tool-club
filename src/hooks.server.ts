import { createServerClient } from '$lib/server/db';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const supabase = createServerClient(event);
	event.locals.supabase = supabase;

	// getUser() makes a network request to verify the token server-side.
	// Never use getSession() here — it reads the cookie without validation
	// and can be spoofed by a client supplying a crafted JWT.
	const {
		data: { user },
	} = await supabase.auth.getUser();

	event.locals.user = user;
	event.locals.session = user ? (await supabase.auth.getSession()).data.session : null;

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		},
	});
};
