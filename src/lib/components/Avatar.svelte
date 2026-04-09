<script lang="ts">
	/**
	 * Avatar — shows a profile photo when available, falls back to
	 * a coloured circle with the user's initials.
	 */
	let {
		name,
		avatarUrl = null,
		size = 'sm',
	}: {
		name: string;
		avatarUrl?: string | null;
		/** sm = 1.75rem, md = 2rem, lg = 3.25rem */
		size?: 'sm' | 'md' | 'lg';
	} = $props();

	function initials(displayName: string): string {
		const letters = displayName
			.trim()
			.split(/\s+/)
			.map((n) => n[0])
			.filter(Boolean)
			.join('')
			.toUpperCase()
			.slice(0, 2);
		return letters || '?';
	}

	const sizeClasses = {
		sm: 'h-7 w-7 text-[0.625rem]',
		md: 'h-8 w-8 text-[0.6875rem]',
		lg: 'h-[3.25rem] w-[3.25rem] text-xl',
	};
</script>

<div
	class="flex shrink-0 items-center justify-center rounded-full overflow-hidden bg-tc-accent-bg font-mono font-medium text-tc-accent-text {sizeClasses[
		size
	]}"
	aria-label={name}
	title={name}
>
	{#if avatarUrl}
		<img src={avatarUrl} alt={name} class="h-full w-full object-cover" />
	{:else}
		{initials(name)}
	{/if}
</div>
