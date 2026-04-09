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
		const data = await request.formData();
		const email = data.get('email')?.toString().trim() ?? '';

		if (!email) return fail(400, { error: 'Email is required.' });

		const { error } = await locals.supabase.auth.signInWithOtp({
			email,
			options: {
				emailRedirectTo: `${url.origin}/auth/callback`,
				shouldCreateUser: false, // existing members only — new users go through /join
			},
		});

		// Always show the "check your email" state regardless of whether the email
		// exists. This prevents leaking which emails are registered. Supabase
		// silently drops the email for unknown addresses when shouldCreateUser=false.
		if (error && error.status !== 200) {
			console.error('signInWithOtp error:', error.message);
		}

		return { sent: true, email };
	},
};
