<script lang="ts">
	import { applyAction, deserialize } from '$app/forms';
	import type { PageData } from './$types';
	import Topbar from '$lib/components/Topbar.svelte';
	import Avatar from '$lib/components/Avatar.svelte';

	let { data }: { data: PageData } = $props();

	let rsvpError = $state<string | null>(null);
	let rsvpSubmitting = $state(false);
	let recapBody = $state('');
	let recapError = $state<string | null>(null);
	let recapSubmitting = $state(false);
	let photoUploading = $state(false);
	let photoError = $state<string | null>(null);

	const isLocked = $derived(data.event.status === 'past');
	const goingFull = $derived(data.isFull && data.myRsvp !== 'yes');

	async function submitRsvp(response: 'yes' | 'no') {
		rsvpSubmitting = true;
		rsvpError = null;
		const fd = new FormData();
		fd.set('response', response);
		const res = await fetch(`/events/${data.event.id}?/rsvp`, { method: 'POST', body: fd });
		const result = deserialize(await res.text());
		if (result.type === 'failure') rsvpError = (result.data?.error as string) ?? 'Failed.';
		else await applyAction(result);
		rsvpSubmitting = false;
	}

	async function submitRecap() {
		recapSubmitting = true;
		recapError = null;
		const fd = new FormData();
		fd.set('body_md', recapBody);
		const res = await fetch(`/events/${data.event.id}?/writeRecap`, { method: 'POST', body: fd });
		const result = deserialize(await res.text());
		if (result.type === 'failure') recapError = (result.data?.error as string) ?? 'Failed.';
		else await applyAction(result);
		recapSubmitting = false;
	}

	async function uploadPhoto(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file || !data.recap) return;
		photoUploading = true;
		photoError = null;
		const fd = new FormData();
		fd.set('photo', file);
		fd.set('recap_id', data.recap.id);
		const res = await fetch(`/events/${data.event.id}?/uploadPhoto`, { method: 'POST', body: fd });
		const result = deserialize(await res.text());
		if (result.type === 'failure') photoError = (result.data?.error as string) ?? 'Upload failed.';
		else await applyAction(result);
		photoUploading = false;
		input.value = '';
	}

	async function togglePhoto(photoId: string, isPublic: boolean) {
		const fd = new FormData();
		fd.set('photo_id', photoId);
		fd.set('is_public', String(!isPublic));
		const res = await fetch(`/events/${data.event.id}?/togglePhoto`, { method: 'POST', body: fd });
		const result = deserialize(await res.text());
		if (result.type !== 'failure') await applyAction(result);
	}
</script>

<svelte:head>
	<title>{data.event.title} — Tool Club</title>
</svelte:head>

<!-- ── Topbar ── -->
<Topbar>
	{#snippet left()}
		<a
			href="/events"
			class="flex items-center gap-1.5 text-xs text-tc-muted hover:text-tc-text transition-colors"
		>
			← Events
		</a>
	{/snippet}
	{#snippet right()}
		{#if data.isAdmin}
			<a
				href="/admin/events/{data.event.id}"
				class="rounded-md [border:0.5px_solid_var(--tc-accent-border)] bg-tc-accent-bg px-3 py-1.5 text-xs text-tc-accent-text transition-opacity hover:opacity-85 before:content-['Admin_·_'] before:font-mono before:text-[0.625rem] before:opacity-70"
			>
				Edit
			</a>
		{/if}
	{/snippet}
</Topbar>

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
		<div class="prose mb-5 [border-top:0.5px_solid_var(--tc-border)] pt-4">
			{@html data.event.bodyHtml}
		</div>
	{/if}

	<!-- ── RSVP block ── -->
	<div class="rounded-lg [border:0.5px_solid_var(--tc-border)] bg-tc-surface p-4 mb-5">
		<p class="font-mono text-[0.6875rem] text-tc-muted mb-2.5">
			{#if isLocked}RSVPs are closed for this event.
			{:else if goingFull}This event is full. Contact the host to be added.
			{:else}Are you going?{/if}
		</p>

		{#if rsvpError}
			<p class="mb-2.5 text-xs text-tc-danger">{rsvpError}</p>
		{/if}

		<div class="flex gap-2 mb-3.5">
			<button
				onclick={() => submitRsvp('yes')}
				disabled={isLocked || goingFull || rsvpSubmitting}
				class="flex-1 rounded-md [border:0.5px_solid_var(--tc-border-mid)] py-2 text-[0.8125rem] transition-all disabled:opacity-40 disabled:cursor-not-allowed
					{data.myRsvp === 'yes'
					? 'bg-tc-accent text-white border-transparent hover:opacity-[0.88]'
					: 'bg-transparent text-tc-text hover:bg-tc-bg'}">Going</button
			>
			<button
				onclick={() => submitRsvp('no')}
				disabled={isLocked || rsvpSubmitting}
				class="flex-1 rounded-md [border:0.5px_solid_var(--tc-border-mid)] py-2 text-[0.8125rem] transition-all disabled:opacity-40 disabled:cursor-not-allowed
					{data.myRsvp === 'no'
					? 'bg-tc-surface font-medium text-tc-text'
					: 'bg-transparent text-tc-text hover:bg-tc-bg'}">Can't make it</button
			>
		</div>

		{#if data.goingUsers.length > 0}
			<div class="flex flex-wrap gap-2.5">
				{#each data.goingUsers as member}
					<div class="flex items-center gap-1.5 text-xs text-tc-muted">
						<Avatar name={member.display_name} size="sm" />
						{member.display_name}
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- ── Recap ── -->
	{#if data.recap}
		<div class="[border-top:0.5px_solid_var(--tc-border)] pt-5 mb-5">
			<div class="flex items-center justify-between mb-3">
				<p class="font-mono text-[0.625rem] uppercase tracking-[0.08em] text-tc-hint">Recap</p>
			</div>
			<div class="prose mb-4">
				{@html data.recap.bodyHtml}
			</div>

			<!-- Photo grid -->
			{#if data.photos.length > 0 || data.canToggleVisibility}
				<div class="grid grid-cols-3 gap-1.5 mb-3">
					{#each data.photos as photo}
						<div
							class="relative aspect-square overflow-hidden rounded-md bg-tc-surface [border:0.5px_solid_var(--tc-border)]"
						>
							{#if photo.url}
								<img src={photo.url} alt="" class="h-full w-full object-cover" loading="lazy" />
							{:else}
								<div class="flex h-full items-center justify-center text-tc-hint text-xs font-mono">
									no file
								</div>
							{/if}
							{#if data.canToggleVisibility}
								<button
									onclick={() => togglePhoto(photo.id, photo.is_public)}
									class="absolute bottom-1 right-1 rounded px-1.5 py-0.5 font-mono text-[0.5rem] transition-colors
										{photo.is_public ? 'bg-tc-accent-bg text-tc-accent-text' : 'bg-tc-surface text-tc-hint'}"
								>
									{photo.is_public ? 'public' : 'private'}
								</button>
							{/if}
						</div>
					{/each}
				</div>
			{:else if data.photos.length === 0}
				<p class="mb-3 text-xs text-tc-muted">No photos yet.</p>
			{/if}

			<!-- Photo upload — any authenticated member -->
			{#if data.recap}
				{#if photoError}
					<p class="mb-2 text-xs text-tc-danger">{photoError}</p>
				{/if}
				<label
					class="flex cursor-pointer items-center gap-2 text-xs text-tc-muted hover:text-tc-text transition-colors"
				>
					<span
						class="rounded-md [border:0.5px_solid_var(--tc-border-mid)] px-3 py-1.5 text-xs transition-colors hover:bg-tc-surface"
					>
						{photoUploading ? 'Uploading…' : '+ Add photo'}
					</span>
					<input
						type="file"
						accept="image/jpeg,image/png,image/webp,image/gif"
						class="sr-only"
						onchange={uploadPhoto}
						disabled={photoUploading}
					/>
				</label>
			{/if}
		</div>
	{:else if data.canWriteRecap}
		<!-- ── Write recap form ── -->
		<div class="[border-top:0.5px_solid_var(--tc-border)] pt-5">
			<p class="mb-3 font-mono text-[0.625rem] uppercase tracking-[0.08em] text-tc-hint">
				Write recap
			</p>

			{#if recapError}
				<p class="mb-2 text-xs text-tc-danger">{recapError}</p>
			{/if}

			<div class="flex items-baseline justify-between mb-1.5">
				<label
					for="recap-body"
					class="font-mono text-[0.6875rem] uppercase tracking-[0.06em] text-tc-hint"
				>
					Recap
				</label>
				<span class="font-mono text-[0.6rem] text-tc-hint">Markdown supported</span>
			</div>
			<textarea
				id="recap-body"
				bind:value={recapBody}
				rows="6"
				placeholder="How did it go? What did people make, see, or learn?"
				class="w-full resize-y rounded-md [border:0.5px_solid_var(--tc-border-mid)] bg-tc-bg px-3 py-2.5 text-sm text-tc-text outline-none transition-colors focus:[border-color:var(--tc-accent-border)] leading-relaxed mb-3"
			></textarea>
			<button
				onclick={submitRecap}
				disabled={recapSubmitting || !recapBody.trim()}
				class="rounded-md bg-tc-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-[0.88] disabled:opacity-40 disabled:cursor-not-allowed"
			>
				{recapSubmitting ? 'Saving…' : 'Post recap'}
			</button>
		</div>
	{/if}
</div>
