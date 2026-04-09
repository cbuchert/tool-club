import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

// Hard gate: any non-admin reaching /admin/* is silently redirected to /events.
// Do not 403 — that would confirm the route exists to non-admins.
export const load: LayoutServerLoad = async ({ locals }) => {
	const { user, supabase } = locals;

	if (!user) redirect(303, '/signin');

	const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();

	if (profile?.role !== 'admin') redirect(303, '/events');

	return {};
};
