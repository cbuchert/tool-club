import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

// Redirect already-authenticated users away from the sign-in page.
export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.user) {
		const { redirect } = await import('@sveltejs/kit');
		redirect(303, '/events');
	}
	return { error: url.searchParams.get('error') };
};

export const actions: Actions = {
	default: async ({ request, locals, url }) => {
		try {
			const data = await request.formData();
			const email = data.get('email')?.toString().trim() ?? '';

			if (!email) return fail(400, { error: 'Email is required.' });

			const { error } = await locals.supabase.auth.signInWithOtp({
				email,
				options: {
					emailRedirectTo: `${url.origin}/auth/callback`,
					// Never create new users from the sign-in form. New accounts are
					// created exclusively through the invite flow (/join/[token]).
					shouldCreateUser: false,
				},
			});

			// Intentional: always return { sent: true } regardless of whether the
			// email is registered. Supabase silently drops the OTP for unknown
			// addresses when shouldCreateUser=false. Returning an error here would
			// expose which emails are in the system — email enumeration is a security
			// anti-pattern and particularly bad for an invite-only community.
			if (error) console.error('signInWithOtp:', error.message);

			return { sent: true, email };
		} catch (e) {
			console.error('signin action threw:', e);
			return fail(500, { error: String(e) });
		}
	},
};
