-- ============================================================
-- invites
-- Single-use, 30-day invite links.
-- Revoking = hard delete. Expired rows cleaned by cron.
-- ============================================================

create table public.invites (
  id           uuid        primary key default gen_random_uuid(),
  token        text        not null unique,
  invited_by   uuid        not null references public.users(id) on delete cascade,
  email        text,
  redeemed_by  uuid        references public.users(id) on delete set null,
  expires_at   timestamptz not null default (now() + interval '30 days'),
  redeemed_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ── Indexes ─────────────────────────────────────────────────
create index invites_invited_by_idx  on public.invites(invited_by);
create index invites_redeemed_by_idx on public.invites(redeemed_by);
create index invites_expires_at_idx  on public.invites(expires_at);

create trigger invites_updated_at
  before update on public.invites
  for each row execute function public.set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────
alter table public.invites enable row level security;

-- Members see only their own pending invites; admins see all.
create policy "invites_member_select"
  on public.invites
  for select
  to authenticated
  using (invited_by = auth.uid() or public.is_admin());

-- Members may create invites where they are the inviter.
create policy "invites_member_insert"
  on public.invites
  for insert
  to authenticated
  with check (invited_by = auth.uid());

-- Members may revoke (delete) their own pending invites.
create policy "invites_member_delete_own"
  on public.invites
  for delete
  to authenticated
  using (invited_by = auth.uid());

-- Admins have full access.
create policy "invites_admin_all"
  on public.invites
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
