-- ============================================================
-- recaps
-- One recap per event (unique constraint on event_id).
-- Only the event host (host_id) or an admin may write one.
-- ============================================================

create table public.recaps (
  id         uuid        primary key default gen_random_uuid(),
  event_id   uuid        not null unique references public.events(id) on delete cascade,
  author_id  uuid        not null references public.users(id) on delete cascade,
  body_md    text        not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Indexes ─────────────────────────────────────────────────
create index recaps_author_id_idx on public.recaps(author_id);

create trigger recaps_updated_at
  before update on public.recaps
  for each row execute function public.set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────
alter table public.recaps enable row level security;

-- All authenticated members see all recaps.
create policy "recaps_member_select"
  on public.recaps
  for select
  to authenticated
  using (true);

-- The event's designated host_id user (or an admin) may create a recap.
create policy "recaps_host_insert"
  on public.recaps
  for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and (
      exists (
        select 1 from public.events e
        where e.id = event_id
        and e.host_id = auth.uid()
      )
      or public.is_admin()
    )
  );

-- The author or an admin may edit the recap body.
create policy "recaps_host_update"
  on public.recaps
  for update
  to authenticated
  using (author_id = auth.uid() or public.is_admin())
  with check (author_id = auth.uid() or public.is_admin());

-- Admins may delete recaps.
create policy "recaps_admin_delete"
  on public.recaps
  for delete
  to authenticated
  using (public.is_admin());
