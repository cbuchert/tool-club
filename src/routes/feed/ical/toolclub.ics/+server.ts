import { createAdminClient } from '$lib/server/db';
import { buildIcalFeed, type PrivateFeedEvent } from '$lib/utils/feeds';
import type { RequestHandler } from '@sveltejs/kit';

// Private iCal feed — authenticated via per-member token in the URL.
// ?token=<feed_token_value>
export const GET: RequestHandler = async ({ url }) => {
	const token = url.searchParams.get('token');

	if (!token) {
		return new Response('Missing token', { status: 401 });
	}

	const admin = createAdminClient();

	const { data: feedToken } = await admin
		.from('feed_tokens')
		.select('user_id')
		.eq('token', token)
		.maybeSingle();

	if (!feedToken) {
		return new Response('Invalid token', { status: 401 });
	}

	const { data: events } = await admin
		.from('events')
		.select('id, title, starts_at, ends_at, location_name, address, body_md')
		.in('status', ['published', 'past'])
		.order('starts_at', { ascending: true });

	const items: PrivateFeedEvent[] = (events ?? []).map((e) => ({
		id: e.id,
		title: e.title,
		starts_at: e.starts_at,
		ends_at: e.ends_at ?? null,
		location_name: e.location_name ?? null,
		address: e.address ?? null,
		body_html: null, // iCal doesn't include body
		url: `${url.origin}/events/${e.id}`,
	}));

	const cal = buildIcalFeed(items, url.origin);

	return new Response(cal, {
		headers: {
			'Content-Type': 'text/calendar; charset=utf-8',
			'Content-Disposition': 'attachment; filename="toolclub.ics"',
			'Cache-Control': 'private, max-age=300',
		},
	});
};
