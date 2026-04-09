import { fail } from '@sveltejs/kit';
import { createAdminClient } from '$lib/server/db';
import { joinSchema } from '$lib/schemas/forms';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const admin = createAdminClient();

	// Admin client required — visitor is unauthenticated; RLS blocks anon reads.
	const { data: invite } = await admin
		.from('invites')
		.select('id, token, expires_at, redeemed_at, users!invited_by(display_name)')
		.eq('token', params.token)
		.maybeSingle();

	if (!invite) {
		return { state: 'not_found' as const };
	}

	const inviterName =
		(invite.users as unknown as { display_name: string } | null)?.display_name ??
		'A Tool Club member';

	if (invite.redeemed_at) {
		return { state: 'redeemed' as const, inviterName };
	}

	if (new Date(invite.expires_at) < new Date()) {
		return { state: 'expired' as const, inviterName };
	}

	return { state: 'valid' as const, inviterName, token: invite.token };
};

export const actions: Actions = {
	default: async ({ request, params, url, cookies, locals }) => {
		const data = await request.formData();
		const parsed = joinSchema.safeParse({
			email: data.get('email')?.toString().trim() ?? '',
			display_name: data.get('display_name')?.toString().trim() ?? '',
		});
		if (!parsed.success) {
			const first = parsed.error.issues[0];
			return fail(400, { error: first.message });
		}
		const { email, display_name } = parsed.data;

		const admin = createAdminClient();

		// Re-validate the invite — it may have been redeemed since page load.
		const { data: invite } = await admin
			.from('invites')
			.select('id')
			.eq('token', params.token)
			.is('redeemed_by', null)
			.gt('expires_at', new Date().toISOString())
			.maybeSingle();

		if (!invite) {
			return fail(410, { error: 'This invite is no longer valid.', email, display_name });
		}

		// Store invite context in a short-lived httpOnly cookie so the callback
		// handler can complete account creation after the magic link is clicked.
		cookies.set('invite_setup', JSON.stringify({ token: params.token, display_name }), {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			maxAge: 600, // 10 minutes — enough time to check email and click the link
		});

		// Use locals.supabase (the SSR client) for signInWithOtp — it is configured
		// with flowType: 'pkce' by @supabase/ssr, so the magic link carries a code
		// parameter that our /auth/callback exchanges. Using the admin client here
		// falls back to implicit flow (hash fragment), which bypasses the callback
		// and skips profile creation and invite redemption.
		const { error } = await locals.supabase.auth.signInWithOtp({
			email,
			options: {
				emailRedirectTo: `${url.origin}/auth/callback`,
				shouldCreateUser: true, // create the auth.users row on first click
			},
		});

		if (error) {
			console.error('signInWithOtp error:', error.message);
			return fail(500, {
				error: 'Failed to send sign-in link. Please try again.',
				email,
				display_name,
			});
		}

		return { sent: true, email };
	},
};
