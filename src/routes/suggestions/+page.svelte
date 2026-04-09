<script lang="ts">
	import { applyAction, deserialize } from '$app/forms';
	import type { PageData } from './$types';
	import { formatVotingCloses } from '$lib/utils/suggestions';
	import { DEFAULT_TIMEZONE } from '$lib/temporal';

	let { data }: { data: PageData } = $props();

	let submitting = $state<string | null>(null); // suggestion id being voted on

	async function toggleVote(id: string) {
		submitting = id;
		const fd = new FormData();
		const res = await fetch(`/suggestions/${id}`, { method: 'POST', body: fd });
		const result = deserialize(await res.text());
		await applyAction(result);
		submitting = null;
	}

	function metaLine(s: (typeof data.suggestions)[0]): string {
		const parts: string[] = [s.author_name];
		if (s.host_name) parts.push(`Host: ${s.host_name}`);
		const closes = formatVotingCloses(s.voting_closes_at, DEFAULT_TIMEZONE);
		if (closes) parts.push(closes);
		if (s.comment_count > 0)
			parts.push(`${s.comment_count} comment${s.comment_count === 1 ? '' : 's'}`);
		return parts.join(' · ');
	}
</script>

<svelte:head>
	<title>Suggestions — Tool Club</title>
</svelte:head>

<!-- ── Topbar ── -->
<div
	class="sticky top-0 z-10 flex min-h-[3.25rem] items-center justify-between [border-bottom:0.5px_solid_var(--tc-border)] bg-tc-bg px-4 sm:px-6"
>
	<span class="font-display text-base font-medium text-tc-text">Suggestions</span>
	<a
		href="/suggestions/new"
		class="rounded-md bg-tc-accent px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-[0.88]"
	>
		+ Propose
	</a>
</div>

<!-- ── List ── -->
<div class="flex-1 p-4 sm:p-6">
	{#if data.suggestions.length === 0}
		<p class="text-[0.8125rem] text-tc-muted">
			No suggestions yet. Be the first to propose something.
		</p>
	{:else}
		<p class="mb-3 font-mono text-[0.625rem] uppercase tracking-[0.08em] text-tc-hint">
			{data.openCount} open · sorted by votes
		</p>

		{#each data.suggestions as s (s.id)}
			<div class="mb-2.5 flex items-start gap-3 rounded-lg [border:0.5px_solid_var(--tc-border)] bg-tc-bg p-4 transition-colors hover:[border-color:var(--tc-border-mid)]">

				<!-- Vote column — fixed width, never shrinks -->
				<div class="flex w-9 shrink-0 flex-col items-center gap-1">
					<button
						onclick={() => toggleVote(s.id)}
						disabled={!s.voting_open || submitting === s.id}
						aria-label={s.voted ? 'Remove vote' : 'Vote for this suggestion'}
						class="flex h-8 w-8 items-center justify-center rounded-md text-sm transition-all disabled:cursor-not-allowed disabled:opacity-35 [border:0.5px_solid_var(--tc-border-mid)] {s.voted ? 'bg-tc-accent-bg [border-color:var(--tc-accent-border)] text-tc-accent-text' : 'bg-transparent text-tc-muted hover:bg-tc-surface'}"
					>▲</button>
					<span class="font-mono text-xs font-medium text-tc-text">{s.vote_count}</span>
				</div>

				<!-- Content + badge share this column so the badge never steals title width -->
				<div class="min-w-0 flex-1">
					<div class="mb-0.5 flex items-start gap-2">
						<a href="/suggestions/{s.id}" class="min-w-0 flex-1 text-sm font-medium leading-snug text-tc-text transition-colors hover:text-tc-accent-text">
							{s.title}
						</a>
						{#if s.status === 'planned'}
							<span class="mt-0.5 shrink-0 rounded-full [border:0.5px_solid_var(--tc-purple-border)] bg-tc-purple-bg px-2 py-0.5 font-mono text-[0.625rem] text-tc-purple-text">planned</span>
						{:else if s.status === 'closed'}
							<span class="mt-0.5 shrink-0 rounded-full [border:0.5px_solid_var(--tc-border-mid)] bg-tc-surface px-2 py-0.5 font-mono text-[0.625rem] text-tc-hint">closed</span>
						{:else}
							<span class="mt-0.5 shrink-0 rounded-full [border:0.5px_solid_var(--tc-info-border)] bg-tc-info-bg px-2 py-0.5 font-mono text-[0.625rem] text-tc-info-text">open</span>
						{/if}
					</div>
					<p class="text-xs text-tc-muted">{metaLine(s)}</p>
				</div>
			</div>
		{/each}
	{/if}
</div>
