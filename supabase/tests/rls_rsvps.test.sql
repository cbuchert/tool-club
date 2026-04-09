-- RLS tests for public.rsvps
-- fixture event IDs: e2000000-...
-- fixture rsvp IDs:  aa000000-...
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

insert into public.events (id, title, status, starts_at, host_name) values
  ('e2000000-0000-0000-0000-000000000001', 'RSVP Test Event',   'published', now() + interval '7 days', 'Host'),
  ('e2000000-0000-0000-0000-000000000002', 'RSVP Insert Event', 'published', now() + interval '7 days', 'Host');

-- Member RSVPs yes; admin user RSVPs no (to test visibility rules)
insert into public.rsvps (id, event_id, user_id, response) values
  ('aa000000-0000-0000-0000-000000000001', 'e2000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'yes'),
  ('aa000000-0000-0000-0000-000000000002', 'e2000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'no');

-- ── As member ────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';

-- 1. Member sees yes RSVPs
select ok(
  (select count(*)::int from public.rsvps
   where id = 'aa000000-0000-0000-0000-000000000001') = 1,
  'member sees yes RSVPs'
);

-- 2. Member cannot see another member''s no RSVP
select is(
  (select count(*)::int from public.rsvps
   where id = 'aa000000-0000-0000-0000-000000000002'),
  0,
  'member cannot see another member''s no RSVP'
);

-- 3. A user can see their own no RSVP
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';
select ok(
  (select count(*)::int from public.rsvps
   where id = 'aa000000-0000-0000-0000-000000000002') = 1,
  'user can see own no RSVP'
);

-- 4. Member can insert own RSVP
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';
select lives_ok(
  $$insert into public.rsvps (event_id, user_id, response)
    values ('e2000000-0000-0000-0000-000000000002',
            '00000000-0000-0000-0000-000000000001', 'yes')$$,
  'member can insert own RSVP'
);

-- 5. Member cannot insert RSVP as another user
select throws_ok(
  $$insert into public.rsvps (event_id, user_id, response)
    values ('e2000000-0000-0000-0000-000000000002',
            '00000000-0000-0000-0000-000000000002', 'yes')$$,
  '42501',
  null,
  'member cannot insert RSVP as another user'
);

-- 6. Member can update own RSVP
select lives_ok(
  $$update public.rsvps set response = 'no'
    where id = 'aa000000-0000-0000-0000-000000000001'$$,
  'member can update own RSVP'
);

-- 7. Member cannot update another''s RSVP (silently affects 0 rows)
update public.rsvps set response = 'yes'
  where id = 'aa000000-0000-0000-0000-000000000002';

set local role postgres;
select is(
  (select response from public.rsvps
   where id = 'aa000000-0000-0000-0000-000000000002'),
  'no',
  'member cannot update another''s RSVP'
);

-- 8. Admin sees all RSVPs including no responses
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';

select ok(
  (select count(*)::int from public.rsvps
   where event_id = 'e2000000-0000-0000-0000-000000000001') = 2,
  'admin sees all RSVPs including no responses'
);

select * from finish();
rollback;
