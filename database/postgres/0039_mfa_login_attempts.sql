-- Migration: Create MFA and Login Attempts tables for portal authentication
-- Required by: src/lib/server/postgres/repositories/auth.ts

CREATE TABLE IF NOT EXISTS portal_user_mfa (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES portal_users(id) ON DELETE CASCADE,
  secret_code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS login_attempts (
  id SERIAL PRIMARY KEY,
  identifier VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  success BOOLEAN NOT NULL DEFAULT FALSE,
  attempt_time TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_identifier_time ON login_attempts(identifier, attempt_time);
CREATE INDEX IF NOT EXISTS idx_portal_user_mfa_user_id ON portal_user_mfa(user_id);
