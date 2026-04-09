-- RLS tests for public.feed_tokens
-- fixture feed token IDs: af000000-...
begin;
select plan(5);

-- ── Fixtures ─────────────────────────────────────────────────
-- ── Fixture users (self-contained — no seed dependency) ──────────────────
-- Inserted inside this transaction; rolled back automatically on finish.
-- on conflict do nothing means tests also pass when the dev seed is applied.
set local role postgres;

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin)
values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'member@test.toolclub', crypt('t', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'admin@test.toolclub',  crypt('t', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false)
on conflict (id) do nothing;

insert into public.users (id, display_name, email, role)
values
  ('00000000-0000-0000-0000-000000000001', 'Test Member', 'member@test.toolclub', 'member'),
  ('00000000-0000-0000-0000-000000000002', 'Test Admin',  'admin@test.toolclub',  'admin')
on conflict (id) do update set display_name = excluded.display_name, role = excluded.role;

-- Ensure fixture tokens have the expected IDs regardless of seed state.
-- DELETE + INSERT inside this transaction is safe — rolls back on finish.
delete from public.feed_tokens
  where user_id in (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002'
  );
insert into public.feed_tokens (id, user_id, token) values
  ('af000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'member-feed-abc'),
  ('af000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'admin-feed-xyz');

-- ── As member ────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';

-- 1. Member can select own token
select ok(
  (select count(*)::int from public.feed_tokens
   where id = 'af000000-0000-0000-0000-000000000001') = 1,
  'member can select own feed token'
);

-- 2. Member cannot select another user''s token
select is(
  (select count(*)::int from public.feed_tokens
   where id = 'af000000-0000-0000-0000-000000000002'),
  0,
  'member cannot select another user''s feed token'
);

-- 3. Member can delete own token (regeneration step 1: delete then re-insert)
select lives_ok(
  $$delete from public.feed_tokens
    where id = 'af000000-0000-0000-0000-000000000001'$$,
  'member can delete own feed token'
);

-- 4. Member can insert own token (regeneration step 2)
select lives_ok(
  $$insert into public.feed_tokens (user_id, token)
    values ('00000000-0000-0000-0000-000000000001', 'member-feed-new')$$,
  'member can insert own feed token'
);

-- 5. Member cannot delete another user''s token (silently 0 rows)
delete from public.feed_tokens
  where id = 'af000000-0000-0000-0000-000000000002';

set local role postgres;
select ok(
  (select count(*)::int from public.feed_tokens
   where id = 'af000000-0000-0000-0000-000000000002') = 1,
  'member cannot delete another user''s feed token'
);

select * from finish();
rollback;
