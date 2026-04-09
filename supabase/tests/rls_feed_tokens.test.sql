-- RLS tests for public.feed_tokens
-- fixture feed token IDs: af000000-...
begin;
select plan(5);

-- ── Fixtures ─────────────────────────────────────────────────
set local role postgres;

insert into public.feed_tokens (id, user_id, token) values
  ('af000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'member-feed-abc'),
  ('af000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'admin-feed-xyz');

-- ── As member ────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';

-- 1. Member can select own token
select ok(
  (select count(*)::int from public.feed_tokens
   where id = 'af000000-0000-0000-0000-000000000001') = 1,
  'member can select own feed token'
);

-- 2. Member cannot select another user''s token
select is(
  (select count(*)::int from public.feed_tokens
   where id = 'af000000-0000-0000-0000-000000000002'),
  0,
  'member cannot select another user''s feed token'
);

-- 3. Member can delete own token (regeneration step 1: delete then re-insert)
select lives_ok(
  $$delete from public.feed_tokens
    where id = 'af000000-0000-0000-0000-000000000001'$$,
  'member can delete own feed token'
);

-- 4. Member can insert own token (regeneration step 2)
select lives_ok(
  $$insert into public.feed_tokens (user_id, token)
    values ('00000000-0000-0000-0000-000000000001', 'member-feed-new')$$,
  'member can insert own feed token'
);

-- 5. Member cannot delete another user''s token (silently 0 rows)
delete from public.feed_tokens
  where id = 'af000000-0000-0000-0000-000000000002';

set local role postgres;
select ok(
  (select count(*)::int from public.feed_tokens
   where id = 'af000000-0000-0000-0000-000000000002') = 1,
  'member cannot delete another user''s feed token'
);

select * from finish();
rollback;
