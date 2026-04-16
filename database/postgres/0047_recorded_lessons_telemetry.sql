-- Expanding recorded_lessons with newly defined metadata constraints
ALTER TABLE recorded_lessons 
ADD COLUMN IF NOT EXISTS lesson_code VARCHAR(100) UNIQUE,
ADD COLUMN IF NOT EXISTS sub_category VARCHAR(100),
ADD COLUMN IF NOT EXISTS tags_json TEXT DEFAULT '[]',
ADD COLUMN IF NOT EXISTS google_calendar_event_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS google_meet_conference_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS actual_start_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS actual_end_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS auto_import_from_drive BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS auto_upload_to_vimeo BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS auto_publish BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS requires_review BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS certificate_eligible BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS quiz_required BOOLEAN DEFAULT false;

-- Table: automation_logs
CREATE TABLE IF NOT EXISTS automation_logs (
    id SERIAL PRIMARY KEY,
    recorded_lesson_id INTEGER REFERENCES recorded_lessons(id) ON DELETE CASCADE,
    action VARCHAR(100),
    status VARCHAR(50),
    error_message TEXT,
    payload_json TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: lesson_attendance
CREATE TABLE IF NOT EXISTS lesson_attendance (
    id SERIAL PRIMARY KEY,
    recorded_lesson_id INTEGER REFERENCES recorded_lessons(id) ON DELETE CASCADE,
    user_id INTEGER,
    attendee_name VARCHAR(255),
    attendee_email VARCHAR(255),
    join_time TIMESTAMPTZ,
    leave_time TIMESTAMPTZ,
    duration_minutes INTEGER,
    attendance_percentage INTEGER,
    attended_live BOOLEAN DEFAULT false,
    attendance_source VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: lesson_view_sessions
CREATE TABLE IF NOT EXISTS lesson_view_sessions (
    id SERIAL PRIMARY KEY,
    recorded_lesson_id INTEGER REFERENCES recorded_lessons(id) ON DELETE CASCADE,
    user_id INTEGER,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    viewer_name VARCHAR(255),
    viewer_email VARCHAR(255),
    ip_hash VARCHAR(255),
    user_agent_hash VARCHAR(255),
    device_type VARCHAR(100),
    user_role VARCHAR(50),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    last_event_at TIMESTAMPTZ,
    watch_seconds INTEGER DEFAULT 0,
    current_position_seconds INTEGER DEFAULT 0,
    max_position_seconds INTEGER DEFAULT 0,
    percent_watched INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT false,
    is_rewatch BOOLEAN DEFAULT false,
    counted_as_view BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: lesson_view_events
CREATE TABLE IF NOT EXISTS lesson_view_events (
    id SERIAL PRIMARY KEY,
    view_session_id INTEGER REFERENCES lesson_view_sessions(id) ON DELETE CASCADE,
    recorded_lesson_id INTEGER REFERENCES recorded_lessons(id) ON DELETE CASCADE,
    user_id INTEGER,
    event_type VARCHAR(50), -- 'timeupdate', 'seeked', 'paused', 'played'
    video_position_seconds INTEGER,
    watch_seconds_delta INTEGER,
    event_metadata_json TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: lesson_view_summary (Aggregated views logic)
CREATE TABLE IF NOT EXISTS lesson_view_summary (
    id SERIAL PRIMARY KEY,
    recorded_lesson_id INTEGER UNIQUE REFERENCES recorded_lessons(id) ON DELETE CASCADE,
    total_views INTEGER DEFAULT 0,
    unique_viewers INTEGER DEFAULT 0,
    registered_viewers INTEGER DEFAULT 0,
    guest_views INTEGER DEFAULT 0,
    total_watch_seconds INTEGER DEFAULT 0,
    average_watch_seconds INTEGER DEFAULT 0,
    completion_rate INTEGER DEFAULT 0,
    rewatch_count INTEGER DEFAULT 0,
    last_viewed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: lesson_ratings
CREATE TABLE IF NOT EXISTS lesson_ratings (
    id SERIAL PRIMARY KEY,
    recorded_lesson_id INTEGER REFERENCES recorded_lessons(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL,
    overall_rating INTEGER CHECK (overall_rating BETWEEN 1 AND 5),
    clarity_rating INTEGER CHECK (clarity_rating BETWEEN 1 AND 5),
    pace_rating INTEGER CHECK (pace_rating BETWEEN 1 AND 5),
    usefulness_rating INTEGER CHECK (usefulness_rating BETWEEN 1 AND 5),
    audio_video_rating INTEGER CHECK (audio_video_rating BETWEEN 1 AND 5),
    most_useful_feedback TEXT,
    improvement_feedback TEXT,
    recommend_lesson BOOLEAN,
    suggested_next_topic TEXT,
    is_public BOOLEAN DEFAULT false,
    approved_by_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (recorded_lesson_id, user_id)
);

-- Table: lesson_quizzes
CREATE TABLE IF NOT EXISTS lesson_quizzes (
    id SERIAL PRIMARY KEY,
    recorded_lesson_id INTEGER REFERENCES recorded_lessons(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    is_required BOOLEAN DEFAULT false,
    pass_mark INTEGER DEFAULT 80,
    retakes_allowed BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: lesson_quiz_questions
CREATE TABLE IF NOT EXISTS lesson_quiz_questions (
    id SERIAL PRIMARY KEY,
    quiz_id INTEGER REFERENCES lesson_quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50), -- 'MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER'
    options_json TEXT,         -- ["A", "B", "C"]
    correct_answer TEXT,       
    marks INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: lesson_quiz_attempts
CREATE TABLE IF NOT EXISTS lesson_quiz_attempts (
    id SERIAL PRIMARY KEY,
    quiz_id INTEGER REFERENCES lesson_quizzes(id) ON DELETE CASCADE,
    recorded_lesson_id INTEGER REFERENCES recorded_lessons(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL,
    score INTEGER DEFAULT 0,
    passed BOOLEAN DEFAULT false,
    attempted_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Table: lesson_completion
CREATE TABLE IF NOT EXISTS lesson_completion (
    id SERIAL PRIMARY KEY,
    recorded_lesson_id INTEGER REFERENCES recorded_lessons(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL,
    attended_live BOOLEAN DEFAULT false,
    live_attendance_percentage INTEGER DEFAULT 0,
    watched_recording BOOLEAN DEFAULT false,
    recording_watch_percentage INTEGER DEFAULT 0,
    rating_submitted BOOLEAN DEFAULT false,
    quiz_completed BOOLEAN DEFAULT false,
    quiz_score INTEGER,
    certificate_eligible BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(recorded_lesson_id, user_id)
);
