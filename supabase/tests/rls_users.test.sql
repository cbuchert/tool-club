-- RLS tests for public.users
-- member: 00000000-0000-0000-0000-000000000001
-- admin:  00000000-0000-0000-0000-000000000002
begin;
select plan(6);

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

-- ── 1. Member can select all users ───────────────────────────
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';

select ok(
  (select count(*)::int from public.users) >= 2,
  'member can select user rows'
);

-- ── 2. Member can select their own row ───────────────────────
select ok(
  (select count(*)::int from public.users
   where id = '00000000-0000-0000-0000-000000000001') = 1,
  'member can select own row'
);

-- ── 3. Member can update own display_name ────────────────────
update public.users
  set display_name = 'Updated Name'
  where id = '00000000-0000-0000-0000-000000000001';

select is(
  (select display_name from public.users
   where id = '00000000-0000-0000-0000-000000000001'),
  'Updated Name',
  'member can update own display_name'
);

-- ── 4. Member cannot elevate own role ────────────────────────
select throws_ok(
  $$update public.users set role = 'admin'
    where id = '00000000-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  'member cannot elevate own role'
);

-- ── 5. Member cannot update another user ─────────────────────
update public.users
  set display_name = 'Hacked'
  where id = '00000000-0000-0000-0000-000000000002';

set local role postgres;
select is(
  (select display_name from public.users
   where id = '00000000-0000-0000-0000-000000000002'),
  'Test Admin',
  'member cannot update another user'
);

-- ── 6. Admin can update any user row ─────────────────────────
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';

update public.users
  set display_name = 'Admin Updated'
  where id = '00000000-0000-0000-0000-000000000001';

select is(
  (select display_name from public.users
   where id = '00000000-0000-0000-0000-000000000001'),
  'Admin Updated',
  'admin can update any user row'
);

select * from finish();
rollback;
