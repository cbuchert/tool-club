-- Adds is_suspended to public.users.
-- Suspension disables sign-in via Supabase Auth ban (set server-side in the
-- suspend/reinstate actions). This column tracks the state for admin UI display.

alter table public.users
  add column is_suspended boolean not null default false;

create index users_is_suspended_idx on public.users(is_suspended);
