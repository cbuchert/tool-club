<script lang="ts">
	import { applyAction, deserialize } from '$app/forms';
	import { createForm } from '@tanstack/svelte-form';
	import { joinSchema } from '$lib/schemas/forms';
	import AuthShell from '$lib/components/AuthShell.svelte';
	import { initials } from '$lib/utils/events';
	import { page } from '$app/stores';

	let { data } = $props();

	let sent = $state<{ email: string } | null>(null);
	let serverError = $state<string | null>(null);

	const form = createForm(() => ({
		defaultValues: { email: '', display_name: '' },
		validators: { onSubmit: joinSchema },
		onSubmit: async ({ value }) => {
			const formData = new FormData();
			formData.set('email', value.email);
			formData.set('display_name', value.display_name);

			// Use full path — ?/default triggers the lifecycle_outside_component bug
			// with TanStack Form's onMount in Svelte 5 reactive branches.
			const response = await fetch($page.url.pathname, { method: 'POST', body: formData });
			const result = deserialize(await response.text());

			if (result.type === 'success' && result.data?.sent) {
				sent = { email: value.email };
			} else if (result.type === 'failure') {
				serverError = (result.data?.error as string) ?? 'Something went wrong.';
			} else {
				await applyAction(result);
			}
		},
	}));

	// Live avatar preview driven by the display_name field
	const nameValue = form.useStore((s) => s.values.display_name);
	const avatarLetter = $derived(initials(nameValue.current));
</script>

<svelte:head>
	<title>Join Tool Club</title>
</svelte:head>

<AuthShell>
	{#if data.state === 'not_found'}
		<div class="w-full max-w-sm [border:0.5px_solid_var(--tc-border)] rounded-lg p-7 bg-tc-bg">
			<div
				class="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-tc-warn-bg"
			>
				<svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
					<path
						d="M11 7v5M11 15h.01"
						stroke="var(--tc-warn-text)"
						stroke-width="1.6"
						stroke-linecap="round"
					/>
					<circle cx="11" cy="11" r="9" stroke="var(--tc-warn-text)" stroke-width="1.4" />
				</svg>
			</div>
			<h1
				class="font-display text-center text-xl font-medium tracking-[-0.01em] text-tc-text mb-1.5"
			>
				Invite not found
			</h1>
			<p class="text-center text-base md:text-[0.8125rem] text-tc-muted leading-relaxed mb-5">
				This invite link isn't valid. Ask the person who invited you to send a new one.
			</p>
			<a
				href="/"
				class="block text-center text-base md:text-xs text-tc-muted hover:text-tc-text transition-colors"
				>← Back</a
			>
		</div>
	{:else if data.state === 'expired' || data.state === 'redeemed'}
		<div class="w-full max-w-sm [border:0.5px_solid_var(--tc-border)] rounded-lg p-7 bg-tc-bg">
			<div
				class="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-tc-warn-bg"
			>
				<svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
					<path
						d="M11 7v5M11 15h.01"
						stroke="var(--tc-warn-text)"
						stroke-width="1.6"
						stroke-linecap="round"
					/>
					<circle cx="11" cy="11" r="9" stroke="var(--tc-warn-text)" stroke-width="1.4" />
				</svg>
			</div>
			<h1
				class="font-display text-center text-xl font-medium tracking-[-0.01em] text-tc-text mb-1.5"
			>
				{data.state === 'expired' ? 'This invite has expired' : 'This invite has already been used'}
			</h1>
			<p class="text-center text-base md:text-[0.8125rem] text-tc-muted leading-relaxed mb-5">
				{data.state === 'expired'
					? 'Invite links expire after 30 days.'
					: 'This link has already been redeemed.'}
				Ask <strong class="font-medium text-tc-text">{data.inviterName}</strong> to send you a new one.
			</p>
			<a
				href="/"
				class="block text-center text-base md:text-xs text-tc-muted hover:text-tc-text transition-colors"
				>← Back</a
			>
		</div>
	{:else if sent}
		<div class="w-full max-w-sm [border:0.5px_solid_var(--tc-border)] rounded-lg p-7 bg-tc-bg">
			<div
				class="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-tc-accent-bg"
			>
				<svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
					<rect
						x="2"
						y="5"
						width="18"
						height="13"
						rx="2"
						stroke="var(--tc-accent-text)"
						stroke-width="1.4"
					/>
					<path
						d="M2 8l9 6 9-6"
						stroke="var(--tc-accent-text)"
						stroke-width="1.4"
						stroke-linecap="round"
					/>
				</svg>
			</div>
			<h1
				class="font-display text-center text-xl font-medium tracking-[-0.01em] text-tc-text mb-1.5"
			>
				Check your email
			</h1>
			<p class="text-center text-base md:text-[0.8125rem] text-tc-muted leading-relaxed mb-4">
				We sent a sign-in link to <strong class="font-medium text-tc-text">{sent.email}</strong>.
				Click it to finish creating your account.
			</p>
			<a
				href="/"
				class="block text-center text-base md:text-xs text-tc-muted hover:text-tc-text transition-colors"
				>← Back</a
			>
		</div>
	{:else}
		<div class="w-full max-w-sm [border:0.5px_solid_var(--tc-border)] rounded-lg p-7 bg-tc-bg">
			<!-- Inviter banner -->
			<div
				class="flex items-center gap-3 rounded-lg [border:0.5px_solid_var(--tc-accent-border)] bg-tc-accent-bg px-4 py-3.5 mb-6"
			>
				<div
					class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tc-accent-text font-display text-base md:text-sm font-medium italic text-tc-accent-bg"
				>
					{initials(data.inviterName ?? '')}
				</div>
				<p class="text-base md:text-[0.8125rem] text-tc-accent-text leading-snug">
					<strong class="font-medium">{data.inviterName}</strong> invited you to join Tool Club.
				</p>
			</div>

			<p
				class="text-base md:text-[0.8125rem] text-tc-muted leading-[1.7] mb-6 pb-5 [border-bottom:0.5px_solid_var(--tc-border)]"
			>
				Tool Club is a small, invite-only group of people who like making things. Events happen a
				few times a month in Springville.
			</p>

			<h1 class="font-display text-xl font-medium tracking-[-0.01em] text-tc-text mb-1.5">
				Create your account
			</h1>
			<p class="text-base md:text-[0.8125rem] text-tc-muted leading-relaxed mb-6">
				Enter your email and a display name to get started.
			</p>

			{#if serverError}
				<p
					class="mb-4 rounded-md [border:0.5px_solid_var(--tc-danger-border)] bg-tc-danger-bg px-3 py-2.5 text-base md:text-[0.75rem] text-tc-danger leading-relaxed"
				>
					{serverError}
				</p>
			{/if}

			<form
				onsubmit={(e) => {
					e.preventDefault();
					serverError = null;
					form.handleSubmit();
				}}
			>
				<form.Field name="email">
					{#snippet children(field)}
						<label
							for="email"
							class="block font-mono text-sm md:text-[0.6875rem] uppercase tracking-[0.06em] text-tc-hint mb-1.5"
							>Email address</label
						>
						<input
							id="email"
							type="email"
							name="email"
							autocomplete="email"
							placeholder="you@example.com"
							value={field.state.value}
							oninput={(e) => field.handleChange(e.currentTarget.value)}
							onblur={field.handleBlur}
							class="w-full rounded-md [border:0.5px_solid_var(--tc-border-mid)] bg-tc-bg px-3 py-2.5 text-base md:text-sm text-tc-text outline-none transition-colors focus:[border-color:var(--tc-accent-border)] mb-1.5"
						/>
						{#if field.state.meta.isTouched && field.state.meta.errors.length}
							<p class="mb-3 text-base md:text-[0.75rem] text-tc-danger">
								{field.state.meta.errors[0]?.message ?? field.state.meta.errors[0]}
							</p>
						{:else}
							<div class="mb-4"></div>
						{/if}
					{/snippet}
				</form.Field>

				<!-- Live avatar preview -->
				<div
					class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full [border:2px_solid_var(--tc-border)] bg-tc-accent-bg font-display text-2xl font-medium italic text-tc-accent-text"
				>
					{avatarLetter}
				</div>

				<form.Field name="display_name">
					{#snippet children(field)}
						<label
							for="display_name"
							class="block font-mono text-sm md:text-[0.6875rem] uppercase tracking-[0.06em] text-tc-hint mb-1.5"
							>Your name</label
						>
						<input
							id="display_name"
							type="text"
							name="display_name"
							autocomplete="name"
							placeholder="e.g. Jamie Rivera"
							value={field.state.value}
							oninput={(e) => field.handleChange(e.currentTarget.value)}
							onblur={field.handleBlur}
							class="w-full rounded-md [border:0.5px_solid_var(--tc-border-mid)] bg-tc-bg px-3 py-2.5 text-base md:text-sm text-tc-text outline-none transition-colors focus:[border-color:var(--tc-accent-border)] mb-1.5"
						/>
						{#if field.state.meta.isTouched && field.state.meta.errors.length}
							<p class="mb-3 text-base md:text-[0.75rem] text-tc-danger">
								{field.state.meta.errors[0]?.message ?? field.state.meta.errors[0]}
							</p>
						{:else}
							<div class="mb-4"></div>
						{/if}
					{/snippet}
				</form.Field>

				<form.Subscribe
					selector={(s) => ({ canSubmit: s.canSubmit, isSubmitting: s.isSubmitting })}
				>
					{#snippet children(state)}
						<button
							type="submit"
							disabled={!state.canSubmit || state.isSubmitting}
							class="w-full rounded-md bg-tc-accent px-4 py-2.5 text-base md:text-sm font-medium text-white transition-opacity hover:opacity-[0.88] disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{state.isSubmitting ? 'Sending…' : 'Send sign-in link'}
						</button>
					{/snippet}
				</form.Subscribe>
			</form>

			<p class="mt-4 text-center text-base md:text-xs text-tc-hint">
				Already a member?
				<a
					href="/signin"
					class="font-mono underline underline-offset-2 text-tc-muted hover:text-tc-text transition-colors"
					>Sign in →</a
				>
			</p>
		</div>
	{/if}
</AuthShell>
