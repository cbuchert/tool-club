import type { PageServerLoad } from './$types';
import { isVotingOpen } from '$lib/utils/suggestions';

export const load: PageServerLoad = async ({ locals }) => {
	const { user, supabase } = locals;

	// Load all suggestions with author name
	const { data: rawSuggestions } = await supabase
		.from('suggestions')
		.select(
			'id, title, status, host_name, voting_closes_at, created_at, author_id, promoted_to_event_id, users!author_id(display_name)'
		)
		.order('created_at', { ascending: false });

	// Load all votes and comments for counting (small dataset — fine to load in full)
	const suggestionIds = (rawSuggestions ?? []).map((s) => s.id);

	const [{ data: allVotes }, { data: allComments }, { data: myVotes }] = await Promise.all([
		suggestionIds.length
			? supabase.from('votes').select('suggestion_id').in('suggestion_id', suggestionIds)
			: Promise.resolve({ data: [] }),
		suggestionIds.length
			? supabase.from('comments').select('suggestion_id').in('suggestion_id', suggestionIds)
			: Promise.resolve({ data: [] }),
		suggestionIds.length
			? supabase
					.from('votes')
					.select('suggestion_id')
					.in('suggestion_id', suggestionIds)
					.eq('user_id', user!.id)
			: Promise.resolve({ data: [] }),
	]);

	const voteCountBySuggestion = new Map<string, number>();
	const commentCountBySuggestion = new Map<string, number>();
	const myVotedIds = new Set((myVotes ?? []).map((v) => v.suggestion_id));

	for (const v of allVotes ?? []) {
		voteCountBySuggestion.set(
			v.suggestion_id,
			(voteCountBySuggestion.get(v.suggestion_id) ?? 0) + 1
		);
	}
	for (const c of allComments ?? []) {
		commentCountBySuggestion.set(
			c.suggestion_id,
			(commentCountBySuggestion.get(c.suggestion_id) ?? 0) + 1
		);
	}

	const suggestions = (rawSuggestions ?? []).map((s) => ({
		id: s.id,
		title: s.title,
		status: s.status as 'open' | 'planned' | 'closed',
		host_name: s.host_name as string | null,
		voting_closes_at: s.voting_closes_at as string | null,
		author_name: (s.users as unknown as { display_name: string } | null)?.display_name ?? 'Member',
		vote_count: voteCountBySuggestion.get(s.id) ?? 0,
		comment_count: commentCountBySuggestion.get(s.id) ?? 0,
		voted: myVotedIds.has(s.id),
		voting_open: isVotingOpen(s.status, s.voting_closes_at as string | null),
		promoted_to_event_id: s.promoted_to_event_id as string | null,
	}));
	// Sort by created_at descending (newest first) — stable ordering that doesn't
	// jump around when vote counts change. Vote count is visible but not the sort key.

	const openCount = suggestions.filter((s) => s.status === 'open').length;

	return { suggestions, openCount };
};
