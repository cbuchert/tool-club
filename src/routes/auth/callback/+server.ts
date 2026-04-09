import { redirect } from '@sveltejs/kit';
import { createAdminClient } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals, cookies }) => {
	const code = url.searchParams.get('code');

	if (!code) redirect(303, '/signin');

	const { error: exchangeError } = await locals.supabase.auth.exchangeCodeForSession(code);
	if (exchangeError) redirect(303, '/signin?error=auth_failed');

	const {
		data: { user },
	} = await locals.supabase.auth.getUser();

	if (!user) redirect(303, '/signin?error=auth_failed');

	// Check whether this user already has a public.users profile.
	const { data: profile } = await locals.supabase
		.from('users')
		.select('id')
		.eq('id', user.id)
		.maybeSingle();

	if (profile) {
		// Existing member — go straight to the app.
		redirect(303, '/events');
	}

	// No profile. Check for a pending invite cookie set by /join/[token].
	const cookieRaw = cookies.get('invite_setup');
	if (!cookieRaw) {
		// Authenticated but no profile and no invite — they need an invite to join.
		await locals.supabase.auth.signOut();
		redirect(303, '/signin?error=no_account');
	}

	let inviteData: { token: string; display_name: string };
	try {
		inviteData = JSON.parse(cookieRaw);
	} catch {
		await locals.supabase.auth.signOut();
		redirect(303, '/signin?error=auth_failed');
	}

	const admin = createAdminClient();

	// Validate the invite is still unredeemed and unexpired.
	const { data: invite } = await admin
		.from('invites')
		.select('id, invited_by')
		.eq('token', inviteData.token)
		.is('redeemed_by', null)
		.gt('expires_at', new Date().toISOString())
		.maybeSingle();

	if (!invite) {
		await locals.supabase.auth.signOut();
		cookies.delete('invite_setup', { path: '/' });
		redirect(303, '/signin?error=auth_failed');
	}

	// Create the public.users profile and mark the invite redeemed atomically.
	// Using admin client because the user has no profile yet (RLS would block).
	await admin.from('users').insert({
		id: user.id,
		display_name: inviteData.display_name || user.email?.split('@')[0] || 'New member',
		email: user.email,
		role: 'member',
		invited_by: invite.invited_by,
	});

	await admin
		.from('invites')
		.update({ redeemed_by: user.id, redeemed_at: new Date().toISOString() })
		.eq('id', invite.id);

	cookies.delete('invite_setup', { path: '/' });

	redirect(303, '/events');
};
