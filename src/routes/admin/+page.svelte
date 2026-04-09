<script lang="ts">
	import Topbar from '$lib/components/Topbar.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Admin — Tool Club</title>
</svelte:head>

<Topbar>
	{#snippet left()}
		<span class="font-display text-base font-medium text-tc-text">Admin</span>
	{/snippet}
</Topbar>

<div class="p-4 sm:p-6 max-w-xl space-y-2">
	<a
		href="/admin/events"
		class="flex items-center justify-between rounded-lg [border:0.5px_solid_var(--tc-border)] bg-tc-bg p-4 transition-colors hover:[border-color:var(--tc-border-mid)] hover:bg-tc-surface"
	>
		<div>
			<p class="text-sm font-medium text-tc-text">Events</p>
			<p class="text-xs text-tc-muted">Create, edit, publish, and delete events</p>
		</div>
		{#if data.draftCount > 0}
			<span
				class="rounded-full bg-tc-warn-bg [border:0.5px_solid_var(--tc-warn-border)] px-2 py-0.5 font-mono text-[0.625rem] text-tc-warn-text"
			>
				{data.draftCount} draft{data.draftCount !== 1 ? 's' : ''}
			</span>
		{/if}
	</a>

	<a
		href="/admin/members"
		class="flex items-center justify-between rounded-lg [border:0.5px_solid_var(--tc-border)] bg-tc-bg p-4 transition-colors hover:[border-color:var(--tc-border-mid)] hover:bg-tc-surface"
	>
		<div>
			<p class="text-sm font-medium text-tc-text">Members</p>
			<p class="text-xs text-tc-muted">
				{data.memberCount}
				{data.memberCount === 1 ? 'member' : 'members'} · {data.pendingInviteCount} pending
				{data.pendingInviteCount === 1 ? 'invite' : 'invites'}
			</p>
		</div>
		{#if data.openSuggestionCount > 0}
			<span
				class="rounded-full bg-tc-surface [border:0.5px_solid_var(--tc-border)] px-2 py-0.5 font-mono text-[0.625rem] text-tc-hint"
			>
				{data.openSuggestionCount} open {data.openSuggestionCount === 1
					? 'suggestion'
					: 'suggestions'}
			</span>
		{/if}
	</a>
</div>
