-- RLS tests for public.invites
-- fixture invite IDs: ad000000-...
begin;
select plan(8);

-- ── Fixtures ─────────────────────────────────────────────────
set local role postgres;

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
