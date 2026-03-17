-- SCHOOL REPORT METADATA & WORKFLOW
-- Tracks the lifecycle of a governed school report: Draft -> AI Narration -> Reviewed -> Approved -> Immutable PDF

CREATE TABLE IF NOT EXISTS school_performance_reports (
  id SERIAL PRIMARY KEY,
  school_id INTEGER NOT NULL REFERENCES schools_directory(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  report_type VARCHAR(50) DEFAULT 'Standard', -- 'Standard', 'Executive', 'Donor-Specific'
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'ai_generated', 'reviewed', 'approved', 'archived'
  
  -- Facts (Data used for narration)
  fact_pack_json JSONB NOT NULL,
  
  -- AI Output
  ai_narrative_json JSONB,
  
  -- Human Overrides
  staff_summary_override TEXT,
  staff_review_note TEXT,
  
  -- Metadata
  generated_by_user_id INTEGER REFERENCES portal_users(id),
  approved_by_user_id INTEGER REFERENCES portal_users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  
  -- Immutable Output
  pdf_url TEXT, -- Path to S3/Cloudfront or R2
  pdf_hash TEXT, -- For integrity verification
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_school_reports_school_id ON school_performance_reports(school_id);
CREATE INDEX IF NOT EXISTS idx_school_reports_status ON school_performance_reports(status);
