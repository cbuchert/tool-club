<script lang="ts">
	import { applyAction, deserialize } from '$app/forms';
	import type { PageData } from './$types';
	import Topbar from '$lib/components/Topbar.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import Avatar from '$lib/components/Avatar.svelte';

	let { data }: { data: PageData } = $props();

	let submitting = $state(false);
	let commentBody = $state('');
	let commentError = $state<string | null>(null);

	async function toggleVote() {
		submitting = true;
		const res = await fetch(`/suggestions/${data.suggestion.id}?/vote`, {
			method: 'POST',
			body: new FormData(),
		});
		const result = deserialize(await res.text());
		await applyAction(result);
		submitting = false;
	}

	async function postComment() {
		if (!commentBody.trim()) return;
		submitting = true;
		commentError = null;
		const fd = new FormData();
		fd.set('body', commentBody);
		const res = await fetch(`/suggestions/${data.suggestion.id}?/comment`, {
			method: 'POST',
			body: fd,
		});
		const result = deserialize(await res.text());
		if (result.type === 'failure') {
			commentError = (result.data?.error as string) ?? 'Something went wrong.';
		} else {
			commentBody = '';
			await applyAction(result);
		}
		submitting = false;
	}

	async function deleteComment(commentId: string) {
		const fd = new FormData();
		fd.set('comment_id', commentId);
		const res = await fetch(`/suggestions/${data.suggestion.id}?/deleteComment`, {
			method: 'POST',
			body: fd,
		});
		const result = deserialize(await res.text());
		await applyAction(result);
	}
</script>

<svelte:head>
	<title>{data.suggestion.title} — Tool Club</title>
</svelte:head>

<!-- ── Topbar ── -->
<Topbar>
	{#snippet left()}
		<a href="/suggestions" class="text-xs text-tc-muted hover:text-tc-text transition-colors"
			>← Suggestions</a
		>
	{/snippet}
</Topbar>

<div class="p-4 sm:p-6 max-w-2xl">
	<!-- ── Header ── -->
	<div class="flex items-start gap-4 mb-5">
		<!-- Vote column -->
		<div class="flex shrink-0 flex-col items-center gap-1" style="min-width: 2.25rem">
			<button
				onclick={toggleVote}
				disabled={!data.votingOpen || submitting}
				aria-label={data.voted ? 'Remove vote' : 'Vote'}
				class="flex h-8 w-8 items-center justify-center rounded-md text-sm transition-all disabled:cursor-not-allowed disabled:opacity-35 [border:0.5px_solid_var(--tc-border-mid)]
					{data.voted
					? 'bg-tc-accent-bg [border-color:var(--tc-accent-border)] text-tc-accent-text'
					: 'bg-transparent text-tc-muted hover:bg-tc-surface'}">▲</button
			>
			<span class="font-mono text-xs font-medium text-tc-text">{data.voteCount}</span>
		</div>

		<div class="min-w-0 flex-1">
			<h1 class="font-display text-xl font-medium tracking-[-0.02em] text-tc-text mb-1">
				{data.suggestion.title}
			</h1>
			<p class="text-xs text-tc-muted">
				{data.author.name}
				{#if data.suggestion.host_name}
					· Host: {data.suggestion.host_name}{/if}
				{#if data.closesLabel}
					· {data.closesLabel}{/if}
			</p>
		</div>

		<!-- Status badge -->
		{#if data.suggestion.status === 'planned'}
			<Badge variant="planned" />
		{:else if data.suggestion.status === 'closed'}
			<Badge variant="closed" />
		{:else}
			<Badge variant="open" label="open" />
		{/if}
	</div>

	<!-- ── Promoted event banner ── -->
	{#if data.promotedEvent}
		<a
			href="/events/{data.promotedEvent.id}"
			class="mb-5 flex items-center gap-2 rounded-lg [border:0.5px_solid_var(--tc-accent-border)] bg-tc-accent-bg px-4 py-3 text-[0.8125rem] text-tc-accent-text transition-opacity hover:opacity-85"
		>
			<span class="font-medium">This became an event →</span>
			<span class="text-tc-accent-text opacity-80">{data.promotedEvent.title}</span>
		</a>
	{/if}

	<!-- ── Body ── -->
	{#if data.suggestion.bodyHtml}
		<div class="prose mb-6">
			{@html data.suggestion.bodyHtml}
		</div>
	{/if}

	<!-- ── Comments ── -->
	<div class="[border-top:0.5px_solid_var(--tc-border)] pt-5">
		<p class="mb-4 font-mono text-[0.625rem] uppercase tracking-[0.08em] text-tc-hint">
			{data.comments.length} comment{data.comments.length === 1 ? '' : 's'}
		</p>

		{#each data.comments as comment (comment.id)}
			<div class="mb-4 flex items-start gap-2.5">
				<div class="mt-0.5">
					<Avatar name={comment.author_name} size="sm" />
				</div>
				<div class="min-w-0 flex-1">
					<div class="mb-0.5 flex items-baseline gap-1.5">
						<span class="text-xs font-medium text-tc-text">{comment.author_name}</span>
						<span class="font-mono text-[0.625rem] text-tc-hint">
							{new Date(comment.created_at).toLocaleDateString('en-US', {
								month: 'short',
								day: 'numeric',
							})}
						</span>
						{#if comment.is_mine}
							<button
								onclick={() => deleteComment(comment.id)}
								class="font-mono text-[0.625rem] text-tc-hint underline underline-offset-2 hover:text-tc-danger transition-colors"
								>delete</button
							>
						{/if}
					</div>
					<p class="text-[0.8125rem] text-tc-muted leading-relaxed">{comment.body}</p>
				</div>
			</div>
		{/each}

		<!-- Comment form — visible on open + planned suggestions -->
		{#if data.suggestion.status !== 'closed'}
			<div class="mt-4">
				{#if commentError}
					<p class="mb-2 text-xs text-tc-danger">{commentError}</p>
				{/if}
				<textarea
					bind:value={commentBody}
					placeholder="Add a comment…"
					rows="3"
					class="w-full resize-none rounded-md [border:0.5px_solid_var(--tc-border-mid)] bg-tc-bg px-3 py-2 text-[0.8125rem] text-tc-text outline-none transition-colors focus:[border-color:var(--tc-accent-border)] mb-2"
				></textarea>
				<button
					onclick={postComment}
					disabled={submitting || !commentBody.trim()}
					class="rounded-md bg-tc-accent px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-[0.88] disabled:opacity-40 disabled:cursor-not-allowed"
				>
					{submitting ? 'Posting…' : 'Post comment'}
				</button>
			</div>
		{/if}
	</div>
</div>
