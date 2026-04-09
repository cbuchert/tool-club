-- ============================================================
-- votes
-- One vote per (suggestion, user). Toggle by delete + insert.
-- ============================================================

create table public.votes (
  id            uuid        primary key default gen_random_uuid(),
  suggestion_id uuid        not null references public.suggestions(id) on delete cascade,
  user_id       uuid        not null references public.users(id) on delete cascade,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (suggestion_id, user_id)
);

-- ── Indexes ─────────────────────────────────────────────────
create index votes_suggestion_id_idx on public.votes(suggestion_id);
create index votes_user_id_idx       on public.votes(user_id);

-- ── RLS ──────────────────────────────────────────────────────
alter table public.votes enable row level security;

-- Vote counts are public to all members (but individual voter
-- identity is not exposed in the UI — only the count).
create policy "votes_member_select"
  on public.votes
  for select
  to authenticated
  using (true);

-- Members may cast a vote for themselves.
create policy "votes_member_insert"
  on public.votes
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- Members may un-vote (delete own vote only).
create policy "votes_member_delete_own"
  on public.votes
  for delete
  to authenticated
  using (user_id = auth.uid());

-- Admins have full access.
create policy "votes_admin_all"
  on public.votes
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
