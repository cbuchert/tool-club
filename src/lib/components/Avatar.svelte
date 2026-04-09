<script lang="ts">
	/**
	 * Initials avatar — derives 1-2 uppercase letters from a display name.
	 * Used everywhere a member needs a visual identifier without a photo.
	 */
	let {
		name,
		size = 'sm',
	}: {
		name: string;
		/** sm = 1.75rem (28px), md = 2rem (32px), lg = 3.25rem (52px) */
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
	class="flex shrink-0 items-center justify-center rounded-full bg-tc-accent-bg font-mono font-medium text-tc-accent-text {sizeClasses[
		size
	]}"
	aria-label={name}
	title={name}
>
	{initials(name)}
</div>
