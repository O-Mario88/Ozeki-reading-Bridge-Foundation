CREATE TABLE IF NOT EXISTS portal_impact_gallery (
    id SERIAL PRIMARY KEY,
    image_url TEXT NOT NULL,
    quote_text TEXT NOT NULL,
    person_name TEXT NOT NULL,
    person_role TEXT NOT NULL,
    activity_type TEXT NOT NULL,
    district TEXT NOT NULL,
    region TEXT NOT NULL,
    recorded_year TEXT NOT NULL,
    file_name TEXT,
    size_bytes INT,
    mime_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    created_by_user_id INT REFERENCES portal_users(id) ON DELETE SET NULL
);
