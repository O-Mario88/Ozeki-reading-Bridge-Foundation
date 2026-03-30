-- Migration: Create school_enrollments and school_literacy_impacts tables
-- These tables track historical enrollment snapshots and literacy impact snapshots
-- per school, supporting the School Profile's Metrics History tab.

-- ═══════════════════════════════════════════════════════════════════
-- school_enrollments: Historical enrollment snapshot records
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS school_enrollments (
  id            SERIAL PRIMARY KEY,
  school_id     INT NOT NULL REFERENCES schools_directory(id) ON DELETE CASCADE,
  boys_count    INT NOT NULL DEFAULT 0,
  girls_count   INT NOT NULL DEFAULT 0,
  total_enrollment INT NOT NULL DEFAULT 0,
  updated_from  TEXT NOT NULL DEFAULT 'Manual entry',
  academic_term TEXT,
  recorded_by_id INT REFERENCES portal_users(id),
  recorded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_school_enrollments_school ON school_enrollments (school_id);
CREATE INDEX IF NOT EXISTS idx_school_enrollments_recorded ON school_enrollments (recorded_at DESC);

-- ═══════════════════════════════════════════════════════════════════
-- school_literacy_impacts: Historical literacy/direct impact snapshots
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS school_literacy_impacts (
  id                    SERIAL PRIMARY KEY,
  school_id             INT NOT NULL REFERENCES schools_directory(id) ON DELETE CASCADE,
  baby_class_impacted   INT NOT NULL DEFAULT 0,
  middle_class_impacted INT NOT NULL DEFAULT 0,
  top_class_impacted    INT NOT NULL DEFAULT 0,
  p1_impacted           INT NOT NULL DEFAULT 0,
  p2_impacted           INT NOT NULL DEFAULT 0,
  p3_impacted           INT NOT NULL DEFAULT 0,
  total_impacted        INT NOT NULL DEFAULT 0,
  recorded_by_id        INT REFERENCES portal_users(id),
  recorded_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_school_literacy_impacts_school ON school_literacy_impacts (school_id);
CREATE INDEX IF NOT EXISTS idx_school_literacy_impacts_recorded ON school_literacy_impacts (recorded_at DESC);
