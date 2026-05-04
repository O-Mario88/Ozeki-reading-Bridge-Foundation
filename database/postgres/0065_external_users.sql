-- Migration 0065: External-user identity layer (Phase 2 / Sprint 7).
--
-- Foundation for the donor / parent / teacher / partner / district_officer
-- portals. External users are NOT staff (portal_users) — they're the people
-- the platform serves. Identity is passwordless: a magic-link token sent
-- via email, exchanged for a session cookie. (Phone-OTP is a follow-up.)
--
-- Roles:
--   donor             — individual or institutional contributor
--   parent            — guardian of one or more enrolled learners
--   teacher           — classroom teacher (also referenced via teacher_uid)
--   partner           — peer NGO / coalition member
--   district_officer  — Ministry of Education district-level user

CREATE TABLE IF NOT EXISTS external_users (
  id BIGSERIAL PRIMARY KEY,
  ref_code TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN (
    'donor', 'parent', 'teacher', 'partner', 'district_officer'
  )),
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  organization TEXT,
  district TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'deactivated')),
  preferences_json JSONB,
  notes TEXT,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_external_users_email_role
  ON external_users (lower(email), role)
  WHERE email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_external_users_phone_role
  ON external_users (phone, role)
  WHERE phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_external_users_role
  ON external_users (role)
  WHERE status = 'active';

COMMENT ON TABLE external_users IS
  'Identity records for non-staff portal users (donors, parents, teachers, partners, district officers).';
COMMENT ON COLUMN external_users.ref_code IS
  'Short opaque reference (URL-safe) used in routes — e.g. /portal/donors/{ref_code}/portfolio.';

CREATE TABLE IF NOT EXISTS external_user_magic_links (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES external_users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms')),
  purpose TEXT NOT NULL DEFAULT 'login' CHECK (purpose IN ('login', 'reset', 'verify')),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_external_magic_links_user
  ON external_user_magic_links (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_external_magic_links_active
  ON external_user_magic_links (expires_at)
  WHERE consumed_at IS NULL;

CREATE TABLE IF NOT EXISTS external_user_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES external_users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_external_sessions_user
  ON external_user_sessions (user_id);

CREATE INDEX IF NOT EXISTS idx_external_sessions_expires_at
  ON external_user_sessions (expires_at);
