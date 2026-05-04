-- Migration 0063: Third-party audit portal (Phase 1 / Sprint 5).
--
-- Adds support for time-limited Auditor accounts that have read-only access
-- to the integrity-relevant slice of the portal. Auditors are real
-- portal_users with role='Auditor', distinguished by:
--   * expires_at — once past, every session lookup must reject the user
--   * audit_invite_tokens — one-shot magic links that mint the auditor user
--                            and a short-lived session on first click

-- 1. Audit account expiry (NULL = no expiry, the default for normal staff).
ALTER TABLE portal_users
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_portal_users_expires_at
  ON portal_users (expires_at)
  WHERE expires_at IS NOT NULL;

COMMENT ON COLUMN portal_users.expires_at IS
  'Account expiry timestamp. After this moment session lookups must reject the user. Used for time-limited Auditor accounts.';

-- 2. One-shot invite tokens for Auditor onboarding.
CREATE TABLE IF NOT EXISTS audit_invite_tokens (
  id BIGSERIAL PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  invited_email TEXT NOT NULL,
  invited_full_name TEXT NOT NULL,
  invited_organization TEXT,
  scope_note TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  account_expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  consumed_user_id INTEGER REFERENCES portal_users(id) ON DELETE SET NULL,
  created_by_user_id INTEGER REFERENCES portal_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_invite_tokens_expires
  ON audit_invite_tokens (expires_at)
  WHERE consumed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_audit_invite_tokens_email
  ON audit_invite_tokens (invited_email);

COMMENT ON TABLE audit_invite_tokens IS
  'One-shot magic-link tokens issued by SuperAdmins to invite a third-party auditor. Consuming the token creates a portal_user with role=Auditor and expires_at=account_expires_at, then mints a session.';
COMMENT ON COLUMN audit_invite_tokens.expires_at IS
  'When the unconsumed invite link itself stops working (typically 48h after issue).';
COMMENT ON COLUMN audit_invite_tokens.account_expires_at IS
  'Once consumed, this is copied to portal_users.expires_at — the auditor session window.';
