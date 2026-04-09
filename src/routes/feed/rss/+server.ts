import { createAdminClient } from '$lib/server/db';
import { buildPrivateRssFeed, type PrivateFeedEvent } from '$lib/utils/feeds';
import { marked } from 'marked';
import type { RequestHandler } from '@sveltejs/kit';

// Private RSS feed — authenticated via per-member token in the URL.
// ?token=<feed_token_value>
export const GET: RequestHandler = async ({ url }) => {
	const token = url.searchParams.get('token');

	if (!token) {
		return new Response('Missing token', { status: 401 });
	}

	const admin = createAdminClient();

	// Validate the token — single lookup, no session involved
	const { data: feedToken } = await admin
		.from('feed_tokens')
		.select('user_id')
		.eq('token', token)
		.maybeSingle();

	if (!feedToken) {
		return new Response('Invalid token', { status: 401 });
	}

	// Load published events and past events with full details
	const { data: events } = await admin
		.from('events')
		.select('id, title, status, starts_at, ends_at, location_name, address, body_md')
		.in('status', ['published', 'past'])
		.order('starts_at', { ascending: false });

	const items: PrivateFeedEvent[] = await Promise.all(
		(events ?? []).map(async (e) => ({
			id: e.id,
			title: e.title,
			starts_at: e.starts_at,
			ends_at: e.ends_at ?? null,
			location_name: e.location_name ?? null,
			address: e.address ?? null,
			body_html: e.body_md ? await marked(e.body_md, { async: true }) : null,
			url: `${url.origin}/events/${e.id}`,
		}))
	);

	const feed = buildPrivateRssFeed(items, `${url.origin}/feed/rss?token=${token}`);

	return new Response(feed, {
		headers: {
			'Content-Type': 'application/rss+xml; charset=utf-8',
			'Cache-Control': 'private, max-age=300',
		},
	});
};
