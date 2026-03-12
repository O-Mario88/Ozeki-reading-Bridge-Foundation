CREATE TABLE IF NOT EXISTS material_distributions (
  id INTEGER PRIMARY KEY,
  school_id INTEGER NOT NULL REFERENCES schools_directory(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  material_type TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  receipt_path TEXT,
  notes TEXT,
  created_by_user_id INTEGER NOT NULL REFERENCES portal_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_material_distributions_school
  ON material_distributions(school_id);
