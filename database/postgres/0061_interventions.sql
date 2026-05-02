-- ─────────────────────────────────────────────────────────────────────
-- 0061_interventions.sql
-- Schema for the /portal/interventions dashboard. Designed so each
-- card on the page maps to a single read off of these tables — no
-- denormalised cache tables, no precomputed aggregates. The
-- /portal/interventions page reads via the repository at
-- src/lib/server/postgres/repositories/interventions.ts and falls
-- back to the screenshot mock when these tables are empty.
--
-- Tables:
--   intervention_plans          — one row per plan (top of the funnel)
--   intervention_plan_actions   — one row per actionable task on a plan
--   intervention_evidence       — file uploads + verification status
--   intervention_activity       — append-only feed for the page sidebar
--
-- Conventions (matches the rest of the portal schema):
--   - id columns are TEXT (so a plan can be addressed as "IP-032"
--     directly from the UI)
--   - timestamps are TIMESTAMPTZ, default NOW()
--   - status / risk / kind columns use CHECK lists, not enum types,
--     because enums can't be safely altered under the
--     bootstrap-every-deploy model (see feedback_migration_idempotency)
--   - foreign keys to portal_users / schools are intentionally loose
--     (TEXT, no FK constraint) — the dashboard tolerates dangling
--     refs and resolves names server-side
-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS intervention_plans (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL,
  scope_type      TEXT NOT NULL DEFAULT 'Country'
    CHECK (scope_type IN ('Country', 'Region', 'District', 'Cluster', 'School')),
  scope_name      TEXT NOT NULL DEFAULT 'Uganda',
  scope_id        TEXT,
  type            TEXT
    CHECK (type IN (
      'Coaching Cycles',
      'Remedial Reading',
      'Materials Support',
      'Leadership Support',
      'Data Quality Fixes'
    )),
  owner_user_id   TEXT,
  owner_name      TEXT,
  status          TEXT NOT NULL DEFAULT 'Planned'
    CHECK (status IN ('Planned', 'Approved', 'In Progress', 'At Risk', 'Completed', 'Verified')),
  progress_pct    INT  NOT NULL DEFAULT 0
    CHECK (progress_pct BETWEEN 0 AND 100),
  due_date        DATE,
  risk            TEXT NOT NULL DEFAULT 'Low'
    CHECK (risk IN ('Low', 'Medium', 'High')),
  region          TEXT,
  high_risk       BOOLEAN NOT NULL DEFAULT FALSE,
  schools_count   INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intervention_plans_status   ON intervention_plans (status);
CREATE INDEX IF NOT EXISTS idx_intervention_plans_risk     ON intervention_plans (risk);
CREATE INDEX IF NOT EXISTS idx_intervention_plans_due      ON intervention_plans (due_date);
CREATE INDEX IF NOT EXISTS idx_intervention_plans_region   ON intervention_plans (region);
CREATE INDEX IF NOT EXISTS idx_intervention_plans_owner    ON intervention_plans (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_intervention_plans_updated  ON intervention_plans (updated_at DESC);


CREATE TABLE IF NOT EXISTS intervention_plan_actions (
  id              TEXT PRIMARY KEY,
  plan_id         TEXT NOT NULL,
  action_text     TEXT NOT NULL,
  owner_user_id   TEXT,
  owner_name      TEXT,
  due_date        DATE,
  status          TEXT NOT NULL DEFAULT 'Pending'
    CHECK (status IN ('Pending', 'In Progress', 'Completed', 'Cancelled')),
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intervention_actions_plan    ON intervention_plan_actions (plan_id);
CREATE INDEX IF NOT EXISTS idx_intervention_actions_status  ON intervention_plan_actions (status);
CREATE INDEX IF NOT EXISTS idx_intervention_actions_due     ON intervention_plan_actions (due_date);
CREATE INDEX IF NOT EXISTS idx_intervention_actions_owner   ON intervention_plan_actions (owner_user_id);


CREATE TABLE IF NOT EXISTS intervention_evidence (
  id              TEXT PRIMARY KEY,
  plan_id         TEXT NOT NULL,
  file_name       TEXT NOT NULL,
  file_kind       TEXT NOT NULL DEFAULT 'document'
    CHECK (file_kind IN ('document', 'spreadsheet', 'image', 'archive', 'audio', 'video')),
  file_url        TEXT,
  uploader_user_id TEXT,
  uploader_name   TEXT,
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status          TEXT NOT NULL DEFAULT 'Pending'
    CHECK (status IN ('Pending', 'Verified', 'Rejected'))
);

CREATE INDEX IF NOT EXISTS idx_intervention_evidence_plan    ON intervention_evidence (plan_id);
CREATE INDEX IF NOT EXISTS idx_intervention_evidence_status  ON intervention_evidence (status);
CREATE INDEX IF NOT EXISTS idx_intervention_evidence_at      ON intervention_evidence (uploaded_at DESC);


CREATE TABLE IF NOT EXISTS intervention_activity (
  id              BIGSERIAL PRIMARY KEY,
  plan_id         TEXT,
  kind            TEXT NOT NULL DEFAULT 'note'
    CHECK (kind IN ('progress', 'action_complete', 'evidence_upload', 'status_change', 'note')),
  message         TEXT NOT NULL,
  actor_user_id   TEXT,
  actor_name      TEXT,
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intervention_activity_plan  ON intervention_activity (plan_id);
CREATE INDEX IF NOT EXISTS idx_intervention_activity_at    ON intervention_activity (occurred_at DESC);
