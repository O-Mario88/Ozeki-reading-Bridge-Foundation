-- Migration 0067: Government district-officer portal + partner embed widgets
-- (Phase 2 / Sprint 9).
--
-- Three tables:
--   district_officer_assignments  — which external_user (role=district_officer)
--                                    has scope over which district + permission
--   district_intervention_schedule — planned remediation interventions a
--                                    district officer has scheduled across
--                                    schools in their jurisdiction
--   school_fidelity_scores         — per-school monthly fidelity score
--                                    (delivery completeness, GPS-verified
--                                    visits, attendance, etc.) used in the
--                                    district dashboard

CREATE TABLE IF NOT EXISTS district_officer_assignments (
  id BIGSERIAL PRIMARY KEY,
  external_user_id BIGINT NOT NULL REFERENCES external_users(id) ON DELETE CASCADE,
  district TEXT NOT NULL,
  region TEXT,
  scope TEXT NOT NULL DEFAULT 'view' CHECK (scope IN ('view', 'schedule', 'admin')),
  assigned_by_user_id INTEGER REFERENCES portal_users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  notes TEXT,
  UNIQUE (external_user_id, district)
);

CREATE INDEX IF NOT EXISTS idx_district_assignments_district
  ON district_officer_assignments (district)
  WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS district_intervention_schedule (
  id BIGSERIAL PRIMARY KEY,
  district TEXT NOT NULL,
  school_id INTEGER REFERENCES schools_directory(id) ON DELETE CASCADE,
  intervention_type TEXT NOT NULL,
  scheduled_for DATE NOT NULL,
  scheduled_by_external_id BIGINT REFERENCES external_users(id) ON DELETE SET NULL,
  scheduled_by_portal_user_id INTEGER REFERENCES portal_users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'completed', 'cancelled')),
  notes TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intervention_schedule_district
  ON district_intervention_schedule (district, scheduled_for DESC);

CREATE INDEX IF NOT EXISTS idx_intervention_schedule_school
  ON district_intervention_schedule (school_id, scheduled_for DESC)
  WHERE school_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS school_fidelity_scores (
  id BIGSERIAL PRIMARY KEY,
  school_id INTEGER NOT NULL REFERENCES schools_directory(id) ON DELETE CASCADE,
  district TEXT,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  visits_planned INTEGER NOT NULL DEFAULT 0,
  visits_delivered INTEGER NOT NULL DEFAULT 0,
  visits_with_gps INTEGER NOT NULL DEFAULT 0,
  visits_with_photo INTEGER NOT NULL DEFAULT 0,
  trainings_attended INTEGER NOT NULL DEFAULT 0,
  fidelity_score NUMERIC(5, 2) NOT NULL DEFAULT 0,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (school_id, period_start)
);

CREATE INDEX IF NOT EXISTS idx_fidelity_scores_district
  ON school_fidelity_scores (district, period_end DESC)
  WHERE district IS NOT NULL;

CREATE TABLE IF NOT EXISTS partner_embed_widgets (
  id BIGSERIAL PRIMARY KEY,
  partner_user_id BIGINT NOT NULL REFERENCES external_users(id) ON DELETE CASCADE,
  ref_code TEXT NOT NULL UNIQUE,
  brand_color TEXT NOT NULL DEFAULT '#066a67',
  show_learners BOOLEAN NOT NULL DEFAULT TRUE,
  show_teachers BOOLEAN NOT NULL DEFAULT TRUE,
  show_districts BOOLEAN NOT NULL DEFAULT TRUE,
  custom_heading TEXT,
  view_count INTEGER NOT NULL DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_embeds_partner
  ON partner_embed_widgets (partner_user_id);

COMMENT ON TABLE district_officer_assignments IS
  'Maps an external_user with role=district_officer to one or more districts they have scope over.';
COMMENT ON TABLE district_intervention_schedule IS
  'Remediation interventions planned by a district officer across schools in their district.';
COMMENT ON TABLE school_fidelity_scores IS
  'Per-school monthly fidelity score: delivery completeness, GPS-verified visits, attendance.';
COMMENT ON TABLE partner_embed_widgets IS
  'Branded iframe-safe impact widgets for partner NGOs to embed Ozeki impact on their own sites.';
