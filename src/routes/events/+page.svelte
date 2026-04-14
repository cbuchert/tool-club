<script lang="ts">
	import type { PageData } from './$types';
	import Topbar from '$lib/components/Topbar.svelte';
	import Badge from '$lib/components/Badge.svelte';
	import Avatar from '$lib/components/Avatar.svelte';

	let { data }: { data: PageData } = $props();

	let view = $state<'upcoming' | 'past'>('upcoming');

	const shown = $derived(view === 'upcoming' ? data.upcoming : data.past);

	// Group events into consecutive month/year buckets, preserving order
	type EventItem = (typeof shown)[0];
	const grouped = $derived(() => {
		const groups: { label: string; events: EventItem[] }[] = [];
		for (const event of shown) {
			const last = groups[groups.length - 1];
			if (!last || last.label !== event.monthLabel) {
				groups.push({ label: event.monthLabel, events: [event] });
			} else {
				last.events.push(event);
			}
		}
		return groups;
	});
</script>

<svelte:head>
	<title>Events — Tool Club</title>
</svelte:head>

<!-- ── Topbar ── -->
<Topbar>
	{#snippet left()}
		<span class="font-display text-base font-medium text-tc-text">Events</span>
	{/snippet}
	{#snippet right()}
		<div class="flex overflow-hidden rounded-md border [border:0.5px_solid_var(--tc-border)]">
			<button
				onclick={() => (view = 'upcoming')}
				class="px-2.5 py-1 text-sm md:text-[0.6875rem] font-mono transition-colors {view === 'upcoming'
					? 'bg-tc-accent-bg text-tc-accent-text'
					: 'bg-transparent text-tc-muted hover:text-tc-text'}"
			>
				Upcoming
			</button>
			<button
				onclick={() => (view = 'past')}
				class="px-2.5 py-1 text-sm md:text-[0.6875rem] font-mono transition-colors {view === 'past'
					? 'bg-tc-accent-bg text-tc-accent-text'
					: 'bg-transparent text-tc-muted hover:text-tc-text'}"
			>
				Past
			</button>
		</div>
	{/snippet}
</Topbar>

<!-- ── Event list ── -->
<div class="p-4 sm:p-6">
	{#if shown.length === 0}
		<p class="text-base md:text-[0.8125rem] text-tc-muted">
			{view === 'upcoming' ? 'No upcoming events.' : 'No past events yet.'}
		</p>
	{:else}
		{#each grouped() as group (group.label)}
			<p
				class="mb-3 font-mono text-sm md:text-[0.625rem] uppercase tracking-[0.08em] text-tc-hint {group !==
				grouped()[0]
					? 'mt-6'
					: ''}"
			>
				{group.label}
			</p>
			{#each group.events as event (event.id)}
				<a
					href="/events/{event.id}"
					class="mb-2.5 flex gap-4 rounded-lg [border:0.5px_solid_var(--tc-border)] bg-tc-bg p-4 transition-colors hover:border-[color:var(--tc-border-mid)] hover:bg-tc-surface"
				>
					<!-- Date column -->
					<div class="w-10 shrink-0 text-center">
						<div class="font-display text-[1.375rem] font-medium leading-none text-tc-text">
							{event.cardDay}
						</div>
						<div class="font-mono text-sm md:text-[0.625rem] uppercase tracking-[0.06em] text-tc-muted">
							{event.cardMonth}
						</div>
					</div>

					<!-- Info -->
					<div class="min-w-0 flex-1">
						<div class="mb-0.5 text-base md:text-sm font-medium text-tc-text">{event.title}</div>
						<div class="mb-2 text-base md:text-xs text-tc-muted">{event.cardMeta}</div>

						<!-- Footer: badge + avatars + count -->
						<div class="flex flex-wrap items-center gap-2">
							<!-- RSVP badge -->
							{#if event.status === 'past'}
								<Badge variant="past" />
							{:else if event.myRsvp === 'yes'}
								<Badge variant="going" />
							{:else if event.isFull}
								<Badge variant="full" />
							{:else}
								<Badge variant="open" />
							{/if}

							<!-- Avatar stack (up to 3 + overflow) -->
							{#if event.goingCount > 0}
								<div class="flex">
									{#each event.goingUsers.slice(0, 3) as u, i (u.id)}
										<div class="border-[1.5px] border-tc-bg rounded-full {i > 0 ? '-ml-1.5' : ''}">
											<Avatar name={u.display_name} size="sm" />
										</div>
									{/each}
									{#if event.goingCount > 3}
										<div
											class="-ml-1.5 flex h-[1.375rem] w-[1.375rem] items-center justify-center rounded-full border-[1.5px] border-tc-bg bg-tc-accent-bg font-mono text-[0.625rem] text-tc-accent-text"
										>
											+{event.goingCount - 3}
										</div>
									{/if}
								</div>
								<span class="text-base md:text-xs text-tc-muted">
									{event.goingCount} going{event.capacity
										? ` · ${event.capacity - event.goingCount} spots left`
										: ''}
								</span>
							{/if}
						</div>
					</div>
				</a>
			{/each}
		{/each}
	{/if}
</div>
