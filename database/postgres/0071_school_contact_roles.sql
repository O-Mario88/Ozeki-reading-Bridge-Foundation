-- Migration 0071: index school_contacts.role_title for analytics queries.
--
-- The role_title column already exists on school_contacts (foundation
-- migration). This migration just adds a covering index so the school
-- profile dashboard can group/filter contacts by role efficiently
-- (Director / Head Teacher / DOS / Deputy Head Teacher / Head Teacher
-- Lower / Classroom Teacher / etc.) and a comment to document the
-- canonical role vocabulary the New Contact form uses.

CREATE INDEX IF NOT EXISTS idx_school_contacts_role_title
  ON school_contacts (school_id, role_title)
  WHERE role_title IS NOT NULL;

COMMENT ON COLUMN school_contacts.role_title IS
  'Canonical role label as captured on the New Contact form. Common values: Director, Head Teacher, DOS, Deputy Head Teacher, Head Teacher Lower, Classroom Teacher, Proprietor. Free-text — not enforced via CHECK so historic / partner data still loads.';
