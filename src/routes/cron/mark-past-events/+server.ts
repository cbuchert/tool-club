import { createAdminClient } from '$lib/server/db';
import type { RequestHandler } from './$types';

/**
 * Cron: mark-past-events
 * Schedule: every hour  (see vercel.json)
 *
 * Sets events.status = 'past' for any published event whose starts_at
 * is more than 24 hours ago. The 24-hour grace period gives members time
 * to RSVP after an event has started before it locks.
 *
 * Protected by CRON_SECRET. Vercel injects the Authorization header
 * automatically when the env var is set. In local dev the check is
 * skipped if the var is absent.
 */
export const GET: RequestHandler = async ({ request }) => {
	// .trim() guards against trailing newlines if the secret was stored via
	// `echo "..." | vercel env add` (echo appends a newline by default).
	const cronSecret = process.env.CRON_SECRET?.trim();
	if (cronSecret) {
		const auth = request.headers.get('authorization');
		if (auth !== `Bearer ${cronSecret}`) {
			return new Response('Unauthorized', { status: 401 });
		}
	}

	const admin = createAdminClient();

	const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

	const { data, error } = await admin
		.from('events')
		.update({ status: 'past' })
		.eq('status', 'published')
		.lt('starts_at', cutoff)
		.select('id, title');

	if (error) {
		console.error('[cron/mark-past-events] DB error:', error.message);
		return new Response(JSON.stringify({ error: error.message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const marked = data?.length ?? 0;
	console.log(`[cron/mark-past-events] Marked ${marked} event(s) as past.`);

	return new Response(JSON.stringify({ marked, events: data ?? [] }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};
