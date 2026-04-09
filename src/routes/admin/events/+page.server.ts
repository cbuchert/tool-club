import { createAdminClient } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const admin = createAdminClient();

	const { data: events } = await admin
		.from('events')
		.select('id, title, status, starts_at, host_name')
		.order('starts_at', { ascending: false });

	return { events: events ?? [] };
};
