-- Create the support_requests table strictly adhering to the repository model
CREATE TABLE IF NOT EXISTS support_requests (
  id SERIAL PRIMARY KEY,
  school_id INTEGER REFERENCES schools_directory(id) ON DELETE SET NULL,
  contact_name TEXT,
  contact_role TEXT,
  contact_info TEXT,
  urgency TEXT,
  message TEXT,
  support_types JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'New',
  created_by_user_id INTEGER REFERENCES portal_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note: we use IF NOT EXISTS just in case older environments partially instantiated it.
-- Also create concept_note_requests as it was discovered missing during schema audit

CREATE TABLE IF NOT EXISTS concept_note_requests (
  id SERIAL PRIMARY KEY,
  requester_type TEXT,
  source_page TEXT,
  region TEXT,
  sub_region TEXT,
  district TEXT,
  payload_json JSONB,
  submitted_by_user_id INTEGER REFERENCES portal_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
