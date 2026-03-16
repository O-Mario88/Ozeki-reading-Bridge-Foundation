-- Migration: 0028_rbac_security.sql
-- Description: Implement standard Many-to-Many RBAC for PII protection and security.

-- Enable UUID extension if not already present
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Table 6: Roles
CREATE TABLE IF NOT EXISTS rbac_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 7: Permissions
CREATE TABLE IF NOT EXISTS rbac_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 8: Role_Permissions (Join Table)
CREATE TABLE IF NOT EXISTS rbac_role_permissions (
    role_id UUID REFERENCES rbac_roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES rbac_permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- Table 9: Users (New standard table for RBAC)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    school_id UUID, -- Links to school facility (to be linked to schools_directory if transitioned to UUID)
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 10: User_Roles (Join Table)
CREATE TABLE IF NOT EXISTS rbac_user_roles (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES rbac_roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- Seed initial Roles
INSERT INTO rbac_roles (name, description) VALUES
('System_Admin', 'Full system access with PII permissions'),
('School_Staff', 'Access to internal school reports and student PII for their facility'),
('Donor', 'Access to public-facing impact statistics'),
('Auditor', 'Specialized access for verification without PII by default')
ON CONFLICT (name) DO NOTHING;

-- Seed initial Permissions
INSERT INTO rbac_permissions (name, description) VALUES
('view_internal_reports', 'Ability to view detailed internal reports'),
('view_public_reports', 'Ability to view public aggregated reports'),
('access_student_pii', 'Ability to see student names and personal details')
ON CONFLICT (name) DO NOTHING;

-- Map basic permissions to Roles
WITH p AS (SELECT id, name FROM rbac_permissions)
INSERT INTO rbac_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM rbac_roles r, p
WHERE r.name = 'System_Admin'
ON CONFLICT DO NOTHING;

WITH p AS (SELECT id, name FROM rbac_permissions),
     r AS (SELECT id, name FROM rbac_roles)
INSERT INTO rbac_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM r, p
WHERE r.name = 'School_Staff' AND p.name IN ('view_internal_reports', 'access_student_pii', 'view_public_reports')
ON CONFLICT DO NOTHING;

WITH p AS (SELECT id, name FROM rbac_permissions),
     r AS (SELECT id, name FROM rbac_roles)
INSERT INTO rbac_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM r, p
WHERE r.name = 'Donor' AND p.name IN ('view_public_reports')
ON CONFLICT DO NOTHING;
