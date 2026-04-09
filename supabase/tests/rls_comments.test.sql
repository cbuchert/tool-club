-- RLS tests for public.comments
-- fixture suggestion IDs: b3000000-...
-- fixture comment IDs:    c1000000-...
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
on conflict (id) do nothing;

insert into public.suggestions (id, author_id, title, body_md, status) values
  ('b3000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
   'Comment Test Suggestion', 'Details.', 'open');

insert into public.comments (id, suggestion_id, user_id, body) values
  ('c1000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000001', 'Member comment'),
  ('c1000000-0000-0000-0000-000000000002', 'b3000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000002', 'Admin comment');

-- ── As member ────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';

-- 1. Member can select all comments
select ok(
  (select count(*)::int from public.comments
   where suggestion_id = 'b3000000-0000-0000-0000-000000000001') = 2,
  'member can select all comments'
);

-- 2. Member can insert own comment
select lives_ok(
  $$insert into public.comments (suggestion_id, user_id, body)
    values ('b3000000-0000-0000-0000-000000000001',
            '00000000-0000-0000-0000-000000000001', 'Another comment')$$,
  'member can insert own comment'
);

-- 3. Member cannot insert comment as another user
select throws_ok(
  $$insert into public.comments (suggestion_id, user_id, body)
    values ('b3000000-0000-0000-0000-000000000001',
            '00000000-0000-0000-0000-000000000002', 'Fake comment')$$,
  '42501',
  null,
  'member cannot insert comment as another user'
);

-- 4. Member can delete own comment
select lives_ok(
  $$delete from public.comments
    where id = 'c1000000-0000-0000-0000-000000000001'$$,
  'member can delete own comment'
);

-- 5. Member cannot delete another''s comment (silently affects 0 rows)
delete from public.comments
  where id = 'c1000000-0000-0000-0000-000000000002';

set local role postgres;
select ok(
  (select count(*)::int from public.comments
   where id = 'c1000000-0000-0000-0000-000000000002') = 1,
  'member cannot delete another''s comment'
);

-- 6. Admin can delete any comment
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';

select lives_ok(
  $$delete from public.comments
    where id = 'c1000000-0000-0000-0000-000000000002'$$,
  'admin can delete any comment'
);

select * from finish();
rollback;
