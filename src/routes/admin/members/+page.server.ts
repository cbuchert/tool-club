import { fail } from '@sveltejs/kit';
import { createAdminClient } from '$lib/server/db';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const admin = createAdminClient();

	const [{ data: members }, { data: invites }] = await Promise.all([
		admin
			.from('users')
			.select('id, display_name, email, role, is_suspended, created_at, invited_by')
			.order('created_at', { ascending: true }),

		// All pending (unredeemed, unexpired) invites with inviter display name
		admin
			.from('invites')
			.select('id, token, email, expires_at, invited_by, users!invited_by(display_name)')
			.is('redeemed_by', null)
			.gt('expires_at', new Date().toISOString())
			.order('created_at', { ascending: false }),
	]);

	return {
		members: (members ?? []).map((m) => ({
			id: m.id as string,
			display_name: m.display_name as string,
			email: m.email as string | null,
			role: m.role as string,
			is_suspended: m.is_suspended as boolean,
			created_at: m.created_at as string,
			invited_by: m.invited_by as string | null,
		})),
		invites: (invites ?? []).map((i) => ({
			id: i.id as string,
			token: i.token as string,
			email: i.email as string | null,
			expires_at: i.expires_at as string,
			invited_by: i.invited_by as string,
			inviter_name:
				(i.users as unknown as { display_name: string } | null)?.display_name ?? 'Member',
		})),
	};
};

export const actions: Actions = {
	// ── Suspend member ────────────────────────────────────────
	suspend: async ({ request }) => {
		const data = await request.formData();
		const userId = data.get('user_id')?.toString() ?? '';
		if (!userId) return fail(400, { error: 'Missing user ID.' });

		const admin = createAdminClient();

		// Disable in Auth (~100 years ban) and mark suspended in public.users
		const [{ error: authErr }, { error: dbErr }] = await Promise.all([
			admin.auth.admin.updateUserById(userId, { ban_duration: '876600h' }),
			admin.from('users').update({ is_suspended: true }).eq('id', userId),
		]);

		if (authErr || dbErr) return fail(500, { error: 'Failed to suspend member.' });

		// Invalidate feed tokens so their RSS/iCal feeds stop working immediately
		await admin.from('feed_tokens').delete().eq('user_id', userId);

		return { success: true };
	},

	// ── Reinstate member ──────────────────────────────────────
	reinstate: async ({ request }) => {
		const data = await request.formData();
		const userId = data.get('user_id')?.toString() ?? '';
		if (!userId) return fail(400, { error: 'Missing user ID.' });

		const admin = createAdminClient();

		const [{ error: authErr }, { error: dbErr }] = await Promise.all([
			admin.auth.admin.updateUserById(userId, { ban_duration: 'none' }),
			admin.from('users').update({ is_suspended: false }).eq('id', userId),
		]);

		if (authErr || dbErr) return fail(500, { error: 'Failed to reinstate member.' });

		return { success: true };
	},

	// ── Revoke invite ─────────────────────────────────────────
	revokeInvite: async ({ request }) => {
		const data = await request.formData();
		const inviteId = data.get('invite_id')?.toString() ?? '';
		if (!inviteId) return fail(400, { error: 'Missing invite ID.' });

		const admin = createAdminClient();
		await admin.from('invites').delete().eq('id', inviteId);
		return { success: true };
	},
};
