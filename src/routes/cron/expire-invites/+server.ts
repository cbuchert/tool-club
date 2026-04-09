import { createAdminClient } from '$lib/server/db';
import type { RequestHandler } from './$types';

/**
 * Cron: expire-invites
 * Schedule: daily at midnight UTC  (see vercel.json)
 *
 * Hard-deletes unredeemed invites whose expires_at has passed.
 * Redeemed invites (redeemed_at is not null) are kept indefinitely
 * for audit / invite-chain purposes.
 *
 * Protected by CRON_SECRET. Vercel injects the Authorization header
 * automatically when the env var is set. In local dev the check is
 * skipped if the var is absent.
 */
export const GET: RequestHandler = async ({ request }) => {
	const cronSecret = process.env.CRON_SECRET;
	if (cronSecret) {
		const auth = request.headers.get('authorization');
		if (auth !== `Bearer ${cronSecret}`) {
			return new Response('Unauthorized', { status: 401 });
		}
	}

	const admin = createAdminClient();

	const { data, error } = await admin
		.from('invites')
		.delete()
		.lt('expires_at', new Date().toISOString())
		.is('redeemed_at', null)
		.select('id');

	if (error) {
		console.error('[cron/expire-invites] DB error:', error.message);
		return new Response(JSON.stringify({ error: error.message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const deleted = data?.length ?? 0;
	console.log(`[cron/expire-invites] Deleted ${deleted} expired invite(s).`);

	return new Response(JSON.stringify({ deleted }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};
