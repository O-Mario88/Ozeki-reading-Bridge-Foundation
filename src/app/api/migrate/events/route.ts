import { NextResponse } from "next/server";
import { queryPostgres } from "@/lib/server/postgres/client";
import { requireAdminToken } from "@/lib/server/http/admin-auth";

export async function GET(request: Request) {
  const authError = requireAdminToken(request);
  if (authError) return authError;

  try {
    await queryPostgres('BEGIN');

    console.log(">> Initiating Phase 6 Master DB Migration...");

    // 1. Unified Training Events Table
    await queryPostgres(`
      CREATE TABLE IF NOT EXISTS training_events (
        id SERIAL PRIMARY KEY,
        event_code VARCHAR(100) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        level VARCHAR(100),
        target_audience TEXT,
        delivery_type VARCHAR(100) NOT NULL, -- 'Online Live Session' or 'In-Person Training'
        funding_type VARCHAR(100) NOT NULL, -- 'Sponsored Training', 'Paid Training', 'Free Ozeki Event'
        sponsoring_partner VARCHAR(255),
        training_fee NUMERIC(12,2) DEFAULT 0,
        currency VARCHAR(10) DEFAULT 'UGX',
        event_date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        registration_deadline DATE,
        max_participants INTEGER,
        certificate_eligible BOOLEAN DEFAULT false,
        feedback_required BOOLEAN DEFAULT false,
        assessment_required BOOLEAN DEFAULT false,
        event_banner_url TEXT,
        status VARCHAR(50) DEFAULT 'Draft',
        
        -- Online Specific Metadata
        google_meet_url TEXT,
        google_calendar_event_id TEXT,
        google_meet_organizer TEXT,
        auto_record_expected BOOLEAN DEFAULT false,
        
        -- In-Person Specific Metadata
        venue_name VARCHAR(255),
        venue_address TEXT,
        district VARCHAR(100),
        sub_county VARCHAR(100),
        parish VARCHAR(100),
        max_schools INTEGER,
        max_teachers_per_school INTEGER,
        
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log(">> ✅ Created training_events");

    // 2. Schools Directory (Expansion if missing)
    await queryPostgres(`
      CREATE TABLE IF NOT EXISTS schools_directory (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        school_type VARCHAR(100),
        ownership VARCHAR(100),
        emis_number VARCHAR(100),
        district VARCHAR(100),
        sub_county VARCHAR(100),
        parish VARCHAR(100),
        phone_number VARCHAR(50),
        email VARCHAR(255),
        head_teacher_name VARCHAR(255),
        head_teacher_phone VARCHAR(50),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 3. Teachers Directory
    await queryPostgres(`
      CREATE TABLE IF NOT EXISTS teachers_directory (
        id SERIAL PRIMARY KEY,
        school_id INTEGER REFERENCES schools_directory(id),
        full_name VARCHAR(255) NOT NULL,
        gender VARCHAR(50),
        phone_number VARCHAR(50),
        email VARCHAR(255),
        role VARCHAR(100),
        class_taught VARCHAR(100),
        subject_area VARCHAR(100),
        prior_phonics_training BOOLEAN DEFAULT false,
        accessibility_needs TEXT,
        consent_to_updates BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log(">> ✅ Created teachers_directory");

    // 4. Event Registrations (School Level)
    await queryPostgres(`
      CREATE TABLE IF NOT EXISTS event_registrations (
        id SERIAL PRIMARY KEY,
        event_id INTEGER REFERENCES training_events(id) ON DELETE CASCADE,
        school_id INTEGER REFERENCES schools_directory(id),
        registered_by_name VARCHAR(255),
        registered_by_phone VARCHAR(50),
        registration_status VARCHAR(50) DEFAULT 'Pending',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    
    // 5. Registration Teachers Linking
    await queryPostgres(`
      CREATE TABLE IF NOT EXISTS event_registration_teachers (
        id SERIAL PRIMARY KEY,
        registration_id INTEGER REFERENCES event_registrations(id) ON DELETE CASCADE,
        teacher_id INTEGER REFERENCES teachers_directory(id),
        event_id INTEGER REFERENCES training_events(id),
        attendance_status VARCHAR(50) DEFAULT 'Registered',
        check_in_time TIMESTAMPTZ,
        check_out_time TIMESTAMPTZ,
        walk_in BOOLEAN DEFAULT false,
        certificate_eligible BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    
    // 6. RECORDED LESSONS (LMS)
    await queryPostgres(`
      CREATE TABLE IF NOT EXISTS recorded_lessons (
        id SERIAL PRIMARY KEY,
        lesson_slug VARCHAR(255) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        teacher_id INTEGER REFERENCES teachers_directory(id),
        level VARCHAR(100),
        class_target VARCHAR(100),
        duration_seconds INTEGER,
        vimeo_video_id VARCHAR(100) NOT NULL,
        thumbnail_url TEXT,
        resources JSONB,
        average_rating NUMERIC(3,2) DEFAULT 0.00,
        total_views INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'Draft',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log(">> ✅ Created recorded_lessons mapping");

    // 7. LMS View Tracking (Vimeo Telemetry)
    await queryPostgres(`
      CREATE TABLE IF NOT EXISTS lesson_view_sessions (
        id SERIAL PRIMARY KEY,
        lesson_id INTEGER REFERENCES recorded_lessons(id),
        teacher_id INTEGER REFERENCES teachers_directory(id),
        session_start TIMESTAMPTZ DEFAULT NOW(),
        session_end TIMESTAMPTZ,
        watch_time_seconds INTEGER DEFAULT 0,
        max_position_seconds INTEGER DEFAULT 0,
        completed BOOLEAN DEFAULT false,
        device_type VARCHAR(100),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log(">> ✅ Created LMS Telemetry mapping");

    await queryPostgres('COMMIT');
    return NextResponse.json({ message: "Phase 6 Migration Completed (Events Schema)" });

  } catch (error) {
    await queryPostgres('ROLLBACK');
    console.error("Migration failed", error);
    return NextResponse.json({ message: "Migration Pipeline Error", error }, { status: 500 });
  }
}
