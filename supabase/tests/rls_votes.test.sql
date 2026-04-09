-- RLS tests for public.votes
-- fixture suggestion IDs: b2000000-...
-- fixture vote IDs:       d1000000-...
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
  ('b2000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002',
   'Voteable Suggestion', 'Vote on this.', 'open');

-- Admin has already voted
insert into public.votes (id, suggestion_id, user_id) values
  ('d1000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000002');

-- ── As member ────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';

-- 1. Member can select all votes
select ok(
  (select count(*)::int from public.votes) >= 1,
  'member can select all votes'
);

-- 2. Member can cast own vote
select lives_ok(
  $$insert into public.votes (suggestion_id, user_id)
    values ('b2000000-0000-0000-0000-000000000001',
            '00000000-0000-0000-0000-000000000001')$$,
  'member can cast own vote'
);

-- 3. Member cannot cast vote as another user
select throws_ok(
  $$insert into public.votes (suggestion_id, user_id)
    values ('b2000000-0000-0000-0000-000000000001',
            '00000000-0000-0000-0000-000000000002')$$,
  '42501',
  null,
  'member cannot cast vote as another user'
);

-- 4. Duplicate vote fails unique constraint
select throws_ok(
  $$insert into public.votes (suggestion_id, user_id)
    values ('b2000000-0000-0000-0000-000000000001',
            '00000000-0000-0000-0000-000000000001')$$,
  '23505',
  null,
  'duplicate vote fails unique constraint'
);

-- 5. Member can delete own vote (un-vote)
select lives_ok(
  $$delete from public.votes
    where suggestion_id = 'b2000000-0000-0000-0000-000000000001'
    and user_id = '00000000-0000-0000-0000-000000000001'$$,
  'member can delete own vote'
);

-- 6. Member cannot delete another''s vote (silently affects 0 rows)
delete from public.votes
  where id = 'd1000000-0000-0000-0000-000000000001';

set local role postgres;
select ok(
  (select count(*)::int from public.votes
   where id = 'd1000000-0000-0000-0000-000000000001') = 1,
  'member cannot delete another''s vote'
);

select * from finish();
rollback;
