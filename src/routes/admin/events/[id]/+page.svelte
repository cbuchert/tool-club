<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import Topbar from '$lib/components/Topbar.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let saving = $state(false);
	let saveSuccess = $state(false);
	let deleting = $state(false);
	let showDeleteConfirm = $state(false);

	const inputClass =
		'w-full rounded-md [border:0.5px_solid_var(--tc-border-mid)] bg-tc-bg px-3 py-2.5 text-sm text-tc-text outline-none transition-colors focus:[border-color:var(--tc-accent-border)]';
	const labelClass =
		'block mb-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.06em] text-tc-hint';

	const goingRsvps = $derived(data.rsvps.filter((r) => r.response === 'yes'));
	const noRsvps = $derived(data.rsvps.filter((r) => r.response === 'no'));
</script>

<svelte:head>
	<title>{data.event.title} — Admin — Tool Club</title>
</svelte:head>

<Topbar>
	{#snippet left()}
		<a href="/admin/events" class="text-xs text-tc-muted transition-colors hover:text-tc-text"
			>← Events</a
		>
	{/snippet}
	{#snippet right()}
		<a
			href="/events/{data.event.id}"
			class="text-xs text-tc-muted transition-colors hover:text-tc-text">View →</a
		>
	{/snippet}
</Topbar>

<div class="p-4 sm:p-6 max-w-xl">
	<!-- ── Edit form ── -->
	<h1 class="mb-5 font-display text-xl font-medium tracking-[-0.02em] text-tc-text">
		{data.event.title}
	</h1>

	{#if form?.error}
		<p
			class="mb-4 rounded-md [border:0.5px_solid_var(--tc-danger-border)] bg-tc-danger-bg px-3 py-2.5 text-xs text-tc-danger"
		>
			{form.error}
		</p>
	{/if}

	{#if saveSuccess}
		<p
			data-testid="save-success"
			class="mb-4 rounded-md [border:0.5px_solid_var(--tc-accent-border)] bg-tc-accent-bg px-3 py-2.5 text-xs text-tc-accent-text"
		>
			Saved.
		</p>
	{/if}

	<form
		method="POST"
		action="?/update"
		use:enhance={() => {
			saving = true;
			saveSuccess = false;
			return async ({ result, update }) => {
				saving = false;
				if (result.type === 'failure') {
					await update();
				} else {
					saveSuccess = true;
					await invalidateAll();
				}
			};
		}}
		class="space-y-4"
	>
		<!-- Status -->
		<div>
			<label for="status" class={labelClass}>Status</label>
			<select id="status" name="status" value={data.event.status} class={inputClass}>
				<option value="draft">draft</option>
				<option value="published">published</option>
				<option value="past">past</option>
			</select>
		</div>

		<!-- Title -->
		<div>
			<label for="title" class={labelClass}>Title <span class="text-tc-danger">*</span></label>
			<input
				id="title"
				name="title"
				type="text"
				required
				value={data.event.title}
				class={inputClass}
			/>
		</div>

		<!-- Start / end -->
		<div class="grid grid-cols-2 gap-3">
			<div>
				<label for="starts_at" class={labelClass}>Start <span class="text-tc-danger">*</span></label
				>
				<input
					id="starts_at"
					name="starts_at"
					type="datetime-local"
					required
					value={data.event.starts_at_local}
					class={inputClass}
				/>
				<p class="mt-0.5 font-mono text-[0.6rem] text-tc-hint">Mountain Time (SLC)</p>
			</div>
			<div>
				<label for="ends_at" class={labelClass}>End</label>
				<input
					id="ends_at"
					name="ends_at"
					type="datetime-local"
					value={data.event.ends_at_local}
					class={inputClass}
				/>
			</div>
		</div>

		<!-- Host -->
		<div class="grid grid-cols-2 gap-3">
			<div>
				<label for="host_name" class={labelClass}
					>Host name <span class="text-tc-danger">*</span></label
				>
				<input
					id="host_name"
					name="host_name"
					type="text"
					required
					value={data.event.host_name}
					class={inputClass}
				/>
			</div>
			<div>
				<label for="host_id" class={labelClass}>Host member</label>
				<select id="host_id" name="host_id" value={data.event.host_id ?? ''} class={inputClass}>
					<option value="">— none —</option>
					{#each data.members as m (m.id)}
						<option value={m.id}>{m.display_name}</option>
					{/each}
				</select>
			</div>
		</div>

		<!-- Location -->
		<div class="grid grid-cols-2 gap-3">
			<div>
				<label for="location_name" class={labelClass}>Venue</label>
				<input
					id="location_name"
					name="location_name"
					type="text"
					value={data.event.location_name ?? ''}
					class={inputClass}
				/>
			</div>
			<div>
				<label for="capacity" class={labelClass}>Capacity</label>
				<input
					id="capacity"
					name="capacity"
					type="number"
					min="1"
					value={data.event.capacity ?? ''}
					class={inputClass}
				/>
			</div>
		</div>

		<div>
			<label for="address" class={labelClass}>Address</label>
			<input
				id="address"
				name="address"
				type="text"
				value={data.event.address ?? ''}
				class={inputClass}
			/>
		</div>

		<!-- Body -->
		<div>
			<div class="mb-1.5 flex items-baseline justify-between">
				<label for="body_md" class={labelClass}>Body</label>
				<span class="font-mono text-[0.6rem] text-tc-hint">Markdown supported</span>
			</div>
			<textarea
				id="body_md"
				name="body_md"
				rows="6"
				value={data.event.body_md ?? ''}
				class="{inputClass} resize-y leading-relaxed"
			></textarea>
		</div>

		<!-- Links -->
		<div>
			<label for="links" class={labelClass}>Links</label>
			<textarea
				id="links"
				name="links"
				rows="3"
				value={data.event.links_text}
				placeholder="Label | https://example.com"
				class="{inputClass} resize-y font-mono text-xs leading-relaxed"
			></textarea>
			<p class="mt-0.5 font-mono text-[0.6rem] text-tc-hint">One "Label | URL" per line</p>
		</div>

		<div class="flex items-center gap-3 pt-2">
			<button
				type="submit"
				data-action="update"
				disabled={saving}
				class="rounded-md bg-tc-accent px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-[0.88] disabled:opacity-50"
			>
				{saving ? 'Saving…' : 'Save'}
			</button>
		</div>
	</form>

	<!-- ── RSVP list ── -->
	{#if data.rsvps.length > 0}
		<div class="mt-8 [border-top:0.5px_solid_var(--tc-border)] pt-5">
			<p class="mb-3 font-mono text-[0.625rem] uppercase tracking-[0.08em] text-tc-hint">
				RSVPs ({data.rsvps.length})
			</p>
			{#if goingRsvps.length > 0}
				<p class="mb-1.5 text-xs font-medium text-tc-text">Going ({goingRsvps.length})</p>
				<div class="mb-3 space-y-1">
					{#each goingRsvps as r (r.user_id)}
						<p class="text-sm text-tc-muted">{r.display_name}</p>
					{/each}
				</div>
			{/if}
			{#if noRsvps.length > 0}
				<p class="mb-1.5 text-xs font-medium text-tc-muted">Can't make it ({noRsvps.length})</p>
				<div class="space-y-1">
					{#each noRsvps as r (r.user_id)}
						<p class="text-sm text-tc-muted">{r.display_name}</p>
					{/each}
				</div>
			{/if}
		</div>
	{/if}

	<!-- ── Danger zone ── -->
	<div class="mt-8 [border-top:0.5px_solid_var(--tc-border)] pt-5">
		<p
			class="mb-3 font-mono text-[0.625rem] uppercase tracking-[0.08em] text-tc-danger [border-bottom:0.5px_solid_var(--tc-danger-border)] pb-2"
		>
			Danger zone
		</p>
		{#if showDeleteConfirm}
			<div class="mb-3 rounded-md [border:0.5px_solid_var(--tc-danger-border)] bg-tc-danger-bg p-3">
				<p class="mb-2 text-xs text-tc-danger">
					This permanently deletes the event and all its RSVPs. Cannot be undone.
				</p>
				<div class="flex gap-2">
					<form
						method="POST"
						action="?/delete"
						use:enhance={() => {
							deleting = true;
							return async ({ update }) => {
								deleting = false;
								await update();
							};
						}}
					>
						<button
							type="submit"
							disabled={deleting}
							class="rounded-md bg-tc-danger px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-[0.88] disabled:opacity-50"
						>
							{deleting ? 'Deleting…' : 'Yes, delete'}
						</button>
					</form>
					<button
						onclick={() => (showDeleteConfirm = false)}
						class="rounded-md [border:0.5px_solid_var(--tc-border-mid)] px-3 py-1.5 text-xs text-tc-muted transition-colors hover:text-tc-text"
					>
						Cancel
					</button>
				</div>
			</div>
		{:else}
			<button
				onclick={() => (showDeleteConfirm = true)}
				class="rounded-md [border:0.5px_solid_var(--tc-danger-border)] px-4 py-2 text-sm text-tc-danger transition-colors hover:bg-tc-danger-bg"
			>
				Delete event
			</button>
		{/if}
	</div>
</div>
