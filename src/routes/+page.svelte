<script lang="ts">
	import LandingBody from '$content/landing.md';
	import { onMount } from 'svelte';
	import { preloadCode } from '$app/navigation';

	// Preload the JS chunks for auth routes 300 ms after the landing page
	// mounts. By the time a visitor's cursor reaches "Sign in" the code is
	// already cached — navigation feels immediate.
	onMount(() => {
		const t = setTimeout(() => {
			preloadCode('/signin');
			preloadCode('/join/[token]');
		}, 300);
		return () => clearTimeout(t);
	});
</script>

<svelte:head>
	<title>Tool Club</title>
</svelte:head>

<div class="flex min-h-screen flex-col">
	<!-- ── Header ── -->
	<header
		class="flex items-center justify-between px-10 py-5 [border-bottom:0.5px_solid_var(--tc-border)]"
	>
		<span class="font-display text-xl font-medium tracking-[-0.02em] text-tc-text">Tool Club</span>
		<a
			href="/signin"
			class="rounded-md px-4 py-1.5 text-[0.8125rem] text-tc-text transition-colors hover:bg-tc-surface [border:0.5px_solid_var(--tc-border-mid)]"
		>
			Sign in
		</a>
	</header>

	<!-- ── Hero ── -->
	<main class="mx-auto w-full max-w-[40rem] flex-1 px-10 pb-16 pt-20">
		<p class="mb-5 font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-tc-hint">
			Springville · Invite only
		</p>
		<h1
			class="mb-7 font-display text-[3rem] font-medium leading-[1.05] tracking-[-0.04em] text-tc-text"
		>
			We make things, then talk about it.
		</h1>
		<div
			class="mb-6 max-w-[32.5rem] text-base leading-[1.75] text-tc-muted [&_p:last-child]:mb-0 [&_p]:mb-4"
		>
			<LandingBody />
		</div>

		<hr class="my-10 [border:none] [border-top:0.5px_solid_var(--tc-border)]" />

		<div class="flex flex-wrap gap-10">
			<div>
				<p class="mb-1.5 font-mono text-[0.625rem] uppercase tracking-[0.08em] text-tc-hint">
					Follow along
				</p>
				<a
					href="/feed/public"
					class="text-sm text-tc-muted underline underline-offset-[3px] transition-colors hover:text-tc-text"
				>
					Public RSS feed →
				</a>
			</div>
		</div>
	</main>

	<!-- ── Footer ── -->
	<footer class="mx-auto w-full max-w-[40rem] px-10 pb-12 font-mono text-[0.6875rem] text-tc-hint">
		Already a member?
		<a
			href="/signin"
			class="underline underline-offset-[3px] transition-colors hover:text-tc-muted"
		>
			Sign in →
		</a>
	</footer>
</div>
