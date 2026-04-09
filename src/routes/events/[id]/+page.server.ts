import { error, fail } from '@sveltejs/kit';
import { marked } from 'marked';
import { Temporal } from '@js-temporal/polyfill';
import { DEFAULT_TIMEZONE, formatEventDate } from '$lib/temporal';
import { rsvpSchema } from '$lib/schemas/forms';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { user, supabase } = locals;

	const { data: event } = await supabase
		.from('events')
		.select('*')
		.eq('id', params.id)
		.maybeSingle();

	if (!event) error(404, 'Event not found');

	// Members see published + past; drafts are admin-only
	const isAdmin =
		(await supabase.from('users').select('role').eq('id', user!.id).single()).data?.role ===
		'admin';

	if (event.status === 'draft' && !isAdmin) error(404, 'Event not found');

	// Format the date string for the detail view
	const instant = Temporal.Instant.from(event.starts_at);
	const dateFormatted = formatEventDate(instant, DEFAULT_TIMEZONE);

	// Also format end time if present
	let endFormatted: string | null = null;
	if (event.ends_at) {
		const endInstant = Temporal.Instant.from(event.ends_at);
		const endZdt = endInstant.toZonedDateTimeISO(DEFAULT_TIMEZONE);
		endFormatted = endZdt.toPlainTime().toLocaleString('en-US', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: true,
		});
	}

	// Render markdown body server-side
	const bodyHtml = event.body_md ? await marked(event.body_md, { async: true }) : null;

	// Going RSVPs with user profiles (for the going list)
	const { data: goingRsvps } = await supabase
		.from('rsvps')
		.select('user_id, users!user_id(id, display_name, avatar_url)')
		.eq('event_id', params.id)
		.eq('response', 'yes')
		.order('created_at');

	const goingUsers = (goingRsvps ?? []).map((r) => {
		const u = r.users as { id: string; display_name: string; avatar_url: string | null } | null;
		return {
			id: r.user_id,
			display_name: u?.display_name ?? 'Member',
			avatar_url: u?.avatar_url ?? null,
		};
	});

	// Current user's RSVP
	const { data: myRsvp } = await supabase
		.from('rsvps')
		.select('id, response')
		.eq('event_id', params.id)
		.eq('user_id', user!.id)
		.maybeSingle();

	const goingCount = goingUsers.length;
	const isFull = event.capacity != null && goingCount >= event.capacity;
	const canRsvp = event.status === 'published';
	const isHost = event.host_id === user!.id;
	const links = (event.links as { label: string; url: string }[] | null) ?? [];

	return {
		event: {
			id: event.id,
			title: event.title,
			status: event.status as 'draft' | 'published' | 'past',
			dateFormatted,
			endFormatted,
			location_name: event.location_name as string | null,
			address: event.address as string | null,
			host_name: event.host_name as string,
			bodyHtml,
			capacity: event.capacity as number | null,
			links,
			promoted_from_id: event.promoted_from_id as string | null,
		},
		goingUsers,
		goingCount,
		isFull,
		canRsvp,
		isHost,
		isAdmin,
		myRsvp: (myRsvp?.response as 'yes' | 'no' | null) ?? null,
	};
};

export const actions: Actions = {
	rsvp: async ({ params, request, locals }) => {
		const { user, supabase } = locals;

		const data = await request.formData();
		const parsed = rsvpSchema.safeParse({ response: data.get('response')?.toString() });
		if (!parsed.success) return fail(400, { error: 'Invalid response.' });
		const { response } = parsed.data;

		// Verify the event is still RSVPable
		const { data: event } = await supabase
			.from('events')
			.select('status, capacity')
			.eq('id', params.id)
			.maybeSingle();

		if (!event || event.status !== 'published') {
			return fail(400, { error: 'RSVPs are locked for this event.' });
		}

		// Capacity check — exclude the current user's existing RSVP from the count
		if (response === 'yes' && event.capacity != null) {
			const { count } = await supabase
				.from('rsvps')
				.select('id', { count: 'exact', head: true })
				.eq('event_id', params.id)
				.eq('response', 'yes')
				.neq('user_id', user!.id);

			if ((count ?? 0) >= event.capacity) {
				return fail(400, { error: 'This event is at capacity.' });
			}
		}

		const { error: upsertError } = await supabase
			.from('rsvps')
			.upsert(
				{ event_id: params.id, user_id: user!.id, response },
				{ onConflict: 'event_id,user_id' }
			);

		if (upsertError) return fail(500, { error: 'Failed to save RSVP. Please try again.' });

		return { success: true };
	},
};
