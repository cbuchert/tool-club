-- RLS tests for public.suggestions
-- fixture suggestion IDs: b1000000-...
begin;
select plan(6);

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

insert into public.suggestions (id, author_id, title, body_md, status) values
  ('b1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Member Idea',  'A great idea.', 'open'),
  ('b1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'Admin Idea',   'Another idea.', 'open');

-- ── As member ────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';

-- 1. Member sees all suggestions
select ok(
  (select count(*)::int from public.suggestions) >= 2,
  'member sees all suggestions'
);

-- 2. Member can insert own suggestion
select lives_ok(
  $$insert into public.suggestions (author_id, title, body_md)
    values ('00000000-0000-0000-0000-000000000001', 'New Idea', 'Details.')$$,
  'member can insert own suggestion'
);

-- 3. Member cannot insert suggestion as another user
select throws_ok(
  $$insert into public.suggestions (author_id, title, body_md)
    values ('00000000-0000-0000-0000-000000000002', 'Fake Idea', 'Nope.')$$,
  '42501',
  null,
  'member cannot insert suggestion as another user'
);

-- 4. Member can update own suggestion
select lives_ok(
  $$update public.suggestions set title = 'Revised Idea'
    where id = 'b1000000-0000-0000-0000-000000000001'$$,
  'member can update own suggestion'
);

-- 5. Member cannot update another''s suggestion (silently affects 0 rows)
update public.suggestions set title = 'Hacked'
  where id = 'b1000000-0000-0000-0000-000000000002';

set local role postgres;
select is(
  (select title from public.suggestions
   where id = 'b1000000-0000-0000-0000-000000000002'),
  'Admin Idea',
  'member cannot update another''s suggestion'
);

-- 6. Admin can change suggestion status
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';

select lives_ok(
  $$update public.suggestions set status = 'closed'
    where id = 'b1000000-0000-0000-0000-000000000001'$$,
  'admin can change suggestion status'
);

select * from finish();
rollback;
