<script lang="ts">
	import { deserialize } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import Topbar from '$lib/components/Topbar.svelte';
	import Avatar from '$lib/components/Avatar.svelte';
	import { autoAnimate } from '$lib/actions/auto-animate';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let submitting = $state<string | null>(null); // stores userId or inviteId being acted on

	async function postAction(action: string, body: FormData) {
		const res = await fetch(`/admin/members?/${action}`, { method: 'POST', body });
		const result = deserialize(await res.text());
		if (result.type !== 'failure') await invalidateAll();
	}

	async function suspend(userId: string) {
		submitting = userId;
		const fd = new FormData();
		fd.set('user_id', userId);
		await postAction('suspend', fd);
		submitting = null;
	}

	async function reinstate(userId: string) {
		submitting = userId;
		const fd = new FormData();
		fd.set('user_id', userId);
		await postAction('reinstate', fd);
		submitting = null;
	}

	async function revokeInvite(inviteId: string) {
		submitting = inviteId;
		const fd = new FormData();
		fd.set('invite_id', inviteId);
		await postAction('revokeInvite', fd);
		submitting = null;
	}
</script>

<svelte:head>
	<title>Members — Admin — Tool Club</title>
</svelte:head>

<Topbar>
	{#snippet left()}
		<a href="/admin" class="text-xs text-tc-muted transition-colors hover:text-tc-text">← Admin</a>
	{/snippet}
</Topbar>

<div class="p-4 sm:p-6 max-w-2xl space-y-8">
	<!-- ── Member list ── -->
	<section>
		<p class="mb-3 font-mono text-[0.625rem] uppercase tracking-[0.08em] text-tc-hint">
			Members ({data.members.length})
		</p>

		<div class="space-y-2" use:autoAnimate>
			{#each data.members as member (member.id)}
				<div
					data-member-id={member.id}
					class="flex items-center gap-3 rounded-lg [border:0.5px_solid_var(--tc-border)] bg-tc-bg p-3.5"
				>
					<Avatar name={member.display_name} size="sm" />

					<div class="min-w-0 flex-1">
						<div class="flex items-center gap-2">
							<p class="text-sm font-medium text-tc-text">{member.display_name}</p>
							{#if member.role === 'admin'}
								<span
									class="rounded-full bg-tc-accent-bg [border:0.5px_solid_var(--tc-accent-border)] px-1.5 py-0.5 font-mono text-[0.5625rem] text-tc-accent-text"
									>admin</span
								>
							{/if}
							{#if member.is_suspended}
								<span
									data-testid="suspended-badge"
									class="rounded-full bg-tc-danger-bg [border:0.5px_solid_var(--tc-danger-border)] px-1.5 py-0.5 font-mono text-[0.5625rem] text-tc-danger"
									>suspended</span
								>
							{/if}
						</div>
						<p class="text-xs text-tc-muted">{member.email ?? '—'}</p>
					</div>

					<div class="flex shrink-0 gap-2">
						{#if member.is_suspended}
							<button
								data-action="reinstate"
								onclick={() => reinstate(member.id)}
								disabled={submitting === member.id}
								class="rounded-md [border:0.5px_solid_var(--tc-accent-border)] bg-tc-accent-bg px-2.5 py-1 font-mono text-[0.625rem] text-tc-accent-text transition-colors hover:opacity-[0.88] disabled:opacity-50"
							>
								Reinstate
							</button>
						{:else}
							<button
								data-action="suspend"
								onclick={() => suspend(member.id)}
								disabled={submitting === member.id}
								class="rounded-md [border:0.5px_solid_var(--tc-danger-border)] px-2.5 py-1 font-mono text-[0.625rem] text-tc-danger transition-colors hover:bg-tc-danger-bg disabled:opacity-50"
							>
								Suspend
							</button>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</section>

	<!-- ── Pending invites ── -->
	{#if data.invites.length > 0}
		<section>
			<p class="mb-3 font-mono text-[0.625rem] uppercase tracking-[0.08em] text-tc-hint">
				Pending invites ({data.invites.length})
			</p>

			<div class="space-y-2" use:autoAnimate>
				{#each data.invites as invite (invite.id)}
					<div
						class="flex items-center justify-between rounded-lg [border:0.5px_solid_var(--tc-border)] bg-tc-bg p-3.5"
					>
						<div class="min-w-0 flex-1">
							<p class="font-mono text-xs text-tc-text">
								{invite.email ?? 'No email recorded'}
							</p>
							<p class="text-xs text-tc-muted">
								From {invite.inviter_name} · Expires {new Date(
									invite.expires_at
								).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
							</p>
						</div>
						<button
							onclick={() => revokeInvite(invite.id)}
							disabled={submitting === invite.id}
							class="ml-3 shrink-0 rounded-md [border:0.5px_solid_var(--tc-danger-border)] px-2.5 py-1 font-mono text-[0.625rem] text-tc-danger transition-colors hover:bg-tc-danger-bg disabled:opacity-50"
						>
							Revoke
						</button>
					</div>
				{/each}
			</div>
		</section>
	{:else}
		<section>
			<p class="mb-3 font-mono text-[0.625rem] uppercase tracking-[0.08em] text-tc-hint">
				Pending invites
			</p>
			<p class="text-sm text-tc-muted">No pending invites.</p>
		</section>
	{/if}
</div>
