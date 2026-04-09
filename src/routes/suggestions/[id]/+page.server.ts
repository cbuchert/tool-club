import { error, fail, redirect } from '@sveltejs/kit';
import { marked } from 'marked';
import type { Actions, PageServerLoad } from './$types';
import { isVotingOpen, formatVotingCloses } from '$lib/utils/suggestions';
import { DEFAULT_TIMEZONE } from '$lib/temporal';
import { createAdminClient } from '$lib/server/db';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { user, supabase } = locals;

	const { data: s } = await supabase
		.from('suggestions')
		.select('*, users!author_id(id, display_name)')
		.eq('id', params.id)
		.maybeSingle();

	if (!s) error(404, 'Suggestion not found');

	// Vote count + whether current user voted
	const { count: voteCount } = await supabase
		.from('votes')
		.select('id', { count: 'exact', head: true })
		.eq('suggestion_id', params.id);

	const { data: myVote } = await supabase
		.from('votes')
		.select('id')
		.eq('suggestion_id', params.id)
		.eq('user_id', user!.id)
		.maybeSingle();

	// Comments with author names, oldest first
	const { data: comments } = await supabase
		.from('comments')
		.select('id, body, created_at, user_id, users!user_id(display_name)')
		.eq('suggestion_id', params.id)
		.order('created_at', { ascending: true });

	// If promoted, load the event title
	let promotedEvent: { id: string; title: string } | null = null;
	if (s.promoted_to_event_id) {
		const { data: evt } = await supabase
			.from('events')
			.select('id, title')
			.eq('id', s.promoted_to_event_id)
			.maybeSingle();
		promotedEvent = evt;
	}

	const bodyHtml = s.body_md ? await marked(s.body_md, { async: true }) : null;
	const votingOpen = isVotingOpen(s.status, s.voting_closes_at as string | null);
	const closesLabel = formatVotingCloses(s.voting_closes_at as string | null, DEFAULT_TIMEZONE);
	const author = s.users as unknown as { id: string; display_name: string } | null;

	return {
		suggestion: {
			id: s.id,
			title: s.title,
			status: s.status as 'open' | 'planned' | 'closed',
			host_name: s.host_name as string | null,
			bodyHtml,
			created_at: s.created_at,
		},
		author: { id: author?.id ?? s.author_id, name: author?.display_name ?? 'Member' },
		voteCount: voteCount ?? 0,
		voted: !!myVote,
		votingOpen,
		closesLabel,
		promotedEvent,
		comments: (comments ?? []).map((c) => ({
			id: c.id,
			body: c.body,
			created_at: c.created_at,
			user_id: c.user_id,
			author_name:
				(c.users as unknown as { display_name: string } | null)?.display_name ?? 'Member',
			is_mine: c.user_id === user!.id,
		})),
		isAdmin:
			(await supabase.from('users').select('role').eq('id', user!.id).single()).data?.role ===
			'admin',
	};
};

export const actions: Actions = {
	// Toggle vote
	vote: async ({ params, locals }) => {
		const { user, supabase } = locals;

		const { data: suggestion } = await supabase
			.from('suggestions')
			.select('status, voting_closes_at')
			.eq('id', params.id)
			.maybeSingle();

		if (!suggestion) return fail(404, { error: 'Suggestion not found.' });
		if (!isVotingOpen(suggestion.status, suggestion.voting_closes_at as string | null)) {
			return fail(400, { error: 'Voting is closed for this suggestion.' });
		}

		const { data: existing } = await supabase
			.from('votes')
			.select('id')
			.eq('suggestion_id', params.id)
			.eq('user_id', user!.id)
			.maybeSingle();

		if (existing) {
			await supabase.from('votes').delete().eq('id', existing.id);
		} else {
			await supabase.from('votes').insert({ suggestion_id: params.id, user_id: user!.id });
		}

		return { voted: !existing };
	},

	// Post comment
	comment: async ({ params, request, locals }) => {
		const { user, supabase } = locals;
		const data = await request.formData();
		const body = data.get('body')?.toString().trim() ?? '';

		if (!body) return fail(400, { error: 'Comment cannot be empty.' });
		if (body.length > 1000) return fail(400, { error: 'Comment is too long.' });

		const { error: insertError } = await supabase
			.from('comments')
			.insert({ suggestion_id: params.id, user_id: user!.id, body });

		if (insertError) return fail(500, { error: 'Failed to post comment.' });
		return { commented: true };
	},

	// Delete comment (own, or any if admin)
	deleteComment: async ({ request, locals }) => {
		const { user, supabase } = locals;
		const data = await request.formData();
		const commentId = data.get('comment_id')?.toString() ?? '';
		if (!commentId) return fail(400, { error: 'Missing comment ID.' });

		const isAdmin =
			(await supabase.from('users').select('role').eq('id', user!.id).single()).data?.role ===
			'admin';

		if (isAdmin) {
			// Admin can delete any comment — use admin client to bypass RLS ownership check
			const admin = createAdminClient();
			await admin.from('comments').delete().eq('id', commentId);
		} else {
			// RLS enforces ownership — silently no-ops if not the comment author
			await supabase.from('comments').delete().eq('id', commentId).eq('user_id', user!.id);
		}
		return { deleted: true };
	},

	// ── Admin-only: close voting ──────────────────────────────
	close: async ({ params, locals }) => {
		const { user, supabase } = locals;
		const isAdmin =
			(await supabase.from('users').select('role').eq('id', user!.id).single()).data?.role ===
			'admin';
		if (!isAdmin) return fail(403, { error: 'Admins only.' });

		await createAdminClient().from('suggestions').update({ status: 'closed' }).eq('id', params.id);
		return { success: true };
	},

	// ── Admin-only: reopen voting ─────────────────────────────
	reopen: async ({ params, locals }) => {
		const { user, supabase } = locals;
		const isAdmin =
			(await supabase.from('users').select('role').eq('id', user!.id).single()).data?.role ===
			'admin';
		if (!isAdmin) return fail(403, { error: 'Admins only.' });

		await createAdminClient().from('suggestions').update({ status: 'open' }).eq('id', params.id);
		return { success: true };
	},

	// ── Admin-only: promote to event ──────────────────────────
	// Creates a draft event pre-filled from the suggestion, marks the suggestion
	// as planned, then redirects the admin to the event edit page.
	promote: async ({ params, locals }) => {
		const { user, supabase } = locals;
		const isAdmin =
			(await supabase.from('users').select('role').eq('id', user!.id).single()).data?.role ===
			'admin';
		if (!isAdmin) return fail(403, { error: 'Admins only.' });

		const { data: suggestion } = await supabase
			.from('suggestions')
			.select('title, body_md, host_name, status')
			.eq('id', params.id)
			.maybeSingle();

		if (!suggestion) return fail(404, { error: 'Suggestion not found.' });
		if (suggestion.status === 'planned') return fail(400, { error: 'Already promoted.' });

		const admin = createAdminClient();

		// Create the draft event pre-filled from suggestion fields.
		// starts_at is required — use a placeholder far in the future.
		// The admin will set the real date on the edit page.
		const { data: event, error: insertError } = await admin
			.from('events')
			.insert({
				title: suggestion.title,
				body_md: suggestion.body_md,
				host_name: suggestion.host_name ?? 'TBD',
				starts_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days out
				status: 'draft',
				promoted_from_id: params.id,
			})
			.select('id')
			.single();

		if (insertError) return fail(500, { error: 'Failed to create event.' });

		// Mark suggestion as planned, record the promoted event.
		await admin
			.from('suggestions')
			.update({ status: 'planned', promoted_to_event_id: event.id })
			.eq('id', params.id);

		redirect(303, `/admin/events/${event.id}`);
	},
};
