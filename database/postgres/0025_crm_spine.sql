-- Literacy CRM Spine: Registry and Unified Engagement Logging

-- 1. CRM Accounts (Universal Registry for Organizations)
CREATE TABLE IF NOT EXISTS crm_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_name TEXT NOT NULL,
    account_type TEXT NOT NULL, -- 'School', 'Partner', 'Donor', 'Government', 'Vendor', 'Community Group'
    source_table TEXT,          -- Reference to domain table (e.g., 'schools_directory')
    source_id INTEGER,           -- Original integer PK for traceability
    status TEXT NOT NULL DEFAULT 'Active',
    geography_id INTEGER,       -- Link to geo hierarchy if applicable
    parent_account_id UUID REFERENCES crm_accounts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_crm_accounts_source ON crm_accounts(source_table, source_id);
CREATE INDEX IF NOT EXISTS idx_crm_accounts_type ON crm_accounts(account_type);

-- 2. CRM Contacts (Universal Registry for People)
CREATE TABLE IF NOT EXISTS crm_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    contact_type TEXT NOT NULL, -- 'Teacher', 'Head Teacher', 'Volunteer', 'Donor Contact', 'Official'
    source_table TEXT,          -- e.g., 'school_contacts', 'teacher_roster', 'finance_contacts'
    source_id INTEGER,           -- Original integer PK
    portal_user_id INTEGER REFERENCES portal_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_crm_contacts_source ON crm_contacts(source_table, source_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_email ON crm_contacts(email);

-- 3. CRM Affiliations (Many-to-Many linkage between People and Organizations)
CREATE TABLE IF NOT EXISTS crm_affiliations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES crm_accounts(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
    role_title TEXT,
    is_primary_contact BOOLEAN NOT NULL DEFAULT FALSE,
    department TEXT,
    status TEXT NOT NULL DEFAULT 'Active',
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(account_id, contact_id, role_title)
);

CREATE INDEX IF NOT EXISTS idx_crm_affiliations_account ON crm_affiliations(account_id);
CREATE INDEX IF NOT EXISTS idx_crm_affiliations_contact ON crm_affiliations(contact_id);

-- 4. CRM Interactions (Unified Polymorphic Event Log)
CREATE TABLE IF NOT EXISTS crm_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interaction_type TEXT NOT NULL, -- 'Visit', 'Call', 'Meeting', 'Training', 'Delivery', 'Email', 'SMS'
    subject TEXT,
    account_id UUID REFERENCES crm_accounts(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
    activity_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    duration_minutes INTEGER,
    status TEXT NOT NULL DEFAULT 'Completed', -- 'Planned', 'Completed', 'Cancelled'
    source_table TEXT,                       -- Link back to 'coaching_visits', 'portal_records', etc
    source_id INTEGER,
    notes TEXT,
    created_by_user_id INTEGER REFERENCES portal_users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_crm_interactions_account_date ON crm_interactions(account_id, activity_date DESC);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_contact_date ON crm_interactions(contact_id, activity_date DESC);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_source ON crm_interactions(source_table, source_id);

-- 5. CRM Tasks / Follow-ups
CREATE TABLE IF NOT EXISTS crm_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject TEXT NOT NULL,
    description TEXT,
    due_date DATE,
    priority TEXT NOT NULL DEFAULT 'Medium', -- 'Low', 'Medium', 'High', 'Urgent'
    status TEXT NOT NULL DEFAULT 'Pending', -- 'Pending', 'In Progress', 'Completed', 'Deferred'
    account_id UUID REFERENCES crm_accounts(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES crm_contacts(id) ON DELETE CASCADE,
    assigned_to_user_id INTEGER REFERENCES portal_users(id),
    related_source_table TEXT,
    related_source_id INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_crm_tasks_assigned ON crm_tasks(assigned_to_user_id, status);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_account ON crm_tasks(account_id, status);

-- 6. v_organization_360 (Unified Literacy Engagement View)
-- Joins CRM Spine with core domain stats for the "Overview" dash.
CREATE OR REPLACE VIEW v_organization_360 AS
SELECT
    a.id AS crm_account_id,
    a.account_name,
    a.account_type,
    a.status,
    s.school_code,
    s.district,
    s.enrolled_learners,
    s.program_status,
    (SELECT COUNT(*) FROM crm_affiliations af WHERE af.account_id = a.id) AS total_contacts,
    (SELECT COUNT(*) FROM crm_interactions i WHERE i.account_id = a.id) AS total_interactions,
    (SELECT MAX(activity_date) FROM crm_interactions i WHERE i.account_id = a.id) AS last_engagement_date,
    (SELECT COUNT(*) FROM crm_tasks t WHERE t.account_id = a.id AND t.status != 'Completed') AS open_tasks
FROM crm_accounts a
LEFT JOIN schools_directory s ON a.source_table = 'schools_directory' AND a.source_id = s.id;
