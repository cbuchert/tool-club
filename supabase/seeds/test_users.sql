-- Test fixture users with fixed UUIDs for use in all pgTAP tests.
-- These UUIDs are referenced throughout supabase/tests/*.sql.
-- Do not change these UUIDs — they are load-bearing in test assertions.
--
-- member UUID: 00000000-0000-0000-0000-000000000001
-- admin UUID:  00000000-0000-0000-0000-000000000002

-- Insert into auth.users so RLS policies (which reference auth.uid()) work correctly.
insert into auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
) values
  (
    '00000000-0000-0000-0000-000000000001',
    'member@test.toolclub',
    crypt('testpassword', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    false,
    'authenticated'
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'admin@test.toolclub',
    crypt('testpassword', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    false,
    'authenticated'
  )
on conflict (id) do nothing;

-- Insert matching public.users rows so is_admin() and RLS policies work.
insert into public.users (id, display_name, email, role) values
  (
    '00000000-0000-0000-0000-000000000001',
    'Test Member',
    'member@test.toolclub',
    'member'
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'Test Admin',
    'admin@test.toolclub',
    'admin'
  )
on conflict (id) do nothing;
