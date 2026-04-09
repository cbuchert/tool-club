-- ============================================================
-- photos
-- Any member may upload. Only the event host or admin may
-- toggle is_public. The is_public flag is an application-layer
-- filter for the public RSS feed — all authenticated members
-- can see all photos regardless of is_public.
-- ============================================================

create table public.photos (
  id           uuid        primary key default gen_random_uuid(),
  recap_id     uuid        not null references public.recaps(id) on delete cascade,
  uploaded_by  uuid        not null references public.users(id) on delete cascade,
  storage_path text        not null,
  is_public    boolean     not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ── Indexes ─────────────────────────────────────────────────
create index photos_recap_id_idx    on public.photos(recap_id);
create index photos_uploaded_by_idx on public.photos(uploaded_by);

create trigger photos_updated_at
  before update on public.photos
  for each row execute function public.set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────
alter table public.photos enable row level security;

-- All authenticated members see all photos.
-- (is_public is only enforced at the application layer for the
-- public RSS feed, which does not rely on RLS.)
create policy "photos_member_select"
  on public.photos
  for select
  to authenticated
  using (true);

-- Any member may upload a photo (server-side upload only).
create policy "photos_member_insert"
  on public.photos
  for insert
  to authenticated
  with check (uploaded_by = auth.uid());

-- Only the event host or an admin may toggle is_public.
create policy "photos_host_update"
  on public.photos
  for update
  to authenticated
  using (
    exists (
      select 1 from public.recaps r
      join public.events e on e.id = r.event_id
      where r.id = recap_id
      and e.host_id = auth.uid()
    )
    or public.is_admin()
  )
  with check (
    exists (
      select 1 from public.recaps r
      join public.events e on e.id = r.event_id
      where r.id = recap_id
      and e.host_id = auth.uid()
    )
    or public.is_admin()
  );

-- Admins have full access.
create policy "photos_admin_all"
  on public.photos
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
