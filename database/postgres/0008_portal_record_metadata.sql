ALTER TABLE portal_records ADD COLUMN IF NOT EXISTS record_code TEXT;
ALTER TABLE portal_records ADD COLUMN IF NOT EXISTS follow_up_date DATE;
ALTER TABLE portal_records ADD COLUMN IF NOT EXISTS follow_up_type TEXT;
ALTER TABLE portal_records ADD COLUMN IF NOT EXISTS follow_up_owner_user_id INTEGER REFERENCES portal_users(id);
ALTER TABLE portal_records ADD COLUMN IF NOT EXISTS review_note TEXT;
ALTER TABLE portal_records ADD COLUMN IF NOT EXISTS created_by_user_id INTEGER REFERENCES portal_users(id);
ALTER TABLE portal_records ADD COLUMN IF NOT EXISTS updated_by_user_id INTEGER REFERENCES portal_users(id);
ALTER TABLE portal_records ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE portal_records ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE portal_records ADD COLUMN IF NOT EXISTS deleted_by_user_id INTEGER REFERENCES portal_users(id);
ALTER TABLE portal_records ADD COLUMN IF NOT EXISTS delete_reason TEXT;
ALTER TABLE portal_records ADD COLUMN IF NOT EXISTS sub_county TEXT NOT NULL DEFAULT '';
ALTER TABLE portal_records ADD COLUMN IF NOT EXISTS parish TEXT NOT NULL DEFAULT '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_portal_records_record_code
  ON portal_records(record_code)
  WHERE record_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_portal_records_created_by
  ON portal_records(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_portal_records_follow_up
  ON portal_records(follow_up_date);
CREATE INDEX IF NOT EXISTS idx_portal_records_follow_up_owner
  ON portal_records(follow_up_owner_user_id);
