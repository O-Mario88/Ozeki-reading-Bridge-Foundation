-- Migration 0068: Anonymised microdata download portal (Phase 3 / Sprint 10).
--
-- Three tables:
--   research_datasets             — catalog of downloadable datasets
--   research_license_acceptances  — once-per-user signed license agreements
--   research_dataset_downloads    — every download, joined to the license

CREATE TABLE IF NOT EXISTS research_datasets (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  dataset_type TEXT NOT NULL CHECK (dataset_type IN (
    'assessments', 'coaching_visits', 'training_attendance', 'school_roster', 'finance_summary'
  )),
  version TEXT NOT NULL DEFAULT 'v1',
  fy_range TEXT,
  sample_size INTEGER,
  doi TEXT,
  zenodo_record_id TEXT,
  license_html TEXT NOT NULL,
  last_built_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_research_datasets_active
  ON research_datasets (slug)
  WHERE is_active IS TRUE;

CREATE TABLE IF NOT EXISTS research_license_acceptances (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  organization TEXT,
  intended_use TEXT NOT NULL,
  signed_text TEXT NOT NULL,
  ip_address TEXT,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_research_licenses_email
  ON research_license_acceptances (lower(email));

CREATE TABLE IF NOT EXISTS research_dataset_downloads (
  id BIGSERIAL PRIMARY KEY,
  dataset_id BIGINT NOT NULL REFERENCES research_datasets(id) ON DELETE CASCADE,
  license_acceptance_id BIGINT REFERENCES research_license_acceptances(id) ON DELETE SET NULL,
  email TEXT,
  organization TEXT,
  ip_address TEXT,
  user_agent TEXT,
  bytes_served BIGINT,
  downloaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_research_downloads_dataset
  ON research_dataset_downloads (dataset_id, downloaded_at DESC);

COMMENT ON TABLE research_datasets IS
  'Catalog of anonymised microdata datasets researchers can download. Active rows are listed at /research/datasets.';
COMMENT ON TABLE research_license_acceptances IS
  'Per-download data-use agreement signing event. The signed_text is preserved verbatim so the agreement is auditable in perpetuity.';
COMMENT ON TABLE research_dataset_downloads IS
  'Every download event with the accepted-license FK so a download can be traced back to the signed agreement.';

-- Seed three default datasets.
INSERT INTO research_datasets (
  slug, title, description, dataset_type, version, fy_range, license_html
)
SELECT * FROM (VALUES
  ('assessments-anonymised', 'Anonymised reading assessment microdata',
   'Per-learner reading-stage and component-score records. Names removed; school IDs hashed; assessment dates truncated to school term.',
   'assessments', 'v1', '2024–2026',
   '<p>This dataset is released under a Creative Commons CC-BY-NC 4.0 license.</p><p>You agree to: (a) cite Ozeki Reading Bridge Foundation in any derivative work; (b) not attempt to re-identify individuals; (c) use the data only for non-commercial research, evaluation, or journalism.</p>'),
  ('coaching-visits-anonymised', 'Anonymised coaching-visit records',
   'Per-visit coaching-cycle records. Names removed; school IDs hashed; visit dates truncated to month.',
   'coaching_visits', 'v1', '2024–2026',
   '<p>This dataset is released under a Creative Commons CC-BY-NC 4.0 license.</p><p>You agree to: (a) cite Ozeki Reading Bridge Foundation in any derivative work; (b) not attempt to re-identify individuals or schools; (c) use the data only for non-commercial research, evaluation, or journalism.</p>'),
  ('school-roster-anonymised', 'Anonymised school-roster snapshot',
   'Hashed school IDs with district / region / enrolment counts. Used for reach-footprint analyses.',
   'school_roster', 'v1', 'current',
   '<p>This dataset is released under a Creative Commons CC-BY 4.0 license.</p><p>You agree to: (a) cite Ozeki Reading Bridge Foundation; (b) not attempt to re-identify schools; (c) use only for evaluation, research, journalism, or government planning.</p>')
) AS seed(slug, title, description, dataset_type, version, fy_range, license_html)
WHERE NOT EXISTS (SELECT 1 FROM research_datasets);
