-- RLS tests for public.recaps
-- fixture event IDs: e3000000-...
-- fixture recap IDs: f1000000-...
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
  ('e3000000-0000-0000-0000-000000000001', 'Member Hosted Event', 'past',
   now() - interval '2 days', 'Test Member', '00000000-0000-0000-0000-000000000001');

-- Event with external host (no host_id)
insert into public.events (id, title, status, starts_at, host_name) values
  ('e3000000-0000-0000-0000-000000000002', 'External Host Event', 'past',
   now() - interval '2 days', 'External Host');

-- Event for admin insert test (no recap yet)
insert into public.events (id, title, status, starts_at, host_name) values
  ('e3000000-0000-0000-0000-000000000003', 'Admin Recap Event', 'past',
   now() - interval '2 days', 'Whoever');

-- Recap on the external-host event (author = admin)
insert into public.recaps (id, event_id, author_id, body_md) values
  ('f1000000-0000-0000-0000-000000000001', 'e3000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000002', 'Admin wrote this.');

-- ── As member ────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';

-- 1. Member can select all recaps
select ok(
  (select count(*)::int from public.recaps) >= 1,
  'member can select all recaps'
);

-- 2. Event host can insert recap for their event
select lives_ok(
  $$insert into public.recaps (event_id, author_id, body_md)
    values ('e3000000-0000-0000-0000-000000000001',
            '00000000-0000-0000-0000-000000000001', 'Great event!')$$,
  'event host can insert recap for their event'
);

-- 3. Non-host member cannot insert recap for event they don''t host
select throws_ok(
  $$insert into public.recaps (event_id, author_id, body_md)
    values ('e3000000-0000-0000-0000-000000000002',
            '00000000-0000-0000-0000-000000000001', 'Not my event.')$$,
  '42501',
  null,
  'non-host cannot insert recap for event they don''t host'
);

-- 4. Host can update own recap
select lives_ok(
  $$update public.recaps set body_md = 'Updated recap.'
    where event_id = 'e3000000-0000-0000-0000-000000000001'$$,
  'host can update own recap'
);

-- 5. Member cannot update another author''s recap (silently 0 rows)
update public.recaps set body_md = 'Hacked.'
  where id = 'f1000000-0000-0000-0000-000000000001';

set local role postgres;
select is(
  (select body_md from public.recaps
   where id = 'f1000000-0000-0000-0000-000000000001'),
  'Admin wrote this.',
  'member cannot update another author''s recap'
);

-- 6. Admin can insert recap for any event
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';

select lives_ok(
  $$insert into public.recaps (event_id, author_id, body_md)
    values ('e3000000-0000-0000-0000-000000000003',
            '00000000-0000-0000-0000-000000000002', 'Admin recap.')$$,
  'admin can insert recap for any event'
);

select * from finish();
rollback;
