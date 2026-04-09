-- ============================================================
-- comments
-- Plain text only. No editing — delete and re-post.
-- ============================================================

create table public.comments (
  id            uuid        primary key default gen_random_uuid(),
  suggestion_id uuid        not null references public.suggestions(id) on delete cascade,
  user_id       uuid        not null references public.users(id) on delete cascade,
  body          text        not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── Indexes ─────────────────────────────────────────────────
create index comments_suggestion_id_idx on public.comments(suggestion_id);
create index comments_user_id_idx       on public.comments(user_id);

-- ── RLS ──────────────────────────────────────────────────────
alter table public.comments enable row level security;

-- All authenticated members see all comments.
create policy "comments_member_select"
  on public.comments
  for select
  to authenticated
  using (true);

-- Members may post comments as themselves.
create policy "comments_member_insert"
  on public.comments
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- Members may delete their own comments.
create policy "comments_member_delete_own"
  on public.comments
  for delete
  to authenticated
  using (user_id = auth.uid());

-- Admins have full access (can delete any comment).
create policy "comments_admin_all"
  on public.comments
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
