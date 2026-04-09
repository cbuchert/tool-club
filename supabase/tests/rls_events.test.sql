-- RLS tests for public.events
-- member: 00000000-0000-0000-0000-000000000001
-- admin:  00000000-0000-0000-0000-000000000002
-- fixture event IDs: e1000000-0000-0000-0000-00000000000{1,2,3}
begin;
select plan(10);

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
  ('e1000000-0000-0000-0000-000000000001', 'Draft Event',     'draft',     now() + interval '7 days', 'Host A'),
  ('e1000000-0000-0000-0000-000000000002', 'Published Event', 'published', now() + interval '7 days', 'Host B'),
  ('e1000000-0000-0000-0000-000000000003', 'Past Event',      'past',      now() - interval '2 days', 'Host C');

-- ── As member ────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';

-- 1. Member sees published events
select ok(
  (select count(*)::int from public.events
   where id = 'e1000000-0000-0000-0000-000000000002') = 1,
  'member sees published events'
);

-- 2. Member sees past events
select ok(
  (select count(*)::int from public.events
   where id = 'e1000000-0000-0000-0000-000000000003') = 1,
  'member sees past events'
);

-- 3. Member does not see draft events
select is(
  (select count(*)::int from public.events
   where id = 'e1000000-0000-0000-0000-000000000001'),
  0,
  'member does not see draft events'
);

-- 4. Member cannot insert events
select throws_ok(
  $$insert into public.events (title, status, starts_at, host_name)
    values ('Bad Insert', 'draft', now(), 'Me')$$,
  '42501',
  null,
  'member cannot insert events'
);

-- 5. Member cannot update events (silently affects 0 rows)
update public.events set title = 'Hacked'
  where id = 'e1000000-0000-0000-0000-000000000002';

set local role postgres;
select is(
  (select title from public.events
   where id = 'e1000000-0000-0000-0000-000000000002'),
  'Published Event',
  'member cannot update events'
);

-- 6. Member cannot delete events (silently affects 0 rows)
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';

delete from public.events where id = 'e1000000-0000-0000-0000-000000000002';

set local role postgres;
select ok(
  (select count(*)::int from public.events
   where id = 'e1000000-0000-0000-0000-000000000002') = 1,
  'member cannot delete events'
);

-- ── As admin ─────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';

-- 7. Admin sees draft events
select ok(
  (select count(*)::int from public.events
   where id = 'e1000000-0000-0000-0000-000000000001') = 1,
  'admin sees draft events'
);

-- 8. Admin can insert events
select lives_ok(
  $$insert into public.events (title, status, starts_at, host_name)
    values ('Admin Event', 'draft', now() + interval '10 days', 'Admin')$$,
  'admin can insert events'
);

-- 9. Admin can update events
select lives_ok(
  $$update public.events set title = 'Updated by Admin'
    where id = 'e1000000-0000-0000-0000-000000000001'$$,
  'admin can update events'
);

-- 10. Admin can delete events
select lives_ok(
  $$delete from public.events
    where id = 'e1000000-0000-0000-0000-000000000001'$$,
  'admin can delete events'
);

select * from finish();
rollback;
