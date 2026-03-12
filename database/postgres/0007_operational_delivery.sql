CREATE TABLE IF NOT EXISTS coaching_visits (
  id INTEGER PRIMARY KEY,
  visit_uid TEXT NOT NULL UNIQUE,
  portal_record_id INTEGER UNIQUE REFERENCES portal_records(id) ON DELETE SET NULL,
  school_id INTEGER NOT NULL REFERENCES schools_directory(id) ON DELETE CASCADE,
  visit_date DATE NOT NULL,
  visit_type TEXT NOT NULL,
  coaching_cycle_number INTEGER,
  coach_user_id INTEGER NOT NULL REFERENCES portal_users(id),
  focus_areas_json TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  implementation_status TEXT NOT NULL DEFAULT 'started',
  visit_pathway TEXT NOT NULL DEFAULT 'observation',
  classes_implementing_json TEXT,
  classes_not_implementing_json TEXT,
  visit_reason TEXT NOT NULL DEFAULT 'lesson_evaluation_coaching'
);
CREATE INDEX IF NOT EXISTS idx_coaching_visits_school
  ON coaching_visits(school_id, visit_date);
CREATE INDEX IF NOT EXISTS idx_coaching_visits_date
  ON coaching_visits(visit_date);
CREATE INDEX IF NOT EXISTS idx_coaching_visits_implementation
  ON coaching_visits(implementation_status, visit_pathway);

CREATE TABLE IF NOT EXISTS visit_participants (
  id INTEGER PRIMARY KEY,
  visit_id INTEGER NOT NULL REFERENCES coaching_visits(id) ON DELETE CASCADE,
  school_id INTEGER NOT NULL REFERENCES schools_directory(id) ON DELETE CASCADE,
  contact_id INTEGER NOT NULL REFERENCES school_contacts(contact_id) ON DELETE CASCADE,
  role_at_time TEXT,
  attended BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_visit_participants_visit
  ON visit_participants(visit_id);
CREATE INDEX IF NOT EXISTS idx_visit_participants_contact
  ON visit_participants(contact_id);

CREATE TABLE IF NOT EXISTS visit_demo (
  id INTEGER PRIMARY KEY,
  visit_id INTEGER NOT NULL UNIQUE REFERENCES coaching_visits(id) ON DELETE CASCADE,
  demo_delivered BOOLEAN NOT NULL DEFAULT TRUE,
  demo_class TEXT,
  demo_focus TEXT,
  demo_minutes INTEGER,
  demo_components_json TEXT NOT NULL DEFAULT '[]',
  materials_used_json TEXT NOT NULL DEFAULT '[]',
  teachers_present_contact_ids_json TEXT NOT NULL DEFAULT '[]',
  takeaways_text TEXT,
  implementation_start_date DATE,
  daily_reading_time_minutes INTEGER,
  classes_to_start_json TEXT NOT NULL DEFAULT '[]',
  responsible_contact_id INTEGER REFERENCES school_contacts(contact_id) ON DELETE SET NULL,
  support_needed_json TEXT NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_visit_demo_visit
  ON visit_demo(visit_id);

CREATE TABLE IF NOT EXISTS visit_leadership_meeting (
  id INTEGER PRIMARY KEY,
  visit_id INTEGER NOT NULL UNIQUE REFERENCES coaching_visits(id) ON DELETE CASCADE,
  meeting_held BOOLEAN NOT NULL DEFAULT TRUE,
  attendees_contact_ids_json TEXT NOT NULL DEFAULT '[]',
  summary_text TEXT,
  agreements_text TEXT,
  risks_text TEXT,
  next_actions_json TEXT NOT NULL DEFAULT '[]',
  next_visit_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_visit_leadership_meeting_visit
  ON visit_leadership_meeting(visit_id);

CREATE TABLE IF NOT EXISTS school_support_status_snapshots (
  id INTEGER PRIMARY KEY,
  school_id INTEGER NOT NULL REFERENCES schools_directory(id) ON DELETE CASCADE,
  period_key TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN (
    'Requires Remedial & Catch-Up',
    'Progressing (Maintain + Strengthen)',
    'Graduation Prep (Approaching criteria)',
    'Graduation Eligible'
  )),
  metrics_json TEXT NOT NULL DEFAULT '{}',
  recommended_actions_json TEXT NOT NULL DEFAULT '[]',
  rules_version TEXT NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(school_id, period_key)
);
CREATE INDEX IF NOT EXISTS idx_school_support_status_snapshots_status
  ON school_support_status_snapshots(status, computed_at DESC);

CREATE TABLE IF NOT EXISTS teacher_support_status_snapshots (
  id INTEGER PRIMARY KEY,
  school_id INTEGER NOT NULL REFERENCES schools_directory(id) ON DELETE CASCADE,
  teacher_uid TEXT NOT NULL REFERENCES teacher_roster(teacher_uid) ON DELETE CASCADE,
  period_key TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN (
    'Needs Catch-up Training',
    'Needs Coaching & Follow-up',
    'On Track'
  )),
  recommended_action TEXT NOT NULL DEFAULT '',
  evaluations_count INTEGER NOT NULL DEFAULT 0,
  metrics_json TEXT NOT NULL DEFAULT '{}',
  rules_version TEXT NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(school_id, teacher_uid, period_key)
);
CREATE INDEX IF NOT EXISTS idx_teacher_support_status_snapshots_status
  ON teacher_support_status_snapshots(status, computed_at DESC);

CREATE TABLE IF NOT EXISTS assessment_item_responses (
  item_response_id INTEGER PRIMARY KEY,
  learner_result_id INTEGER NOT NULL REFERENCES assessment_records(id) ON DELETE CASCADE,
  assessment_session_result_id INTEGER REFERENCES assessment_session_results(id) ON DELETE CASCADE,
  assessment_session_id INTEGER REFERENCES assessment_sessions(id) ON DELETE CASCADE,
  learner_uid TEXT,
  domain_key TEXT NOT NULL,
  item_key TEXT NOT NULL,
  accuracy BOOLEAN NOT NULL DEFAULT FALSE,
  latency_ms DOUBLE PRECISION,
  attempts INTEGER NOT NULL DEFAULT 1,
  hint_used BOOLEAN NOT NULL DEFAULT FALSE,
  correction_used BOOLEAN NOT NULL DEFAULT FALSE,
  item_score DOUBLE PRECISION,
  latency_score DOUBLE PRECISION,
  attempt_support_score DOUBLE PRECISION,
  model_version TEXT,
  scoring_profile_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_assessment_item_responses_result
  ON assessment_item_responses(learner_result_id);
CREATE INDEX IF NOT EXISTS idx_assessment_item_responses_domain
  ON assessment_item_responses(domain_key, model_version);
