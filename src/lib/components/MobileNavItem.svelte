<script lang="ts">
	let {
		href,
		label,
		active: isActive,
	}: {
		href: string;
		label: string;
		active: boolean;
	} = $props();
</script>

<a {href} class="item" class:active={isActive}>{label}</a>

<style>
	.item {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.625rem 0.25rem 0.5rem;
		font-size: 0.875rem;
		font-family: var(--font-mono);
		color: var(--tc-muted);
		text-decoration: none;
		border-top: 0.125rem solid transparent;
		transition:
			color 0.1s,
			border-color 0.1s;
	}

	.item.active {
		color: var(--tc-accent-text);
		border-top-color: var(--tc-accent);
	}
</style>
