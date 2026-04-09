import { cardDay, cardMonth, cardMeta } from '$lib/utils/events';
import type { PageServerLoad } from './$types';

// ── Load ─────────────────────────────────────────────────────

export const load: PageServerLoad = async ({ locals }) => {
	const { user, supabase } = locals;

	// Load all visible events sorted by date
	const { data: rawEvents } = await supabase
		.from('events')
		.select('id, title, status, starts_at, location_name, capacity, host_name')
		.in('status', ['published', 'past'])
		.order('starts_at', { ascending: true });

	const events = rawEvents ?? [];
	const eventIds = events.map((e) => e.id);

	// Going RSVPs with user display names (for avatar stacks)
	const { data: goingRsvps } = eventIds.length
		? await supabase
				.from('rsvps')
				.select('event_id, user_id, users!user_id(display_name)')
				.in('event_id', eventIds)
				.eq('response', 'yes')
				.order('created_at')
		: { data: [] };

	// Current user's own RSVPs across all events
	const { data: myRsvps } = eventIds.length
		? await supabase
				.from('rsvps')
				.select('event_id, response')
				.in('event_id', eventIds)
				.eq('user_id', user!.id)
		: { data: [] };

	const myRsvpMap = new Map(myRsvps?.map((r) => [r.event_id, r.response as 'yes' | 'no']) ?? []);

	// Group going users by event
	type GoingUser = { id: string; display_name: string };
	const goingByEvent = new Map<string, GoingUser[]>();
	for (const r of goingRsvps ?? []) {
		const users = goingByEvent.get(r.event_id) ?? [];
		const user = r.users as { display_name: string } | null;
		if (user) users.push({ id: r.user_id, display_name: user.display_name });
		goingByEvent.set(r.event_id, users);
	}

	// Shape each event for the card
	const shaped = events.map((e) => {
		const going = goingByEvent.get(e.id) ?? [];
		return {
			id: e.id,
			title: e.title,
			status: e.status as 'published' | 'past',
			cardDay: cardDay(e.starts_at),
			cardMonth: cardMonth(e.starts_at),
			cardMeta: cardMeta(e.starts_at, e.location_name),
			capacity: e.capacity as number | null,
			goingUsers: going,
			goingCount: going.length,
			isFull: e.capacity != null && going.length >= e.capacity,
			myRsvp: myRsvpMap.get(e.id) ?? null,
		};
	});

	return {
		upcoming: shaped.filter((e) => e.status === 'published'),
		past: shaped.filter((e) => e.status === 'past').reverse(), // most recent first
	};
};
