CREATE TABLE IF NOT EXISTS portal_evidence (
  id INTEGER PRIMARY KEY,
  record_id INTEGER REFERENCES portal_records(id) ON DELETE SET NULL,
  module TEXT NOT NULL CHECK(module IN ('training', 'visit', 'assessment', 'story')),
  date DATE NOT NULL,
  school_name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  stored_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  uploaded_by_user_id INTEGER NOT NULL REFERENCES portal_users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portal_evidence_record_id
  ON portal_evidence(record_id);

CREATE INDEX IF NOT EXISTS idx_portal_evidence_module
  ON portal_evidence(module);

CREATE INDEX IF NOT EXISTS idx_portal_evidence_date
  ON portal_evidence(date);

CREATE INDEX IF NOT EXISTS idx_portal_evidence_school
  ON portal_evidence(school_name);
