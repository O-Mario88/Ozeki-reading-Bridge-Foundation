ALTER TABLE school_contacts
  ADD COLUMN IF NOT EXISTS contact_record_type TEXT NOT NULL DEFAULT 'School Contact',
  ADD COLUMN IF NOT EXISTS nickname TEXT,
  ADD COLUMN IF NOT EXISTS leadership_role BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sub_role TEXT,
  ADD COLUMN IF NOT EXISTS role_formula TEXT,
  ADD COLUMN IF NOT EXISTS last_ssa_sent DATE,
  ADD COLUMN IF NOT EXISTS trainer BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE INDEX IF NOT EXISTS idx_school_contacts_record_type
  ON school_contacts(contact_record_type);

CREATE INDEX IF NOT EXISTS idx_school_contacts_leadership_role
  ON school_contacts(leadership_role);

CREATE INDEX IF NOT EXISTS idx_school_contacts_trainer
  ON school_contacts(trainer);
