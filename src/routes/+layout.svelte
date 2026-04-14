<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';
	import { page } from '$app/stores';
	import MobileNavItem from '$lib/components/MobileNavItem.svelte';
	import NavProgress from '$lib/components/NavProgress.svelte';
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

<NavProgress />

<!-- Shell chrome rendered conditionally, but children always rendered at the same
     level to avoid recreating page components (and TanStack Form's onMount) inside
     a reactive Svelte 5 branch when $page updates after applyAction. -->

{#if isShell}
	<!-- ── Sidebar (desktop) ── -->
	<nav class="sidebar">
		<div class="logo">Tool Club</div>

		{#each navItems as item (item.href)}
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
{/if}

<!-- ── Page content (always rendered, never recreated) ── -->
<main class="main" class:in-shell={isShell}>
	{@render children()}
</main>

{#if isShell}
	<!-- ── Mobile nav (≤640px) ── -->
	<nav class="mobile-nav" aria-label="Main navigation">
		<div class="mobile-nav-inner">
			{#each navItems as item (item.href)}
				<MobileNavItem href={item.href} label={item.label} active={active(item.href)} />
			{/each}
			{#if isAdmin}
				<MobileNavItem href="/admin" label="Admin" active={active('/admin')} />
			{/if}
		</div>
	</nav>
{/if}

<style>
	/* ── Shell: sidebar + main sit side-by-side via body flex ── */
	:global(body):has(.sidebar) {
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
		background: var(--tc-bg);
		display: flex;
		flex-direction: column;
	}

	.main.in-shell {
		flex: 1;
		overflow-y: auto;
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

	/* ── Responsive ─────────────────────────────────────────── */
	@media (max-width: 40rem) {
		/* On mobile, let the document itself be the scroll container.
		   The overflow/100svh/flex combo used for the desktop sidebar
		   hijacks scroll on iOS WebKit: `.main` internal scrolling
		   silently fails AND pull-to-refresh is disabled. Native document
		   scroll is robust on every mobile browser. */
		:global(body):has(.sidebar) {
			display: block;
			height: auto;
			overflow: visible;
		}

		.sidebar {
			display: none;
		}

		.main,
		.main.in-shell {
			display: block;
			overflow: visible;
			flex: initial;
			min-height: auto;
			/* Reserve room below for the fixed mobile tab bar so the last
			   content doesn't sit under it. 3.75rem ≈ nav height + a little
			   breathing room; safe-area-inset-bottom covers the iOS home
			   indicator. */
			padding-bottom: calc(3.75rem + env(safe-area-inset-bottom));
		}

		.mobile-nav {
			display: block;
			position: fixed;
			left: 0;
			right: 0;
			bottom: 0;
			padding-bottom: env(safe-area-inset-bottom);
		}
	}
</style>
