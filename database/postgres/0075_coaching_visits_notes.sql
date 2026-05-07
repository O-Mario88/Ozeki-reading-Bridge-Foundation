-- Migration 0075: promote coaching-visit free-text notes to a structured
-- column.
--
-- Previously the notes field accepted by the visits API was retained only
-- inside payload_json on the portal_records audit row — recoverable, but
-- not searchable or filterable from SQL. Adding a dedicated column makes
-- "find every visit where the coach mentioned X" possible without parsing
-- JSON. Idempotent: ADD COLUMN IF NOT EXISTS so re-bootstrap is a no-op
-- once applied.

ALTER TABLE coaching_visits ADD COLUMN IF NOT EXISTS notes TEXT;

-- Cheap GIN-on-trigram index so the visits-search UI can do
-- ILIKE '%word%' without a sequential scan on large datasets. Skipped if
-- pg_trgm is not available — the column itself is what we care about.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_coaching_visits_notes_trgm
             ON coaching_visits USING gin (notes gin_trgm_ops)';
  END IF;
END $$;
