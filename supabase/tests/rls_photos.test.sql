-- RLS tests for public.photos
-- fixture event IDs: e4000000-...
-- fixture recap IDs: f2000000-...
-- fixture photo IDs: ab000000-...
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

-- Event hosted by the test member
insert into public.events (id, title, status, starts_at, host_name, host_id) values
  ('e4000000-0000-0000-0000-000000000001', 'Photo Test Event',  'past',
   now() - interval '2 days', 'Test Member', '00000000-0000-0000-0000-000000000001');

-- Event with no member host
insert into public.events (id, title, status, starts_at, host_name) values
  ('e4000000-0000-0000-0000-000000000002', 'External Host Event', 'past',
   now() - interval '2 days', 'External');

insert into public.recaps (id, event_id, author_id, body_md) values
  ('f2000000-0000-0000-0000-000000000001', 'e4000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000001', 'Recap 1'),
  ('f2000000-0000-0000-0000-000000000002', 'e4000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000002', 'Recap 2');

insert into public.photos (id, recap_id, uploaded_by, storage_path, is_public) values
  ('ab000000-0000-0000-0000-000000000001', 'f2000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000001', 'e1/photo1.jpg', false),
  ('ab000000-0000-0000-0000-000000000002', 'f2000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000002', 'e2/photo1.jpg', false);

-- ── As member ────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';

-- 1. Member can select all photos
select ok(
  (select count(*)::int from public.photos) >= 2,
  'member can select all photos'
);

-- 2. Member can upload a photo
select lives_ok(
  $$insert into public.photos (recap_id, uploaded_by, storage_path)
    values ('f2000000-0000-0000-0000-000000000001',
            '00000000-0000-0000-0000-000000000001', 'e1/photo2.jpg')$$,
  'member can upload own photo'
);

-- 3. Member cannot upload photo as another user
select throws_ok(
  $$insert into public.photos (recap_id, uploaded_by, storage_path)
    values ('f2000000-0000-0000-0000-000000000001',
            '00000000-0000-0000-0000-000000000002', 'e1/fake.jpg')$$,
  '42501',
  null,
  'member cannot insert photo as another user'
);

-- 4. Event host can toggle is_public on their event''s photo
select lives_ok(
  $$update public.photos set is_public = true
    where id = 'ab000000-0000-0000-0000-000000000001'$$,
  'event host can toggle is_public on their event''s photo'
);

-- 5. Non-host member cannot toggle is_public on another event''s photo
update public.photos set is_public = true
  where id = 'ab000000-0000-0000-0000-000000000002';

set local role postgres;
select is(
  (select is_public from public.photos
   where id = 'ab000000-0000-0000-0000-000000000002'),
  false,
  'non-host cannot toggle is_public on another event''s photo'
);

-- 6. Admin can toggle is_public on any photo
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';

select lives_ok(
  $$update public.photos set is_public = true
    where id = 'ab000000-0000-0000-0000-000000000002'$$,
  'admin can toggle is_public on any photo'
);

select * from finish();
rollback;
