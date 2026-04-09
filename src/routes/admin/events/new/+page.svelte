<script lang="ts">
	import { enhance } from '$app/forms';
	import Topbar from '$lib/components/Topbar.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const inputClass =
		'w-full rounded-md [border:0.5px_solid_var(--tc-border-mid)] bg-tc-bg px-3 py-2.5 text-sm text-tc-text outline-none transition-colors focus:[border-color:var(--tc-accent-border)]';
	const labelClass =
		'block mb-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.06em] text-tc-hint';
</script>

<svelte:head>
	<title>New Event — Admin — Tool Club</title>
</svelte:head>

<Topbar>
	{#snippet left()}
		<a href="/admin/events" class="text-xs text-tc-muted transition-colors hover:text-tc-text"
			>← Events</a
		>
	{/snippet}
</Topbar>

<div class="p-4 sm:p-6 max-w-xl">
	<h1 class="mb-6 font-display text-xl font-medium tracking-[-0.02em] text-tc-text">New event</h1>

	{#if form?.error}
		<p
			class="mb-4 rounded-md [border:0.5px_solid_var(--tc-danger-border)] bg-tc-danger-bg px-3 py-2.5 text-xs text-tc-danger"
		>
			{form.error}
		</p>
	{/if}

	<form method="POST" use:enhance class="space-y-4">
		<!-- Title -->
		<div>
			<label for="title" class={labelClass}>Title <span class="text-tc-danger">*</span></label>
			<input id="title" name="title" type="text" required class={inputClass} />
		</div>

		<!-- Start / end -->
		<div class="grid grid-cols-2 gap-3">
			<div>
				<label for="starts_at" class={labelClass}>Start <span class="text-tc-danger">*</span></label
				>
				<input id="starts_at" name="starts_at" type="datetime-local" required class={inputClass} />
				<p class="mt-0.5 font-mono text-[0.6rem] text-tc-hint">Mountain Time (SLC)</p>
			</div>
			<div>
				<label for="ends_at" class={labelClass}>End</label>
				<input id="ends_at" name="ends_at" type="datetime-local" class={inputClass} />
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
					placeholder="Freeform — can be non-member"
					class={inputClass}
				/>
			</div>
			<div>
				<label for="host_id" class={labelClass}>Host member</label>
				<select id="host_id" name="host_id" class={inputClass}>
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
				<input id="location_name" name="location_name" type="text" class={inputClass} />
			</div>
			<div>
				<label for="capacity" class={labelClass}>Capacity</label>
				<input id="capacity" name="capacity" type="number" min="1" class={inputClass} />
			</div>
		</div>

		<div>
			<label for="address" class={labelClass}>Address</label>
			<input id="address" name="address" type="text" class={inputClass} />
		</div>

		<!-- Body -->
		<div>
			<div class="mb-1.5 flex items-baseline justify-between">
				<label for="body_md" class={labelClass}>Body</label>
				<span class="font-mono text-[0.6rem] text-tc-hint">Markdown supported</span>
			</div>
			<textarea id="body_md" name="body_md" rows="6" class="{inputClass} resize-y leading-relaxed"
			></textarea>
		</div>

		<!-- Links -->
		<div>
			<label for="links" class={labelClass}>Links</label>
			<textarea
				id="links"
				name="links"
				rows="3"
				placeholder="Label | https://example.com"
				class="{inputClass} resize-y font-mono text-xs leading-relaxed"
			></textarea>
			<p class="mt-0.5 font-mono text-[0.6rem] text-tc-hint">One "Label | URL" per line</p>
		</div>

		<div class="pt-2">
			<button
				type="submit"
				class="rounded-md bg-tc-accent px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-[0.88]"
			>
				Create draft
			</button>
		</div>
	</form>
</div>
