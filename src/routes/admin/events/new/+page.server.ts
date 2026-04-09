import { fail, redirect } from '@sveltejs/kit';
import { createAdminClient } from '$lib/server/db';
import { eventSchema } from '$lib/schemas/forms';
import { fromDatetimeLocal, parseLinks } from '$lib/utils/datetime';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const admin = createAdminClient();
	const { data: members } = await admin
		.from('users')
		.select('id, display_name')
		.order('display_name');
	return { members: members ?? [] };
};

export const actions: Actions = {
	default: async ({ request }) => {
		const data = await request.formData();

		const baseValidation = eventSchema.safeParse({
			title: data.get('title')?.toString().trim() ?? '',
			starts_at: data.get('starts_at')?.toString().trim() ?? '',
			host_name: data.get('host_name')?.toString().trim() ?? '',
			status: 'draft',
		});
		if (!baseValidation.success) {
			return fail(400, { error: baseValidation.error.issues[0].message });
		}

		const starts_at = fromDatetimeLocal(data.get('starts_at')?.toString().trim() ?? '');
		if (!starts_at) return fail(400, { error: 'Invalid start date.' });

		const ends_at = fromDatetimeLocal(data.get('ends_at')?.toString().trim() ?? '');

		const capacity_raw = data.get('capacity')?.toString().trim();
		let capacity: number | null = null;
		if (capacity_raw) {
			const n = parseInt(capacity_raw, 10);
			if (isNaN(n) || n <= 0) return fail(400, { error: 'Capacity must be a positive number.' });
			capacity = n;
		}

		const admin = createAdminClient();
		const { data: event, error: insertError } = await admin
			.from('events')
			.insert({
				title: baseValidation.data.title,
				starts_at,
				ends_at,
				host_name: baseValidation.data.host_name,
				host_id: data.get('host_id')?.toString().trim() || null,
				location_name: data.get('location_name')?.toString().trim() || null,
				address: data.get('address')?.toString().trim() || null,
				capacity,
				body_md: data.get('body_md')?.toString().trim() || null,
				links: parseLinks(data.get('links')?.toString() ?? ''),
				status: 'draft',
			})
			.select('id')
			.single();

		if (insertError) return fail(500, { error: 'Failed to create event. Please try again.' });

		redirect(303, `/admin/events/${event.id}`);
	},
};
