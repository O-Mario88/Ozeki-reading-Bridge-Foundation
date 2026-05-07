-- Migration 0055: Workflow Engine
-- User-configurable automation rules. Each workflow binds an event type to a set of
-- conditions and actions. When an event is published, the workflow dispatcher evaluates
-- each rule and fires matching actions — without code deploys.

CREATE TABLE IF NOT EXISTS workflows (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  trigger_event TEXT NOT NULL,
  conditions_json JSONB NOT NULL DEFAULT '[]',
  actions_json JSONB NOT NULL DEFAULT '[]',
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_by_user_id INTEGER REFERENCES portal_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_fired_at TIMESTAMPTZ,
  fire_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_workflows_trigger
  ON workflows(trigger_event, is_enabled);

-- Per-execution audit trail
CREATE TABLE IF NOT EXISTS workflow_executions (
  id BIGSERIAL PRIMARY KEY,
  workflow_id INTEGER NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  event_id BIGINT REFERENCES platform_events(id) ON DELETE SET NULL,
  matched BOOLEAN NOT NULL,
  actions_results_json JSONB NOT NULL DEFAULT '[]',
  duration_ms INTEGER,
  error_message TEXT,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_exec_workflow
  ON workflow_executions(workflow_id, executed_at DESC);

-- Seed a few sensible defaults (safe to re-run)
INSERT INTO workflows (name, description, trigger_event, conditions_json, actions_json, created_by_user_id)
SELECT
  'Low-rating observation alert',
  'Email admins when an observation is submitted with a "low" fidelity rating',
  'observation.submitted',
  '[{"field":"rating","operator":"equals","value":"low"}]'::jsonb,
  '[{"type":"email_admins","subject":"Low-rating observation flagged"}]'::jsonb,
  NULL
WHERE NOT EXISTS (SELECT 1 FROM workflows WHERE name = 'Low-rating observation alert');

INSERT INTO workflows (name, description, trigger_event, conditions_json, actions_json, created_by_user_id)
SELECT
  'Endline regression follow-up',
  'Seed a coaching intervention when school endline composite drops > 1 point below baseline',
  'assessment.submitted',
  '[{"field":"assessmentType","operator":"equals","value":"endline"}]'::jsonb,
  '[{"type":"seed_intervention","daysOut":14,"actionType":"endline_regression_review"}]'::jsonb,
  NULL
WHERE NOT EXISTS (SELECT 1 FROM workflows WHERE name = 'Endline regression follow-up');

INSERT INTO workflows (name, description, trigger_event, conditions_json, actions_json, created_by_user_id)
SELECT
  'Auto-issue quiz certificate',
  'Generate & email certificate when a teacher passes a recorded-lesson quiz',
  'quiz.passed',
  '[]'::jsonb,
  '[{"type":"issue_lesson_certificate"}]'::jsonb,
  NULL
WHERE NOT EXISTS (SELECT 1 FROM workflows WHERE name = 'Auto-issue quiz certificate');
