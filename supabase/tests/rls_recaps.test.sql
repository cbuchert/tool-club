-- RLS tests for public.recaps
-- fixture event IDs: e3000000-...
-- fixture recap IDs: f1000000-...
begin;
select plan(6);

-- ── Fixtures ─────────────────────────────────────────────────
set local role postgres;

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
