<script lang="ts">
	import { enhance } from '$app/forms';
	import AuthShell from '$lib/components/AuthShell.svelte';

	let { data, form } = $props();
	let loading = $state(false);

	// Live avatar preview — first letter of display name, Fraunces italic
	let nameInput = $state(form?.display_name ?? '');
	const avatarLetter = $derived(nameInput.trim()[0]?.toUpperCase() ?? '?');
</script>

<svelte:head>
	<title>Join Tool Club</title>
</svelte:head>

<AuthShell>
	{#if data.state === 'not_found'}
		<!-- ── Invalid token ── -->
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
			<p class="text-center text-[0.8125rem] text-tc-muted leading-relaxed mb-5">
				This invite link isn't valid. Ask the person who invited you to send a new one.
			</p>
			<a
				href="/"
				class="block text-center text-xs text-tc-muted hover:text-tc-text transition-colors"
			>
				← Back to toolclub.app
			</a>
		</div>
	{:else if data.state === 'expired' || data.state === 'redeemed'}
		<!-- ── Expired / redeemed ── -->
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
			<p class="text-center text-[0.8125rem] text-tc-muted leading-relaxed mb-5">
				{data.state === 'expired'
					? 'Invite links expire after 30 days.'
					: 'This invite link has already been redeemed.'}
				Ask <strong class="font-medium text-tc-text">{data.inviterName}</strong> to send you a new one.
			</p>
			<a
				href="/"
				class="block text-center text-xs text-tc-muted hover:text-tc-text transition-colors"
			>
				← Back to toolclub.app
			</a>
		</div>
	{:else if form?.sent}
		<!-- ── Check your email ── -->
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
			<p class="text-center text-[0.8125rem] text-tc-muted leading-relaxed mb-4">
				We sent a sign-in link to <strong class="font-medium text-tc-text">{form.email}</strong>.
				Click it to finish creating your account.
			</p>
			<a
				href="/"
				class="block text-center text-xs text-tc-muted hover:text-tc-text transition-colors"
			>
				← Back to toolclub.app
			</a>
		</div>
	{:else}
		<!-- ── Invite form ── -->
		<div class="w-full max-w-sm [border:0.5px_solid_var(--tc-border)] rounded-lg p-7 bg-tc-bg">
			<!-- Inviter banner -->
			<div
				class="flex items-center gap-3 rounded-lg [border:0.5px_solid_var(--tc-accent-border)] bg-tc-accent-bg px-4 py-3.5 mb-6"
			>
				<div
					class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tc-accent-text font-display text-sm font-medium italic text-tc-accent-bg"
				>
					{data.inviterName[0]?.toUpperCase()}
				</div>
				<p class="text-[0.8125rem] text-tc-accent-text leading-snug">
					<strong class="font-medium">{data.inviterName}</strong> invited you to join Tool Club.
				</p>
			</div>

			<!-- Description -->
			<p
				class="text-[0.8125rem] text-tc-muted leading-[1.7] mb-6 pb-5 [border-bottom:0.5px_solid_var(--tc-border)]"
			>
				Tool Club is a small, invite-only group of people who like making things. Events happen a
				few times a month in Salt Lake City.
			</p>

			<h1 class="font-display text-xl font-medium tracking-[-0.01em] text-tc-text mb-1.5">
				Create your account
			</h1>
			<p class="text-[0.8125rem] text-tc-muted leading-relaxed mb-6">
				Enter your email and a display name to get started.
			</p>

			{#if form?.error}
				<p
					class="mb-4 rounded-md [border:0.5px_solid_var(--tc-danger-border)] bg-tc-danger-bg px-3 py-2.5 text-[0.75rem] text-tc-danger leading-relaxed"
				>
					{form.error}
				</p>
			{/if}

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
					value={form?.email ?? ''}
					class="w-full rounded-md [border:0.5px_solid_var(--tc-border-mid)] bg-tc-bg px-3 py-2.5 text-sm text-tc-text outline-none transition-colors focus:[border-color:var(--tc-accent-border)] mb-4"
				/>

				<!-- Avatar preview -->
				<div
					class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full [border:2px_solid_var(--tc-border)] bg-tc-accent-bg font-display text-2xl font-medium italic text-tc-accent-text"
				>
					{avatarLetter}
				</div>

				<label
					for="display_name"
					class="block font-mono text-[0.6875rem] uppercase tracking-[0.06em] text-tc-hint mb-1.5"
				>
					Your name
				</label>
				<input
					id="display_name"
					name="display_name"
					type="text"
					required
					autocomplete="name"
					placeholder="e.g. Jamie Rivera"
					bind:value={nameInput}
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

			<p class="mt-4 text-center text-xs text-tc-hint">
				Already a member?
				<a
					href="/signin"
					class="font-mono underline underline-offset-2 text-tc-muted hover:text-tc-text transition-colors"
				>
					Sign in →
				</a>
			</p>
		</div>
	{/if}
</AuthShell>
