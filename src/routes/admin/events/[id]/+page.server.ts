import { error, fail, redirect } from '@sveltejs/kit';
import { createAdminClient } from '$lib/server/db';
import { eventSchema } from '$lib/schemas/forms';
import { fromDatetimeLocal, toDatetimeLocal, linksToText, parseLinks } from '$lib/utils/datetime';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const admin = createAdminClient();

	const [{ data: event }, { data: members }, { data: rsvps }] = await Promise.all([
		admin.from('events').select('*').eq('id', params.id).maybeSingle(),
		admin.from('users').select('id, display_name').order('display_name'),
		admin
			.from('rsvps')
			.select('response, user_id, users!user_id(display_name)')
			.eq('event_id', params.id)
			.order('created_at'),
	]);

	if (!event) error(404, 'Event not found');

	return {
		event: {
			...event,
			starts_at_local: toDatetimeLocal(event.starts_at),
			ends_at_local: event.ends_at ? toDatetimeLocal(event.ends_at) : '',
			links_text: linksToText((event.links as { label: string; url: string }[]) ?? []),
		},
		members: members ?? [],
		rsvps: (rsvps ?? []).map((r) => ({
			response: r.response as 'yes' | 'no',
			user_id: r.user_id,
			display_name:
				(r.users as unknown as { display_name: string } | null)?.display_name ?? 'Member',
		})),
	};
};

export const actions: Actions = {
	// ── Update event ──────────────────────────────────────────
	update: async ({ params, request }) => {
		const data = await request.formData();

		const baseValidation = eventSchema.safeParse({
			title: data.get('title')?.toString().trim() ?? '',
			starts_at: data.get('starts_at')?.toString().trim() ?? '',
			host_name: data.get('host_name')?.toString().trim() ?? '',
			status: data.get('status')?.toString() ?? 'draft',
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
		const { error: updateError } = await admin
			.from('events')
			.update({
				title: baseValidation.data.title,
				status: baseValidation.data.status,
				starts_at,
				ends_at,
				host_name: baseValidation.data.host_name,
				host_id: data.get('host_id')?.toString().trim() || null,
				location_name: data.get('location_name')?.toString().trim() || null,
				address: data.get('address')?.toString().trim() || null,
				capacity,
				body_md: data.get('body_md')?.toString().trim() || null,
				links: parseLinks(data.get('links')?.toString() ?? ''),
			})
			.eq('id', params.id);

		if (updateError) return fail(500, { error: 'Failed to save. Please try again.' });
		return { success: true };
	},

	// ── Delete event ──────────────────────────────────────────
	delete: async ({ params }) => {
		const admin = createAdminClient();
		await admin.from('events').delete().eq('id', params.id);
		redirect(303, '/admin/events');
	},
};
