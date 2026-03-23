-- Add missing columns to support_requests to match application expectations

ALTER TABLE support_requests ADD COLUMN IF NOT EXISTS school_id INTEGER;
ALTER TABLE support_requests ADD COLUMN IF NOT EXISTS contact_name TEXT;
ALTER TABLE support_requests ADD COLUMN IF NOT EXISTS contact_role TEXT;
ALTER TABLE support_requests ADD COLUMN IF NOT EXISTS contact_info TEXT;
ALTER TABLE support_requests ADD COLUMN IF NOT EXISTS urgency TEXT;
ALTER TABLE support_requests ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE support_requests ADD COLUMN IF NOT EXISTS support_types JSONB;
ALTER TABLE support_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
