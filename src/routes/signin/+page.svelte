<script lang="ts">
	import { deserialize } from '$app/forms';
	import { createForm } from '@tanstack/svelte-form';
	import { signinSchema } from '$lib/schemas/forms';
	import AuthShell from '$lib/components/AuthShell.svelte';

	let { data } = $props();

	let sent = $state<{ email: string } | null>(null);
	let serverError = $state<string | null>(null);

	const errorMessages: Record<string, string> = {
		no_account: 'No account found for that email. You need an invite to join Tool Club.',
		auth_failed: 'Sign-in failed. Please try again.',
	};

	const form = createForm(() => ({
		defaultValues: { email: '' },
		validators: { onSubmit: signinSchema },
		onSubmit: async ({ value }) => {
			serverError = null;
			const formData = new FormData();
			formData.set('email', value.email);

			const response = await fetch('/signin', { method: 'POST', body: formData });

			if (!response.ok) {
				serverError = 'Something went wrong. Please try again.';
				return;
			}

			const result = deserialize(await response.text());

			if (result.type === 'success' && result.data?.sent) {
				sent = { email: value.email };
			} else if (result.type === 'failure') {
				serverError = (result.data?.error as string) ?? 'Something went wrong.';
			}
			// No applyAction — avoids re-rendering page component in a reactive
			// branch which breaks TanStack Form's onMount registration in Svelte 5.
		},
	}));
</script>

<svelte:head>
	<title>Sign in — Tool Club</title>
</svelte:head>

<AuthShell>
	<div class="w-full max-w-sm [border:0.5px_solid_var(--tc-border)] rounded-lg p-7 bg-tc-bg">
		{#if sent}
			<!-- ── Check your email ── -->
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
			</p>
			<button
				onclick={() => {
					sent = null;
					serverError = null;
				}}
				class="block w-full text-center text-base md:text-xs text-tc-muted hover:text-tc-text transition-colors"
			>
				← Use a different email
			</button>
		{:else}
			<!-- ── Sign-in form ── -->
			{#if data.error || serverError}
				<p
					class="mb-4 rounded-md [border:0.5px_solid_var(--tc-danger-border)] bg-tc-danger-bg px-3 py-2.5 text-base md:text-[0.75rem] text-tc-danger leading-relaxed"
				>
					{serverError ??
						(data.error
							? (errorMessages[data.error] ?? 'Something went wrong. Please try again.')
							: '')}
				</p>
			{/if}

			<h1 class="font-display text-xl font-medium tracking-[-0.01em] text-tc-text mb-1.5">
				Sign in
			</h1>
			<p class="text-base md:text-[0.8125rem] text-tc-muted leading-relaxed mb-6">
				Enter your email and we'll send you a sign-in link. No password needed.
			</p>

			<form
				onsubmit={(e) => {
					e.preventDefault();
					form.handleSubmit();
				}}
			>
				<form.Field name="email">
					{#snippet children(field)}
						<label
							for="email"
							class="block font-mono text-sm md:text-[0.6875rem] uppercase tracking-[0.06em] text-tc-hint mb-1.5"
						>
							Email address
						</label>
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

			<a
				href="/"
				class="mt-4 block text-center text-base md:text-xs text-tc-muted hover:text-tc-text transition-colors"
			>
				← Back
			</a>
		{/if}
	</div>
</AuthShell>
