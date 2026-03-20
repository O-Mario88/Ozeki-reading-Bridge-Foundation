-- 0037: User onboarding — add status, department, must_change_password, invited_at, last_login_at
ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ;
ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
