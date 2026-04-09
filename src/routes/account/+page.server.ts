import { fail, redirect } from '@sveltejs/kit';
import { createAdminClient } from '$lib/server/db';
import { displayNameSchema } from '$lib/schemas/forms';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const { user, supabase } = locals;

	const [
		{ data: profile },
		{ data: pendingInvite },
		{ data: recruited },
		{ data: feedToken },
		{ data: hostedEvents },
	] = await Promise.all([
		supabase.from('users').select('display_name, email, avatar_url').eq('id', user!.id).single(),

		// Pending = unredeemed + not expired
		supabase
			.from('invites')
			.select('id, token, email, expires_at')
			.eq('invited_by', user!.id)
			.is('redeemed_by', null)
			.gt('expires_at', new Date().toISOString())
			.maybeSingle(),

		// Members this user invited who have joined
		supabase.from('users').select('id, display_name').eq('invited_by', user!.id),

		supabase.from('feed_tokens').select('token').eq('user_id', user!.id).maybeSingle(),

		// Upcoming/draft events this user is hosting — blocks deletion
		supabase
			.from('events')
			.select('id, title')
			.eq('host_id', user!.id)
			.in('status', ['draft', 'published']),
	]);

	const token = feedToken?.token ?? null;
	const origin = url.origin;

	return {
		profile: profile ?? { display_name: '', email: '', avatar_url: null },
		pendingInvite: pendingInvite ?? null,
		pendingInviteUrl: pendingInvite ? `${origin}/join/${pendingInvite.token}` : null,
		recruited: recruited ?? [],
		feedToken: token,
		rssUrl: token ? `${origin}/feed/rss?token=${token}` : null,
		// .ics extension in the URL is intentional — calendar apps and curl infer
		// the file type from the URL path, not just Content-Type/Content-Disposition.
		icalUrl: token ? `${origin}/feed/ical/toolclub.ics?token=${token}` : null,
		deletionBlockedBy: hostedEvents?.length ? hostedEvents : null,
	};
};

export const actions: Actions = {
	// ── Update display name ───────────────────────────────────────────────────
	updateName: async ({ request, locals }) => {
		const { user, supabase } = locals;
		const data = await request.formData();
		const parsed = displayNameSchema.safeParse({
			display_name: data.get('display_name')?.toString().trim(),
		});
		if (!parsed.success) return fail(400, { error: parsed.error.errors[0].message });

		const { error } = await supabase
			.from('users')
			.update({ display_name: parsed.data.display_name })
			.eq('id', user!.id);

		if (error) return fail(500, { error: 'Failed to update display name.' });
		return { success: true };
	},

	// ── Generate invite ───────────────────────────────────────────────────────
	generateInvite: async ({ locals, url }) => {
		const { user, supabase } = locals;

		// Enforce one pending invite maximum
		const { data: existing } = await supabase
			.from('invites')
			.select('id')
			.eq('invited_by', user!.id)
			.is('redeemed_by', null)
			.gt('expires_at', new Date().toISOString())
			.maybeSingle();

		if (existing) {
			return fail(400, { error: 'You already have a pending invite. Revoke it first.' });
		}

		const token = crypto.randomUUID().replace(/-/g, '');
		const { error } = await supabase.from('invites').insert({
			invited_by: user!.id,
			token,
		});

		if (error) return fail(500, { error: 'Failed to create invite.' });
		return { success: true, inviteUrl: `${url.origin}/join/${token}` };
	},

	// ── Revoke invite ─────────────────────────────────────────────────────────
	revokeInvite: async ({ request, locals }) => {
		const { user, supabase } = locals;
		const data = await request.formData();
		const inviteId = data.get('invite_id')?.toString() ?? '';
		if (!inviteId) return fail(400, { error: 'Missing invite ID.' });

		// RLS ensures only the inviter can delete their own invites
		await supabase.from('invites').delete().eq('id', inviteId).eq('invited_by', user!.id);
		return { success: true };
	},

	// ── Regenerate feed token ─────────────────────────────────────────────────
	regenerateToken: async ({ locals }) => {
		const { user, supabase } = locals;

		// Delete old token first (unique constraint on user_id means we must delete before insert)
		await supabase.from('feed_tokens').delete().eq('user_id', user!.id);

		const newToken = crypto.randomUUID().replace(/-/g, '');
		const { error } = await supabase
			.from('feed_tokens')
			.insert({ user_id: user!.id, token: newToken });

		if (error) return fail(500, { error: 'Failed to regenerate token.' });
		return { success: true };
	},

	// ── Delete account ────────────────────────────────────────────────────────
	deleteAccount: async ({ locals }) => {
		const { user, supabase } = locals;

		// Check blocker: cannot delete if hosting any upcoming event
		const { data: hostedEvents } = await supabase
			.from('events')
			.select('title')
			.eq('host_id', user!.id)
			.in('status', ['draft', 'published']);

		if (hostedEvents?.length) {
			return fail(400, {
				deleteError: `You are the designated host of "${hostedEvents[0].title}". Ask an admin to reassign the host before deleting your account.`,
			});
		}

		const userId = user!.id;
		const admin = createAdminClient();

		// Sign out first — session is gone before any profile data changes,
		// so there is no window where the user is authenticated as "Former member".
		await supabase.auth.signOut();

		// Anonymize the public.users row — retain it per spec ("Former member").
		// We do NOT delete auth.users because the FK (public.users.id →
		// auth.users.id ON DELETE CASCADE) would cascade-delete this row.
		// Content (recaps, comments, suggestions) remains attributed to the
		// anonymised record.
		await admin
			.from('users')
			.update({ display_name: 'Former member', email: null, avatar_url: null })
			.eq('id', userId);

		// Sever the auth identity — change the email in auth.users to a
		// permanently undeliverable address so the original email can never be
		// used to sign in again. (.invalid is a reserved TLD; no MX record exists.)
		await admin.auth.admin.updateUserById(userId, {
			email: `deleted+${userId}@toolclub.invalid`,
		});

		// Hard-delete pending invites and feed tokens
		await Promise.all([
			admin.from('invites').delete().eq('invited_by', userId).is('redeemed_by', null),
			admin.from('feed_tokens').delete().eq('user_id', userId),
		]);

		redirect(303, '/');
	},
};
