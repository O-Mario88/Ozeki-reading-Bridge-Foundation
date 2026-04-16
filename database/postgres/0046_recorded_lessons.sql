CREATE TABLE IF NOT EXISTS recorded_lessons (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    teacher_name VARCHAR(150),
    class_level VARCHAR(50),
    phonics_level VARCHAR(50),
    category VARCHAR(50),
    google_meet_link VARCHAR(255),
    google_drive_file_id VARCHAR(255),
    google_drive_file_name VARCHAR(255),
    google_drive_folder_id VARCHAR(255),
    vimeo_video_id VARCHAR(50),
    vimeo_url VARCHAR(255),
    vimeo_embed_url TEXT,
    thumbnail_url TEXT,
    duration INTEGER,
    lesson_date TIMESTAMPTZ,
    scheduled_start_time TIMESTAMPTZ,
    scheduled_end_time TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'Scheduled',
    access_level VARCHAR(50) DEFAULT 'Registered Users Only', 
    is_published BOOLEAN DEFAULT false,
    published_at TIMESTAMPTZ,
    created_by INTEGER,
    reviewed_by INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lesson_resources (
    id SERIAL PRIMARY KEY,
    recorded_lesson_id INTEGER NOT NULL REFERENCES recorded_lessons(id) ON DELETE CASCADE,
    resource_title VARCHAR(255) NOT NULL,
    resource_type VARCHAR(50),
    file_url TEXT,
    google_drive_file_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recording_import_logs (
    id SERIAL PRIMARY KEY,
    recorded_lesson_id INTEGER REFERENCES recorded_lessons(id) ON DELETE CASCADE,
    google_drive_file_id VARCHAR(255),
    vimeo_video_id VARCHAR(50),
    action VARCHAR(100),
    status VARCHAR(50),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
