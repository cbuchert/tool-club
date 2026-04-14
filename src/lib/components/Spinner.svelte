<script lang="ts">
	let {
		size = '1rem',
	}: {
		/** Matches the surrounding text — defaults to 1em so it scales with
		 *  font-size. Pass a fixed size (e.g. '0.875rem') if you want to pin it. */
		size?: string;
	} = $props();
</script>

<span
	class="spinner"
	style:width={size}
	style:height={size}
	aria-hidden="true"
></span>

<style>
	.spinner {
		display: inline-block;
		border: 0.125rem solid currentColor;
		border-top-color: transparent;
		border-radius: 50%;
		animation: spin 0.7s linear infinite;
		vertical-align: -0.125em;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.spinner {
			animation-duration: 2s;
		}
	}
</style>
