-- ============================================================
-- events
-- promoted_from_id FK to suggestions is added after
-- suggestions is created (migration 00005).
-- ============================================================

create table public.events (
  id               uuid        primary key default gen_random_uuid(),
  title            text        not null,
  status           text        not null default 'draft'
                                 check (status in ('draft', 'published', 'past')),
  starts_at        timestamptz not null,
  ends_at          timestamptz,
  location_name    text,
  address          text,
  body_md          text,
  links            jsonb       not null default '[]'::jsonb,
  capacity         integer     check (capacity is null or capacity > 0),
  host_name        text        not null,
  host_id          uuid        references public.users(id) on delete set null,
  -- promoted_from_id added via ALTER in migration 00005
  promoted_from_id uuid,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ── Indexes ─────────────────────────────────────────────────
create index events_status_idx     on public.events(status);
create index events_starts_at_idx  on public.events(starts_at);
create index events_host_id_idx    on public.events(host_id);

create trigger events_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────
alter table public.events enable row level security;

-- Members see published and past events. Drafts are admin-only.
create policy "events_member_select"
  on public.events
  for select
  to authenticated
  using (status in ('published', 'past') or public.is_admin());

-- Only admins may create events.
create policy "events_admin_insert"
  on public.events
  for insert
  to authenticated
  with check (public.is_admin());

-- Only admins may edit events.
create policy "events_admin_update"
  on public.events
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Only admins may delete events.
create policy "events_admin_delete"
  on public.events
  for delete
  to authenticated
  using (public.is_admin());
