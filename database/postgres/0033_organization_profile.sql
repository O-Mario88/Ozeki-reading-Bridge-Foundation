CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS organization_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  po_box TEXT NOT NULL,
  telephone TEXT NOT NULL,
  email TEXT NOT NULL,
  tin TEXT NOT NULL,
  registration_number TEXT NOT NULL,
  logo_storage_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_organization_profile_active_singleton
  ON organization_profile (is_active)
  WHERE is_active = TRUE;

INSERT INTO organization_profile (
  name,
  address,
  po_box,
  telephone,
  email,
  tin,
  registration_number,
  logo_storage_url,
  is_active
)
SELECT
  'Ozeki Reading Bridge Foundation',
  'Acholi Lane, Gulu City, Uganda',
  'P.O. Box 204743, Kampala, Uganda',
  '+256 773 397 375',
  'support@ozekiread.org',
  '1057023312',
  '80034783181112',
  '/photos/logo.png',
  TRUE
WHERE NOT EXISTS (
  SELECT 1
  FROM organization_profile
  WHERE is_active = TRUE
);
