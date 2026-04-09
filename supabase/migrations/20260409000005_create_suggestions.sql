-- ============================================================
-- suggestions
-- Also adds the FK from events.promoted_from_id → suggestions,
-- resolving the circular dependency (events was created first
-- without the FK constraint).
-- ============================================================

create table public.suggestions (
  id                    uuid        primary key default gen_random_uuid(),
  author_id             uuid        not null references public.users(id) on delete cascade,
  title                 text        not null,
  body_md               text        not null,
  host_name             text,
  status                text        not null default 'open'
                                      check (status in ('open', 'planned', 'closed')),
  voting_closes_at      timestamptz,
  promoted_to_event_id  uuid        references public.events(id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ── Resolve circular FK: events ↔ suggestions ───────────────
alter table public.events
  add constraint events_promoted_from_id_fkey
  foreign key (promoted_from_id)
  references public.suggestions(id)
  on delete set null;

create index events_promoted_from_id_idx      on public.events(promoted_from_id);

-- ── Indexes ─────────────────────────────────────────────────
create index suggestions_author_id_idx           on public.suggestions(author_id);
create index suggestions_status_idx              on public.suggestions(status);
create index suggestions_promoted_to_event_id_idx on public.suggestions(promoted_to_event_id);

create trigger suggestions_updated_at
  before update on public.suggestions
  for each row execute function public.set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────
alter table public.suggestions enable row level security;

-- All authenticated members see all suggestions.
create policy "suggestions_member_select"
  on public.suggestions
  for select
  to authenticated
  using (true);

-- Members may create suggestions for themselves.
create policy "suggestions_member_insert"
  on public.suggestions
  for insert
  to authenticated
  with check (author_id = auth.uid());

-- Authors may edit their own suggestion title/body.
create policy "suggestions_member_update_own"
  on public.suggestions
  for update
  to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

-- Admins have full access (status changes, promotion, deletion).
create policy "suggestions_admin_all"
  on public.suggestions
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
