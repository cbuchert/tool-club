<script lang="ts">
	import { navigating } from '$app/stores';

	// Small delay before showing the bar so fast navigations don't flash.
	const SHOW_AFTER_MS = 150;

	let visible = $state(false);
	let timer: ReturnType<typeof setTimeout> | null = null;

	$effect(() => {
		if ($navigating) {
			if (timer) clearTimeout(timer);
			timer = setTimeout(() => (visible = true), SHOW_AFTER_MS);
		} else {
			if (timer) {
				clearTimeout(timer);
				timer = null;
			}
			visible = false;
		}
	});
</script>

{#if visible}
	<div class="progress" role="progressbar" aria-label="Loading"></div>
{/if}

<style>
	.progress {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		height: 0.125rem;
		background: var(--tc-accent);
		z-index: 100;
		transform-origin: left;
		animation: progress 8s cubic-bezier(0.1, 0.6, 0.3, 1) forwards;
	}

	/* Asymptotic progress — fills fast at first, approaches but never reaches
	   100% until the navigation actually completes and the bar is removed. */
	@keyframes progress {
		0% {
			transform: scaleX(0);
			opacity: 1;
		}
		30% {
			transform: scaleX(0.5);
		}
		60% {
			transform: scaleX(0.75);
		}
		100% {
			transform: scaleX(0.92);
			opacity: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.progress {
			animation: none;
			transform: scaleX(0.5);
		}
	}
</style>
