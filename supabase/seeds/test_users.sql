-- Dev convenience seed — NOT required for pgTAP tests.
--
-- Purpose: creates two ready-to-use accounts for local development so you can
-- sign in via the magic link flow without creating users manually.
--
-- pgTAP RLS tests are fully self-contained and insert their own fixtures
-- inside begin;...rollback; transactions. They do not depend on this file.
--
-- Fixed UUIDs are used so Supabase Studio and local URLs stay stable across
-- db resets. Do not change them.
--
--   member:  00000000-0000-0000-0000-000000000001  member@test.toolclub
--   admin:   00000000-0000-0000-0000-000000000002  admin@test.toolclub

-- ── auth.users ────────────────────────────────────────────────────────────
-- instance_id and aud are required by GoTrue's FindUserByEmailAndAudience
-- query. Without them signInWithOtp fails silently (otp_disabled error).
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  -- Token fields must be '' not NULL — GoTrue's Go scanner cannot convert
  -- NULL to string and throws "Database error finding user" during OTP.
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
) values
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'member@test.toolclub',
    crypt('testpassword', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    false,
    '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    'admin@test.toolclub',
    crypt('testpassword', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    false,
    '', '', '', ''
  )
on conflict (id) do nothing;

-- ── auth.identities ───────────────────────────────────────────────────────
-- Required for magic link / OTP auth. provider_id = email for email provider.
insert into auth.identities (
  provider_id,
  user_id,
  identity_data,
  provider,
  created_at,
  updated_at
) values
  (
    'member@test.toolclub',
    '00000000-0000-0000-0000-000000000001',
    '{"sub":"00000000-0000-0000-0000-000000000001","email":"member@test.toolclub"}',
    'email',
    now(), now()
  ),
  (
    'admin@test.toolclub',
    '00000000-0000-0000-0000-000000000002',
    '{"sub":"00000000-0000-0000-0000-000000000002","email":"admin@test.toolclub"}',
    'email',
    now(), now()
  )
on conflict (provider_id, provider) do nothing;

-- ── public.users ──────────────────────────────────────────────────────────
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
