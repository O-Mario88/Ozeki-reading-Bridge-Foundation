-- Migration 0070: Uganda EMIS bi-directional sync (Phase 4 / Sprint 12).
--
-- Three tables:
--   emis_config            — singleton row controlling the adapter
--   emis_school_links      — maps Ozeki school IDs to EMIS school codes
--   emis_sync_runs         — log of every sync run (manual or cron)

CREATE TABLE IF NOT EXISTS emis_config (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  api_base_url TEXT,
  has_api_token BOOLEAN NOT NULL DEFAULT FALSE,
  pull_frequency_minutes INTEGER NOT NULL DEFAULT 1440,
  push_outcomes BOOLEAN NOT NULL DEFAULT TRUE,
  last_pull_at TIMESTAMPTZ,
  last_push_at TIMESTAMPTZ,
  last_run_status TEXT,
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO emis_config (id, enabled) VALUES (1, FALSE)
  ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS emis_school_links (
  id BIGSERIAL PRIMARY KEY,
  ozeki_school_id INTEGER REFERENCES schools_directory(id) ON DELETE CASCADE,
  emis_school_code TEXT NOT NULL UNIQUE,
  emis_district TEXT,
  emis_sub_county TEXT,
  emis_payload_json JSONB,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emis_school_links_school
  ON emis_school_links (ozeki_school_id)
  WHERE ozeki_school_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS emis_sync_runs (
  id BIGSERIAL PRIMARY KEY,
  direction TEXT NOT NULL CHECK (direction IN ('pull', 'push', 'reconcile')),
  trigger TEXT NOT NULL CHECK (trigger IN ('manual', 'cron', 'startup')),
  status TEXT NOT NULL CHECK (status IN ('success', 'partial', 'failed', 'mock')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  schools_in INTEGER NOT NULL DEFAULT 0,
  teachers_in INTEGER NOT NULL DEFAULT 0,
  outcomes_out INTEGER NOT NULL DEFAULT 0,
  errors INTEGER NOT NULL DEFAULT 0,
  summary TEXT,
  payload_summary JSONB
);

CREATE INDEX IF NOT EXISTS idx_emis_sync_runs_started
  ON emis_sync_runs (started_at DESC);

COMMENT ON TABLE emis_config IS
  'Singleton config for the Uganda EMIS adapter. has_api_token is a boolean indicator only — the actual token is read from the EMIS_API_TOKEN env var, never persisted in the DB.';
COMMENT ON TABLE emis_school_links IS
  'Maps Ozeki schools_directory.id to the canonical Uganda EMIS school code.';
COMMENT ON TABLE emis_sync_runs IS
  'Append-only log of every EMIS sync run. Status mock indicates the adapter ran in dry-run mode because EMIS credentials were not configured.';
