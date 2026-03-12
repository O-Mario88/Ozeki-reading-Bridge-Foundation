CREATE TABLE IF NOT EXISTS portal_users (
  id INTEGER PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  phone TEXT,
  is_supervisor BOOLEAN NOT NULL DEFAULT FALSE,
  is_me BOOLEAN NOT NULL DEFAULT FALSE,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  is_superadmin BOOLEAN NOT NULL DEFAULT FALSE,
  geography_scope TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS portal_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES portal_users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_portal_sessions_user_id ON portal_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_portal_sessions_expires_at ON portal_sessions(expires_at);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  user_name TEXT NOT NULL,
  action TEXT NOT NULL,
  target_table TEXT,
  target_id TEXT,
  payload_before TEXT,
  payload_after TEXT,
  detail TEXT,
  ip_address TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS geo_regions (
  id INTEGER PRIMARY KEY,
  region_id TEXT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS geo_subregions (
  id INTEGER PRIMARY KEY,
  subregion_id TEXT,
  region_id INTEGER,
  name TEXT NOT NULL,
  UNIQUE(name)
);

CREATE TABLE IF NOT EXISTS geo_districts (
  id INTEGER PRIMARY KEY,
  district_id TEXT,
  subregion_id INTEGER,
  region_id INTEGER,
  name TEXT NOT NULL,
  UNIQUE(name)
);

CREATE TABLE IF NOT EXISTS geo_subcounties (
  id INTEGER PRIMARY KEY,
  subcounty_id TEXT,
  district_id INTEGER,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS geo_parishes (
  id INTEGER PRIMARY KEY,
  parish_id TEXT,
  subcounty_id INTEGER,
  district_id INTEGER,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS schools_directory (
  id INTEGER PRIMARY KEY,
  school_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  district TEXT NOT NULL,
  sub_county TEXT NOT NULL,
  parish TEXT NOT NULL,
  village TEXT,
  enrolled_boys INTEGER NOT NULL DEFAULT 0,
  enrolled_girls INTEGER NOT NULL DEFAULT 0,
  enrolled_learners INTEGER NOT NULL DEFAULT 0,
  gps_lat TEXT,
  gps_lng TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  enrollment_total INTEGER NOT NULL DEFAULT 0,
  enrollment_by_grade TEXT,
  enrolled_baby INTEGER NOT NULL DEFAULT 0,
  enrolled_middle INTEGER NOT NULL DEFAULT 0,
  enrolled_top INTEGER NOT NULL DEFAULT 0,
  enrolled_p1 INTEGER NOT NULL DEFAULT 0,
  enrolled_p2 INTEGER NOT NULL DEFAULT 0,
  enrolled_p3 INTEGER NOT NULL DEFAULT 0,
  enrolled_p4 INTEGER NOT NULL DEFAULT 0,
  enrolled_p5 INTEGER NOT NULL DEFAULT 0,
  enrolled_p6 INTEGER NOT NULL DEFAULT 0,
  enrolled_p7 INTEGER NOT NULL DEFAULT 0,
  program_status TEXT NOT NULL DEFAULT 'active',
  graduated_at TIMESTAMPTZ,
  graduated_by_user_id INTEGER,
  graduation_notes TEXT,
  graduation_version TEXT,
  school_uid TEXT,
  region TEXT,
  sub_region TEXT,
  region_id TEXT,
  subregion_id TEXT,
  district_id TEXT,
  geo_region_id TEXT,
  geo_subregion_id TEXT,
  geo_district_id TEXT,
  geo_subcounty_id TEXT,
  geo_parish_id TEXT,
  primary_contact_id INTEGER,
  contact_email TEXT
);

CREATE TABLE IF NOT EXISTS school_contacts (
  contact_id INTEGER PRIMARY KEY,
  contact_uid TEXT NOT NULL UNIQUE,
  school_id INTEGER NOT NULL REFERENCES schools_directory(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  gender TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  whatsapp TEXT,
  category TEXT NOT NULL,
  role_title TEXT,
  is_primary_contact BOOLEAN NOT NULL DEFAULT FALSE,
  class_taught TEXT,
  subject_taught TEXT,
  teacher_uid TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS school_learners (
  learner_id INTEGER PRIMARY KEY,
  learner_uid TEXT NOT NULL UNIQUE,
  school_id INTEGER NOT NULL REFERENCES schools_directory(id) ON DELETE CASCADE,
  learner_name TEXT NOT NULL,
  class_grade TEXT NOT NULL,
  age INTEGER NOT NULL,
  gender TEXT NOT NULL,
  internal_child_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teacher_roster (
  id INTEGER PRIMARY KEY,
  teacher_uid TEXT NOT NULL UNIQUE,
  school_id INTEGER NOT NULL REFERENCES schools_directory(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  gender TEXT,
  phone TEXT,
  email TEXT,
  class_taught TEXT,
  role_title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS learner_roster (
  id INTEGER PRIMARY KEY,
  learner_uid TEXT NOT NULL UNIQUE,
  school_id INTEGER NOT NULL REFERENCES schools_directory(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  gender TEXT,
  age INTEGER,
  class_grade TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS training_sessions (
  id INTEGER PRIMARY KEY,
  school_name TEXT NOT NULL,
  district TEXT NOT NULL,
  sub_county TEXT NOT NULL,
  parish TEXT NOT NULL,
  village TEXT,
  session_date DATE NOT NULL,
  created_by_user_id INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS training_participants (
  id INTEGER PRIMARY KEY,
  training_id INTEGER,
  participant_name TEXT NOT NULL,
  participant_role TEXT NOT NULL,
  gender TEXT,
  teacher_uid TEXT,
  school_id INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS online_training_events (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  online_teachers_trained INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS legacy_assessment_records (
  id INTEGER PRIMARY KEY,
  school_name TEXT,
  district TEXT,
  learners_assessed INTEGER NOT NULL DEFAULT 0,
  stories_published INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assessment_sessions (
  id INTEGER PRIMARY KEY,
  session_uid TEXT NOT NULL UNIQUE,
  portal_record_id INTEGER,
  school_id INTEGER NOT NULL REFERENCES schools_directory(id) ON DELETE CASCADE,
  assessment_date DATE NOT NULL,
  assessment_type TEXT NOT NULL,
  class_grade TEXT NOT NULL,
  tool_version TEXT NOT NULL DEFAULT 'EGRA-v1',
  assessor_user_id INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  model_version TEXT,
  benchmark_version TEXT,
  scoring_profile_version TEXT
);

CREATE TABLE IF NOT EXISTS assessment_session_results (
  id INTEGER PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES assessment_sessions(id) ON DELETE CASCADE,
  learner_uid TEXT,
  learner_name TEXT,
  gender TEXT,
  age INTEGER,
  result_json TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assessment_records (
  id INTEGER PRIMARY KEY,
  school_id INTEGER NOT NULL REFERENCES schools_directory(id) ON DELETE CASCADE,
  assessment_date DATE NOT NULL,
  assessment_type TEXT NOT NULL,
  class_grade TEXT,
  age INTEGER,
  learner_uid TEXT,
  letter_identification_score REAL,
  sound_identification_score REAL,
  decodable_words_score REAL,
  undecodable_words_score REAL,
  made_up_words_score REAL,
  story_reading_score REAL,
  fluency_accuracy_score REAL,
  reading_comprehension_score REAL,
  model_version TEXT,
  benchmark_version TEXT,
  scoring_profile_version TEXT,
  reading_stage_label TEXT,
  reading_stage_order INTEGER,
  benchmark_grade_level TEXT,
  expected_vs_actual_status TEXT,
  phonemic_awareness_mastery_status TEXT,
  grapheme_phoneme_correspondence_mastery_status TEXT,
  blending_decoding_mastery_status TEXT,
  word_recognition_fluency_mastery_status TEXT,
  sentence_paragraph_construction_mastery_status TEXT,
  comprehension_mastery_status TEXT,
  created_by_user_id INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS portal_records (
  id INTEGER PRIMARY KEY,
  module TEXT NOT NULL,
  school_id INTEGER,
  school_name TEXT,
  district TEXT,
  date DATE,
  status TEXT,
  program_type TEXT,
  payload_json TEXT NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contacts (
  id INTEGER PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS download_leads (
  id INTEGER PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id INTEGER PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
