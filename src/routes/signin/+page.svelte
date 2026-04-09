<script lang="ts">
	import { enhance } from '$app/forms';
	import AuthShell from '$lib/components/AuthShell.svelte';

	let { form, data } = $props();
	let loading = $state(false);

	const errorMessages: Record<string, string> = {
		no_account: 'No account found for that email. You need an invite to join Tool Club.',
		auth_failed: 'Sign-in failed. Please try again.',
	};
</script>

<svelte:head>
	<title>Sign in — Tool Club</title>
</svelte:head>

<AuthShell>
	<div class="w-full max-w-sm [border:0.5px_solid_var(--tc-border)] rounded-lg p-7 bg-tc-bg">
		{#if form?.sent}
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
			<p class="text-center text-[0.8125rem] text-tc-muted leading-relaxed mb-4">
				We sent a sign-in link to <strong class="font-medium text-tc-text">{form.email}</strong>.
			</p>
			<a
				href="/signin"
				class="block text-center text-xs text-tc-muted hover:text-tc-text transition-colors"
			>
				← Use a different email
			</a>
		{:else}
			<!-- ── Sign-in form ── -->
			{#if data.error}
				<p
					class="mb-4 rounded-md [border:0.5px_solid_var(--tc-danger-border)] bg-tc-danger-bg px-3 py-2.5 text-[0.75rem] text-tc-danger leading-relaxed"
				>
					{errorMessages[data.error] ?? 'Something went wrong. Please try again.'}
				</p>
			{/if}

			<h1 class="font-display text-xl font-medium tracking-[-0.01em] text-tc-text mb-1.5">
				Sign in
			</h1>
			<p class="text-[0.8125rem] text-tc-muted leading-relaxed mb-6">
				Enter your email and we'll send you a sign-in link. No password needed.
			</p>

			<form
				method="POST"
				use:enhance={() => {
					loading = true;
					return async ({ update }) => {
						await update();
						loading = false;
					};
				}}
			>
				<label
					for="email"
					class="block font-mono text-[0.6875rem] uppercase tracking-[0.06em] text-tc-hint mb-1.5"
				>
					Email address
				</label>
				<input
					id="email"
					name="email"
					type="email"
					required
					autocomplete="email"
					placeholder="you@example.com"
					class="w-full rounded-md [border:0.5px_solid_var(--tc-border-mid)] bg-tc-bg px-3 py-2.5 text-sm text-tc-text outline-none transition-colors focus:[border-color:var(--tc-accent-border)] mb-4"
				/>
				<button
					type="submit"
					disabled={loading}
					class="w-full rounded-md bg-tc-accent px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-[0.88] disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{loading ? 'Sending…' : 'Send sign-in link'}
				</button>
			</form>

			<a
				href="/"
				class="mt-4 block text-center text-xs text-tc-muted hover:text-tc-text transition-colors"
			>
				← Back to toolclub.app
			</a>
		{/if}
	</div>
</AuthShell>
