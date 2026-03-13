CREATE TABLE IF NOT EXISTS training_feedback_entries (
  id INTEGER PRIMARY KEY,
  training_record_id INTEGER NOT NULL REFERENCES portal_records(id) ON DELETE CASCADE,
  school_id INTEGER NOT NULL REFERENCES schools_directory(id) ON DELETE CASCADE,
  contact_id INTEGER REFERENCES school_contacts(contact_id) ON DELETE SET NULL,
  trainer_user_id INTEGER REFERENCES portal_users(id) ON DELETE SET NULL,
  feedback_role TEXT NOT NULL CHECK(feedback_role IN ('participant', 'trainer')),
  what_went_well TEXT,
  how_training_changed_teaching TEXT,
  what_you_will_do_to_improve_reading_levels TEXT,
  challenges TEXT,
  recommendations_next_training TEXT,
  role_snapshot TEXT,
  gender_snapshot TEXT,
  class_taught_snapshot TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_training_feedback_entries_training
  ON training_feedback_entries(training_record_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_training_feedback_entries_school
  ON training_feedback_entries(school_id, submitted_at DESC);

CREATE TABLE IF NOT EXISTS portal_testimonials (
  id INTEGER PRIMARY KEY,
  storyteller_name TEXT NOT NULL,
  storyteller_role TEXT NOT NULL,
  school_id INTEGER REFERENCES schools_directory(id) ON DELETE SET NULL,
  school_name TEXT NOT NULL,
  district TEXT NOT NULL,
  story_text TEXT NOT NULL,
  video_source_type TEXT NOT NULL DEFAULT 'upload' CHECK(video_source_type IN ('upload', 'youtube')),
  video_file_name TEXT NOT NULL,
  video_stored_path TEXT NOT NULL,
  video_mime_type TEXT NOT NULL,
  video_size_bytes INTEGER NOT NULL,
  youtube_video_id TEXT,
  youtube_video_title TEXT,
  youtube_channel_title TEXT,
  youtube_thumbnail_url TEXT,
  youtube_embed_url TEXT,
  youtube_watch_url TEXT,
  photo_file_name TEXT,
  photo_stored_path TEXT,
  photo_mime_type TEXT,
  photo_size_bytes INTEGER,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  moderation_status TEXT NOT NULL DEFAULT 'approved',
  source_type TEXT NOT NULL DEFAULT 'manual',
  source_training_feedback_id INTEGER REFERENCES training_feedback_entries(id) ON DELETE SET NULL,
  source_training_record_id INTEGER REFERENCES portal_records(id) ON DELETE SET NULL,
  quote_field TEXT,
  created_by_user_id INTEGER NOT NULL REFERENCES portal_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sub_county TEXT NOT NULL DEFAULT '',
  parish TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_portal_testimonials_created_at
  ON portal_testimonials(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_portal_testimonials_published
  ON portal_testimonials(is_published);
CREATE INDEX IF NOT EXISTS idx_portal_testimonials_school_id
  ON portal_testimonials(school_id);
CREATE INDEX IF NOT EXISTS idx_portal_testimonials_district
  ON portal_testimonials(district);
CREATE INDEX IF NOT EXISTS idx_portal_testimonials_training_record
  ON portal_testimonials(source_training_record_id);

CREATE TABLE IF NOT EXISTS story_activity_participants (
  id INTEGER PRIMARY KEY,
  story_activity_id INTEGER NOT NULL REFERENCES story_activities(id) ON DELETE CASCADE,
  school_id INTEGER NOT NULL REFERENCES schools_directory(id) ON DELETE CASCADE,
  contact_id INTEGER NOT NULL REFERENCES school_contacts(contact_id) ON DELETE CASCADE,
  role_at_time TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_story_activity_participants_story
  ON story_activity_participants(story_activity_id);
CREATE INDEX IF NOT EXISTS idx_story_activity_participants_contact
  ON story_activity_participants(contact_id);

CREATE TABLE IF NOT EXISTS story_activity_learners (
  id INTEGER PRIMARY KEY,
  story_activity_id INTEGER NOT NULL REFERENCES story_activities(id) ON DELETE CASCADE,
  school_id INTEGER NOT NULL REFERENCES schools_directory(id) ON DELETE CASCADE,
  learner_id INTEGER NOT NULL REFERENCES school_learners(learner_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_story_activity_learners_story
  ON story_activity_learners(story_activity_id);
CREATE INDEX IF NOT EXISTS idx_story_activity_learners_learner
  ON story_activity_learners(learner_id);

CREATE TABLE IF NOT EXISTS activity_insights (
  insights_id INTEGER PRIMARY KEY,
  activity_type TEXT NOT NULL CHECK(activity_type IN ('training', 'visit', 'assessment', 'lesson_evaluation', 'story_activity')),
  activity_id INTEGER NOT NULL,
  scope_type TEXT NOT NULL CHECK(scope_type IN ('school', 'district', 'region', 'subregion', 'country')),
  scope_id TEXT NOT NULL,
  key_findings TEXT,
  what_went_well TEXT,
  challenges TEXT,
  conclusions_next_steps TEXT,
  created_by_user_id INTEGER REFERENCES portal_users(id) ON DELETE SET NULL,
  finalized BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(activity_type, activity_id, scope_type, scope_id)
);
CREATE INDEX IF NOT EXISTS idx_activity_insights_activity
  ON activity_insights(activity_type, activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_insights_scope
  ON activity_insights(scope_type, scope_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS activity_recommendations (
  rec_link_id INTEGER PRIMARY KEY,
  insights_id INTEGER NOT NULL REFERENCES activity_insights(insights_id) ON DELETE CASCADE,
  rec_id TEXT NOT NULL,
  priority TEXT NOT NULL CHECK(priority IN ('high', 'medium', 'low')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(insights_id, rec_id)
);
CREATE INDEX IF NOT EXISTS idx_activity_recommendations_rec
  ON activity_recommendations(rec_id);

CREATE OR REPLACE VIEW school_insights_rollup AS
WITH scoped AS (
  SELECT
    ai.insights_id,
    ai.scope_id AS school_id,
    ai.key_findings,
    ai.conclusions_next_steps,
    ai.updated_at
  FROM activity_insights ai
  WHERE ai.scope_type = 'school'
),
latest AS (
  SELECT
    school_id,
    MAX(updated_at) AS last_updated
  FROM scoped
  GROUP BY school_id
),
latest_findings AS (
  SELECT
    s.school_id,
    string_agg(TRIM(COALESCE(s.key_findings, '')), ', ' ORDER BY s.insights_id) AS latest_findings
  FROM scoped s
  JOIN latest l
    ON l.school_id = s.school_id
   AND l.last_updated = s.updated_at
  GROUP BY s.school_id
),
actions AS (
  SELECT
    grouped.school_id,
    string_agg(grouped.rec_id, ', ' ORDER BY grouped.rec_id) AS recommendation_ids,
    string_agg(grouped.action_text, ', ' ORDER BY grouped.action_text) AS open_actions
  FROM (
    SELECT DISTINCT
      ai.scope_id AS school_id,
      ar.rec_id,
      (
        ar.rec_id || ':' || ar.priority ||
        CASE
          WHEN COALESCE(TRIM(ar.notes), '') != '' THEN ' (' || TRIM(ar.notes) || ')'
          ELSE ''
        END
      ) AS action_text
    FROM activity_insights ai
    LEFT JOIN activity_recommendations ar ON ar.insights_id = ai.insights_id
    WHERE ai.scope_type = 'school'
      AND ar.rec_id IS NOT NULL
  ) grouped
  GROUP BY grouped.school_id
)
SELECT
  CAST(l.school_id AS INTEGER) AS school_id,
  l.last_updated,
  COALESCE(lf.latest_findings, '') AS latest_findings,
  COALESCE(a.open_actions, '') AS open_actions,
  COALESCE(a.recommendation_ids, '') AS recommendation_ids
FROM latest l
LEFT JOIN latest_findings lf ON lf.school_id = l.school_id
LEFT JOIN actions a ON a.school_id = l.school_id;
