-- Optimization indexes for Dashboard and Analytical Queries
CREATE INDEX IF NOT EXISTS idx_portal_records_module ON portal_records(module);
CREATE INDEX IF NOT EXISTS idx_portal_records_school_id ON portal_records(school_id);
CREATE INDEX IF NOT EXISTS idx_portal_records_module_school ON portal_records(module, school_id);
CREATE INDEX IF NOT EXISTS idx_portal_records_created_at_desc ON portal_records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_portal_records_updated_at_desc ON portal_records(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_requests_status ON support_requests(status);
