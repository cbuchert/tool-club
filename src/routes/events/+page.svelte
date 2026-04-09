<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let view = $state<'upcoming' | 'past'>('upcoming');

	const shown = $derived(view === 'upcoming' ? data.upcoming : data.past);

	function initials(name: string): string {
		return name
			.split(' ')
			.map((n) => n[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	}
</script>

<svelte:head>
	<title>Events — Tool Club</title>
</svelte:head>

<!-- ── Topbar ── -->
<div
	class="sticky top-0 z-10 flex min-h-[3.25rem] items-center justify-between border-b border-[color:var(--tc-border)] bg-tc-bg px-6 [border-width:0.5px]"
>
	<span class="font-display text-base font-medium text-tc-text">Events</span>
	<div class="flex overflow-hidden rounded-md border [border:0.5px_solid_var(--tc-border)]">
		<button
			onclick={() => (view = 'upcoming')}
			class="px-2.5 py-1 text-[0.6875rem] font-mono transition-colors {view === 'upcoming'
				? 'bg-tc-accent-bg text-tc-accent-text'
				: 'bg-transparent text-tc-muted hover:text-tc-text'}"
		>
			Upcoming
		</button>
		<button
			onclick={() => (view = 'past')}
			class="px-2.5 py-1 text-[0.6875rem] font-mono transition-colors {view === 'past'
				? 'bg-tc-accent-bg text-tc-accent-text'
				: 'bg-transparent text-tc-muted hover:text-tc-text'}"
		>
			Past
		</button>
	</div>
</div>

<!-- ── Event list ── -->
<div class="flex-1 p-6">
	{#if shown.length === 0}
		<p class="text-[0.8125rem] text-tc-muted">
			{view === 'upcoming' ? 'No upcoming events.' : 'No past events yet.'}
		</p>
	{:else}
		{#each shown as event (event.id)}
			<a
				href="/events/{event.id}"
				class="mb-2.5 flex gap-4 rounded-lg [border:0.5px_solid_var(--tc-border)] bg-tc-bg p-4 transition-colors hover:border-[color:var(--tc-border-mid)] hover:bg-tc-surface"
			>
				<!-- Date column -->
				<div class="w-10 shrink-0 text-center">
					<div class="font-display text-[1.375rem] font-medium leading-none text-tc-text">
						{event.cardDay}
					</div>
					<div class="font-mono text-[0.625rem] uppercase tracking-[0.06em] text-tc-muted">
						{event.cardMonth}
					</div>
				</div>

				<!-- Info -->
				<div class="min-w-0 flex-1">
					<div class="mb-0.5 text-sm font-medium text-tc-text">{event.title}</div>
					<div class="mb-2 text-xs text-tc-muted">{event.cardMeta}</div>

					<!-- Footer: badge + avatars + count -->
					<div class="flex flex-wrap items-center gap-2">
						<!-- RSVP badge -->
						{#if event.status === 'past'}
							<span
								class="rounded-full border bg-tc-surface px-1.5 py-0.5 font-mono text-[0.625rem] text-tc-hint [border:0.5px_solid_var(--tc-border-mid)]"
								>Past</span
							>
						{:else if event.myRsvp === 'yes'}
							<span
								class="rounded-full border bg-tc-accent-bg px-1.5 py-0.5 font-mono text-[0.625rem] text-tc-accent-text [border:0.5px_solid_var(--tc-accent-border)]"
								>Going</span
							>
						{:else if event.isFull}
							<span
								class="rounded-full border bg-tc-warn-bg px-1.5 py-0.5 font-mono text-[0.625rem] text-tc-warn-text [border:0.5px_solid_var(--tc-warn-border)]"
								>Full</span
							>
						{:else}
							<span
								class="rounded-full border bg-tc-info-bg px-1.5 py-0.5 font-mono text-[0.625rem] text-tc-info-text [border:0.5px_solid_var(--tc-info-border)]"
								>RSVP open</span
							>
						{/if}

						<!-- Avatar stack (up to 3 + overflow) -->
						{#if event.goingCount > 0}
							<div class="flex">
								{#each event.goingUsers.slice(0, 3) as u, i}
									<div
										class="flex h-[1.375rem] w-[1.375rem] items-center justify-center rounded-full border-[1.5px] border-tc-bg bg-tc-accent-bg font-mono text-[0.5625rem] font-medium text-tc-accent-text {i >
										0
											? '-ml-1.5'
											: ''}"
									>
										{initials(u.display_name)}
									</div>
								{/each}
								{#if event.goingCount > 3}
									<div
										class="-ml-1.5 flex h-[1.375rem] w-[1.375rem] items-center justify-center rounded-full border-[1.5px] border-tc-bg bg-tc-accent-bg font-mono text-[0.5rem] text-tc-accent-text"
									>
										+{event.goingCount - 3}
									</div>
								{/if}
							</div>
							<span class="text-xs text-tc-muted">
								{event.goingCount} going{event.capacity
									? ` · ${event.capacity - event.goingCount} spots left`
									: ''}
							</span>
						{/if}
					</div>
				</div>
			</a>
		{/each}
	{/if}
</div>
