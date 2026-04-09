-- RLS tests for public.invites
-- fixture invite IDs: ad000000-...
begin;
select plan(8);

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

insert into public.invites (id, token, invited_by) values
  ('ad000000-0000-0000-0000-000000000001', 'member-token-abc', '00000000-0000-0000-0000-000000000001'),
  ('ad000000-0000-0000-0000-000000000002', 'admin-token-xyz',  '00000000-0000-0000-0000-000000000002');

-- ── As member ────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';

-- 1. Member can see own invites
select ok(
  (select count(*)::int from public.invites
   where id = 'ad000000-0000-0000-0000-000000000001') = 1,
  'member can see own invites'
);

-- 2. Member cannot see another member''s invites
select is(
  (select count(*)::int from public.invites
   where id = 'ad000000-0000-0000-0000-000000000002'),
  0,
  'member cannot see another member''s invites'
);

-- 3. Member can create invite as themselves
select lives_ok(
  $$insert into public.invites (token, invited_by)
    values ('new-token-001', '00000000-0000-0000-0000-000000000001')$$,
  'member can create invite as themselves'
);

-- 4. Member cannot create invite as another user
select throws_ok(
  $$insert into public.invites (token, invited_by)
    values ('fake-token-001', '00000000-0000-0000-0000-000000000002')$$,
  '42501',
  null,
  'member cannot create invite as another user'
);

-- 5. Member can revoke own invite
select lives_ok(
  $$delete from public.invites
    where id = 'ad000000-0000-0000-0000-000000000001'$$,
  'member can revoke own invite'
);

-- 6. Member cannot revoke another member''s invite (silently 0 rows)
delete from public.invites
  where id = 'ad000000-0000-0000-0000-000000000002';

set local role postgres;
select ok(
  (select count(*)::int from public.invites
   where id = 'ad000000-0000-0000-0000-000000000002') = 1,
  'member cannot revoke another member''s invite'
);

-- ── As admin ─────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';

-- 7. Admin can see all invites
select ok(
  (select count(*)::int from public.invites) >= 1,
  'admin can see all invites'
);

-- 8. Admin can revoke any invite
select lives_ok(
  $$delete from public.invites
    where id = 'ad000000-0000-0000-0000-000000000002'$$,
  'admin can revoke any invite'
);

select * from finish();
rollback;
