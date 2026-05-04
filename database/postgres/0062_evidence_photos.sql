-- Migration 0062: GPS-tagged photo evidence for coaching visits and training events.
--
-- Adds an `evidence_photos` table that stores per-photo GPS lat/lng, capture
-- timestamp, full EXIF JSON, a tamper-detection sha256 hash, and a polymorphic
-- pointer back to the parent record (a coaching_visit, training_session, or
-- training_record). This is the storage layer behind Phase 1 / Sprint 4.
--
-- Notes:
--   * `parent_type` is a checked enum-string so a single photo can be attached
--     to any of the supported parent record kinds without a giant FK fan-out.
--   * No FK on (parent_type, parent_id) — Postgres can't FK against a
--     polymorphic association. Integrity is enforced at the application layer.
--   * `photo_hash_sha256` is NOT unique: the same photo may legitimately serve
--     as evidence for more than one parent record.

CREATE TABLE IF NOT EXISTS evidence_photos (
  id BIGSERIAL PRIMARY KEY,
  parent_type TEXT NOT NULL CHECK (parent_type IN ('coaching_visit', 'training_session', 'training_record')),
  parent_id BIGINT NOT NULL,
  school_id INTEGER REFERENCES schools(id) ON DELETE SET NULL,
  captured_at TIMESTAMPTZ,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  gps_accuracy_m DOUBLE PRECISION,
  exif_json JSONB,
  photo_hash_sha256 TEXT NOT NULL,
  file_name TEXT NOT NULL,
  stored_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  width_px INTEGER,
  height_px INTEGER,
  caption TEXT,
  uploaded_by_user_id INTEGER REFERENCES portal_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_photos_parent
  ON evidence_photos (parent_type, parent_id);

CREATE INDEX IF NOT EXISTS idx_evidence_photos_school
  ON evidence_photos (school_id)
  WHERE school_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_evidence_photos_uploaded_by
  ON evidence_photos (uploaded_by_user_id, created_at DESC)
  WHERE uploaded_by_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_evidence_photos_captured_at
  ON evidence_photos (captured_at DESC)
  WHERE captured_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_evidence_photos_geo
  ON evidence_photos (lat, lng)
  WHERE lat IS NOT NULL AND lng IS NOT NULL;

COMMENT ON TABLE evidence_photos IS
  'GPS-tagged photo evidence attached to coaching visits or training events. EXIF and hash preserved for third-party verification.';
COMMENT ON COLUMN evidence_photos.parent_type IS
  'Polymorphic parent kind: coaching_visit, training_session, or training_record.';
COMMENT ON COLUMN evidence_photos.lat IS
  'Latitude (WGS84). Source priority: EXIF GPSLatitude > browser geolocation.';
COMMENT ON COLUMN evidence_photos.lng IS
  'Longitude (WGS84). Source priority: EXIF GPSLongitude > browser geolocation.';
COMMENT ON COLUMN evidence_photos.gps_accuracy_m IS
  'Browser-reported geolocation accuracy in meters (when not from EXIF).';
COMMENT ON COLUMN evidence_photos.exif_json IS
  'Full EXIF metadata blob, preserved verbatim from upload for verification.';
COMMENT ON COLUMN evidence_photos.photo_hash_sha256 IS
  'sha256 of the original uploaded bytes. Tamper-detection key.';
