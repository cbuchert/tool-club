<script lang="ts">
	let { children } = $props();
</script>

<!--
	Shared wrapper for all auth pages: /signin, /join/[token], /auth/callback errors.
	Centers content vertically, renders the "Tool Club" wordmark above the card slot.
-->
<div class="flex min-h-screen flex-col items-center justify-center px-6 py-10">
	<div
		class="font-display mb-10 text-center text-[1.375rem] font-medium tracking-[-0.02em] text-tc-text"
	>
		Tool Club
	</div>
	{@render children()}
</div>
