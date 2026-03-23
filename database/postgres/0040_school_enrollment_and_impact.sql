-- Migration: School Enrollment & Literacy Impact Tracking
-- Decoupled longitudinal tables for tracking school metrics.

CREATE TABLE IF NOT EXISTS school_enrollments (
  id SERIAL PRIMARY KEY,
  school_id INTEGER NOT NULL REFERENCES schools_directory(id) ON DELETE CASCADE,
  boys_count INTEGER NOT NULL DEFAULT 0,
  girls_count INTEGER NOT NULL DEFAULT 0,
  total_enrollment INTEGER NOT NULL DEFAULT 0,
  updated_from TEXT NOT NULL,
  academic_term TEXT,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  recorded_by_id INTEGER REFERENCES portal_users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_school_enrollments_school_id ON school_enrollments(school_id);

CREATE TABLE IF NOT EXISTS school_literacy_impacts (
  id SERIAL PRIMARY KEY,
  school_id INTEGER NOT NULL REFERENCES schools_directory(id) ON DELETE CASCADE,
  baby_class_impacted INTEGER NOT NULL DEFAULT 0,
  middle_class_impacted INTEGER NOT NULL DEFAULT 0,
  top_class_impacted INTEGER NOT NULL DEFAULT 0,
  p1_impacted INTEGER NOT NULL DEFAULT 0,
  p2_impacted INTEGER NOT NULL DEFAULT 0,
  p3_impacted INTEGER NOT NULL DEFAULT 0,
  total_impacted INTEGER NOT NULL DEFAULT 0,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  recorded_by_id INTEGER REFERENCES portal_users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_school_literacy_impacts_school_id ON school_literacy_impacts(school_id);
