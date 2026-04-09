import { createAdminClient } from '$lib/server/db';
import { buildPublicRssFeed, type PublicFeedEvent } from '$lib/utils/feeds';
import type { RequestHandler } from '@sveltejs/kit';

// Public RSS feed — event titles and dates only, no auth required.
// Admin client used server-side so no auth cookie is needed.
export const GET: RequestHandler = async ({ url }) => {
	const admin = createAdminClient();

	const { data: events } = await admin
		.from('events')
		.select('id, title, starts_at')
		.eq('status', 'published')
		.order('starts_at', { ascending: true });

	const items: PublicFeedEvent[] = (events ?? []).map((e) => ({
		id: e.id,
		title: e.title,
		starts_at: e.starts_at,
		url: `${url.origin}/events/${e.id}`,
	}));

	const feed = buildPublicRssFeed(items, `${url.origin}/feed/public`);

	return new Response(feed, {
		headers: {
			'Content-Type': 'application/rss+xml; charset=utf-8',
			'Cache-Control': 'public, max-age=900',
		},
	});
};
