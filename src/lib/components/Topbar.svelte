<script lang="ts">
	import type { Snippet } from 'svelte';

	/**
	 * Sticky page topbar — used on every authenticated route.
	 * Left slot: title or back button. Right slot: actions (optional).
	 */
	let {
		left,
		right,
	}: {
		left: Snippet;
		right?: Snippet;
	} = $props();
</script>

<div
	class="sticky top-0 z-10 flex min-h-[3.25rem] items-center justify-between [border-bottom:0.5px_solid_var(--tc-border)] bg-tc-bg px-4 sm:px-6"
>
	{@render left()}
	{#if right}
		{@render right()}
	{/if}
</div>
