<script lang="ts">
	import { deserialize } from '$app/forms';
	import { goto } from '$app/navigation';
	import { createForm } from '@tanstack/svelte-form';
	import { proposalSchema } from '$lib/schemas/forms';
	import Topbar from '$lib/components/Topbar.svelte';

	let serverError = $state<string | null>(null);

	const form = createForm(() => ({
		defaultValues: { title: '', body_md: '', host_name: '' },
		validators: { onSubmit: proposalSchema },
		onSubmit: async ({ value }) => {
			serverError = null;
			const fd = new FormData();
			fd.set('title', value.title);
			fd.set('body_md', value.body_md);
			if (value.host_name) fd.set('host_name', value.host_name);

			const res = await fetch('/suggestions/new', { method: 'POST', body: fd });
			const result = deserialize(await res.text());
			if (result.type === 'failure') {
				serverError = (result.data?.error as string) ?? 'Something went wrong.';
			} else if (result.type === 'redirect') {
				// Per src/AGENTS.md: do not call applyAction inside TanStack Form's
				// onSubmit — it triggers reactive re-renders that cause
				// lifecycle_outside_component. Navigate manually instead.
				goto(result.location);
			}
		},
	}));
</script>

<svelte:head>
	<title>Propose — Tool Club</title>
</svelte:head>

<!-- ── Topbar ── -->
<Topbar>
	{#snippet left()}
		<a href="/suggestions" class="text-base md:text-xs text-tc-muted hover:text-tc-text transition-colors"
			>← Suggestions</a
		>
	{/snippet}
</Topbar>

<div class="p-4 sm:p-6 max-w-xl">
	<h1 class="font-display text-xl font-medium tracking-[-0.02em] text-tc-text mb-1.5">
		Propose an idea
	</h1>
	<p class="mb-6 text-base md:text-[0.8125rem] text-tc-muted leading-relaxed">
		Describe the event you'd like the group to consider. Members will vote, and admins can promote
		top ideas to events.
	</p>

	{#if serverError}
		<p
			class="mb-4 rounded-md [border:0.5px_solid_var(--tc-danger-border)] bg-tc-danger-bg px-3 py-2.5 text-base md:text-xs text-tc-danger"
		>
			{serverError}
		</p>
	{/if}

	<form
		onsubmit={(e) => {
			e.preventDefault();
			form.handleSubmit();
		}}
	>
		<form.Field name="title">
			{#snippet children(field)}
				<label
					for="title"
					class="block font-mono text-sm md:text-[0.6875rem] uppercase tracking-[0.06em] text-tc-hint mb-1.5"
				>
					Title <span class="text-tc-danger">*</span>
				</label>
				<input
					id="title"
					type="text"
					name="title"
					required
					placeholder="e.g. Foundry tour at Provo Iron Works"
					value={field.state.value}
					oninput={(e) => field.handleChange(e.currentTarget.value)}
					onblur={field.handleBlur}
					class="w-full rounded-md [border:0.5px_solid_var(--tc-border-mid)] bg-tc-bg px-3 py-2.5 text-base md:text-sm text-tc-text outline-none transition-colors focus:[border-color:var(--tc-accent-border)] mb-1.5"
				/>
				{#if field.state.meta.isTouched && field.state.meta.errors.length}
					<p class="mb-3 text-base md:text-xs text-tc-danger">
						{String(field.state.meta.errors[0])}
					</p>
				{:else}
					<div class="mb-4"></div>
				{/if}
			{/snippet}
		</form.Field>

		<form.Field name="body_md">
			{#snippet children(field)}
				<div class="flex items-baseline justify-between mb-1.5">
					<label
						for="body_md"
						class="font-mono text-sm md:text-[0.6875rem] uppercase tracking-[0.06em] text-tc-hint"
					>
						Description <span class="text-tc-danger">*</span>
					</label>
					<span class="font-mono text-[0.6rem] text-tc-hint">Markdown supported</span>
				</div>
				<textarea
					id="body_md"
					name="body_md"
					required
					rows="5"
					placeholder="What's the idea? Who would benefit? Any logistics to consider?"
					value={field.state.value}
					oninput={(e) => field.handleChange(e.currentTarget.value)}
					onblur={field.handleBlur}
					class="w-full resize-y rounded-md [border:0.5px_solid_var(--tc-border-mid)] bg-tc-bg px-3 py-2.5 text-base md:text-sm text-tc-text outline-none transition-colors focus:[border-color:var(--tc-accent-border)] leading-relaxed mb-1.5"
				></textarea>
				{#if field.state.meta.isTouched && field.state.meta.errors.length}
					<p class="mb-3 text-base md:text-xs text-tc-danger">
						{String(field.state.meta.errors[0])}
					</p>
				{:else}
					<div class="mb-4"></div>
				{/if}
			{/snippet}
		</form.Field>

		<form.Field name="host_name">
			{#snippet children(field)}
				<label
					for="host_name"
					class="block font-mono text-sm md:text-[0.6875rem] uppercase tracking-[0.06em] text-tc-hint mb-1.5"
				>
					Nominated host <span class="text-tc-hint font-sans normal-case text-sm md:text-[0.6875rem]"
						>(optional)</span
					>
				</label>
				<input
					id="host_name"
					type="text"
					name="host_name"
					placeholder="Who should run this?"
					value={field.state.value}
					oninput={(e) => field.handleChange(e.currentTarget.value)}
					onblur={field.handleBlur}
					class="w-full rounded-md [border:0.5px_solid_var(--tc-border-mid)] bg-tc-bg px-3 py-2.5 text-base md:text-sm text-tc-text outline-none transition-colors focus:[border-color:var(--tc-accent-border)] mb-4"
				/>
			{/snippet}
		</form.Field>

		<form.Subscribe selector={(s) => ({ canSubmit: s.canSubmit, isSubmitting: s.isSubmitting })}>
			{#snippet children(state)}
				<button
					type="submit"
					disabled={!state.canSubmit || state.isSubmitting}
					class="rounded-md bg-tc-accent px-5 py-2.5 text-base md:text-sm font-medium text-white transition-opacity hover:opacity-[0.88] disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{state.isSubmitting ? 'Submitting…' : 'Submit proposal'}
				</button>
			{/snippet}
		</form.Subscribe>
	</form>
</div>
