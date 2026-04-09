import { createAdminClient } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const admin = createAdminClient();

	const [
		{ count: draftCount },
		{ count: memberCount },
		{ count: pendingInviteCount },
		{ count: openSuggestionCount },
	] = await Promise.all([
		admin.from('events').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
		admin.from('users').select('*', { count: 'exact', head: true }),
		admin
			.from('invites')
			.select('*', { count: 'exact', head: true })
			.is('redeemed_by', null)
			.gt('expires_at', new Date().toISOString()),
		admin.from('suggestions').select('*', { count: 'exact', head: true }).eq('status', 'open'),
	]);

	return {
		draftCount: draftCount ?? 0,
		memberCount: memberCount ?? 0,
		pendingInviteCount: pendingInviteCount ?? 0,
		openSuggestionCount: openSuggestionCount ?? 0,
	};
};
