-- ============================================================
-- rsvps
-- One RSVP per (event, user). Response is 'yes' or 'no'.
-- Locked once the event is past.
-- ============================================================

create table public.rsvps (
  id         uuid        primary key default gen_random_uuid(),
  event_id   uuid        not null references public.events(id) on delete cascade,
  user_id    uuid        not null references public.users(id) on delete cascade,
  response   text        not null check (response in ('yes', 'no')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, user_id)
);

-- ── Indexes ─────────────────────────────────────────────────
create index rsvps_event_id_idx on public.rsvps(event_id);
create index rsvps_user_id_idx  on public.rsvps(user_id);

create trigger rsvps_updated_at
  before update on public.rsvps
  for each row execute function public.set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────
alter table public.rsvps enable row level security;

-- 'yes' RSVPs are visible to all members. 'no' RSVPs visible
-- only to the owner and admins.
create policy "rsvps_member_select"
  on public.rsvps
  for select
  to authenticated
  using (
    response = 'yes'
    or user_id = auth.uid()
    or public.is_admin()
  );

-- Members may RSVP for themselves only.
create policy "rsvps_member_insert"
  on public.rsvps
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- Members may change their own RSVP.
create policy "rsvps_member_update_own"
  on public.rsvps
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Admins have full access.
create policy "rsvps_admin_all"
  on public.rsvps
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
