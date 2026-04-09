import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

// Routes that don't require authentication.
const PUBLIC_ROUTES = ['/', '/signin', '/auth/callback', '/feed/public'];

function isPublicRoute(pathname: string): boolean {
	if (PUBLIC_ROUTES.includes(pathname)) return true;
	if (pathname.startsWith('/join/')) return true;
	return false;
}

export const load: LayoutServerLoad = async ({ locals, url }) => {
	const { user, supabase } = locals;

	if (!user && !isPublicRoute(url.pathname)) {
		redirect(303, '/signin');
	}

	// Fetch the public.users profile for display name and role.
	// Needed by the layout shell (sidebar display name, admin nav item).
	let profile: { display_name: string; role: string } | null = null;
	if (user) {
		const { data } = await supabase
			.from('users')
			.select('display_name, role')
			.eq('id', user.id)
			.single();
		profile = data;
	}

	return { user, profile };
};
