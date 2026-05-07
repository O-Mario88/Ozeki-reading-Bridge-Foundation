-- Leadership simplification: add 'about' column, migrate biography data
ALTER TABLE portal_leadership_team_members
  ADD COLUMN IF NOT EXISTS about TEXT NOT NULL DEFAULT '';

-- Migrate existing biography content into the new 'about' column
UPDATE portal_leadership_team_members
  SET about = COALESCE(biography, '')
  WHERE about = '' AND biography IS NOT NULL AND biography != '';
