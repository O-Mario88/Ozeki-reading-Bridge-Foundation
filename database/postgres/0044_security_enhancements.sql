-- Part 1: Session Security Extensions
ALTER TABLE portal_sessions 
ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS is_mfa_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- Part 2: Login Abuse/Rate Limiting Table
CREATE TABLE IF NOT EXISTS login_attempts (
  id BIGSERIAL PRIMARY KEY,
  identifier TEXT NOT NULL,
  ip_address TEXT,
  success BOOLEAN NOT NULL,
  attempt_time TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_login_attempts_lookup ON login_attempts(identifier, attempt_time);

-- Part 3: MFA Flow
CREATE TABLE IF NOT EXISTS portal_user_mfa (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES portal_users(id) ON DELETE CASCADE,
  secret_code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
