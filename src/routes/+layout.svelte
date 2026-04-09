<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';
	import { page } from '$app/stores';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	// Show the app shell only for authenticated, non-public pages.
	const isShell = $derived(
		!!data.user &&
			$page.url.pathname !== '/' &&
			!$page.url.pathname.startsWith('/signin') &&
			!$page.url.pathname.startsWith('/auth/') &&
			!$page.url.pathname.startsWith('/join/')
	);

	const isAdmin = $derived(data.profile?.role === 'admin');

	const navItems = [
		{ href: '/events', label: 'Events' },
		{ href: '/suggestions', label: 'Suggestions' },
		{ href: '/account', label: 'Account' },
	];

	function active(href: string) {
		return $page.url.pathname.startsWith(href);
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if isShell}
	<div class="shell">
		<!-- ── Sidebar (desktop) ── -->
		<nav class="sidebar">
			<div class="logo">
				Tool Club
				<span>making things together</span>
			</div>

			{#each navItems as item}
				<a href={item.href} class="nav-item" class:active={active(item.href)}>
					<span class="dot"></span>
					{item.label}
				</a>
			{/each}

			{#if isAdmin}
				<a href="/admin" class="nav-item admin-item" class:active={active('/admin')}>
					<span class="dot"></span>
					Admin
				</a>
			{/if}

			<div class="sidebar-bottom">
				<div class="user-label">Signed in as</div>
				<div class="user-name">{data.profile?.display_name ?? '—'}</div>
				<form method="POST" action="/signout" class="mt-2">
					<button type="submit" class="sign-out-btn">Sign out</button>
				</form>
			</div>
		</nav>

		<!-- ── Main content ── -->
		<main class="main">
			{@render children()}
		</main>
	</div>

	<!-- ── Mobile nav (≤640px) ── -->
	<nav class="mobile-nav" aria-label="Main navigation">
		<div class="mobile-nav-inner">
			{#each navItems as item}
				<a href={item.href} class="mobile-nav-item" class:active={active(item.href)}>
					{item.label}
				</a>
			{/each}
		</div>
	</nav>
{:else}
	{@render children()}
{/if}

<style>
	/* ── Shell ─────────────────────────────────────────────── */
	.shell {
		display: flex;
		height: 100svh;
		overflow: hidden;
	}

	/* ── Sidebar ────────────────────────────────────────────── */
	.sidebar {
		width: 12.5rem;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		padding: 1.25rem 0;
		background: var(--tc-surface);
		border-right: 0.5px solid var(--tc-border);
		overflow-y: auto;
	}

	.logo {
		font-family: var(--font-display);
		font-size: 1.125rem;
		font-weight: 500;
		letter-spacing: -0.02em;
		color: var(--tc-text);
		padding: 0 1rem 1.25rem;
		border-bottom: 0.5px solid var(--tc-border);
		margin-bottom: 0.75rem;
	}

	.logo span {
		display: block;
		font-style: italic;
		font-weight: 300;
		font-size: 0.8125rem;
		color: var(--tc-muted);
		margin-top: 0.125rem;
	}

	.nav-item {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		padding: 0.5rem 1rem;
		font-size: 0.8125rem;
		color: var(--tc-muted);
		text-decoration: none;
		transition:
			background 0.1s,
			color 0.1s;
	}

	.nav-item:hover {
		background: var(--tc-bg);
		color: var(--tc-text);
	}

	.nav-item.active {
		background: var(--tc-bg);
		color: var(--tc-text);
		font-weight: 500;
	}

	.nav-item.active .dot {
		background: var(--tc-accent);
	}

	.dot {
		width: 0.375rem;
		height: 0.375rem;
		border-radius: 50%;
		background: var(--tc-border-mid);
		flex-shrink: 0;
		transition: background 0.1s;
	}

	.admin-item {
		margin-top: 0.5rem;
		border-top: 0.5px solid var(--tc-border);
		padding-top: 1rem;
		font-size: 0.75rem;
		color: var(--tc-accent-text);
	}

	.admin-item .dot {
		background: var(--tc-accent-border);
	}

	.sidebar-bottom {
		margin-top: auto;
		padding: 0.875rem 1rem 0.25rem;
		border-top: 0.5px solid var(--tc-border);
	}

	.user-label {
		font-size: 0.6875rem;
		color: var(--tc-hint);
		font-family: var(--font-mono);
		margin-bottom: 0.125rem;
	}

	.user-name {
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--tc-text);
	}

	.sign-out-btn {
		font-size: 0.6875rem;
		font-family: var(--font-mono);
		color: var(--tc-hint);
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		transition: color 0.1s;
	}

	.sign-out-btn:hover {
		color: var(--tc-muted);
	}

	/* ── Main ───────────────────────────────────────────────── */
	.main {
		flex: 1;
		overflow-y: auto;
		background: var(--tc-bg);
		display: flex;
		flex-direction: column;
	}

	/* ── Mobile nav ─────────────────────────────────────────── */
	.mobile-nav {
		display: none;
		position: sticky;
		bottom: 0;
		background: var(--tc-bg);
		border-top: 0.5px solid var(--tc-border);
		z-index: 20;
	}

	.mobile-nav-inner {
		display: flex;
	}

	.mobile-nav-item {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.625rem 0.25rem 0.5rem;
		font-size: 0.625rem;
		font-family: var(--font-mono);
		color: var(--tc-muted);
		text-decoration: none;
		border-top: 0.125rem solid transparent;
		transition:
			color 0.1s,
			border-color 0.1s;
	}

	.mobile-nav-item.active {
		color: var(--tc-accent-text);
		border-top-color: var(--tc-accent);
	}

	/* ── Responsive ─────────────────────────────────────────── */
	@media (max-width: 40rem) {
		.shell {
			height: 100svh;
		}

		.sidebar {
			display: none;
		}

		.mobile-nav {
			display: block;
		}
	}
</style>
