<script lang="ts">
	import { deserialize } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import Topbar from '$lib/components/Topbar.svelte';
	import Avatar from '$lib/components/Avatar.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// ── Display name inline edit ──────────────────────────────────────────────
	let editing = $state(false);
	let nameValue = $state(data.profile.display_name);
	let nameError = $state<string | null>(null);
	let nameSaving = $state(false);

	async function saveName() {
		if (!nameValue.trim()) {
			nameError = 'Display name is required.';
			return;
		}
		nameSaving = true;
		nameError = null;
		const fd = new FormData();
		fd.set('display_name', nameValue);
		const res = await fetch('/account?/updateName', { method: 'POST', body: fd });
		const result = deserialize(await res.text());
		if (result.type === 'failure') nameError = (result.data?.error as string) ?? 'Failed.';
		else {
			editing = false;
			await invalidateAll();
		}
		nameSaving = false;
	}

	// ── Avatar upload ─────────────────────────────────────────────────────────
	let avatarUploading = $state(false);
	let avatarError = $state<string | null>(null);

	async function uploadAvatar(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		avatarUploading = true;
		avatarError = null;
		const fd = new FormData();
		fd.set('avatar', file);
		const res = await fetch('/account?/uploadAvatar', { method: 'POST', body: fd });
		const result = deserialize(await res.text());
		if (result.type === 'failure') avatarError = (result.data?.error as string) ?? 'Upload failed.';
		else await invalidateAll();
		avatarUploading = false;
		input.value = '';
	}

	// ── Invite actions ────────────────────────────────────────────────────────
	let inviteGenerating = $state(false);
	let inviteError = $state<string | null>(null);
	// Track copied state per invite ID
	let copiedInviteId = $state<string | null>(null);

	async function generateInvite() {
		inviteGenerating = true;
		inviteError = null;
		const res = await fetch('/account?/generateInvite', { method: 'POST', body: new FormData() });
		const result = deserialize(await res.text());
		if (result.type === 'failure') inviteError = (result.data?.error as string) ?? 'Failed.';
		else await invalidateAll();
		inviteGenerating = false;
	}

	async function revokeInvite(inviteId: string) {
		const fd = new FormData();
		fd.set('invite_id', inviteId);
		const res = await fetch('/account?/revokeInvite', { method: 'POST', body: fd });
		const result = deserialize(await res.text());
		if (result.type !== 'failure') await invalidateAll();
	}

	// ── Feed token ────────────────────────────────────────────────────────────
	let tokenCopied = $state<'rss' | 'ical' | null>(null);
	let regenerating = $state(false);
	let showRegenerateConfirm = $state(false);

	async function copyUrl(type: 'rss' | 'ical', url: string) {
		await navigator.clipboard.writeText(url);
		tokenCopied = type;
		setTimeout(() => {
			tokenCopied = null;
		}, 2000);
	}

	async function regenerateToken() {
		regenerating = true;
		const res = await fetch('/account?/regenerateToken', { method: 'POST', body: new FormData() });
		const result = deserialize(await res.text());
		if (result.type !== 'failure') {
			showRegenerateConfirm = false;
			await invalidateAll();
		}
		regenerating = false;
	}

	// ── Account deletion ──────────────────────────────────────────────────────
	let showDeleteConfirm = $state(false);
	let deleteError = $state<string | null>(null);
	let deleting = $state(false);

	async function deleteAccount() {
		deleting = true;
		deleteError = null;
		const res = await fetch('/account?/deleteAccount', { method: 'POST', body: new FormData() });
		const result = deserialize(await res.text());
		if (result.type === 'failure') {
			deleteError = (result.data?.deleteError as string) ?? 'Failed.';
			showDeleteConfirm = false;
		} else {
			// Deletion redirects to / — follow the redirect via a hard navigation
			window.location.href = '/';
		}
		deleting = false;
	}
</script>

<svelte:head>
	<title>Account — Tool Club</title>
</svelte:head>

<Topbar>
	{#snippet left()}
		<span class="font-display text-base font-medium text-tc-text">Account</span>
	{/snippet}
</Topbar>

<div class="p-4 sm:p-6 max-w-xl space-y-8">
	<!-- ── Identity ── -->
	<section>
		<p class="mb-3 font-mono text-[0.625rem] uppercase tracking-[0.08em] text-tc-hint">Identity</p>

		<div class="flex items-center gap-4 mb-4">
			<!-- Clicking the avatar triggers the file input -->
			<label class="relative cursor-pointer group" title="Change photo">
				<Avatar
					name={data.profile.display_name || '?'}
					avatarUrl={data.profile.avatar_url}
					size="lg"
				/>
				<div
					class="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
				>
					<span class="font-mono text-[0.5rem] text-white uppercase tracking-widest">
						{avatarUploading ? '…' : 'Edit'}
					</span>
				</div>
				<input
					type="file"
					accept="image/jpeg,image/png,image/webp"
					class="sr-only"
					onchange={uploadAvatar}
					disabled={avatarUploading}
				/>
			</label>
			<div>
				{#if editing}
					<div class="flex items-center gap-2">
						<input
							bind:value={nameValue}
							onkeydown={(e) => {
								if (e.key === 'Enter') saveName();
								if (e.key === 'Escape') {
									editing = false;
									nameValue = data.profile.display_name;
								}
							}}
							class="text-base font-medium text-tc-text bg-transparent border-b-[1.5px] [border-color:var(--tc-accent-border)] outline-none w-44"
							autofocus
						/>
						<button
							onclick={saveName}
							disabled={nameSaving}
							class="flex h-6 w-6 items-center justify-center rounded-md [border:0.5px_solid_var(--tc-accent-border)] bg-tc-accent-bg text-tc-accent-text text-xs transition-colors hover:bg-tc-accent hover:text-white disabled:opacity-50"
							>✓</button
						>
					</div>
					{#if nameError}<p class="mt-1 text-xs text-tc-danger">{nameError}</p>{/if}
				{:else}
					<button
						onclick={() => {
							editing = true;
							nameValue = data.profile.display_name;
						}}
						class="text-base font-medium text-tc-text border-b border-dashed border-transparent hover:[border-color:var(--tc-border-mid)] transition-colors cursor-text text-left"
					>
						{data.profile.display_name}
					</button>
				{/if}
				<p class="text-sm text-tc-muted">{data.profile.email ?? ''}</p>
			</div>
		</div>
		{#if avatarError}
			<p class="mt-2 text-xs text-tc-danger">{avatarError}</p>
		{/if}
		<p class="text-xs text-tc-hint">Click your avatar to change it · Click your name to edit it.</p>
	</section>

	<!-- ── Invites ── -->
	<section>
		<p class="mb-3 font-mono text-[0.625rem] uppercase tracking-[0.08em] text-tc-hint">Invites</p>

		{#if inviteError}
			<p class="mb-2 text-xs text-tc-danger">{inviteError}</p>
		{/if}

		<!-- Pending invites list -->
		{#if data.pendingInvites.length > 0}
			<div class="mb-3 space-y-2">
				{#each data.pendingInvites as invite (invite.id)}
					<div
						class="flex items-center justify-between rounded-md [border:0.5px_solid_var(--tc-border)] px-3 py-2.5"
					>
						<div class="min-w-0">
							<p class="truncate text-tc-text font-mono text-xs">{invite.url}</p>
							<p class="text-xs text-tc-muted mt-0.5">
								Sent {new Date(invite.created_at).toLocaleDateString('en-US', {
									month: 'short',
									day: 'numeric',
								})}
								· Expires {new Date(invite.expires_at).toLocaleDateString('en-US', {
									month: 'short',
									day: 'numeric',
								})}
							</p>
						</div>
						<div class="flex gap-2 ml-3 shrink-0">
							<button
								onclick={async () => {
									await navigator.clipboard.writeText(invite.url);
									copiedInviteId = invite.id;
									setTimeout(() => (copiedInviteId = null), 2000);
								}}
								class="rounded-md [border:0.5px_solid_var(--tc-border-mid)] px-2.5 py-1 font-mono text-[0.625rem] text-tc-text transition-colors hover:bg-tc-surface {copiedInviteId ===
								invite.id
									? 'bg-tc-accent-bg text-tc-accent-text [border-color:var(--tc-accent-border)]'
									: ''}">{copiedInviteId === invite.id ? 'Copied' : 'Copy'}</button
							>
							<button
								onclick={() => revokeInvite(invite.id)}
								class="rounded-md [border:0.5px_solid_var(--tc-danger-border)] px-2.5 py-1 font-mono text-[0.625rem] text-tc-danger transition-colors hover:bg-tc-danger-bg"
								>Revoke</button
							>
						</div>
					</div>
				{/each}
			</div>
		{/if}

		<button
			onclick={generateInvite}
			disabled={inviteGenerating}
			class="rounded-md [border:0.5px_solid_var(--tc-border-mid)] px-4 py-2 text-sm text-tc-text transition-colors hover:bg-tc-surface disabled:opacity-50 disabled:cursor-not-allowed"
		>
			{inviteGenerating ? 'Creating…' : '+ Send an invite'}
		</button>

		<!-- Invite history: members who joined via this user's invites -->
		{#if data.recruited.length > 0}
			<div class="mt-5">
				<p class="mb-2 font-mono text-[0.625rem] uppercase tracking-[0.08em] text-tc-hint">
					Your invite history
				</p>
				<div
					class="rounded-md [border:0.5px_solid_var(--tc-border)] divide-y [--tw-divide-opacity:1]"
					style="--divide-color: var(--tc-border)"
				>
					{#each data.recruited as member (member.id)}
						<div
							class="flex items-center justify-between px-3 py-2.5 [border-bottom:0.5px_solid_var(--tc-border)] last:border-b-0"
						>
							<div class="flex items-center gap-2">
								<Avatar name={member.display_name} size="sm" />
								<span class="text-sm text-tc-text">{member.display_name}</span>
							</div>
							<span
								class="font-mono text-[0.625rem] rounded-full px-2 py-0.5 bg-tc-accent-bg text-tc-accent-text [border:0.5px_solid_var(--tc-accent-border)]"
							>
								Joined {new Date(member.created_at).toLocaleDateString('en-US', {
									month: 'short',
									day: 'numeric',
								})}
							</span>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</section>

	<!-- ── Network ── -->
	{#if data.recruited.length > 0}
		<section>
			<p class="mb-3 font-mono text-[0.625rem] uppercase tracking-[0.08em] text-tc-hint">
				Your network
			</p>
			<div class="space-y-4">
				{#each data.recruited as member (member.id)}
					{@const theirRecruits = data.secondLevel.filter((s) => s.invited_by === member.id)}
					<div>
						<div class="flex items-center gap-2 mb-1.5">
							<Avatar name={member.display_name} size="sm" />
							<span class="text-sm font-medium text-tc-text">{member.display_name}</span>
						</div>
						<div class="ml-5 pl-3 [border-left:0.5px_solid_var(--tc-border)]">
							{#if theirRecruits.length > 0}
								<div class="space-y-1.5">
									{#each theirRecruits as recruit (recruit.id)}
										<div class="flex items-center gap-2">
											<Avatar name={recruit.display_name} size="sm" />
											<span class="text-xs text-tc-muted">{recruit.display_name}</span>
										</div>
									{/each}
								</div>
							{:else}
								<p class="text-xs text-tc-hint">Nobody invited yet</p>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</section>
	{/if}

	<!-- ── Feed ── -->
	<section>
		<p class="mb-3 font-mono text-[0.625rem] uppercase tracking-[0.08em] text-tc-hint">
			Feed &amp; calendar
		</p>

		{#if data.feedToken}
			<div class="space-y-2 mb-4">
				{#each [{ label: 'RSS feed', url: data.rssUrl, type: 'rss' as const }, { label: 'iCal feed', url: data.icalUrl, type: 'ical' as const }] as feed (feed.type)}
					{#if feed.url}
						<div
							class="flex items-center gap-2 overflow-hidden rounded-md [border:0.5px_solid_var(--tc-border)] bg-tc-surface px-3 py-2"
						>
							<p class="font-mono text-[0.6875rem] shrink-0 text-tc-hint w-16">{feed.label}</p>
							<p class="min-w-0 flex-1 truncate font-mono text-[0.6875rem] text-tc-muted">
								{feed.url}
							</p>
							<button
								onclick={() => copyUrl(feed.type, feed.url!)}
								class="shrink-0 rounded-md [border:0.5px_solid_var(--tc-border-mid)] px-2 py-0.5 font-mono text-[0.625rem] text-tc-text transition-colors hover:bg-tc-bg {tokenCopied ===
								feed.type
									? 'bg-tc-accent-bg text-tc-accent-text [border-color:var(--tc-accent-border)]'
									: ''}">{tokenCopied === feed.type ? 'Copied!' : 'Copy'}</button
							>
						</div>
					{/if}
				{/each}
			</div>

			{#if showRegenerateConfirm}
				<div class="rounded-md [border:0.5px_solid_var(--tc-warn-border)] bg-tc-warn-bg p-3 mb-3">
					<p class="text-[0.8125rem] text-tc-warn-text mb-2">
						Regenerating your token will immediately break any existing RSS or calendar
						subscriptions. Continue?
					</p>
					<div class="flex gap-2">
						<button
							onclick={regenerateToken}
							disabled={regenerating}
							class="rounded-md bg-tc-warn-text px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-[0.88] disabled:opacity-50"
						>
							{regenerating ? 'Regenerating…' : 'Yes, regenerate'}
						</button>
						<button
							onclick={() => (showRegenerateConfirm = false)}
							class="rounded-md [border:0.5px_solid_var(--tc-border-mid)] px-3 py-1.5 text-xs text-tc-muted transition-colors hover:text-tc-text"
						>
							Cancel
						</button>
					</div>
				</div>
			{:else}
				<button
					onclick={() => (showRegenerateConfirm = true)}
					class="text-xs font-mono text-tc-muted underline underline-offset-2 hover:text-tc-text transition-colors"
				>
					Regenerate token
				</button>
			{/if}
		{:else}
			<p class="text-sm text-tc-muted">
				No feed token. Generate one to get your personal RSS and iCal links.
			</p>
			<button
				onclick={regenerateToken}
				class="mt-2 rounded-md [border:0.5px_solid_var(--tc-border-mid)] px-4 py-2 text-sm text-tc-text transition-colors hover:bg-tc-surface"
				>Generate feed token</button
			>
		{/if}

		<p class="mt-3 rounded-md bg-tc-surface p-3 text-xs text-tc-muted leading-relaxed">
			Your private feed URL contains a secret token. Anyone with the URL can see your full event
			calendar. Keep it private. Regenerating creates a new token and immediately breaks any
			existing subscriptions.
		</p>
	</section>

	<!-- ── Danger zone ── -->
	<section>
		<p
			class="mb-3 font-mono text-[0.625rem] uppercase tracking-[0.08em] text-tc-danger [border-bottom:0.5px_solid_var(--tc-danger-border)] pb-2.5"
		>
			Danger zone
		</p>

		{#if data.deletionBlockedBy?.length}
			<p class="mb-3 text-sm text-tc-muted">
				You are the designated host of
				<strong class="font-medium text-tc-text">{data.deletionBlockedBy[0].title}</strong>{data
					.deletionBlockedBy.length > 1
					? ` and ${data.deletionBlockedBy.length - 1} other event${data.deletionBlockedBy.length > 2 ? 's' : ''}`
					: ''}. Ask an admin to reassign the host before deleting your account.
			</p>
		{/if}

		{#if deleteError}
			<p class="mb-3 text-sm text-tc-danger">{deleteError}</p>
		{/if}

		{#if showDeleteConfirm}
			<div class="rounded-md [border:0.5px_solid_var(--tc-danger-border)] bg-tc-danger-bg p-3 mb-3">
				<p class="text-[0.8125rem] text-tc-danger mb-2">
					This will anonymise your profile ("Former member") and sign you out. Your content stays
					attributed to the anonymised account. This cannot be undone.
				</p>
				<div class="flex gap-2">
					<button
						onclick={deleteAccount}
						disabled={deleting || !!data.deletionBlockedBy?.length}
						class="rounded-md bg-tc-danger px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-[0.88] disabled:opacity-50"
					>
						{deleting ? 'Deleting…' : 'Yes, delete my account'}
					</button>
					<button
						onclick={() => (showDeleteConfirm = false)}
						class="rounded-md [border:0.5px_solid_var(--tc-border-mid)] px-3 py-1.5 text-xs text-tc-muted transition-colors hover:text-tc-text"
					>
						Cancel
					</button>
				</div>
			</div>
		{:else}
			<button
				onclick={() => (showDeleteConfirm = true)}
				disabled={!!data.deletionBlockedBy?.length}
				class="rounded-md [border:0.5px_solid_var(--tc-danger-border)] px-4 py-2 text-sm text-tc-danger transition-colors hover:bg-tc-danger-bg disabled:opacity-40 disabled:cursor-not-allowed"
				>Delete account</button
			>
		{/if}
	</section>
</div>
