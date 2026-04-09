<script lang="ts">
	import Topbar from '$lib/components/Topbar.svelte';
	import type { PageData } from './$types';
	import { cardDay, cardMonth } from '$lib/utils/events';

	let { data }: { data: PageData } = $props();

	const groups = $derived([
		{ label: 'Drafts', items: data.events.filter((e) => e.status === 'draft') },
		{ label: 'Published', items: data.events.filter((e) => e.status === 'published') },
		{ label: 'Past', items: data.events.filter((e) => e.status === 'past') },
	]);

	function statusClasses(status: string): string {
		if (status === 'draft')
			return 'bg-tc-warn-bg text-tc-warn-text [border-color:var(--tc-warn-border)]';
		if (status === 'published')
			return 'bg-tc-accent-bg text-tc-accent-text [border-color:var(--tc-accent-border)]';
		return 'bg-tc-surface text-tc-hint [border-color:var(--tc-border-mid)]';
	}
</script>

<svelte:head>
	<title>Events — Admin — Tool Club</title>
</svelte:head>

<Topbar>
	{#snippet left()}
		<a href="/admin" class="text-xs text-tc-muted transition-colors hover:text-tc-text">← Admin</a>
	{/snippet}
	{#snippet right()}
		<a
			href="/admin/events/new"
			class="rounded-md bg-tc-accent px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-[0.88]"
		>
			+ New event
		</a>
	{/snippet}
</Topbar>

<div class="p-4 sm:p-6 max-w-2xl">
	{#if data.events.length === 0}
		<p class="text-sm text-tc-muted">No events yet.</p>
	{:else}
		{#each groups as group (group.label)}
			{#if group.items.length > 0}
				<p
					class="mb-2 mt-5 font-mono text-[0.625rem] uppercase tracking-[0.08em] text-tc-hint first:mt-0"
				>
					{group.label}
				</p>
				{#each group.items as event (event.id)}
					<a
						href="/admin/events/{event.id}"
						class="mb-2 flex items-center gap-3 rounded-lg [border:0.5px_solid_var(--tc-border)] bg-tc-bg p-3.5 transition-colors hover:[border-color:var(--tc-border-mid)] hover:bg-tc-surface"
					>
						<div class="w-8 shrink-0 text-center">
							<div class="font-display text-lg font-medium leading-none text-tc-text">
								{cardDay(event.starts_at)}
							</div>
							<div class="font-mono text-[0.5625rem] uppercase tracking-[0.06em] text-tc-muted">
								{cardMonth(event.starts_at)}
							</div>
						</div>
						<div class="min-w-0 flex-1">
							<p class="truncate text-sm font-medium text-tc-text">{event.title}</p>
							<p class="text-xs text-tc-muted">{event.host_name}</p>
						</div>
						<span
							class="rounded-full [border:0.5px_solid] px-2 py-0.5 font-mono text-[0.625rem] {statusClasses(
								event.status
							)}"
						>
							{event.status}
						</span>
					</a>
				{/each}
			{/if}
		{/each}
	{/if}
</div>
