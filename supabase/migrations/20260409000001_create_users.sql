-- ============================================================
-- users
-- Profile table. One row per auth.users row, created by the
-- server on invite redemption (not via trigger).
-- ============================================================

create table public.users (
  id            uuid        primary key references auth.users(id) on delete cascade,
  display_name  text        not null,
  email         text,
  avatar_url    text,
  role          text        not null default 'member'
                              check (role in ('member', 'admin')),
  invited_by    uuid        references public.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── Indexes ─────────────────────────────────────────────────
create index users_invited_by_idx on public.users(invited_by);

-- ── Shared trigger function (used by all tables) ────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- ── RLS helper ───────────────────────────────────────────────
-- security definer so it bypasses RLS when called from within
-- an RLS policy, preventing infinite recursion.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid()
    and role = 'admin'
  );
$$;

-- ── RLS ──────────────────────────────────────────────────────
alter table public.users enable row level security;

-- All authenticated users can read all user rows.
create policy "users_member_select"
  on public.users
  for select
  to authenticated
  using (true);

-- Members may update their own row but cannot elevate their role.
create policy "users_member_update_own"
  on public.users
  for update
  to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    -- new role must match the committed role; prevents self-elevation
    and role = (select u.role from public.users u where u.id = auth.uid())
  );

-- Admins may update any user row (including role changes).
create policy "users_admin_update_any"
  on public.users
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
