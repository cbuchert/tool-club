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
		width: 200px;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		padding: 20px 0;
		background: var(--color-tc-surface);
		border-right: 0.5px solid var(--color-tc-border);
		overflow-y: auto;
	}

	.logo {
		font-family: var(--font-display);
		font-size: 18px;
		font-weight: 500;
		letter-spacing: -0.3px;
		color: var(--color-tc-text);
		padding: 0 16px 20px;
		border-bottom: 0.5px solid var(--color-tc-border);
		margin-bottom: 12px;
	}

	.logo span {
		display: block;
		font-style: italic;
		font-weight: 300;
		font-size: 13px;
		color: var(--color-tc-muted);
		margin-top: 2px;
	}

	.nav-item {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 16px;
		font-size: 13px;
		color: var(--color-tc-muted);
		text-decoration: none;
		transition:
			background 0.1s,
			color 0.1s;
	}

	.nav-item:hover {
		background: var(--color-tc-bg);
		color: var(--color-tc-text);
	}

	.nav-item.active {
		background: var(--color-tc-bg);
		color: var(--color-tc-text);
		font-weight: 500;
	}

	.nav-item.active .dot {
		background: var(--color-tc-accent);
	}

	.dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--color-tc-border-mid);
		flex-shrink: 0;
		transition: background 0.1s;
	}

	.admin-item {
		margin-top: 8px;
		border-top: 0.5px solid var(--color-tc-border);
		padding-top: 16px;
		font-size: 12px;
		color: var(--color-tc-accent-text);
	}

	.admin-item .dot {
		background: var(--color-tc-accent-border);
	}

	.sidebar-bottom {
		margin-top: auto;
		padding: 14px 16px 4px;
		border-top: 0.5px solid var(--color-tc-border);
	}

	.user-label {
		font-size: 11px;
		color: var(--color-tc-hint);
		font-family: var(--font-mono);
		margin-bottom: 2px;
	}

	.user-name {
		font-size: 13px;
		font-weight: 500;
		color: var(--color-tc-text);
	}

	/* ── Main ───────────────────────────────────────────────── */
	.main {
		flex: 1;
		overflow-y: auto;
		background: var(--color-tc-bg);
		display: flex;
		flex-direction: column;
	}

	/* ── Mobile nav ─────────────────────────────────────────── */
	.mobile-nav {
		display: none;
		position: sticky;
		bottom: 0;
		background: var(--color-tc-bg);
		border-top: 0.5px solid var(--color-tc-border);
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
		padding: 10px 4px 8px;
		font-size: 10px;
		font-family: var(--font-mono);
		color: var(--color-tc-muted);
		text-decoration: none;
		border-top: 2px solid transparent;
		transition:
			color 0.1s,
			border-color 0.1s;
	}

	.mobile-nav-item.active {
		color: var(--color-tc-accent-text);
		border-top-color: var(--color-tc-accent);
	}

	/* ── Responsive ─────────────────────────────────────────── */
	@media (max-width: 640px) {
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
