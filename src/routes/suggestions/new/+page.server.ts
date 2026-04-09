import { fail, redirect } from '@sveltejs/kit';
import { proposalSchema } from '$lib/schemas/forms';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const { user, supabase } = locals;
		const data = await request.formData();

		const parsed = proposalSchema.safeParse({
			title: data.get('title')?.toString().trim() ?? '',
			body_md: data.get('body_md')?.toString().trim() ?? '',
			host_name: data.get('host_name')?.toString().trim() || undefined,
		});

		if (!parsed.success) {
			const first = parsed.error.errors[0];
			return fail(400, { error: first.message, values: Object.fromEntries(data) });
		}

		const { data: suggestion, error: insertError } = await supabase
			.from('suggestions')
			.insert({
				author_id: user!.id,
				title: parsed.data.title,
				body_md: parsed.data.body_md,
				host_name: parsed.data.host_name ?? null,
				status: 'open',
			})
			.select('id')
			.single();

		if (insertError) return fail(500, { error: 'Failed to save. Please try again.' });

		redirect(303, `/suggestions/${suggestion.id}`);
	},
};
