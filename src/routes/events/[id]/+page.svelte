<script lang="ts">
	import { applyAction, deserialize } from '$app/forms';
	import type { PageData } from './$types';
	import { initials } from '$lib/utils/events';

	let { data }: { data: PageData } = $props();

	let rsvpError = $state<string | null>(null);
	let submitting = $state(false);

	async function submitRsvp(response: 'yes' | 'no') {
		submitting = true;
		rsvpError = null;

		const formData = new FormData();
		formData.set('response', response);

		const res = await fetch('?/rsvp', { method: 'POST', body: formData });
		const result = deserialize(await res.text());

		if (result.type === 'failure') {
			rsvpError = (result.data?.error as string) ?? 'Failed to save RSVP.';
		} else {
			await applyAction(result);
		}
		submitting = false;
	}

	const isLocked = $derived(data.event.status === 'past');
	const goingFull = $derived(data.isFull && data.myRsvp !== 'yes');
</script>

<svelte:head>
	<title>{data.event.title} — Tool Club</title>
</svelte:head>

<!-- ── Topbar ── -->
<div
	class="sticky top-0 z-10 flex min-h-[3.25rem] items-center justify-between [border-bottom:0.5px_solid_var(--tc-border)] bg-tc-bg px-6"
>
	<a
		href="/events"
		class="flex items-center gap-1.5 text-xs text-tc-muted hover:text-tc-text transition-colors"
	>
		← Events
	</a>
	{#if data.isAdmin}
		<a
			href="/admin/events/{data.event.id}"
			class="rounded-md [border:0.5px_solid_var(--tc-accent-border)] bg-tc-accent-bg px-3 py-1.5 text-xs text-tc-accent-text transition-opacity hover:opacity-85 before:content-['Admin_·_'] before:font-mono before:text-[0.625rem] before:opacity-70"
		>
			Edit
		</a>
	{/if}
</div>

<div class="p-6 max-w-2xl">
	<!-- ── Event header ── -->
	<h1 class="font-display text-2xl font-medium tracking-[-0.02em] text-tc-text mb-5">
		{data.event.title}
	</h1>

	<!-- ── Detail fields ── -->
	<div class="space-y-3 mb-5">
		<div class="flex gap-3 text-[0.8125rem]">
			<span class="w-20 shrink-0 font-mono text-[0.6875rem] pt-px text-tc-muted">When</span>
			<span class="text-tc-text">
				{data.event.dateFormatted}{#if data.event.endFormatted}
					– {data.event.endFormatted}{/if}
			</span>
		</div>

		{#if data.event.host_name}
			<div class="flex gap-3 text-[0.8125rem]">
				<span class="w-20 shrink-0 font-mono text-[0.6875rem] pt-px text-tc-muted">Host</span>
				<span class="text-tc-text">{data.event.host_name}</span>
			</div>
		{/if}

		{#if data.event.location_name}
			<div class="flex gap-3 text-[0.8125rem]">
				<span class="w-20 shrink-0 font-mono text-[0.6875rem] pt-px text-tc-muted">Location</span>
				<span class="text-tc-text">
					{data.event.location_name}
					{#if data.event.address}
						<span class="block text-tc-muted">{data.event.address}</span>
					{/if}
				</span>
			</div>
		{/if}

		{#if data.event.capacity}
			<div class="flex gap-3 text-[0.8125rem]">
				<span class="w-20 shrink-0 font-mono text-[0.6875rem] pt-px text-tc-muted">Capacity</span>
				<span class="text-tc-text">{data.goingCount} / {data.event.capacity}</span>
			</div>
		{/if}

		{#if data.event.links.length > 0}
			<div class="flex gap-3 text-[0.8125rem]">
				<span class="w-20 shrink-0 font-mono text-[0.6875rem] pt-px text-tc-muted">Links</span>
				<div class="space-y-1">
					{#each data.event.links as link}
						<a
							href={link.url}
							target="_blank"
							rel="noopener noreferrer"
							class="block text-tc-accent-text underline underline-offset-2 hover:opacity-80 transition-opacity"
						>
							{link.label}
						</a>
					{/each}
				</div>
			</div>
		{/if}
	</div>

	<!-- ── Body markdown ── -->
	{#if data.event.bodyHtml}
		<div
			class="prose-sm border-t pt-4 [border-color:var(--tc-border)] [border-width:0.5px] mb-5 text-[0.8125rem] text-tc-muted leading-[1.7]"
		>
			{@html data.event.bodyHtml}
		</div>
	{/if}

	<!-- ── RSVP block ── -->
	<div class="rounded-lg [border:0.5px_solid_var(--tc-border)] bg-tc-surface p-4 mb-5">
		<p class="font-mono text-[0.6875rem] text-tc-muted mb-2.5">
			{#if isLocked}
				RSVPs are closed for this event.
			{:else if goingFull}
				This event is full. Contact the host to be added.
			{:else}
				Are you going?
			{/if}
		</p>

		{#if rsvpError}
			<p class="mb-2.5 text-[0.75rem] text-tc-danger">{rsvpError}</p>
		{/if}

		<div class="flex gap-2 mb-3.5">
			<button
				onclick={() => submitRsvp('yes')}
				disabled={isLocked || goingFull || submitting}
				class="flex-1 rounded-md [border:0.5px_solid_var(--tc-border-mid)] py-2 text-[0.8125rem] transition-all disabled:opacity-40 disabled:cursor-not-allowed
					{data.myRsvp === 'yes'
					? 'bg-tc-accent text-white border-transparent hover:opacity-[0.88]'
					: 'bg-transparent text-tc-text hover:bg-tc-bg'}"
			>
				Going
			</button>
			<button
				onclick={() => submitRsvp('no')}
				disabled={isLocked || submitting}
				class="flex-1 rounded-md [border:0.5px_solid_var(--tc-border-mid)] py-2 text-[0.8125rem] transition-all disabled:opacity-40 disabled:cursor-not-allowed
					{data.myRsvp === 'no'
					? 'bg-tc-surface font-medium text-tc-text'
					: 'bg-transparent text-tc-text hover:bg-tc-bg'}"
			>
				Can't make it
			</button>
		</div>

		<!-- Going list -->
		{#if data.goingUsers.length > 0}
			<div class="flex flex-wrap gap-2.5">
				{#each data.goingUsers as user}
					<div class="flex items-center gap-1.5 text-xs text-tc-muted">
						<div
							class="flex h-7 w-7 items-center justify-center rounded-full bg-tc-accent-bg font-mono text-[0.625rem] font-medium text-tc-accent-text"
						>
							{initials(user.display_name)}
						</div>
						{user.display_name}
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
