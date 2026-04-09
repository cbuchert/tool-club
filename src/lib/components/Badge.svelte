<script lang="ts">
	type Variant = 'going' | 'open' | 'full' | 'planned' | 'past' | 'closed' | 'no';

	let { variant, label }: { variant: Variant; label?: string } = $props();

	const classes: Record<Variant, string> = {
		going: 'bg-tc-accent-bg text-tc-accent-text [border-color:var(--tc-accent-border)]',
		open: 'bg-tc-info-bg text-tc-info-text [border-color:var(--tc-info-border)]',
		full: 'bg-tc-warn-bg text-tc-warn-text [border-color:var(--tc-warn-border)]',
		planned: 'bg-tc-purple-bg text-tc-purple-text [border-color:var(--tc-purple-border)]',
		past: 'bg-tc-surface text-tc-hint [border-color:var(--tc-border-mid)]',
		closed: 'bg-tc-surface text-tc-hint [border-color:var(--tc-border-mid)]',
		no: 'bg-tc-surface text-tc-muted [border-color:var(--tc-border-mid)]',
	};

	const defaultLabels: Record<Variant, string> = {
		going: 'Going',
		open: 'RSVP open',
		full: 'Full',
		planned: 'planned',
		past: 'Past',
		closed: 'closed',
		no: "Can't make it",
	};
</script>

<span
	class="rounded-full [border:0.5px_solid] px-1.5 py-0.5 font-mono text-[0.625rem] whitespace-nowrap flex-shrink-0 {classes[
		variant
	]}"
>
	{label ?? defaultLabels[variant]}
</span>
