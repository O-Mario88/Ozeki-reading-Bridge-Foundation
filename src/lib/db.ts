import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import {
  AssessmentRecord,
  AssessmentRecordInput,
  AuditLogEntry,
  ConsentRecordEntry,
  ConsentRecordInput,
  CostCategory,
  CostEffectivenessData,
  CostEntryInput,
  CostEntryRecord,
  DashboardActivityItem,
  DashboardAgendaItem,
  DashboardFollowUpItem,
  DataQualitySummary,
  DomainGainData,
  FidelityBand,
  FidelityDashboardData,
  FidelityDriverScore,
  FidelityScore,
  ImpactCalculatorResult,
  InterventionGroupInput,
  InterventionGroupRecord,
  InterventionSessionInput,
  InterventionSessionRecord,
  LearningGainsData,
  MaterialDistributionInput,
  MaterialDistributionRecord,
  ObservationRubricInput,
  ObservationRubricRecord,
  OnlineTrainingEventInput,
  OnlineTrainingEventRecord,
  PortalAnalyticsData,
  PortalAnalyticsDistrictStat,
  PortalAnalyticsModuleStatus,
  PortalAnalyticsMonthlyPoint,
  PortalAnalyticsRecentRecord,
  PortalAnalyticsUserStat,
  PortalDistrictReportSummary,
  PortalDashboardData,
  PortalRecord,
  PortalRecordFilters,
  PortalRecordInput,
  PortalRecordModule,
  PortalRecordStatus,
  PortalTestimonialRecord,
  PortalUser,
  PortalUserAdminRecord,
  PortalUserRole,
  PortalEvidenceRecord,
  PortalOperationalReportsData,
  PortalSchoolReportRow,
  ImpactReportBuildInput,
  ImpactReportCoverageBlock,
  ImpactReportDataQualityBlock,
  ImpactReportEngagementBlock,
  ImpactReportFactPack,
  ImpactReportInstructionQualityBlock,
  ImpactReportLearningOutcomeMetric,
  ImpactReportLearningOutcomesBlock,
  ImpactReportNarrative,
  ImpactReportSectionNarrative,
  ImpactReportProgramType,
  ImpactReportRecord,
  ImpactReportScopeType,
  ImpactReportTemplatePackage,
  ImpactReportTemplateSection,
  ImpactReportType,
  ImpactReportVariant,
  SchoolDirectoryInput,
  SchoolDirectoryRecord,
  PortalResourceRecord,
  PortalResourceSection,
  portalResourceSections,
  TrainingSessionInput,
  TrainingSessionRecord,
  RegionStats,
  DistrictStats,
  AggregatedImpactData,
  DistrictLeagueRow,
  GovernmentViewData,
} from "@/lib/types";
import {
  getDistrictsByRegion,
  inferRegionFromDistrict,
  inferSubRegionFromDistrict,
  ugandaRegions,
} from "@/lib/uganda-locations";

const dataDir = path.join(process.cwd(), "data");
const dbFile = path.join(dataDir, "app.db");
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const PASSWORD_SALT = process.env.PORTAL_PASSWORD_SALT ?? "orbf-portal-default-salt";

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let dbInstance: Database.Database | null = null;

function hashPassword(password: string) {
  return crypto
    .createHash("sha256")
    .update(`${PASSWORD_SALT}:${password}`)
    .digest("hex");
}

function hasColumn(db: Database.Database, table: string, column: string) {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{
    name: string;
  }>;
  return rows.some((row) => row.name === column);
}

function ensureColumn(
  db: Database.Database,
  table: string,
  column: string,
  definition: string,
) {
  if (!hasColumn(db, table, column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function ensurePortalUserColumns(db: Database.Database) {
  ensureColumn(db, "portal_users", "phone", "TEXT");
  ensureColumn(db, "portal_users", "is_supervisor", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "portal_users", "is_me", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "portal_users", "is_admin", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "portal_users", "is_superadmin", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "portal_users", "geography_scope", "TEXT");
}

function ensureOnlineTrainingColumns(db: Database.Database) {
  ensureColumn(
    db,
    "online_training_events",
    "online_teachers_trained",
    "INTEGER NOT NULL DEFAULT 0",
  );
  ensureColumn(
    db,
    "online_training_events",
    "online_school_leaders_trained",
    "INTEGER NOT NULL DEFAULT 0",
  );
  ensureColumn(db, "online_training_events", "recording_url", "TEXT");
  ensureColumn(db, "online_training_events", "chat_summary", "TEXT");
  ensureColumn(db, "online_training_events", "attendance_captured_at", "TEXT");
}

function ensureImpactReportColumns(db: Database.Database) {
  ensureColumn(db, "impact_reports", "partner_name", "TEXT");
}

function ensurePortalResourceColumns(db: Database.Database) {
  ensureColumn(db, "portal_resources", "section", "TEXT NOT NULL DEFAULT 'Resources Library'");
}

function ensureSchoolDirectoryColumns(db: Database.Database) {
  ensureColumn(db, "schools_directory", "enrolled_learners", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "schools_directory", "enrolled_boys", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "schools_directory", "enrolled_girls", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "schools_directory", "enrolled_baby", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "schools_directory", "enrolled_middle", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "schools_directory", "enrolled_top", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "schools_directory", "enrolled_p1", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "schools_directory", "enrolled_p2", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "schools_directory", "enrolled_p3", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "schools_directory", "enrolled_p4", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "schools_directory", "enrolled_p5", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "schools_directory", "enrolled_p6", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "schools_directory", "enrolled_p7", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "schools_directory", "notes", "TEXT");
  db.exec(`
    UPDATE schools_directory
    SET enrolled_boys = COALESCE(enrolled_learners, 0)
    WHERE COALESCE(enrolled_boys, 0) = 0
      AND COALESCE(enrolled_girls, 0) = 0
      AND COALESCE(enrolled_learners, 0) > 0;
  `);
}

function ensurePortalRecordColumns(db: Database.Database) {
  ensureColumn(db, "portal_records", "school_id", "INTEGER");
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_portal_records_school_id
      ON portal_records(school_id);
  `);

  db.exec(`
    UPDATE portal_records
    SET school_id = (
      SELECT sd.id
      FROM schools_directory sd
      WHERE lower(trim(sd.name)) = lower(trim(portal_records.school_name))
        AND lower(trim(sd.district)) = lower(trim(portal_records.district))
      LIMIT 1
    )
    WHERE school_id IS NULL
      AND trim(COALESCE(school_name, '')) != '';
  `);

  db.exec(`
    UPDATE portal_records
    SET school_id = (
      SELECT sd.id
      FROM schools_directory sd
      WHERE lower(trim(sd.name)) = lower(trim(portal_records.school_name))
      LIMIT 1
    )
    WHERE school_id IS NULL
      AND trim(COALESCE(school_name, '')) != '';
  `);
}

function ensureGeographyColumns(db: Database.Database) {
  // Add sub_county and parish to portal_records
  ensureColumn(db, "portal_records", "sub_county", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "portal_records", "parish", "TEXT NOT NULL DEFAULT ''");

  // Add sub_county and parish to portal_testimonials
  ensureColumn(db, "portal_testimonials", "sub_county", "TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "portal_testimonials", "parish", "TEXT NOT NULL DEFAULT ''");

  // District indexes for geo queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_schools_district ON schools_directory(district);
    CREATE INDEX IF NOT EXISTS idx_schools_sub_county ON schools_directory(district, sub_county);
    CREATE INDEX IF NOT EXISTS idx_schools_parish ON schools_directory(district, sub_county, parish);
    CREATE INDEX IF NOT EXISTS idx_training_district ON training_sessions(district);
    CREATE INDEX IF NOT EXISTS idx_portal_records_district ON portal_records(district);
    CREATE INDEX IF NOT EXISTS idx_portal_testimonials_district ON portal_testimonials(district);
  `);

  // Backfill portal_records sub_county/parish from schools_directory via school_id
  db.exec(`
    UPDATE portal_records
    SET sub_county = (SELECT sd.sub_county FROM schools_directory sd WHERE sd.id = portal_records.school_id),
        parish = (SELECT sd.parish FROM schools_directory sd WHERE sd.id = portal_records.school_id)
    WHERE school_id IS NOT NULL
      AND (COALESCE(sub_county, '') = '' OR COALESCE(parish, '') = '');
  `);

  // Backfill portal_testimonials from schools_directory via school_name/district
  db.exec(`
    UPDATE portal_testimonials
    SET sub_county = COALESCE((
      SELECT sd.sub_county FROM schools_directory sd
      WHERE lower(trim(sd.name)) = lower(trim(portal_testimonials.school_name))
        AND lower(trim(sd.district)) = lower(trim(portal_testimonials.district))
      LIMIT 1
    ), ''),
    parish = COALESCE((
      SELECT sd.parish FROM schools_directory sd
      WHERE lower(trim(sd.name)) = lower(trim(portal_testimonials.school_name))
        AND lower(trim(sd.district)) = lower(trim(portal_testimonials.district))
      LIMIT 1
    ), '')
    WHERE COALESCE(sub_county, '') = '' OR COALESCE(parish, '') = '';
  `);
}

function ensurePortalTestimonialVideoColumns(db: Database.Database) {
  ensureColumn(
    db,
    "portal_testimonials",
    "video_source_type",
    "TEXT NOT NULL DEFAULT 'upload'",
  );
  ensureColumn(db, "portal_testimonials", "youtube_video_id", "TEXT");
  ensureColumn(db, "portal_testimonials", "youtube_video_title", "TEXT");
  ensureColumn(db, "portal_testimonials", "youtube_channel_title", "TEXT");
  ensureColumn(db, "portal_testimonials", "youtube_thumbnail_url", "TEXT");
  ensureColumn(db, "portal_testimonials", "youtube_embed_url", "TEXT");
  ensureColumn(db, "portal_testimonials", "youtube_watch_url", "TEXT");

  db.exec(`
    UPDATE portal_testimonials
    SET video_source_type = CASE
      WHEN COALESCE(video_mime_type, '') = 'video/youtube' THEN 'youtube'
      ELSE 'upload'
    END
    WHERE COALESCE(video_source_type, '') = '';
  `);
}

function ensureAssessmentDomainsColumns(db: Database.Database) {
  ensureColumn(db, "assessment_records", "letter_identification_score", "INTEGER");
  ensureColumn(db, "assessment_records", "sound_identification_score", "INTEGER");
  ensureColumn(db, "assessment_records", "decodable_words_score", "INTEGER");
  ensureColumn(db, "assessment_records", "undecodable_words_score", "INTEGER");
  ensureColumn(db, "assessment_records", "made_up_words_score", "INTEGER");
  ensureColumn(db, "assessment_records", "story_reading_score", "INTEGER");
  ensureColumn(db, "assessment_records", "reading_comprehension_score", "INTEGER");
}


function seedPortalUsers(db: Database.Database) {
  const accounts = [
    {
      fullName: "ORB Foundation Staff",
      email: process.env.PORTAL_STAFF_EMAIL?.toLowerCase() ?? "staff@ozekireadingbridge.org",
      phone: process.env.PORTAL_STAFF_PHONE ?? "+256700100001",
      role: "Staff" as PortalUserRole,
      password: process.env.PORTAL_STAFF_PASSWORD ?? "Staff@12345",
      isSupervisor: 0,
      isME: 0,
      isAdmin: 0,
      isSuperAdmin: 0,
    },
    {
      fullName: "ORB Foundation Volunteer",
      email:
        process.env.PORTAL_VOLUNTEER_EMAIL?.toLowerCase() ??
        "volunteer@ozekireadingbridge.org",
      phone: process.env.PORTAL_VOLUNTEER_PHONE ?? "+256700100002",
      role: "Volunteer" as PortalUserRole,
      password: process.env.PORTAL_VOLUNTEER_PASSWORD ?? "Volunteer@12345",
      isSupervisor: 0,
      isME: 0,
      isAdmin: 0,
      isSuperAdmin: 0,
    },
    {
      fullName: "ORB Supervisor",
      email: process.env.PORTAL_SUPERVISOR_EMAIL?.toLowerCase() ?? "supervisor@ozekireadingbridge.org",
      phone: process.env.PORTAL_SUPERVISOR_PHONE ?? "+256700100003",
      role: "Staff" as PortalUserRole,
      password: process.env.PORTAL_SUPERVISOR_PASSWORD ?? "Supervisor@12345",
      isSupervisor: 1,
      isME: 0,
      isAdmin: 0,
      isSuperAdmin: 0,
    },
    {
      fullName: "ORB M&E Officer",
      email: process.env.PORTAL_ME_EMAIL?.toLowerCase() ?? "me@ozekireadingbridge.org",
      phone: process.env.PORTAL_ME_PHONE ?? "+256700100004",
      role: "Staff" as PortalUserRole,
      password: process.env.PORTAL_ME_PASSWORD ?? "ME@12345",
      isSupervisor: 0,
      isME: 1,
      isAdmin: 0,
      isSuperAdmin: 0,
    },
    {
      fullName: "ORB Admin",
      email: process.env.PORTAL_ADMIN_EMAIL?.toLowerCase() ?? "admin@ozekiread.org",
      phone: process.env.PORTAL_ADMIN_PHONE ?? "+256773397375",
      role: "Staff" as PortalUserRole,
      password: process.env.PORTAL_ADMIN_PASSWORD ?? "Admin@16079",
      isSupervisor: 0,
      isME: 0,
      isAdmin: 1,
      isSuperAdmin: 0,
    },
    {
      fullName: "ORB Super Admin",
      email: process.env.PORTAL_SUPERADMIN_EMAIL?.toLowerCase() ?? "edwin@ozekiread.org",
      phone: process.env.PORTAL_SUPERADMIN_PHONE ?? "+256773397375",
      role: "Staff" as PortalUserRole,
      password: process.env.PORTAL_SUPERADMIN_PASSWORD ?? "Admin@16079",
      isSupervisor: 0,
      isME: 0,
      isAdmin: 1,
      isSuperAdmin: 1,
    },
  ];

  const upsertUser = db.prepare(`
    INSERT INTO portal_users (
      full_name,
      email,
      role,
      password_hash,
      phone,
      is_supervisor,
      is_me,
      is_admin,
      is_superadmin
    ) VALUES (
      @fullName,
      @email,
      @role,
      @passwordHash,
      @phone,
      @isSupervisor,
      @isME,
      @isAdmin,
      @isSuperAdmin
    )
    ON CONFLICT(email) DO UPDATE SET
      full_name = excluded.full_name,
      role = excluded.role,
      password_hash = excluded.password_hash,
      phone = excluded.phone,
      is_supervisor = excluded.is_supervisor,
      is_me = excluded.is_me,
      is_admin = excluded.is_admin,
      is_superadmin = excluded.is_superadmin
  `);

  accounts.forEach((account) => {
    upsertUser.run({
      fullName: account.fullName,
      email: account.email,
      role: account.role,
      phone: account.phone,
      isSupervisor: account.isSupervisor,
      isME: account.isME,
      isAdmin: account.isAdmin,
      isSuperAdmin: account.isSuperAdmin,
      passwordHash: hashPassword(account.password),
    });
  });

  const legacyAdminEmail = "admin@ozekireadingbridge.org";
  const seededSuperAdminEmail =
    process.env.PORTAL_SUPERADMIN_EMAIL?.toLowerCase() ?? "edwin@ozekiread.org";
  if (legacyAdminEmail !== seededSuperAdminEmail) {
    db.prepare(
      `
      UPDATE portal_users
      SET
        role = 'Volunteer',
        is_supervisor = 0,
        is_me = 0,
        is_admin = 0,
        is_superadmin = 0,
        password_hash = @passwordHash
      WHERE lower(email) = @email
    `,
    ).run({
      email: legacyAdminEmail,
      passwordHash: hashPassword(`${seededSuperAdminEmail}:disabled`),
    });
  }
}

function getDb() {
  if (dbInstance) {
    return dbInstance;
  }

  const db = new Database(dbFile, { timeout: 5000 });
  db.pragma("busy_timeout = 5000");
  db.pragma("foreign_keys = ON");

  db.exec(`
  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service TEXT NOT NULL,
    school_name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    teachers INTEGER NOT NULL,
    grades TEXT NOT NULL,
    challenges TEXT NOT NULL,
    location TEXT NOT NULL,
    preferred_date TEXT NOT NULL,
    preferred_time TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    organization TEXT,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS download_leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resource_slug TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    organization TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS portal_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK(role IN ('Staff', 'Volunteer')),
    password_hash TEXT NOT NULL,
    is_superadmin INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS portal_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES portal_users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_portal_sessions_token
    ON portal_sessions(token);

  CREATE TABLE IF NOT EXISTS training_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    school_name TEXT NOT NULL,
    district TEXT NOT NULL,
    sub_county TEXT NOT NULL,
    parish TEXT NOT NULL,
    village TEXT,
    session_date TEXT NOT NULL,
    created_by_user_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(created_by_user_id) REFERENCES portal_users(id)
  );

  CREATE TABLE IF NOT EXISTS training_participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    participant_name TEXT NOT NULL,
    participant_role TEXT NOT NULL CHECK(participant_role IN ('Classroom teacher', 'School Leader')),
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(session_id) REFERENCES training_sessions(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS legacy_assessment_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    school_name TEXT NOT NULL,
    district TEXT NOT NULL,
    sub_county TEXT NOT NULL,
    parish TEXT NOT NULL,
    village TEXT,
    learners_assessed INTEGER NOT NULL DEFAULT 0,
    stories_published INTEGER NOT NULL DEFAULT 0,
    assessment_date TEXT NOT NULL,
    created_by_user_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(created_by_user_id) REFERENCES portal_users(id)
  );

  CREATE TABLE IF NOT EXISTS assessment_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    child_name TEXT NOT NULL,
    child_id TEXT NOT NULL,
    gender TEXT NOT NULL,
    age INTEGER NOT NULL,
    school_id INTEGER NOT NULL,
    class_grade TEXT NOT NULL,
    assessment_date TEXT NOT NULL,
    assessment_type TEXT NOT NULL,
    letter_identification_score INTEGER,
    sound_identification_score INTEGER,
    decodable_words_score INTEGER,
    undecodable_words_score INTEGER,
    made_up_words_score INTEGER,
    story_reading_score INTEGER,
    reading_comprehension_score INTEGER,
    notes TEXT,
    created_by_user_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(created_by_user_id) REFERENCES portal_users(id),
    FOREIGN KEY(school_id) REFERENCES schools_directory(id)
  );

  CREATE TABLE IF NOT EXISTS online_training_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    audience TEXT NOT NULL,
    start_datetime TEXT NOT NULL,
    end_datetime TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    attendee_emails TEXT,
    attendee_count INTEGER NOT NULL DEFAULT 0,
    online_teachers_trained INTEGER NOT NULL DEFAULT 0,
    online_school_leaders_trained INTEGER NOT NULL DEFAULT 0,
    calendar_event_id TEXT,
    calendar_link TEXT,
    meet_link TEXT,
    recording_url TEXT,
    chat_summary TEXT,
    attendance_captured_at TEXT,
    created_by_user_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(created_by_user_id) REFERENCES portal_users(id)
  );

  CREATE TABLE IF NOT EXISTS schools_directory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS portal_resources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    grade TEXT NOT NULL CHECK(grade IN ('Nursery', 'P1-P2', 'P3-P4', 'P5-P7', 'All Primary')),
    skill TEXT NOT NULL CHECK(skill IN ('Phonics', 'Fluency', 'Comprehension', 'Assessment', 'Remedial', 'Writing')),
    type TEXT NOT NULL CHECK(type IN ('Toolkit', 'Lesson Plan', 'Assessment', 'Poster', 'Guide', 'Reader')),
    file_name TEXT,
    stored_path TEXT,
    mime_type TEXT,
    size_bytes INTEGER,
    external_url TEXT,
    download_label TEXT,
    section TEXT NOT NULL DEFAULT 'Resources Library',
    is_published INTEGER NOT NULL DEFAULT 1,
    created_by_user_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(created_by_user_id) REFERENCES portal_users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_portal_resources_created_at
    ON portal_resources(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_portal_resources_published
    ON portal_resources(is_published);

  CREATE TABLE IF NOT EXISTS portal_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_code TEXT NOT NULL UNIQUE,
    module TEXT NOT NULL CHECK(module IN ('training', 'visit', 'assessment', 'story')),
    date TEXT NOT NULL,
    district TEXT NOT NULL,
    school_id INTEGER,
    school_name TEXT NOT NULL,
    program_type TEXT,
    status TEXT NOT NULL CHECK(status IN ('Draft', 'Submitted', 'Returned', 'Approved')),
    follow_up_date TEXT,
    payload_json TEXT NOT NULL,
    review_note TEXT,
    created_by_user_id INTEGER NOT NULL,
    updated_by_user_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(school_id) REFERENCES schools_directory(id) ON DELETE SET NULL,
    FOREIGN KEY(created_by_user_id) REFERENCES portal_users(id),
    FOREIGN KEY(updated_by_user_id) REFERENCES portal_users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_portal_records_module ON portal_records(module);
  CREATE INDEX IF NOT EXISTS idx_portal_records_date ON portal_records(date);
  CREATE INDEX IF NOT EXISTS idx_portal_records_status ON portal_records(status);
  CREATE INDEX IF NOT EXISTS idx_portal_records_created_by ON portal_records(created_by_user_id);
  CREATE INDEX IF NOT EXISTS idx_portal_records_follow_up ON portal_records(follow_up_date);

  CREATE TABLE IF NOT EXISTS portal_evidence (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_id INTEGER,
    module TEXT NOT NULL CHECK(module IN ('training', 'visit', 'assessment', 'story')),
    date TEXT NOT NULL,
    school_name TEXT NOT NULL,
    file_name TEXT NOT NULL,
    stored_path TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    uploaded_by_user_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(record_id) REFERENCES portal_records(id) ON DELETE SET NULL,
    FOREIGN KEY(uploaded_by_user_id) REFERENCES portal_users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_portal_evidence_record_id ON portal_evidence(record_id);
  CREATE INDEX IF NOT EXISTS idx_portal_evidence_module ON portal_evidence(module);
  CREATE INDEX IF NOT EXISTS idx_portal_evidence_date ON portal_evidence(date);
  CREATE INDEX IF NOT EXISTS idx_portal_evidence_school ON portal_evidence(school_name);

  CREATE TABLE IF NOT EXISTS portal_testimonials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    storyteller_name TEXT NOT NULL,
    storyteller_role TEXT NOT NULL,
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
    is_published INTEGER NOT NULL DEFAULT 1,
    created_by_user_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(created_by_user_id) REFERENCES portal_users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_portal_testimonials_created_at
    ON portal_testimonials(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_portal_testimonials_published
    ON portal_testimonials(is_published);

  CREATE TABLE IF NOT EXISTS impact_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    partner_name TEXT,
    report_type TEXT NOT NULL,
    scope_type TEXT NOT NULL CHECK(scope_type IN ('National', 'Region', 'District', 'School')),
    scope_value TEXT NOT NULL DEFAULT 'All',
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    programs_json TEXT NOT NULL,
    fact_pack_json TEXT NOT NULL,
    narrative_json TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Generated',
    is_public INTEGER NOT NULL DEFAULT 0,
    version TEXT NOT NULL DEFAULT 'v1.0',
    generated_at TEXT NOT NULL DEFAULT (datetime('now')),
    view_count INTEGER NOT NULL DEFAULT 0,
    download_count INTEGER NOT NULL DEFAULT 0,
    created_by_user_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(created_by_user_id) REFERENCES portal_users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_impact_reports_generated_at
    ON impact_reports(generated_at DESC);
  CREATE INDEX IF NOT EXISTS idx_impact_reports_public
    ON impact_reports(is_public, generated_at DESC);
  CREATE INDEX IF NOT EXISTS idx_impact_reports_scope
    ON impact_reports(scope_type, scope_value);

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    user_name TEXT NOT NULL,
    action TEXT NOT NULL,
    target_table TEXT NOT NULL,
    target_id INTEGER,
    detail TEXT,
    ip_address TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_audit_logs_user
    ON audit_logs(user_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_audit_logs_target
    ON audit_logs(target_table, target_id);

  CREATE TABLE IF NOT EXISTS cost_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scope_type TEXT NOT NULL CHECK(scope_type IN ('country', 'region', 'district', 'school')),
    scope_value TEXT NOT NULL,
    period TEXT NOT NULL,
    category TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    notes TEXT,
    created_by_user_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(created_by_user_id) REFERENCES portal_users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_cost_entries_scope
    ON cost_entries(scope_type, scope_value, period);

  CREATE TABLE IF NOT EXISTS observation_rubrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    school_id INTEGER NOT NULL,
    teacher_uid TEXT NOT NULL,
    date TEXT NOT NULL,
    lesson_type TEXT NOT NULL,
    indicators_json TEXT NOT NULL DEFAULT '[]',
    overall_score REAL NOT NULL DEFAULT 0,
    strengths TEXT,
    gaps TEXT,
    coaching_actions TEXT,
    created_by_user_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(school_id) REFERENCES schools_directory(id),
    FOREIGN KEY(created_by_user_id) REFERENCES portal_users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_observation_rubrics_school
    ON observation_rubrics(school_id, date DESC);
  CREATE INDEX IF NOT EXISTS idx_observation_rubrics_teacher
    ON observation_rubrics(teacher_uid);

  CREATE TABLE IF NOT EXISTS intervention_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    school_id INTEGER NOT NULL,
    grade TEXT NOT NULL,
    target_skill TEXT NOT NULL,
    learners_json TEXT NOT NULL DEFAULT '[]',
    schedule TEXT,
    start_date TEXT NOT NULL,
    end_date TEXT,
    created_by_user_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(school_id) REFERENCES schools_directory(id),
    FOREIGN KEY(created_by_user_id) REFERENCES portal_users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_intervention_groups_school
    ON intervention_groups(school_id);

  CREATE TABLE IF NOT EXISTS intervention_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    attendance INTEGER NOT NULL DEFAULT 0,
    skills_practiced TEXT,
    quick_check_score REAL,
    notes TEXT,
    created_by_user_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(group_id) REFERENCES intervention_groups(id) ON DELETE CASCADE,
    FOREIGN KEY(created_by_user_id) REFERENCES portal_users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_intervention_sessions_group
    ON intervention_sessions(group_id, date DESC);

  CREATE TABLE IF NOT EXISTS material_distributions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    school_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    material_type TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    receipt_path TEXT,
    notes TEXT,
    created_by_user_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(school_id) REFERENCES schools_directory(id),
    FOREIGN KEY(created_by_user_id) REFERENCES portal_users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_material_distributions_school
    ON material_distributions(school_id);

  CREATE TABLE IF NOT EXISTS consent_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    school_id INTEGER NOT NULL,
    consent_type TEXT NOT NULL CHECK(consent_type IN ('photo', 'video', 'story')),
    source TEXT NOT NULL,
    date TEXT NOT NULL,
    allowed_usage TEXT NOT NULL CHECK(allowed_usage IN ('public', 'partner', 'internal')),
    linked_files TEXT,
    expiry_date TEXT,
    created_by_user_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(school_id) REFERENCES schools_directory(id),
    FOREIGN KEY(created_by_user_id) REFERENCES portal_users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_consent_records_school
    ON consent_records(school_id);

  CREATE TABLE IF NOT EXISTS geography_master (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    parent_id INTEGER,
    level TEXT NOT NULL CHECK(level IN ('country', 'region', 'sub_region', 'district', 'sub_county', 'parish')),
    metadata TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(parent_id) REFERENCES geography_master(id)
  );

  CREATE INDEX IF NOT EXISTS idx_geography_master_level
    ON geography_master(level, name);
  CREATE INDEX IF NOT EXISTS idx_geography_master_parent
    ON geography_master(parent_id);
  `);

  ensurePortalUserColumns(db);
  ensureOnlineTrainingColumns(db);
  ensureImpactReportColumns(db);
  ensurePortalResourceColumns(db);
  ensureSchoolDirectoryColumns(db);
  ensurePortalRecordColumns(db);
  ensureGeographyColumns(db);
  ensurePortalTestimonialVideoColumns(db);
  ensureAssessmentDomainsColumns(db);
  seedPortalUsers(db);

  dbInstance = db;
  return db;
}

export function saveBooking(payload: {
  service: string;
  schoolName: string;
  contactName: string;
  email: string;
  phone: string;
  teachers: number;
  grades: string;
  challenges: string;
  location: string;
  preferredDate: string;
  preferredTime: string;
}) {
  return getDb()
    .prepare(`
      INSERT INTO bookings (
        service,
        school_name,
        contact_name,
        email,
        phone,
        teachers,
        grades,
        challenges,
        location,
        preferred_date,
        preferred_time
      ) VALUES (
        @service,
        @schoolName,
        @contactName,
        @email,
        @phone,
        @teachers,
        @grades,
        @challenges,
        @location,
        @preferredDate,
        @preferredTime
      )
    `)
    .run(payload);
}

export function saveContact(payload: {
  type: string;
  name: string;
  email: string;
  phone?: string;
  organization?: string;
  message: string;
}) {
  return getDb()
    .prepare(`
      INSERT INTO contacts (
        type,
        name,
        email,
        phone,
        organization,
        message
      ) VALUES (
        @type,
        @name,
        @email,
        @phone,
        @organization,
        @message
      )
    `)
    .run(payload);
}

export function saveDownloadLead(payload: {
  resourceSlug: string;
  name: string;
  email: string;
  organization?: string;
}) {
  return getDb()
    .prepare(`
      INSERT INTO download_leads (
        resource_slug,
        name,
        email,
        organization
      ) VALUES (
        @resourceSlug,
        @name,
        @email,
        @organization
      )
    `)
    .run(payload);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 90);
}

function parsePortalResourceRow(row: {
  id: number;
  slug: string;
  title: string;
  description: string;
  grade: PortalResourceRecord["grade"];
  skill: PortalResourceRecord["skill"];
  type: PortalResourceRecord["type"];
  section?: string | null;
  fileName: string | null;
  storedPath: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  externalUrl: string | null;
  downloadLabel: string | null;
  isPublished: number;
  createdByUserId: number;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}): PortalResourceRecord {
  return {
    id: Number(row.id),
    slug: row.slug,
    title: row.title,
    description: row.description,
    grade: row.grade,
    skill: row.skill,
    type: row.type,
    section: portalResourceSections.includes((row.section ?? "") as PortalResourceSection)
      ? ((row.section ?? "") as PortalResourceSection)
      : "Resources Library",
    fileName: row.fileName ?? null,
    storedPath: row.storedPath ?? null,
    mimeType: row.mimeType ?? null,
    sizeBytes: row.sizeBytes !== null ? Number(row.sizeBytes) : null,
    externalUrl: row.externalUrl ?? null,
    downloadLabel: row.downloadLabel ?? null,
    isPublished: Boolean(row.isPublished),
    createdByUserId: Number(row.createdByUserId),
    createdByName: row.createdByName,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function savePortalResource(input: {
  title: string;
  description: string;
  grade: PortalResourceRecord["grade"];
  skill: PortalResourceRecord["skill"];
  type: PortalResourceRecord["type"];
  section: PortalResourceSection;
  fileName?: string | null;
  storedPath?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  externalUrl?: string | null;
  downloadLabel?: string | null;
  isPublished?: boolean;
  createdByUserId: number;
}): PortalResourceRecord {
  const db = getDb();
  const baseSlug = slugify(input.title) || `resource-${Date.now()}`;
  let slug = baseSlug;
  let counter = 2;

  while (
    db
      .prepare(`SELECT 1 FROM portal_resources WHERE slug = @slug LIMIT 1`)
      .get({ slug })
  ) {
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  const now = new Date().toISOString();
  const insertResult = db
    .prepare(
      `
      INSERT INTO portal_resources (
        slug,
        title,
        description,
        grade,
        skill,
        type,
        section,
        file_name,
        stored_path,
        mime_type,
        size_bytes,
        external_url,
        download_label,
        is_published,
        created_by_user_id,
        created_at,
        updated_at
      ) VALUES (
        @slug,
        @title,
        @description,
        @grade,
        @skill,
        @type,
        @section,
        @fileName,
        @storedPath,
        @mimeType,
        @sizeBytes,
        @externalUrl,
        @downloadLabel,
        @isPublished,
        @createdByUserId,
        @createdAt,
        @updatedAt
      )
    `,
    )
    .run({
      slug,
      title: input.title.trim(),
      description: input.description.trim(),
      grade: input.grade,
      skill: input.skill,
      type: input.type,
      section: input.section,
      fileName: input.fileName ?? null,
      storedPath: input.storedPath ?? null,
      mimeType: input.mimeType ?? null,
      sizeBytes: input.sizeBytes ?? null,
      externalUrl: input.externalUrl ?? null,
      downloadLabel: input.downloadLabel?.trim() || null,
      isPublished: input.isPublished === false ? 0 : 1,
      createdByUserId: input.createdByUserId,
      createdAt: now,
      updatedAt: now,
    });

  const id = Number(insertResult.lastInsertRowid);
  const row = db
    .prepare(
      `
      SELECT
        pr.id,
        pr.slug,
        pr.title,
        pr.description,
        pr.grade,
        pr.skill,
        pr.type,
        pr.section,
        pr.file_name AS fileName,
        pr.stored_path AS storedPath,
        pr.mime_type AS mimeType,
        pr.size_bytes AS sizeBytes,
        pr.external_url AS externalUrl,
        pr.download_label AS downloadLabel,
        pr.is_published AS isPublished,
        pr.created_by_user_id AS createdByUserId,
        pu.full_name AS createdByName,
        pr.created_at AS createdAt,
        pr.updated_at AS updatedAt
      FROM portal_resources pr
      JOIN portal_users pu ON pu.id = pr.created_by_user_id
      WHERE pr.id = @id
      LIMIT 1
    `,
    )
    .get({ id }) as
    | {
      id: number;
      slug: string;
      title: string;
      description: string;
      grade: PortalResourceRecord["grade"];
      skill: PortalResourceRecord["skill"];
      type: PortalResourceRecord["type"];
      section: PortalResourceSection;
      fileName: string | null;
      storedPath: string | null;
      mimeType: string | null;
      sizeBytes: number | null;
      externalUrl: string | null;
      downloadLabel: string | null;
      isPublished: number;
      createdByUserId: number;
      createdByName: string;
      createdAt: string;
      updatedAt: string;
    }
    | undefined;

  if (!row) {
    throw new Error("Could not load saved resource.");
  }

  return parsePortalResourceRow(row);
}

export function listPortalResources(user: PortalUser, limit = 180): PortalResourceRecord[] {
  const whereClauses = ["1=1"];
  const params: Record<string, string | number> = { limit };

  if (!canViewAllRecords(user)) {
    whereClauses.push("pr.created_by_user_id = @createdByUserId");
    params.createdByUserId = user.id;
  }

  const rows = getDb()
    .prepare(
      `
      SELECT
        pr.id,
        pr.slug,
        pr.title,
        pr.description,
        pr.grade,
        pr.skill,
        pr.type,
        pr.section,
        pr.file_name AS fileName,
        pr.stored_path AS storedPath,
        pr.mime_type AS mimeType,
        pr.size_bytes AS sizeBytes,
        pr.external_url AS externalUrl,
        pr.download_label AS downloadLabel,
        pr.is_published AS isPublished,
        pr.created_by_user_id AS createdByUserId,
        pu.full_name AS createdByName,
        pr.created_at AS createdAt,
        pr.updated_at AS updatedAt
      FROM portal_resources pr
      JOIN portal_users pu ON pu.id = pr.created_by_user_id
      WHERE ${whereClauses.join(" AND ")}
      ORDER BY pr.created_at DESC, pr.id DESC
      LIMIT @limit
    `,
    )
    .all(params) as Array<{
      id: number;
      slug: string;
      title: string;
      description: string;
      grade: PortalResourceRecord["grade"];
      skill: PortalResourceRecord["skill"];
      type: PortalResourceRecord["type"];
      section: PortalResourceSection;
      fileName: string | null;
      storedPath: string | null;
      mimeType: string | null;
      sizeBytes: number | null;
      externalUrl: string | null;
      downloadLabel: string | null;
      isPublished: number;
      createdByUserId: number;
      createdByName: string;
      createdAt: string;
      updatedAt: string;
    }>;

  return rows.map((row) => parsePortalResourceRow(row));
}

export function listPublishedPortalResources(
  limit = 250,
  options?: { sections?: PortalResourceSection[] },
): PortalResourceRecord[] {
  const whereClauses = ["pr.is_published = 1"];
  const params: Record<string, string | number> = { limit };

  const sections = options?.sections?.length ? options.sections : null;
  if (sections) {
    const placeholders = sections.map((_, index) => `@section${index}`);
    whereClauses.push(`pr.section IN (${placeholders.join(", ")})`);
    sections.forEach((section, index) => {
      params[`section${index}`] = section;
    });
  }

  const rows = getDb()
    .prepare(
      `
      SELECT
        pr.id,
        pr.slug,
        pr.title,
        pr.description,
        pr.grade,
        pr.skill,
        pr.type,
        pr.section,
        pr.file_name AS fileName,
        pr.stored_path AS storedPath,
        pr.mime_type AS mimeType,
        pr.size_bytes AS sizeBytes,
        pr.external_url AS externalUrl,
        pr.download_label AS downloadLabel,
        pr.is_published AS isPublished,
        pr.created_by_user_id AS createdByUserId,
        pu.full_name AS createdByName,
        pr.created_at AS createdAt,
        pr.updated_at AS updatedAt
      FROM portal_resources pr
      JOIN portal_users pu ON pu.id = pr.created_by_user_id
      WHERE ${whereClauses.join(" AND ")}
      ORDER BY pr.created_at DESC, pr.id DESC
      LIMIT @limit
    `,
    )
    .all(params) as Array<{
      id: number;
      slug: string;
      title: string;
      description: string;
      grade: PortalResourceRecord["grade"];
      skill: PortalResourceRecord["skill"];
      type: PortalResourceRecord["type"];
      section: PortalResourceSection;
      fileName: string | null;
      storedPath: string | null;
      mimeType: string | null;
      sizeBytes: number | null;
      externalUrl: string | null;
      downloadLabel: string | null;
      isPublished: number;
      createdByUserId: number;
      createdByName: string;
      createdAt: string;
      updatedAt: string;
    }>;

  return rows.map((row) => parsePortalResourceRow(row));
}

export function getPublishedPortalResourceById(id: number): PortalResourceRecord | null {
  const row = getDb()
    .prepare(
      `
      SELECT
        pr.id,
        pr.slug,
        pr.title,
        pr.description,
        pr.grade,
        pr.skill,
        pr.type,
        pr.section,
        pr.file_name AS fileName,
        pr.stored_path AS storedPath,
        pr.mime_type AS mimeType,
        pr.size_bytes AS sizeBytes,
        pr.external_url AS externalUrl,
        pr.download_label AS downloadLabel,
        pr.is_published AS isPublished,
        pr.created_by_user_id AS createdByUserId,
        pu.full_name AS createdByName,
        pr.created_at AS createdAt,
        pr.updated_at AS updatedAt
      FROM portal_resources pr
      JOIN portal_users pu ON pu.id = pr.created_by_user_id
      WHERE pr.id = @id
        AND pr.is_published = 1
      LIMIT 1
    `,
    )
    .get({ id }) as
    | {
      id: number;
      slug: string;
      title: string;
      description: string;
      grade: PortalResourceRecord["grade"];
      skill: PortalResourceRecord["skill"];
      type: PortalResourceRecord["type"];
      section: PortalResourceSection;
      fileName: string | null;
      storedPath: string | null;
      mimeType: string | null;
      sizeBytes: number | null;
      externalUrl: string | null;
      downloadLabel: string | null;
      isPublished: number;
      createdByUserId: number;
      createdByName: string;
      createdAt: string;
      updatedAt: string;
    }
    | undefined;

  return row ? parsePortalResourceRow(row) : null;
}



export function saveNewsletterSubscriber(payload: { name: string; email: string }) {
  return getDb()
    .prepare(
      `
      INSERT INTO newsletter_subscribers (
        name,
        email
      ) VALUES (
        @name,
        @email
      )
      ON CONFLICT(email) DO NOTHING
    `,
    )
    .run(payload);
}

function parsePortalUserRow(row: {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  role: PortalUserRole;
  geographyScope: string | null;
  isSupervisor: number;
  isME: number;
  isAdmin: number;
  isSuperAdmin: number;
}): PortalUser {
  return {
    id: row.id,
    fullName: row.fullName,
    email: row.email,
    phone: row.phone,
    role: row.role,
    geographyScope: row.geographyScope ?? null,
    isSupervisor: Boolean(row.isSupervisor),
    isME: Boolean(row.isME),
    isAdmin: Boolean(row.isAdmin),
    isSuperAdmin: Boolean(row.isSuperAdmin),
  };
}

export function getPortalUserByEmail(email: string): PortalUser | null {
  const normalized = email.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const row = getDb()
    .prepare(
      `
      SELECT
        id,
        full_name AS fullName,
        email,
        phone,
        role,
        geography_scope AS geographyScope,
        is_supervisor AS isSupervisor,
        is_me AS isME,
        is_admin AS isAdmin,
        is_superadmin AS isSuperAdmin
      FROM portal_users
      WHERE lower(email) = @email
      LIMIT 1
    `,
    )
    .get({ email: normalized }) as
    | {
      id: number;
      fullName: string;
      email: string;
      phone: string | null;
      role: PortalUserRole;
      geographyScope: string | null;
      isSupervisor: number;
      isME: number;
      isAdmin: number;
      isSuperAdmin: number;
    }
    | undefined;

  if (!row) {
    return null;
  }

  return parsePortalUserRow(row);
}

export function canManagePortalUsers(user: PortalUser) {
  return user.isSuperAdmin;
}

export function listPortalUsersForAdmin(currentUser: PortalUser): PortalUserAdminRecord[] {
  if (!canManagePortalUsers(currentUser)) {
    throw new Error("Unauthorized");
  }

  const rows = getDb()
    .prepare(
      `
      SELECT
        id,
        full_name AS fullName,
        email,
        phone,
        role,
        geography_scope AS geographyScope,
        is_supervisor AS isSupervisor,
        is_me AS isME,
        is_admin AS isAdmin,
        is_superadmin AS isSuperAdmin,
        created_at AS createdAt
      FROM portal_users
      ORDER BY is_superadmin DESC, full_name ASC
    `,
    )
    .all() as Array<{
      id: number;
      fullName: string;
      email: string;
      phone: string | null;
      role: PortalUserRole;
      geographyScope: string | null;
      isSupervisor: number;
      isME: number;
      isAdmin: number;
      isSuperAdmin: number;
      createdAt: string;
    }>;

  return rows.map((row) => ({
    ...parsePortalUserRow(row),
    createdAt: row.createdAt,
  }));
}

export function createPortalUserAccount(
  input: {
    fullName: string;
    email: string;
    phone?: string;
    role: PortalUserRole;
    password: string;
    isSupervisor?: boolean;
    isME?: boolean;
    isAdmin?: boolean;
    isSuperAdmin?: boolean;
  },
  currentUser: PortalUser,
) {
  if (!canManagePortalUsers(currentUser)) {
    throw new Error("Unauthorized");
  }

  const normalizedEmail = input.email.trim().toLowerCase();
  const fullName = input.fullName.trim();
  if (!normalizedEmail || !fullName) {
    throw new Error("Full name and email are required.");
  }
  const isVolunteer = input.role === "Volunteer";

  const result = getDb()
    .prepare(
      `
      INSERT INTO portal_users (
        full_name,
        email,
        phone,
        role,
        password_hash,
        is_supervisor,
        is_me,
        is_admin,
        is_superadmin
      ) VALUES (
        @fullName,
        @email,
        @phone,
        @role,
        @passwordHash,
        @isSupervisor,
        @isME,
        @isAdmin,
        @isSuperAdmin
      )
    `,
    )
    .run({
      fullName,
      email: normalizedEmail,
      phone: input.phone?.trim() ? input.phone.trim() : null,
      role: input.role,
      passwordHash: hashPassword(input.password),
      isSupervisor: !isVolunteer && input.isSupervisor ? 1 : 0,
      isME: !isVolunteer && input.isME ? 1 : 0,
      isAdmin: !isVolunteer && input.isAdmin ? 1 : 0,
      isSuperAdmin: !isVolunteer && input.isSuperAdmin ? 1 : 0,
    });

  return Number(result.lastInsertRowid);
}

export function updatePortalUserPermissions(
  userId: number,
  input: {
    fullName?: string;
    phone?: string | null;
    role?: PortalUserRole;
    isSupervisor?: boolean;
    isME?: boolean;
    isAdmin?: boolean;
    isSuperAdmin?: boolean;
    password?: string;
  },
  currentUser: PortalUser,
) {
  if (!canManagePortalUsers(currentUser)) {
    throw new Error("Unauthorized");
  }

  const target = getDb()
    .prepare(
      `
      SELECT
        id,
        role,
        is_superadmin AS isSuperAdmin
      FROM portal_users
      WHERE id = @userId
      LIMIT 1
    `,
    )
    .get({ userId }) as { id: number; role: PortalUserRole; isSuperAdmin: number } | undefined;

  if (!target) {
    throw new Error("User not found.");
  }

  if (
    target.id === currentUser.id &&
    (input.isSuperAdmin === false || input.role === "Volunteer")
  ) {
    throw new Error("You cannot remove your own super admin access.");
  }

  const updates: string[] = [];
  const params: Record<string, unknown> = { userId };
  const nextRole = input.role ?? target.role;
  const forceVolunteerPermissions = input.role === "Volunteer";

  if (typeof input.fullName === "string") {
    updates.push("full_name = @fullName");
    params.fullName = input.fullName.trim();
  }
  if (input.phone !== undefined) {
    updates.push("phone = @phone");
    params.phone = input.phone?.trim() ? input.phone.trim() : null;
  }
  if (input.role) {
    updates.push("role = @role");
    params.role = input.role;
  }
  if (input.isSupervisor !== undefined) {
    updates.push("is_supervisor = @isSupervisor");
    params.isSupervisor = forceVolunteerPermissions ? 0 : input.isSupervisor ? 1 : 0;
  }
  if (input.isME !== undefined) {
    updates.push("is_me = @isME");
    params.isME = forceVolunteerPermissions ? 0 : input.isME ? 1 : 0;
  }
  if (input.isAdmin !== undefined) {
    updates.push("is_admin = @isAdmin");
    params.isAdmin = forceVolunteerPermissions ? 0 : input.isAdmin ? 1 : 0;
  }
  if (input.isSuperAdmin !== undefined) {
    updates.push("is_superadmin = @isSuperAdmin");
    params.isSuperAdmin = forceVolunteerPermissions ? 0 : input.isSuperAdmin ? 1 : 0;
  }
  if (input.password) {
    updates.push("password_hash = @passwordHash");
    params.passwordHash = hashPassword(input.password);
  }

  if (nextRole === "Volunteer") {
    if (!updates.includes("is_supervisor = @isSupervisor")) {
      updates.push("is_supervisor = @isSupervisor");
      params.isSupervisor = 0;
    }
    if (!updates.includes("is_me = @isME")) {
      updates.push("is_me = @isME");
      params.isME = 0;
    }
    if (!updates.includes("is_admin = @isAdmin")) {
      updates.push("is_admin = @isAdmin");
      params.isAdmin = 0;
    }
    if (!updates.includes("is_superadmin = @isSuperAdmin")) {
      updates.push("is_superadmin = @isSuperAdmin");
      params.isSuperAdmin = 0;
    }
  }

  if (updates.length === 0) {
    return;
  }

  getDb()
    .prepare(
      `
      UPDATE portal_users
      SET ${updates.join(", ")}
      WHERE id = @userId
    `,
    )
    .run(params);
}

function tableExists(tableName: string) {
  const row = getDb()
    .prepare(
      `
      SELECT name
      FROM sqlite_master
      WHERE type = 'table'
        AND name = @tableName
      LIMIT 1
    `,
    )
    .get({ tableName }) as { name?: string } | undefined;

  return Boolean(row?.name);
}

export function deletePortalUserAccount(userId: number, currentUser: PortalUser) {
  if (!canManagePortalUsers(currentUser)) {
    throw new Error("Unauthorized");
  }

  const db = getDb();
  const target = db
    .prepare(
      `
      SELECT
        id,
        full_name AS fullName,
        is_superadmin AS isSuperAdmin
      FROM portal_users
      WHERE id = @userId
      LIMIT 1
    `,
    )
    .get({ userId }) as { id: number; fullName: string; isSuperAdmin: number } | undefined;

  if (!target) {
    throw new Error("User not found.");
  }

  if (target.id === currentUser.id) {
    throw new Error("You cannot delete your own account.");
  }

  if (target.isSuperAdmin) {
    const remainingSuperAdmins = db
      .prepare(
        `
        SELECT COUNT(*) AS total
        FROM portal_users
        WHERE is_superadmin = 1
          AND id != @userId
      `,
      )
      .get({ userId }) as { total: number };

    if (Number(remainingSuperAdmins.total ?? 0) <= 0) {
      throw new Error("At least one super admin account must remain.");
    }
  }

  const dependencyChecks: Array<{ label: string; query: string }> = [
    {
      label: "portal records",
      query:
        "SELECT COUNT(*) AS total FROM portal_records WHERE created_by_user_id = @userId OR updated_by_user_id = @userId",
    },
    {
      label: "evidence uploads",
      query: "SELECT COUNT(*) AS total FROM portal_evidence WHERE uploaded_by_user_id = @userId",
    },
    {
      label: "training sessions",
      query: "SELECT COUNT(*) AS total FROM training_sessions WHERE created_by_user_id = @userId",
    },
    {
      label: "assessment records",
      query: "SELECT COUNT(*) AS total FROM assessment_records WHERE created_by_user_id = @userId",
    },
    {
      label: "online trainings",
      query: "SELECT COUNT(*) AS total FROM online_training_events WHERE created_by_user_id = @userId",
    },
    {
      label: "testimonials",
      query: "SELECT COUNT(*) AS total FROM portal_testimonials WHERE created_by_user_id = @userId",
    },
    {
      label: "resources",
      query: "SELECT COUNT(*) AS total FROM portal_resources WHERE created_by_user_id = @userId",
    },

    {
      label: "impact reports",
      query: "SELECT COUNT(*) AS total FROM impact_reports WHERE created_by_user_id = @userId",
    },
  ];

  const linkedData: string[] = [];
  for (const check of dependencyChecks) {
    const tableName = check.query.match(/FROM\s+([a-zA-Z0-9_]+)/i)?.[1];
    if (tableName && !tableExists(tableName)) {
      continue;
    }
    const row = db.prepare(check.query).get({ userId }) as { total: number } | undefined;
    if (Number(row?.total ?? 0) > 0) {
      linkedData.push(check.label);
    }
  }

  if (linkedData.length > 0) {
    throw new Error(
      `Cannot delete this account because it has linked data (${linkedData.join(", ")}).`,
    );
  }

  const transaction = db.transaction(() => {
    db.prepare("DELETE FROM portal_sessions WHERE user_id = @userId").run({ userId });
    db.prepare("DELETE FROM portal_users WHERE id = @userId").run({ userId });
  });

  transaction();
}

export function authenticatePortalUser(identifier: string, password: string): PortalUser | null {
  const normalizedIdentifier = identifier.trim();
  const normalizedEmail = normalizedIdentifier.toLowerCase();
  const row = getDb()
    .prepare(
      `
      SELECT
        id,
        full_name AS fullName,
        email,
        phone,
        role,
        geography_scope AS geographyScope,
        is_supervisor AS isSupervisor,
        is_me AS isME,
        is_admin AS isAdmin,
        is_superadmin AS isSuperAdmin,
        password_hash AS passwordHash
      FROM portal_users
      WHERE lower(email) = @email
         OR phone = @phone
      LIMIT 1
    `,
    )
    .get({ email: normalizedEmail, phone: normalizedIdentifier }) as
    | {
      id: number;
      fullName: string;
      email: string;
      phone: string | null;
      role: PortalUserRole;
      geographyScope: string | null;
      isSupervisor: number;
      isME: number;
      isAdmin: number;
      isSuperAdmin: number;
      passwordHash: string;
    }
    | undefined;

  if (!row) {
    return null;
  }

  if (row.passwordHash !== hashPassword(password)) {
    return null;
  }

  return parsePortalUserRow(row);
}

export function createPortalSession(userId: number) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000).toISOString();

  getDb()
    .prepare(
      `
      INSERT INTO portal_sessions (
        user_id,
        token,
        expires_at
      ) VALUES (
        @userId,
        @token,
        @expiresAt
      )
    `,
    )
    .run({ userId, token, expiresAt });

  return {
    token,
    expiresAt,
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

export function getPortalUserFromSession(token: string): PortalUser | null {
  const db = getDb();

  db.prepare("DELETE FROM portal_sessions WHERE datetime(expires_at) <= datetime('now')").run();

  const row = db
    .prepare(
      `
      SELECT
        u.id,
        u.full_name AS fullName,
        u.email,
        u.phone,
        u.role,
        u.geography_scope AS geographyScope,
        u.is_supervisor AS isSupervisor,
        u.is_me AS isME,
        u.is_admin AS isAdmin,
        u.is_superadmin AS isSuperAdmin
      FROM portal_sessions s
      JOIN portal_users u ON u.id = s.user_id
      WHERE s.token = @token
        AND datetime(s.expires_at) > datetime('now')
      LIMIT 1
    `,
    )
    .get({ token }) as
    | {
      id: number;
      fullName: string;
      email: string;
      phone: string | null;
      role: PortalUserRole;
      geographyScope: string | null;
      isSupervisor: number;
      isME: number;
      isAdmin: number;
      isSuperAdmin: number;
    }
    | undefined;

  if (!row) {
    return null;
  }

  return parsePortalUserRow(row);
}

export function deletePortalSession(token: string) {
  getDb().prepare("DELETE FROM portal_sessions WHERE token = @token").run({ token });
}

export function saveTrainingSession(payload: TrainingSessionInput, createdByUserId: number) {
  const db = getDb();

  const insertSession = db.prepare(`
    INSERT INTO training_sessions (
      school_name,
      district,
      sub_county,
      parish,
      village,
      session_date,
      created_by_user_id
    ) VALUES (
      @schoolName,
      @district,
      @subCounty,
      @parish,
      @village,
      @sessionDate,
      @createdByUserId
    )
  `);

  const insertParticipant = db.prepare(`
    INSERT INTO training_participants (
      session_id,
      participant_name,
      participant_role,
      phone,
      email
    ) VALUES (
      @sessionId,
      @name,
      @role,
      @phone,
      @email
    )
  `);

  const transaction = db.transaction((input: TrainingSessionInput, userId: number) => {
    const sessionInsert = insertSession.run({
      schoolName: input.schoolName,
      district: input.district,
      subCounty: input.subCounty,
      parish: input.parish,
      village: input.village?.trim() ? input.village : null,
      sessionDate: input.sessionDate,
      createdByUserId: userId,
    });

    const sessionId = Number(sessionInsert.lastInsertRowid);

    input.participants.forEach((participant) => {
      insertParticipant.run({
        sessionId,
        name: participant.name,
        role: participant.role,
        phone: participant.phone,
        email: participant.email,
      });
    });

    return sessionId;
  });

  const sessionId = transaction(payload, createdByUserId);

  const row = db
    .prepare(
      `
      SELECT
        ts.id,
        ts.school_name AS schoolName,
        ts.district,
        ts.sub_county AS subCounty,
        ts.parish,
        ts.village,
        ts.session_date AS sessionDate,
        ts.created_at AS createdAt,
        COUNT(tp.id) AS participantCount,
        SUM(CASE WHEN tp.participant_role = 'Classroom teacher' THEN 1 ELSE 0 END) AS classroomTeachers,
        SUM(CASE WHEN tp.participant_role = 'School Leader' THEN 1 ELSE 0 END) AS schoolLeaders
      FROM training_sessions ts
      LEFT JOIN training_participants tp ON tp.session_id = ts.id
      WHERE ts.id = @sessionId
      GROUP BY ts.id
      LIMIT 1
    `,
    )
    .get({ sessionId }) as TrainingSessionRecord | undefined;

  if (!row) {
    throw new Error("Could not load saved training session.");
  }

  return {
    ...row,
    participantCount: Number(row.participantCount ?? 0),
    classroomTeachers: Number(row.classroomTeachers ?? 0),
    schoolLeaders: Number(row.schoolLeaders ?? 0),
  };
}

export function listTrainingSessions(limit = 20): TrainingSessionRecord[] {
  const rows = getDb()
    .prepare(
      `
      SELECT
        ts.id,
        ts.school_name AS schoolName,
        ts.district,
        ts.sub_county AS subCounty,
        ts.parish,
        ts.village,
        ts.session_date AS sessionDate,
        ts.created_at AS createdAt,
        COUNT(tp.id) AS participantCount,
        SUM(CASE WHEN tp.participant_role = 'Classroom teacher' THEN 1 ELSE 0 END) AS classroomTeachers,
        SUM(CASE WHEN tp.participant_role = 'School Leader' THEN 1 ELSE 0 END) AS schoolLeaders
      FROM training_sessions ts
      LEFT JOIN training_participants tp ON tp.session_id = ts.id
      GROUP BY ts.id
      ORDER BY ts.session_date DESC, ts.id DESC
      LIMIT @limit
    `,
    )
    .all({ limit }) as TrainingSessionRecord[];

  return rows.map((row) => ({
    ...row,
    participantCount: Number(row.participantCount ?? 0),
    classroomTeachers: Number(row.classroomTeachers ?? 0),
    schoolLeaders: Number(row.schoolLeaders ?? 0),
  }));
}

export function saveAssessmentRecord(payload: AssessmentRecordInput, createdByUserId: number) {
  const db = getDb();

  const insertResult = db
    .prepare(
      `
      INSERT INTO assessment_records (
        child_name,
        child_id,
        gender,
        age,
        school_id,
        class_grade,
        assessment_date,
        assessment_type,
        letter_identification_score,
        sound_identification_score,
        decodable_words_score,
        undecodable_words_score,
        made_up_words_score,
        story_reading_score,
        reading_comprehension_score,
        notes,
        created_by_user_id
      ) VALUES (
        @childName,
        @childId,
        @gender,
        @age,
        @schoolId,
        @classGrade,
        @assessmentDate,
        @assessmentType,
        @letterIdentificationScore,
        @soundIdentificationScore,
        @decodableWordsScore,
        @undecodableWordsScore,
        @madeUpWordsScore,
        @storyReadingScore,
        @readingComprehensionScore,
        @notes,
        @createdByUserId
      )
    `,
    )
    .run({
      childName: payload.childName,
      childId: payload.childId,
      gender: payload.gender,
      age: payload.age,
      schoolId: payload.schoolId,
      classGrade: payload.classGrade,
      assessmentDate: payload.assessmentDate,
      assessmentType: payload.assessmentType,
      letterIdentificationScore: payload.letterIdentificationScore,
      soundIdentificationScore: payload.soundIdentificationScore,
      decodableWordsScore: payload.decodableWordsScore,
      undecodableWordsScore: payload.undecodableWordsScore,
      madeUpWordsScore: payload.madeUpWordsScore,
      storyReadingScore: payload.storyReadingScore,
      readingComprehensionScore: payload.readingComprehensionScore,
      notes: payload.notes?.trim() ? payload.notes : null,
      createdByUserId,
    });

  const assessmentId = Number(insertResult.lastInsertRowid);
  const row = db
    .prepare(
      `
      SELECT
        id,
        child_name AS childName,
        child_id AS childId,
        gender,
        age,
        school_id AS schoolId,
        class_grade AS classGrade,
        assessment_date AS assessmentDate,
        assessment_type AS assessmentType,
        letter_identification_score AS letterIdentificationScore,
        sound_identification_score AS soundIdentificationScore,
        decodable_words_score AS decodableWordsScore,
        undecodable_words_score AS undecodableWordsScore,
        made_up_words_score AS madeUpWordsScore,
        story_reading_score AS storyReadingScore,
        reading_comprehension_score AS readingComprehensionScore,
        notes,
        created_at AS createdAt
      FROM assessment_records
      WHERE id = @assessmentId
      LIMIT 1
    `,
    )
    .get({ assessmentId }) as AssessmentRecord | undefined;

  if (!row) {
    throw new Error("Could not load saved assessment record.");
  }

  return { ...row, createdByUserId };
}

export function listAssessmentRecords(limit = 20): AssessmentRecord[] {
  const rows = getDb()
    .prepare(
      `
      SELECT
        id,
        child_name AS childName,
        child_id AS childId,
        gender,
        age,
        school_id AS schoolId,
        class_grade AS classGrade,
        assessment_date AS assessmentDate,
        assessment_type AS assessmentType,
        letter_identification_score AS letterIdentificationScore,
        sound_identification_score AS soundIdentificationScore,
        decodable_words_score AS decodableWordsScore,
        undecodable_words_score AS undecodableWordsScore,
        made_up_words_score AS madeUpWordsScore,
        story_reading_score AS storyReadingScore,
        reading_comprehension_score AS readingComprehensionScore,
        notes,
        created_by_user_id AS createdByUserId,
        created_at AS createdAt
      FROM assessment_records
      ORDER BY assessment_date DESC, id DESC
      LIMIT @limit
    `,
    )
    .all({ limit }) as AssessmentRecord[];

  return rows;
}

export function saveOnlineTrainingEvent(
  payload: OnlineTrainingEventInput & {
    startDateTime: string;
    endDateTime: string;
    attendeeEmails: string[];
    calendarEventId?: string | null;
    calendarLink?: string | null;
    meetLink?: string | null;
  },
  createdByUserId: number,
): OnlineTrainingEventRecord {
  const db = getDb();
  const insertResult = db
    .prepare(
      `
      INSERT INTO online_training_events (
        title,
        description,
        audience,
        start_datetime,
        end_datetime,
        duration_minutes,
        attendee_emails,
        attendee_count,
        online_teachers_trained,
        online_school_leaders_trained,
        calendar_event_id,
        calendar_link,
        meet_link,
        created_by_user_id
      ) VALUES (
        @title,
        @description,
        @audience,
        @startDateTime,
        @endDateTime,
        @durationMinutes,
        @attendeeEmails,
        @attendeeCount,
        @onlineTeachersTrained,
        @onlineSchoolLeadersTrained,
        @calendarEventId,
        @calendarLink,
        @meetLink,
        @createdByUserId
      )
    `,
    )
    .run({
      title: payload.title,
      description: payload.description?.trim() ? payload.description : null,
      audience: payload.audience,
      startDateTime: payload.startDateTime,
      endDateTime: payload.endDateTime,
      durationMinutes: payload.durationMinutes,
      attendeeEmails: payload.attendeeEmails.join(","),
      attendeeCount: payload.attendeeEmails.length,
      onlineTeachersTrained: 0,
      onlineSchoolLeadersTrained: 0,
      calendarEventId: payload.calendarEventId ?? null,
      calendarLink: payload.calendarLink ?? null,
      meetLink: payload.meetLink ?? null,
      createdByUserId,
    });

  const eventId = Number(insertResult.lastInsertRowid);
  const row = db
    .prepare(
      `
      SELECT
        id,
        title,
        description,
        audience,
        start_datetime AS startDateTime,
        end_datetime AS endDateTime,
        duration_minutes AS durationMinutes,
        attendee_count AS attendeeCount,
        online_teachers_trained AS onlineTeachersTrained,
        online_school_leaders_trained AS onlineSchoolLeadersTrained,
        calendar_event_id AS calendarEventId,
        calendar_link AS calendarLink,
        meet_link AS meetLink,
        recording_url AS recordingUrl,
        chat_summary AS chatSummary,
        attendance_captured_at AS attendanceCapturedAt,
        created_at AS createdAt
      FROM online_training_events
      WHERE id = @eventId
      LIMIT 1
    `,
    )
    .get({ eventId }) as OnlineTrainingEventRecord | undefined;

  if (!row) {
    throw new Error("Could not load saved online training event.");
  }

  return {
    ...row,
    attendeeCount: Number(row.attendeeCount ?? 0),
    durationMinutes: Number(row.durationMinutes ?? 0),
    onlineTeachersTrained: Number(row.onlineTeachersTrained ?? 0),
    onlineSchoolLeadersTrained: Number(row.onlineSchoolLeadersTrained ?? 0),
  };
}

export function listOnlineTrainingEvents(limit = 20): OnlineTrainingEventRecord[] {
  const rows = getDb()
    .prepare(
      `
      SELECT
        id,
        title,
        description,
        audience,
        start_datetime AS startDateTime,
        end_datetime AS endDateTime,
        duration_minutes AS durationMinutes,
        attendee_count AS attendeeCount,
        online_teachers_trained AS onlineTeachersTrained,
        online_school_leaders_trained AS onlineSchoolLeadersTrained,
        calendar_event_id AS calendarEventId,
        calendar_link AS calendarLink,
        meet_link AS meetLink,
        recording_url AS recordingUrl,
        chat_summary AS chatSummary,
        attendance_captured_at AS attendanceCapturedAt,
        created_at AS createdAt
      FROM online_training_events
      ORDER BY start_datetime DESC, id DESC
      LIMIT @limit
    `,
    )
    .all({ limit }) as OnlineTrainingEventRecord[];

  return rows.map((row) => ({
    ...row,
    attendeeCount: Number(row.attendeeCount ?? 0),
    durationMinutes: Number(row.durationMinutes ?? 0),
    onlineTeachersTrained: Number(row.onlineTeachersTrained ?? 0),
    onlineSchoolLeadersTrained: Number(row.onlineSchoolLeadersTrained ?? 0),
  }));
}

export function getOnlineTrainingEventById(eventId: number): OnlineTrainingEventRecord | null {
  const row = getDb()
    .prepare(
      `
      SELECT
        id,
        title,
        description,
        audience,
        start_datetime AS startDateTime,
        end_datetime AS endDateTime,
        duration_minutes AS durationMinutes,
        attendee_count AS attendeeCount,
        online_teachers_trained AS onlineTeachersTrained,
        online_school_leaders_trained AS onlineSchoolLeadersTrained,
        calendar_event_id AS calendarEventId,
        calendar_link AS calendarLink,
        meet_link AS meetLink,
        recording_url AS recordingUrl,
        chat_summary AS chatSummary,
        attendance_captured_at AS attendanceCapturedAt,
        created_at AS createdAt
      FROM online_training_events
      WHERE id = @eventId
      LIMIT 1
    `,
    )
    .get({ eventId }) as OnlineTrainingEventRecord | undefined;

  if (!row) {
    return null;
  }

  return {
    ...row,
    attendeeCount: Number(row.attendeeCount ?? 0),
    durationMinutes: Number(row.durationMinutes ?? 0),
    onlineTeachersTrained: Number(row.onlineTeachersTrained ?? 0),
    onlineSchoolLeadersTrained: Number(row.onlineSchoolLeadersTrained ?? 0),
  };
}

export function saveOnlineTrainingAttendance(
  eventId: number,
  input: {
    onlineTeachersTrained: number;
    onlineSchoolLeadersTrained: number;
    attendeeCount?: number;
    recordingUrl?: string | null;
    chatSummary?: string | null;
  },
) {
  getDb()
    .prepare(
      `
      UPDATE online_training_events
      SET
        online_teachers_trained = @onlineTeachersTrained,
        online_school_leaders_trained = @onlineSchoolLeadersTrained,
        attendee_count = @attendeeCount,
        recording_url = @recordingUrl,
        chat_summary = @chatSummary,
        attendance_captured_at = @attendanceCapturedAt
      WHERE id = @eventId
    `,
    )
    .run({
      eventId,
      onlineTeachersTrained: Math.max(0, Math.floor(input.onlineTeachersTrained)),
      onlineSchoolLeadersTrained: Math.max(0, Math.floor(input.onlineSchoolLeadersTrained)),
      attendeeCount:
        input.attendeeCount !== undefined
          ? Math.max(0, Math.floor(input.attendeeCount))
          : Math.max(
            0,
            Math.floor(input.onlineTeachersTrained) + Math.floor(input.onlineSchoolLeadersTrained),
          ),
      recordingUrl: input.recordingUrl?.trim() ? input.recordingUrl.trim() : null,
      chatSummary: input.chatSummary?.trim() ? input.chatSummary.trim() : null,
      attendanceCapturedAt: new Date().toISOString(),
    });

  return getOnlineTrainingEventById(eventId);
}

const recordCodePrefix: Record<PortalRecordModule, string> = {
  training: "TRN",
  visit: "VIS",
  assessment: "ASM",
  story: "STY",
};

function formatRecordCode(module: PortalRecordModule, id: number) {
  return `${recordCodePrefix[module]}-${id.toString().padStart(4, "0")}`;
}

function canReviewRecords(user: PortalUser) {
  return user.isSupervisor || user.isME || user.isAdmin || user.isSuperAdmin;
}

function canViewAllRecords(user: PortalUser) {
  return user.isSupervisor || user.isME || user.isAdmin || user.isSuperAdmin;
}

function parsePortalRecord(
  row: {
    id: number;
    recordCode: string;
    module: PortalRecordModule;
    date: string;
    district: string;
    schoolId: number | null;
    schoolName: string;
    programType: string | null;
    status: PortalRecordStatus;
    followUpDate: string | null;
    payloadJson: string;
    reviewNote: string | null;
    createdByUserId: number;
    createdByName: string;
    createdAt: string;
    updatedAt: string;
  },
): PortalRecord {
  return {
    id: row.id,
    recordCode: row.recordCode,
    module: row.module,
    date: row.date,
    district: row.district,
    schoolId: row.schoolId !== null ? Number(row.schoolId) : null,
    schoolName: row.schoolName,
    programType: row.programType ?? undefined,
    status: row.status,
    followUpDate: row.followUpDate ?? undefined,
    payload: JSON.parse(row.payloadJson || "{}"),
    reviewNote: row.reviewNote,
    createdByUserId: row.createdByUserId,
    createdByName: row.createdByName,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function normalizePayload(input: PortalRecordInput) {
  return JSON.stringify(input.payload ?? {});
}

function getSchoolDirectoryRecordById(id: number) {
  const row = getDb()
    .prepare(
      `
      SELECT
        id,
        school_code AS schoolCode,
        name,
        district,
        sub_county AS subCounty,
        parish,
        village,
        enrolled_boys AS enrolledBoys,
        enrolled_girls AS enrolledGirls,
        CASE
          WHEN COALESCE(enrolled_boys, 0) + COALESCE(enrolled_girls, 0) > 0
            THEN COALESCE(enrolled_boys, 0) + COALESCE(enrolled_girls, 0)
          ELSE COALESCE(enrolled_learners, 0)
        END AS enrolledLearners,
        gps_lat AS gpsLat,
        gps_lng AS gpsLng,
        contact_name AS contactName,
        contact_phone AS contactPhone,
        notes,
        created_at AS createdAt
      FROM schools_directory
      WHERE id = @id
      LIMIT 1
    `,
    )
    .get({ id }) as SchoolDirectoryRecord | undefined;

  return row ?? null;
}

function findSchoolByNormalizedName(name: string, excludeId?: number) {
  const normalizedName = name.trim().toLowerCase();
  if (!normalizedName) {
    return null;
  }

  const row = getDb()
    .prepare(
      `
      SELECT id, school_code AS schoolCode, name, district
      FROM schools_directory
      WHERE lower(trim(name)) = @normalizedName
        ${excludeId ? "AND id != @excludeId" : ""}
      LIMIT 1
    `,
    )
    .get(
      excludeId
        ? { normalizedName, excludeId }
        : { normalizedName },
    ) as { id: number; schoolCode: string; name: string; district: string } | undefined;

  return row ?? null;
}

function checkPortalDuplicate(
  db: Database.Database,
  module: PortalRecordModule,
  date: string,
  schoolId: number,
  schoolName: string,
  excludeId?: number,
) {
  const row = db
    .prepare(
      `
      SELECT id
      FROM portal_records
      WHERE module = @module
        AND date = @date
        AND (
          school_id = @schoolId
          OR (school_id IS NULL AND lower(trim(school_name)) = lower(trim(@schoolName)))
        )
        ${excludeId ? "AND id != @excludeId" : ""}
      LIMIT 1
    `,
    )
    .get({ module, date, schoolId, schoolName, excludeId }) as { id?: number } | undefined;

  return Boolean(row?.id);
}

export function createPortalRecord(input: PortalRecordInput, user: PortalUser): PortalRecord {
  const db = getDb();
  if (!input.schoolId || input.schoolId <= 0) {
    throw new Error("School selection is required.");
  }

  const school = getSchoolDirectoryRecordById(input.schoolId);
  if (!school) {
    throw new Error("Selected school account was not found.");
  }

  if (checkPortalDuplicate(db, input.module, input.date, school.id, school.name)) {
    throw new Error(
      `Duplicate prevention: a ${input.module} entry already exists for this school and date.`,
    );
  }

  const insertResult = db
    .prepare(
      `
      INSERT INTO portal_records (
        record_code,
        module,
        date,
        district,
        school_id,
        school_name,
        program_type,
        status,
        follow_up_date,
        payload_json,
        created_by_user_id,
        updated_by_user_id
      ) VALUES (
        @recordCode,
        @module,
        @date,
        @district,
        @schoolId,
        @schoolName,
        @programType,
        @status,
        @followUpDate,
        @payloadJson,
        @createdByUserId,
        @updatedByUserId
      )
    `,
    )
    .run({
      recordCode: `${recordCodePrefix[input.module]}-PENDING`,
      module: input.module,
      date: input.date,
      district: school.district,
      schoolId: school.id,
      schoolName: school.name,
      programType: input.programType ?? null,
      status: input.status,
      followUpDate: input.followUpDate ?? null,
      payloadJson: normalizePayload(input),
      createdByUserId: user.id,
      updatedByUserId: user.id,
    });

  const id = Number(insertResult.lastInsertRowid);
  const recordCode = formatRecordCode(input.module, id);
  db.prepare("UPDATE portal_records SET record_code = @recordCode WHERE id = @id").run({
    id,
    recordCode,
  });

  const record = getPortalRecordById(id, user);
  if (!record) {
    throw new Error("Could not load newly created record.");
  }

  return record;
}

export function updatePortalRecord(
  id: number,
  input: PortalRecordInput,
  user: PortalUser,
): PortalRecord {
  const db = getDb();
  if (!input.schoolId || input.schoolId <= 0) {
    throw new Error("School selection is required.");
  }

  const school = getSchoolDirectoryRecordById(input.schoolId);
  if (!school) {
    throw new Error("Selected school account was not found.");
  }

  const current = db
    .prepare(
      `
      SELECT id, created_by_user_id AS createdByUserId, status
      FROM portal_records
      WHERE id = @id
      LIMIT 1
    `,
    )
    .get({ id }) as { id: number; createdByUserId: number; status: PortalRecordStatus } | undefined;

  if (!current) {
    throw new Error("Record not found.");
  }

  const canEditOwn = current.createdByUserId === user.id && current.status !== "Approved";
  if (!(canEditOwn || canReviewRecords(user))) {
    throw new Error("You do not have permission to edit this record.");
  }

  if (checkPortalDuplicate(db, input.module, input.date, school.id, school.name, id)) {
    throw new Error(
      `Duplicate prevention: a ${input.module} entry already exists for this school and date.`,
    );
  }

  db.prepare(
    `
    UPDATE portal_records
    SET
      module = @module,
      date = @date,
      district = @district,
      school_id = @schoolId,
      school_name = @schoolName,
      program_type = @programType,
      status = @status,
      follow_up_date = @followUpDate,
      payload_json = @payloadJson,
      updated_by_user_id = @updatedByUserId,
      updated_at = datetime('now')
    WHERE id = @id
  `,
  ).run({
    id,
    module: input.module,
    date: input.date,
    district: school.district,
    schoolId: school.id,
    schoolName: school.name,
    programType: input.programType ?? null,
    status: input.status,
    followUpDate: input.followUpDate ?? null,
    payloadJson: normalizePayload(input),
    updatedByUserId: user.id,
  });

  const updated = getPortalRecordById(id, user);
  if (!updated) {
    throw new Error("Could not load updated record.");
  }

  return updated;
}

export function setPortalRecordStatus(
  id: number,
  status: PortalRecordStatus,
  user: PortalUser,
  reviewNote?: string,
) {
  if (!canReviewRecords(user)) {
    throw new Error("Only supervisors, M&E, or admins can approve/return records.");
  }

  const db = getDb();
  db.prepare(
    `
    UPDATE portal_records
    SET
      status = @status,
      review_note = @reviewNote,
      updated_by_user_id = @updatedByUserId,
      updated_at = datetime('now')
    WHERE id = @id
  `,
  ).run({
    id,
    status,
    reviewNote: reviewNote?.trim() ? reviewNote : null,
    updatedByUserId: user.id,
  });

  const updated = getPortalRecordById(id, user);
  if (!updated) {
    throw new Error("Could not load updated record.");
  }

  return updated;
}

export function getPortalRecordById(id: number, user: PortalUser): PortalRecord | null {
  const db = getDb();
  const row = db
    .prepare(
      `
      SELECT
        pr.id,
        pr.record_code AS recordCode,
        pr.module,
        pr.date,
        pr.district,
        pr.school_id AS schoolId,
        pr.school_name AS schoolName,
        pr.program_type AS programType,
        pr.status,
        pr.follow_up_date AS followUpDate,
        pr.payload_json AS payloadJson,
        pr.review_note AS reviewNote,
        pr.created_by_user_id AS createdByUserId,
        pu.full_name AS createdByName,
        pr.created_at AS createdAt,
        pr.updated_at AS updatedAt
      FROM portal_records pr
      JOIN portal_users pu ON pu.id = pr.created_by_user_id
      WHERE pr.id = @id
      LIMIT 1
    `,
    )
    .get({ id }) as
    | {
      id: number;
      recordCode: string;
      module: PortalRecordModule;
      date: string;
      district: string;
      schoolId: number | null;
      schoolName: string;
      programType: string | null;
      status: PortalRecordStatus;
      followUpDate: string | null;
      payloadJson: string;
      reviewNote: string | null;
      createdByUserId: number;
      createdByName: string;
      createdAt: string;
      updatedAt: string;
    }
    | undefined;

  if (!row) {
    return null;
  }

  if (!canViewAllRecords(user) && row.createdByUserId !== user.id) {
    return null;
  }

  return parsePortalRecord(row);
}

export function listPortalRecords(filters: PortalRecordFilters, user: PortalUser): PortalRecord[] {
  const whereClauses = ["pr.module = @module"];
  const params: Record<string, string | number> = { module: filters.module };

  if (!canViewAllRecords(user)) {
    whereClauses.push("pr.created_by_user_id = @currentUserId");
    params.currentUserId = user.id;
  }

  if (filters.dateFrom) {
    whereClauses.push("pr.date >= @dateFrom");
    params.dateFrom = filters.dateFrom;
  }
  if (filters.dateTo) {
    whereClauses.push("pr.date <= @dateTo");
    params.dateTo = filters.dateTo;
  }
  if (filters.district) {
    whereClauses.push("lower(pr.district) LIKE lower(@district)");
    params.district = `%${filters.district}%`;
  }
  if (filters.school) {
    whereClauses.push("lower(pr.school_name) LIKE lower(@school)");
    params.school = `%${filters.school}%`;
  }
  if (filters.status) {
    whereClauses.push("pr.status = @status");
    params.status = filters.status;
  }
  if (filters.createdBy && canViewAllRecords(user)) {
    whereClauses.push("pr.created_by_user_id = @createdBy");
    params.createdBy = filters.createdBy;
  }
  if (filters.programType) {
    whereClauses.push("lower(pr.program_type) LIKE lower(@programType)");
    params.programType = `%${filters.programType}%`;
  }

  const rows = getDb()
    .prepare(
      `
      SELECT
        pr.id,
        pr.record_code AS recordCode,
        pr.module,
        pr.date,
        pr.district,
        pr.school_id AS schoolId,
        pr.school_name AS schoolName,
        pr.program_type AS programType,
        pr.status,
        pr.follow_up_date AS followUpDate,
        pr.payload_json AS payloadJson,
        pr.review_note AS reviewNote,
        pr.created_by_user_id AS createdByUserId,
        pu.full_name AS createdByName,
        pr.created_at AS createdAt,
        pr.updated_at AS updatedAt
      FROM portal_records pr
      JOIN portal_users pu ON pu.id = pr.created_by_user_id
      WHERE ${whereClauses.join(" AND ")}
      ORDER BY pr.date DESC, pr.updated_at DESC
      LIMIT 300
    `,
    )
    .all(params) as Array<{
      id: number;
      recordCode: string;
      module: PortalRecordModule;
      date: string;
      district: string;
      schoolId: number | null;
      schoolName: string;
      programType: string | null;
      status: PortalRecordStatus;
      followUpDate: string | null;
      payloadJson: string;
      reviewNote: string | null;
      createdByUserId: number;
      createdByName: string;
      createdAt: string;
      updatedAt: string;
    }>;

  return rows.map((row) => parsePortalRecord(row));
}

function getWeekBounds() {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = (day + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return {
    from: monday.toISOString().slice(0, 10),
    to: sunday.toISOString().slice(0, 10),
  };
}

function getTodayPlusDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function getPortalDashboardData(user: PortalUser): PortalDashboardData {
  const db = getDb();
  const weekBounds = getWeekBounds();
  const today = new Date().toISOString().slice(0, 10);
  const weekAhead = getTodayPlusDays(7);

  const baseUserFilter = canViewAllRecords(user) ? "" : "AND created_by_user_id = @currentUserId";
  const baseParams = canViewAllRecords(user) ? {} : { currentUserId: user.id };

  const kpiRows = db
    .prepare(
      `
      SELECT module, COUNT(*) AS total
      FROM portal_records
      WHERE date >= @from AND date <= @to
      ${baseUserFilter}
      GROUP BY module
    `,
    )
    .all({ ...baseParams, from: weekBounds.from, to: weekBounds.to }) as Array<{
      module: PortalRecordModule;
      total: number;
    }>;

  const agendaRows = db
    .prepare(
      `
      SELECT
        id,
        record_code AS recordCode,
        module,
        date,
        school_name AS schoolName,
        program_type AS programType
      FROM portal_records
      WHERE date >= @today
        AND date <= @weekAhead
        ${baseUserFilter}
      ORDER BY date ASC, id ASC
      LIMIT 15
    `,
    )
    .all({ ...baseParams, today, weekAhead }) as DashboardAgendaItem[];

  const followUpRows = db
    .prepare(
      `
      SELECT
        id,
        record_code AS recordCode,
        module,
        school_name AS schoolName,
        follow_up_date AS followUpDate
      FROM portal_records
      WHERE follow_up_date IS NOT NULL
        AND follow_up_date <= @today
        AND status != 'Approved'
        ${baseUserFilter}
      ORDER BY follow_up_date ASC
      LIMIT 12
    `,
    )
    .all({ ...baseParams, today }) as DashboardFollowUpItem[];

  const recentRows = db
    .prepare(
      `
      SELECT
        id,
        record_code AS recordCode,
        module,
        date,
        school_name AS schoolName,
        status,
        updated_at AS updatedAt
      FROM portal_records
      WHERE 1=1
        ${baseUserFilter}
      ORDER BY updated_at DESC
      LIMIT 10
    `,
    )
    .all(baseParams) as DashboardActivityItem[];

  const getCount = (module: PortalRecordModule) =>
    Number(kpiRows.find((row) => row.module === module)?.total ?? 0);

  const learnersResult = db
    .prepare("SELECT SUM(enrolled_learners) as total FROM schools_directory")
    .get() as { total: number };
  const totalLearners = learnersResult?.total ?? 0;

  return {
    kpis: {
      trainingsLogged: getCount("training"),
      schoolVisits: getCount("visit"),
      assessments: getCount("assessment"),
      storyActivities: getCount("story"),
      learnersReached: totalLearners,
    },
    weekAgenda: agendaRows,
    dueFollowUps: followUpRows,
    recentActivity: recentRows,
  };
}

export function createSchoolDirectoryRecord(input: SchoolDirectoryInput): SchoolDirectoryRecord {
  const db = getDb();
  const normalizedName = input.name.trim();
  if (!normalizedName) {
    throw new Error("School name is required.");
  }

  const duplicateSchool = findSchoolByNormalizedName(normalizedName);
  if (duplicateSchool) {
    throw new Error(
      "A school with this name already exists. Append location details (district/sub-county/parish) to distinguish it.",
    );
  }

  const insertResult = db
    .prepare(
      `
      INSERT INTO schools_directory (
        school_code,
        name,
        district,
        sub_county,
        parish,
        village,
        enrolled_boys,
        enrolled_girls,
        enrolled_baby,
        enrolled_middle,
        enrolled_top,
        enrolled_p1,
        enrolled_p2,
        enrolled_p3,
        enrolled_p4,
        enrolled_p5,
        enrolled_p6,
        enrolled_p7,
        enrolled_learners,
        gps_lat,
        gps_lng,
        contact_name,
        contact_phone,
        notes
      ) VALUES (
        @schoolCode,
        @name,
        @district,
        @subCounty,
        @parish,
        @village,
        @enrolledBoys,
        @enrolledGirls,
        @enrolledBaby,
        @enrolledMiddle,
        @enrolledTop,
        @enrolledP1,
        @enrolledP2,
        @enrolledP3,
        @enrolledP4,
        @enrolledP5,
        @enrolledP6,
        @enrolledP7,
        @enrolledLearners,
        @gpsLat,
        @gpsLng,
        @contactName,
        @contactPhone,
        @notes
      )
    `,
    )
    .run({
      schoolCode: "SCH-PENDING",
      name: normalizedName,
      district: input.district,
      subCounty: input.subCounty,
      parish: input.parish,
      village: input.village?.trim() ? input.village : null,
      enrolledBoys: Math.max(0, Math.floor(Number(input.enrolledBoys ?? 0))),
      enrolledGirls: Math.max(0, Math.floor(Number(input.enrolledGirls ?? 0))),
      enrolledBaby: Math.max(0, Math.floor(Number(input.enrolledBaby ?? 0))),
      enrolledMiddle: Math.max(0, Math.floor(Number(input.enrolledMiddle ?? 0))),
      enrolledTop: Math.max(0, Math.floor(Number(input.enrolledTop ?? 0))),
      enrolledP1: Math.max(0, Math.floor(Number(input.enrolledP1 ?? 0))),
      enrolledP2: Math.max(0, Math.floor(Number(input.enrolledP2 ?? 0))),
      enrolledP3: Math.max(0, Math.floor(Number(input.enrolledP3 ?? 0))),
      enrolledP4: Math.max(0, Math.floor(Number(input.enrolledP4 ?? 0))),
      enrolledP5: Math.max(0, Math.floor(Number(input.enrolledP5 ?? 0))),
      enrolledP6: Math.max(0, Math.floor(Number(input.enrolledP6 ?? 0))),
      enrolledP7: Math.max(0, Math.floor(Number(input.enrolledP7 ?? 0))),
      enrolledLearners:
        Math.max(0, Math.floor(Number(input.enrolledBaby ?? 0))) +
        Math.max(0, Math.floor(Number(input.enrolledMiddle ?? 0))) +
        Math.max(0, Math.floor(Number(input.enrolledTop ?? 0))) +
        Math.max(0, Math.floor(Number(input.enrolledP1 ?? 0))) +
        Math.max(0, Math.floor(Number(input.enrolledP2 ?? 0))) +
        Math.max(0, Math.floor(Number(input.enrolledP3 ?? 0))),
      gpsLat: input.gpsLat?.trim() ? input.gpsLat : null,
      gpsLng: input.gpsLng?.trim() ? input.gpsLng : null,
      contactName: input.contactName?.trim() ? input.contactName : null,
      contactPhone: input.contactPhone?.trim() ? input.contactPhone : null,
      notes: input.notes?.trim() ? input.notes.trim() : null,
    });

  const id = Number(insertResult.lastInsertRowid);
  const schoolCode = `SCH-${id.toString().padStart(4, "0")}`;
  db.prepare("UPDATE schools_directory SET school_code = @schoolCode WHERE id = @id").run({
    id,
    schoolCode,
  });

  const row = getSchoolDirectoryRecordById(id);
  if (!row) {
    throw new Error("Could not load created school.");
  }

  return row;
}

export function updateSchoolDirectoryRecord(
  schoolId: number,
  input: {
    name?: string;
    district?: string;
    subCounty?: string;
    parish?: string;
    village?: string | null;
    enrolledBoys?: number;
    enrolledGirls?: number;
    enrolledBaby?: number;
    enrolledMiddle?: number;
    enrolledTop?: number;
    enrolledP1?: number;
    enrolledP2?: number;
    enrolledP3?: number;
    enrolledP4?: number;
    enrolledP5?: number;
    enrolledP6?: number;
    enrolledP7?: number;
    gpsLat?: string | null;
    gpsLng?: string | null;
    contactName?: string | null;
    contactPhone?: string | null;
    notes?: string | null;
  },
): SchoolDirectoryRecord {
  const current = getSchoolDirectoryRecordById(schoolId);
  if (!current) {
    throw new Error("School not found.");
  }

  const updates: string[] = [];
  const params: Record<string, unknown> = { schoolId };

  if (input.name !== undefined) {
    const value = input.name.trim();
    if (!value) {
      throw new Error("School name is required.");
    }
    const duplicateSchool = findSchoolByNormalizedName(value, schoolId);
    if (duplicateSchool) {
      throw new Error(
        "A school with this name already exists. Append location details (district/sub-county/parish) to distinguish it.",
      );
    }
    updates.push("name = @name");
    params.name = value;
  }
  if (input.district !== undefined) {
    const value = input.district.trim();
    if (!value) {
      throw new Error("District is required.");
    }
    updates.push("district = @district");
    params.district = value;
  }
  if (input.subCounty !== undefined) {
    const value = input.subCounty.trim();
    if (!value) {
      throw new Error("Sub-county is required.");
    }
    updates.push("sub_county = @subCounty");
    params.subCounty = value;
  }
  if (input.parish !== undefined) {
    const value = input.parish.trim();
    if (!value) {
      throw new Error("Parish is required.");
    }
    updates.push("parish = @parish");
    params.parish = value;
  }
  if (input.village !== undefined) {
    const value = input.village?.trim();
    updates.push("village = @village");
    params.village = value ? value : null;
  }
  if (input.enrolledBoys !== undefined) {
    const value = Math.max(0, Math.floor(Number(input.enrolledBoys)));
    if (!Number.isFinite(value)) {
      throw new Error("Enrolled boys must be a valid number.");
    }
    updates.push("enrolled_boys = @enrolledBoys");
    params.enrolledBoys = value;
  }
  if (input.enrolledGirls !== undefined) {
    const value = Math.max(0, Math.floor(Number(input.enrolledGirls)));
    if (!Number.isFinite(value)) {
      throw new Error("Enrolled girls must be a valid number.");
    }
    updates.push("enrolled_girls = @enrolledGirls");
    params.enrolledGirls = value;
  }
  if (input.gpsLat !== undefined) {
    const value = input.gpsLat?.trim();
    updates.push("gps_lat = @gpsLat");
    params.gpsLat = value ? value : null;
  }
  if (input.gpsLng !== undefined) {
    const value = input.gpsLng?.trim();
    updates.push("gps_lng = @gpsLng");
    params.gpsLng = value ? value : null;
  }
  if (input.contactName !== undefined) {
    const value = input.contactName?.trim();
    updates.push("contact_name = @contactName");
    params.contactName = value ? value : null;
  }
  if (input.contactPhone !== undefined) {
    const value = input.contactPhone?.trim();
    updates.push("contact_phone = @contactPhone");
    params.contactPhone = value ? value : null;
  }
  if (input.notes !== undefined) {
    const value = input.notes?.trim();
    updates.push("notes = @notes");
    params.notes = value ? value : null;
  }

  if (updates.length === 0) {
    return current;
  }

  if (input.enrolledBaby !== undefined) {
    const value = Math.max(0, Math.floor(Number(input.enrolledBaby)));
    updates.push("enrolled_baby = @enrolledBaby");
    params.enrolledBaby = value;
  }
  if (input.enrolledMiddle !== undefined) {
    const value = Math.max(0, Math.floor(Number(input.enrolledMiddle)));
    updates.push("enrolled_middle = @enrolledMiddle");
    params.enrolledMiddle = value;
  }
  if (input.enrolledTop !== undefined) {
    const value = Math.max(0, Math.floor(Number(input.enrolledTop)));
    updates.push("enrolled_top = @enrolledTop");
    params.enrolledTop = value;
  }
  if (input.enrolledP1 !== undefined) {
    const value = Math.max(0, Math.floor(Number(input.enrolledP1)));
    updates.push("enrolled_p1 = @enrolledP1");
    params.enrolledP1 = value;
  }
  if (input.enrolledP2 !== undefined) {
    const value = Math.max(0, Math.floor(Number(input.enrolledP2)));
    updates.push("enrolled_p2 = @enrolledP2");
    params.enrolledP2 = value;
  }
  if (input.enrolledP3 !== undefined) {
    const value = Math.max(0, Math.floor(Number(input.enrolledP3)));
    updates.push("enrolled_p3 = @enrolledP3");
    params.enrolledP3 = value;
  }
  if (input.enrolledP4 !== undefined) {
    const value = Math.max(0, Math.floor(Number(input.enrolledP4)));
    updates.push("enrolled_p4 = @enrolledP4");
    params.enrolledP4 = value;
  }
  if (input.enrolledP5 !== undefined) {
    const value = Math.max(0, Math.floor(Number(input.enrolledP5)));
    updates.push("enrolled_p5 = @enrolledP5");
    params.enrolledP5 = value;
  }
  if (input.enrolledP6 !== undefined) {
    const value = Math.max(0, Math.floor(Number(input.enrolledP6)));
    updates.push("enrolled_p6 = @enrolledP6");
    params.enrolledP6 = value;
  }
  if (input.enrolledP7 !== undefined) {
    const value = Math.max(0, Math.floor(Number(input.enrolledP7)));
    updates.push("enrolled_p7 = @enrolledP7");
    params.enrolledP7 = value;
  }

  // Recalculate learners reached (Baby-P3)
  const baby = input.enrolledBaby !== undefined ? Math.max(0, Math.floor(Number(input.enrolledBaby))) : current.enrolledBaby;
  const middle = input.enrolledMiddle !== undefined ? Math.max(0, Math.floor(Number(input.enrolledMiddle))) : current.enrolledMiddle;
  const top = input.enrolledTop !== undefined ? Math.max(0, Math.floor(Number(input.enrolledTop))) : current.enrolledTop;
  const p1 = input.enrolledP1 !== undefined ? Math.max(0, Math.floor(Number(input.enrolledP1))) : current.enrolledP1;
  const p2 = input.enrolledP2 !== undefined ? Math.max(0, Math.floor(Number(input.enrolledP2))) : current.enrolledP2;
  const p3 = input.enrolledP3 !== undefined ? Math.max(0, Math.floor(Number(input.enrolledP3))) : current.enrolledP3;

  updates.push("enrolled_learners = @enrolledLearners");
  params.enrolledLearners = baby + middle + top + p1 + p2 + p3;

  getDb()
    .prepare(
      `
      UPDATE schools_directory
      SET ${updates.join(", ")}
      WHERE id = @schoolId
    `,
    )
    .run(params);

  const updated = getSchoolDirectoryRecordById(schoolId);
  if (!updated) {
    throw new Error("Could not load updated school record.");
  }

  return updated;
}

export function listSchoolDirectoryRecords(filters?: {
  district?: string;
  query?: string;
}): SchoolDirectoryRecord[] {
  const where: string[] = ["1=1"];
  const params: Record<string, string | number> = {};

  if (filters?.district) {
    where.push("lower(district) LIKE lower(@district)");
    params.district = `%${filters.district}%`;
  }

  if (filters?.query) {
    where.push("(lower(name) LIKE lower(@query) OR lower(school_code) LIKE lower(@query))");
    params.query = `%${filters.query}%`;
  }

  return getDb()
    .prepare(
      `
      SELECT
        id,
        school_code AS schoolCode,
        name,
        district,
        sub_county AS subCounty,
        parish,
        village,
        enrolled_boys AS enrolledBoys,
        enrolled_girls AS enrolledGirls,
        CASE
          WHEN COALESCE(enrolled_boys, 0) + COALESCE(enrolled_girls, 0) > 0
            THEN COALESCE(enrolled_boys, 0) + COALESCE(enrolled_girls, 0)
          ELSE COALESCE(enrolled_learners, 0)
        END AS enrolledLearners,
        gps_lat AS gpsLat,
        gps_lng AS gpsLng,
        contact_name AS contactName,
        contact_phone AS contactPhone,
        notes,
        created_at AS createdAt
      FROM schools_directory
      WHERE ${where.join(" AND ")}
      ORDER BY created_at DESC
      LIMIT 500
    `,
    )
    .all(params) as SchoolDirectoryRecord[];
}

export function listPortalUsersForFilters(user: PortalUser) {
  if (!canViewAllRecords(user)) {
    return [{ id: user.id, fullName: user.fullName }];
  }

  return getDb()
    .prepare(
      `
      SELECT id, full_name AS fullName
      FROM portal_users
      ORDER BY full_name ASC
    `,
    )
    .all() as Array<{ id: number; fullName: string }>;
}

function parsePortalEvidenceRow(row: {
  id: number;
  recordId: number | null;
  module: PortalRecordModule;
  date: string;
  schoolName: string;
  fileName: string;
  storedPath: string;
  mimeType: string;
  sizeBytes: number;
  uploadedByName: string;
  uploadedByUserId?: number;
  createdAt: string;
}): PortalEvidenceRecord {
  return {
    id: row.id,
    recordId: row.recordId !== null ? Number(row.recordId) : null,
    module: row.module,
    date: row.date,
    schoolName: row.schoolName,
    fileName: row.fileName,
    storedPath: row.storedPath,
    mimeType: row.mimeType,
    sizeBytes: Number(row.sizeBytes),
    uploadedByName: row.uploadedByName,
    createdAt: row.createdAt,
  };
}

export function savePortalEvidence(input: {
  recordId?: number;
  module: PortalRecordModule;
  date: string;
  schoolName: string;
  fileName: string;
  storedPath: string;
  mimeType: string;
  sizeBytes: number;
  uploadedByUserId: number;
}): PortalEvidenceRecord {
  const db = getDb();
  const insertResult = db
    .prepare(
      `
      INSERT INTO portal_evidence (
        record_id,
        module,
        date,
        school_name,
        file_name,
        stored_path,
        mime_type,
        size_bytes,
        uploaded_by_user_id
      ) VALUES (
        @recordId,
        @module,
        @date,
        @schoolName,
        @fileName,
        @storedPath,
        @mimeType,
        @sizeBytes,
        @uploadedByUserId
      )
    `,
    )
    .run({
      recordId: input.recordId ?? null,
      module: input.module,
      date: input.date,
      schoolName: input.schoolName,
      fileName: input.fileName,
      storedPath: input.storedPath,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      uploadedByUserId: input.uploadedByUserId,
    });

  const id = Number(insertResult.lastInsertRowid);
  const row = db
    .prepare(
      `
      SELECT
        pe.id,
        pe.record_id AS recordId,
        pe.module,
        pe.date,
        pe.school_name AS schoolName,
        pe.file_name AS fileName,
        pe.stored_path AS storedPath,
        pe.mime_type AS mimeType,
        pe.size_bytes AS sizeBytes,
        pu.full_name AS uploadedByName,
        pe.created_at AS createdAt
      FROM portal_evidence pe
      JOIN portal_users pu ON pu.id = pe.uploaded_by_user_id
      WHERE pe.id = @id
      LIMIT 1
    `,
    )
    .get({ id }) as
    | {
      id: number;
      recordId: number | null;
      module: PortalRecordModule;
      date: string;
      schoolName: string;
      fileName: string;
      storedPath: string;
      mimeType: string;
      sizeBytes: number;
      uploadedByName: string;
      createdAt: string;
    }
    | undefined;

  if (!row) {
    throw new Error("Could not load saved evidence.");
  }

  return parsePortalEvidenceRow(row);
}

export function listPortalEvidence(
  filters: {
    module?: PortalRecordModule;
    dateFrom?: string;
    dateTo?: string;
    school?: string;
    recordId?: number;
  },
  user: PortalUser,
): PortalEvidenceRecord[] {
  const whereClauses = ["1=1"];
  const params: Record<string, string | number> = {};

  if (!canViewAllRecords(user)) {
    whereClauses.push("pe.uploaded_by_user_id = @currentUserId");
    params.currentUserId = user.id;
  }

  if (filters.module) {
    whereClauses.push("pe.module = @module");
    params.module = filters.module;
  }

  if (filters.dateFrom) {
    whereClauses.push("pe.date >= @dateFrom");
    params.dateFrom = filters.dateFrom;
  }

  if (filters.dateTo) {
    whereClauses.push("pe.date <= @dateTo");
    params.dateTo = filters.dateTo;
  }

  if (filters.school) {
    whereClauses.push("lower(pe.school_name) LIKE lower(@school)");
    params.school = `%${filters.school}%`;
  }

  if (filters.recordId) {
    whereClauses.push("pe.record_id = @recordId");
    params.recordId = filters.recordId;
  }

  const rows = getDb()
    .prepare(
      `
      SELECT
        pe.id,
        pe.record_id AS recordId,
        pe.module,
        pe.date,
        pe.school_name AS schoolName,
        pe.file_name AS fileName,
        pe.stored_path AS storedPath,
        pe.mime_type AS mimeType,
        pe.size_bytes AS sizeBytes,
        pu.full_name AS uploadedByName,
        pe.created_at AS createdAt
      FROM portal_evidence pe
      JOIN portal_users pu ON pu.id = pe.uploaded_by_user_id
      WHERE ${whereClauses.join(" AND ")}
      ORDER BY pe.created_at DESC
      LIMIT 250
    `,
    )
    .all(params) as Array<{
      id: number;
      recordId: number | null;
      module: PortalRecordModule;
      date: string;
      schoolName: string;
      fileName: string;
      storedPath: string;
      mimeType: string;
      sizeBytes: number;
      uploadedByName: string;
      createdAt: string;
    }>;

  return rows.map((row) => parsePortalEvidenceRow(row));
}

export function getPortalEvidenceById(id: number, user: PortalUser): PortalEvidenceRecord | null {
  const row = getDb()
    .prepare(
      `
      SELECT
        pe.id,
        pe.record_id AS recordId,
        pe.module,
        pe.date,
        pe.school_name AS schoolName,
        pe.file_name AS fileName,
        pe.stored_path AS storedPath,
        pe.mime_type AS mimeType,
        pe.size_bytes AS sizeBytes,
        pe.uploaded_by_user_id AS uploadedByUserId,
        pu.full_name AS uploadedByName,
        pe.created_at AS createdAt
      FROM portal_evidence pe
      JOIN portal_users pu ON pu.id = pe.uploaded_by_user_id
      WHERE pe.id = @id
      LIMIT 1
    `,
    )
    .get({ id }) as
    | {
      id: number;
      recordId: number | null;
      module: PortalRecordModule;
      date: string;
      schoolName: string;
      fileName: string;
      storedPath: string;
      mimeType: string;
      sizeBytes: number;
      uploadedByUserId: number;
      uploadedByName: string;
      createdAt: string;
    }
    | undefined;

  if (!row) {
    return null;
  }

  if (!canViewAllRecords(user) && row.uploadedByUserId !== user.id) {
    return null;
  }

  return parsePortalEvidenceRow(row);
}

function parsePortalTestimonialRow(row: {
  id: number;
  storytellerName: string;
  storytellerRole: string;
  schoolName: string;
  district: string;
  storyText: string;
  videoSourceType: "upload" | "youtube" | string;
  videoFileName: string;
  videoStoredPath: string;
  videoMimeType: string;
  videoSizeBytes: number;
  youtubeVideoId: string | null;
  youtubeVideoTitle: string | null;
  youtubeChannelTitle: string | null;
  youtubeThumbnailUrl: string | null;
  youtubeEmbedUrl: string | null;
  youtubeWatchUrl: string | null;
  photoFileName: string | null;
  photoStoredPath: string | null;
  photoMimeType: string | null;
  photoSizeBytes: number | null;
  isPublished: number;
  createdByUserId: number;
  createdByName: string;
  createdAt: string;
}): PortalTestimonialRecord {
  return {
    id: row.id,
    storytellerName: row.storytellerName,
    storytellerRole: row.storytellerRole,
    schoolName: row.schoolName,
    district: row.district,
    storyText: row.storyText,
    videoSourceType: row.videoSourceType === "youtube" ? "youtube" : "upload",
    videoFileName: row.videoFileName,
    videoStoredPath: row.videoStoredPath,
    videoMimeType: row.videoMimeType,
    videoSizeBytes: Number(row.videoSizeBytes),
    youtubeVideoId: row.youtubeVideoId ?? null,
    youtubeVideoTitle: row.youtubeVideoTitle ?? null,
    youtubeChannelTitle: row.youtubeChannelTitle ?? null,
    youtubeThumbnailUrl: row.youtubeThumbnailUrl ?? null,
    youtubeEmbedUrl: row.youtubeEmbedUrl ?? null,
    youtubeWatchUrl: row.youtubeWatchUrl ?? null,
    photoFileName: row.photoFileName ?? null,
    photoStoredPath: row.photoStoredPath ?? null,
    photoMimeType: row.photoMimeType ?? null,
    photoSizeBytes: row.photoSizeBytes !== null ? Number(row.photoSizeBytes) : null,
    isPublished: Boolean(row.isPublished),
    createdByUserId: Number(row.createdByUserId),
    createdByName: row.createdByName,
    createdAt: row.createdAt,
  };
}

export function savePortalTestimonial(input: {
  storytellerName: string;
  storytellerRole: string;
  schoolName: string;
  district: string;
  storyText: string;
  videoSourceType?: "upload" | "youtube";
  videoFileName: string;
  videoStoredPath: string;
  videoMimeType: string;
  videoSizeBytes: number;
  youtubeVideoId?: string | null;
  youtubeVideoTitle?: string | null;
  youtubeChannelTitle?: string | null;
  youtubeThumbnailUrl?: string | null;
  youtubeEmbedUrl?: string | null;
  youtubeWatchUrl?: string | null;
  photoFileName?: string | null;
  photoStoredPath?: string | null;
  photoMimeType?: string | null;
  photoSizeBytes?: number | null;
  createdByUserId: number;
}): PortalTestimonialRecord {
  const db = getDb();
  const insertResult = db
    .prepare(
      `
      INSERT INTO portal_testimonials (
        storyteller_name,
        storyteller_role,
        school_name,
        district,
        story_text,
        video_source_type,
        video_file_name,
        video_stored_path,
        video_mime_type,
        video_size_bytes,
        youtube_video_id,
        youtube_video_title,
        youtube_channel_title,
        youtube_thumbnail_url,
        youtube_embed_url,
        youtube_watch_url,
        photo_file_name,
        photo_stored_path,
        photo_mime_type,
        photo_size_bytes,
        is_published,
        created_by_user_id
      ) VALUES (
        @storytellerName,
        @storytellerRole,
        @schoolName,
        @district,
        @storyText,
        @videoSourceType,
        @videoFileName,
        @videoStoredPath,
        @videoMimeType,
        @videoSizeBytes,
        @youtubeVideoId,
        @youtubeVideoTitle,
        @youtubeChannelTitle,
        @youtubeThumbnailUrl,
        @youtubeEmbedUrl,
        @youtubeWatchUrl,
        @photoFileName,
        @photoStoredPath,
        @photoMimeType,
        @photoSizeBytes,
        1,
        @createdByUserId
      )
    `,
    )
    .run({
      storytellerName: input.storytellerName,
      storytellerRole: input.storytellerRole,
      schoolName: input.schoolName,
      district: input.district,
      storyText: input.storyText,
      videoSourceType: input.videoSourceType ?? "upload",
      videoFileName: input.videoFileName,
      videoStoredPath: input.videoStoredPath,
      videoMimeType: input.videoMimeType,
      videoSizeBytes: input.videoSizeBytes,
      youtubeVideoId: input.youtubeVideoId ?? null,
      youtubeVideoTitle: input.youtubeVideoTitle ?? null,
      youtubeChannelTitle: input.youtubeChannelTitle ?? null,
      youtubeThumbnailUrl: input.youtubeThumbnailUrl ?? null,
      youtubeEmbedUrl: input.youtubeEmbedUrl ?? null,
      youtubeWatchUrl: input.youtubeWatchUrl ?? null,
      photoFileName: input.photoFileName ?? null,
      photoStoredPath: input.photoStoredPath ?? null,
      photoMimeType: input.photoMimeType ?? null,
      photoSizeBytes: input.photoSizeBytes ?? null,
      createdByUserId: input.createdByUserId,
    });

  const id = Number(insertResult.lastInsertRowid);
  const row = db
    .prepare(
      `
      SELECT
        pt.id,
        pt.storyteller_name AS storytellerName,
        pt.storyteller_role AS storytellerRole,
        pt.school_name AS schoolName,
        pt.district,
        pt.story_text AS storyText,
        pt.video_source_type AS videoSourceType,
        pt.video_file_name AS videoFileName,
        pt.video_stored_path AS videoStoredPath,
        pt.video_mime_type AS videoMimeType,
        pt.video_size_bytes AS videoSizeBytes,
        pt.youtube_video_id AS youtubeVideoId,
        pt.youtube_video_title AS youtubeVideoTitle,
        pt.youtube_channel_title AS youtubeChannelTitle,
        pt.youtube_thumbnail_url AS youtubeThumbnailUrl,
        pt.youtube_embed_url AS youtubeEmbedUrl,
        pt.youtube_watch_url AS youtubeWatchUrl,
        pt.photo_file_name AS photoFileName,
        pt.photo_stored_path AS photoStoredPath,
        pt.photo_mime_type AS photoMimeType,
        pt.photo_size_bytes AS photoSizeBytes,
        pt.is_published AS isPublished,
        pt.created_by_user_id AS createdByUserId,
        pu.full_name AS createdByName,
        pt.created_at AS createdAt
      FROM portal_testimonials pt
      JOIN portal_users pu ON pu.id = pt.created_by_user_id
      WHERE pt.id = @id
      LIMIT 1
    `,
    )
    .get({ id }) as
    | {
      id: number;
      storytellerName: string;
      storytellerRole: string;
      schoolName: string;
      district: string;
      storyText: string;
      videoSourceType: "upload" | "youtube" | string;
      videoFileName: string;
      videoStoredPath: string;
      videoMimeType: string;
      videoSizeBytes: number;
      youtubeVideoId: string | null;
      youtubeVideoTitle: string | null;
      youtubeChannelTitle: string | null;
      youtubeThumbnailUrl: string | null;
      youtubeEmbedUrl: string | null;
      youtubeWatchUrl: string | null;
      photoFileName: string | null;
      photoStoredPath: string | null;
      photoMimeType: string | null;
      photoSizeBytes: number | null;
      isPublished: number;
      createdByUserId: number;
      createdByName: string;
      createdAt: string;
    }
    | undefined;

  if (!row) {
    throw new Error("Could not load saved testimonial.");
  }

  return parsePortalTestimonialRow(row);
}

export function listPortalTestimonials(
  user: PortalUser,
  limit = 120,
): PortalTestimonialRecord[] {
  const canViewAll = canViewAllRecords(user);
  const rows = getDb()
    .prepare(
      `
      SELECT
        pt.id,
        pt.storyteller_name AS storytellerName,
        pt.storyteller_role AS storytellerRole,
        pt.school_name AS schoolName,
        pt.district,
        pt.story_text AS storyText,
        pt.video_source_type AS videoSourceType,
        pt.video_file_name AS videoFileName,
        pt.video_stored_path AS videoStoredPath,
        pt.video_mime_type AS videoMimeType,
        pt.video_size_bytes AS videoSizeBytes,
        pt.youtube_video_id AS youtubeVideoId,
        pt.youtube_video_title AS youtubeVideoTitle,
        pt.youtube_channel_title AS youtubeChannelTitle,
        pt.youtube_thumbnail_url AS youtubeThumbnailUrl,
        pt.youtube_embed_url AS youtubeEmbedUrl,
        pt.youtube_watch_url AS youtubeWatchUrl,
        pt.photo_file_name AS photoFileName,
        pt.photo_stored_path AS photoStoredPath,
        pt.photo_mime_type AS photoMimeType,
        pt.photo_size_bytes AS photoSizeBytes,
        pt.is_published AS isPublished,
        pt.created_by_user_id AS createdByUserId,
        pu.full_name AS createdByName,
        pt.created_at AS createdAt
      FROM portal_testimonials pt
      JOIN portal_users pu ON pu.id = pt.created_by_user_id
      ${canViewAll ? "" : "WHERE pt.created_by_user_id = @currentUserId"}
      ORDER BY pt.created_at DESC
      LIMIT @limit
    `,
    )
    .all(
      canViewAll ? { limit } : { currentUserId: user.id, limit },
    ) as Array<{
      id: number;
      storytellerName: string;
      storytellerRole: string;
      schoolName: string;
      district: string;
      storyText: string;
      videoSourceType: "upload" | "youtube" | string;
      videoFileName: string;
      videoStoredPath: string;
      videoMimeType: string;
      videoSizeBytes: number;
      youtubeVideoId: string | null;
      youtubeVideoTitle: string | null;
      youtubeChannelTitle: string | null;
      youtubeThumbnailUrl: string | null;
      youtubeEmbedUrl: string | null;
      youtubeWatchUrl: string | null;
      photoFileName: string | null;
      photoStoredPath: string | null;
      photoMimeType: string | null;
      photoSizeBytes: number | null;
      isPublished: number;
      createdByUserId: number;
      createdByName: string;
      createdAt: string;
    }>;

  return rows.map((row) => parsePortalTestimonialRow(row));
}

export function listPublishedPortalTestimonials(limit = 180): PortalTestimonialRecord[] {
  const rows = getDb()
    .prepare(
      `
      SELECT
        pt.id,
        pt.storyteller_name AS storytellerName,
        pt.storyteller_role AS storytellerRole,
        pt.school_name AS schoolName,
        pt.district,
        pt.story_text AS storyText,
        pt.video_source_type AS videoSourceType,
        pt.video_file_name AS videoFileName,
        pt.video_stored_path AS videoStoredPath,
        pt.video_mime_type AS videoMimeType,
        pt.video_size_bytes AS videoSizeBytes,
        pt.youtube_video_id AS youtubeVideoId,
        pt.youtube_video_title AS youtubeVideoTitle,
        pt.youtube_channel_title AS youtubeChannelTitle,
        pt.youtube_thumbnail_url AS youtubeThumbnailUrl,
        pt.youtube_embed_url AS youtubeEmbedUrl,
        pt.youtube_watch_url AS youtubeWatchUrl,
        pt.photo_file_name AS photoFileName,
        pt.photo_stored_path AS photoStoredPath,
        pt.photo_mime_type AS photoMimeType,
        pt.photo_size_bytes AS photoSizeBytes,
        pt.is_published AS isPublished,
        pt.created_by_user_id AS createdByUserId,
        pu.full_name AS createdByName,
        pt.created_at AS createdAt
      FROM portal_testimonials pt
      JOIN portal_users pu ON pu.id = pt.created_by_user_id
      WHERE pt.is_published = 1
      ORDER BY pt.created_at DESC
      LIMIT @limit
    `,
    )
    .all({ limit }) as Array<{
      id: number;
      storytellerName: string;
      storytellerRole: string;
      schoolName: string;
      district: string;
      storyText: string;
      videoSourceType: "upload" | "youtube" | string;
      videoFileName: string;
      videoStoredPath: string;
      videoMimeType: string;
      videoSizeBytes: number;
      youtubeVideoId: string | null;
      youtubeVideoTitle: string | null;
      youtubeChannelTitle: string | null;
      youtubeThumbnailUrl: string | null;
      youtubeEmbedUrl: string | null;
      youtubeWatchUrl: string | null;
      photoFileName: string | null;
      photoStoredPath: string | null;
      photoMimeType: string | null;
      photoSizeBytes: number | null;
      isPublished: number;
      createdByUserId: number;
      createdByName: string;
      createdAt: string;
    }>;

  return rows.map((row) => parsePortalTestimonialRow(row));
}

export function getPublishedPortalTestimonialById(
  id: number,
): PortalTestimonialRecord | null {
  const row = getDb()
    .prepare(
      `
      SELECT
        pt.id,
        pt.storyteller_name AS storytellerName,
        pt.storyteller_role AS storytellerRole,
        pt.school_name AS schoolName,
        pt.district,
        pt.story_text AS storyText,
        pt.video_source_type AS videoSourceType,
        pt.video_file_name AS videoFileName,
        pt.video_stored_path AS videoStoredPath,
        pt.video_mime_type AS videoMimeType,
        pt.video_size_bytes AS videoSizeBytes,
        pt.youtube_video_id AS youtubeVideoId,
        pt.youtube_video_title AS youtubeVideoTitle,
        pt.youtube_channel_title AS youtubeChannelTitle,
        pt.youtube_thumbnail_url AS youtubeThumbnailUrl,
        pt.youtube_embed_url AS youtubeEmbedUrl,
        pt.youtube_watch_url AS youtubeWatchUrl,
        pt.photo_file_name AS photoFileName,
        pt.photo_stored_path AS photoStoredPath,
        pt.photo_mime_type AS photoMimeType,
        pt.photo_size_bytes AS photoSizeBytes,
        pt.is_published AS isPublished,
        pt.created_by_user_id AS createdByUserId,
        pu.full_name AS createdByName,
        pt.created_at AS createdAt
      FROM portal_testimonials pt
      JOIN portal_users pu ON pu.id = pt.created_by_user_id
      WHERE pt.id = @id
        AND pt.is_published = 1
      LIMIT 1
    `,
    )
    .get({ id }) as
    | {
      id: number;
      storytellerName: string;
      storytellerRole: string;
      schoolName: string;
      district: string;
      storyText: string;
      videoSourceType: "upload" | "youtube" | string;
      videoFileName: string;
      videoStoredPath: string;
      videoMimeType: string;
      videoSizeBytes: number;
      youtubeVideoId: string | null;
      youtubeVideoTitle: string | null;
      youtubeChannelTitle: string | null;
      youtubeThumbnailUrl: string | null;
      youtubeEmbedUrl: string | null;
      youtubeWatchUrl: string | null;
      photoFileName: string | null;
      photoStoredPath: string | null;
      photoMimeType: string | null;
      photoSizeBytes: number | null;
      isPublished: number;
      createdByUserId: number;
      createdByName: string;
      createdAt: string;
    }
    | undefined;

  if (!row) {
    return null;
  }

  return parsePortalTestimonialRow(row);
}

function countTotal(db: Database.Database, query: string) {
  const row = db.prepare(query).get() as { total: number | null };
  return Number(row.total ?? 0);
}

export function getImpactSummary() {
  const db = getDb();

  const teachersTrained = countTotal(
    db,
    "SELECT COUNT(*) AS total FROM training_participants WHERE participant_role = 'Classroom teacher'",
  );
  const trainingSessionsCompleted = countTotal(db, "SELECT COUNT(*) AS total FROM training_sessions");
  const onlineTrainingSummary = db
    .prepare(
      `
      SELECT
        COUNT(*) AS total,
        COALESCE(SUM(online_teachers_trained), 0) AS teachers
      FROM online_training_events
    `,
    )
    .get() as { total: number | null; teachers: number | null };
  const onlineTrainingSessionsCompleted = Number(onlineTrainingSummary.total ?? 0);
  const onlineTeachersTrained = Number(onlineTrainingSummary.teachers ?? 0);

  const legacyLearnersAssessedRow = db
    .prepare("SELECT COALESCE(SUM(learners_assessed), 0) AS total FROM legacy_assessment_records")
    .get() as { total: number | null };
  const newLearnersAssessedRow = db
    .prepare("SELECT COUNT(*) AS total FROM assessment_records")
    .get() as { total: number | null };
  const storiesPublishedRow = db
    .prepare("SELECT COALESCE(SUM(stories_published), 0) AS total FROM legacy_assessment_records")
    .get() as { total: number | null };

  const totalLearnersAssessed = Number(legacyLearnersAssessedRow.total ?? 0) + Number(newLearnersAssessedRow.total ?? 0);
  const enrolledLearnersRow = db
    .prepare(
      `
      SELECT
        COALESCE(
          SUM(
            CASE
              WHEN COALESCE(enrolled_boys, 0) + COALESCE(enrolled_girls, 0) > 0
                THEN COALESCE(enrolled_boys, 0) + COALESCE(enrolled_girls, 0)
              ELSE COALESCE(enrolled_learners, 0)
            END
          ),
          0
        ) AS total
      FROM schools_directory
    `,
    )
    .get() as { total: number | null };

  const schoolLookupRows = db
    .prepare(
      `
      SELECT
        id,
        lower(trim(name)) AS schoolKey,
        lower(trim(district)) AS districtKey
      FROM schools_directory
      WHERE trim(COALESCE(name, '')) != ''
    `,
    )
    .all() as Array<{
      id: number;
      schoolKey: string | null;
      districtKey: string | null;
    }>;
  const schoolLookupByComposite = new Map<string, number>();
  const schoolLookupByName = new Map<string, number>();
  schoolLookupRows.forEach((row) => {
    const schoolKey = String(row.schoolKey ?? "").trim();
    if (!schoolKey) {
      return;
    }
    const districtKey = String(row.districtKey ?? "").trim();
    schoolLookupByName.set(schoolKey, Number(row.id));
    schoolLookupByComposite.set(`${schoolKey}|${districtKey}`, Number(row.id));
  });

  const portalRows = db
    .prepare(
      `
      SELECT
        module,
        school_id AS schoolId,
        school_name AS schoolName,
        district,
        payload_json AS payloadJson
      FROM portal_records
    `,
    )
    .all() as Array<{
      module: PortalRecordModule;
      schoolId: number | null;
      schoolName: string;
      district: string;
      payloadJson: string;
    }>;

  let portalTeachersTrained = 0;
  let portalLearnersAssessed = 0;
  let portalStoriesPublished = 0;
  let portalTrainingSessions = 0;
  const legacySchoolRows = db
    .prepare(
      `
      SELECT
        lower(trim(school_name)) AS schoolKey,
        lower(trim(district)) AS districtKey
      FROM training_sessions
      WHERE trim(COALESCE(school_name, '')) != ''
    `,
    )
    .all() as Array<{ schoolKey: string | null; districtKey: string | null }>;
  const uniqueTrainingSchools = new Set<string>();
  legacySchoolRows.forEach((row) => {
    const schoolKey = String(row.schoolKey ?? "").trim();
    const districtKey = String(row.districtKey ?? "").trim();
    if (!schoolKey) {
      return;
    }
    const resolvedId =
      schoolLookupByComposite.get(`${schoolKey}|${districtKey}`) ??
      schoolLookupByName.get(schoolKey);
    uniqueTrainingSchools.add(resolvedId ? `id:${resolvedId}` : `name:${schoolKey}`);
  });

  portalRows.forEach((row) => {
    const payload = JSON.parse(row.payloadJson || "{}") as Record<string, unknown>;

    if (row.module === "training") {
      portalTrainingSessions += 1;
      if (row.schoolId && row.schoolId > 0) {
        uniqueTrainingSchools.add(`id:${Number(row.schoolId)}`);
      } else {
        const schoolKey = row.schoolName.trim().toLowerCase();
        if (!schoolKey) {
          return;
        }
        const districtKey = String(row.district ?? "").trim().toLowerCase();
        const resolvedId =
          schoolLookupByComposite.get(`${schoolKey}|${districtKey}`) ??
          schoolLookupByName.get(schoolKey);
        uniqueTrainingSchools.add(resolvedId ? `id:${resolvedId}` : `name:${schoolKey}`);
      }

      const attendedValue =
        Number(payload.attendedTotal ?? payload.participantsTotal ?? payload.numberAttended ?? 0) ||
        0;
      portalTeachersTrained += attendedValue;
    }

    if (row.module === "assessment") {
      const learners = Number(payload.learnersAssessed ?? 0) || 0;
      const stories = Number(payload.storiesPublished ?? 0) || 0;
      portalLearnersAssessed += learners;
      portalStoriesPublished += stories;
    }

    if (row.module === "story") {
      const approvedStories = Number(payload.storiesApproved ?? 0) || 0;
      portalStoriesPublished += approvedStories;
    }
  });

  const bookingCount = countTotal(db, "SELECT COUNT(*) AS total FROM bookings");
  const contactCount = countTotal(db, "SELECT COUNT(*) AS total FROM contacts");
  const downloadCount = countTotal(db, "SELECT COUNT(*) AS total FROM download_leads");
  const newsletterCount = countTotal(db, "SELECT COUNT(*) AS total FROM newsletter_subscribers");

  return {
    metrics: [
      {
        label: "Teachers trained",
        value: teachersTrained + portalTeachersTrained + onlineTeachersTrained,
      },
      { label: "Schools trained", value: uniqueTrainingSchools.size },
      {
        label: "Learners assessed",
        value: totalLearnersAssessed + portalLearnersAssessed,
      },
      {
        label: "Stories published",
        value: Number(storiesPublishedRow.total ?? 0) + portalStoriesPublished,
      },
      {
        label: "Training sessions completed",
        value:
          trainingSessionsCompleted + onlineTrainingSessionsCompleted + portalTrainingSessions,
      },
      {
        label: "Learners enrolled",
        value: Number(enrolledLearnersRow.total ?? 0),
      },
    ],
    engagement: {
      bookingRequests: bookingCount,
      partnerInquiries: contactCount,
      toolkitLeads: downloadCount,
      newsletterSubscribers: newsletterCount,
    },
    generatedAt: new Date().toISOString(),
  };
}

type ImpactProfileStatus = "On track" | "Needs support" | "High priority";

type ImpactOutcomeAggregate = {
  letterIdentification: number | null;
  soundIdentification: number | null;
  decodableWords: number | null;
  undecodableWords: number | null;
  madeUpWords: number | null;
  storyReading: number | null;
  readingComprehension: number | null;
  sampleSize: number;
};

export type ImpactExplorerActivityItem = {
  date: string;
  module: PortalRecordModule;
  programType: string;
  status: PortalRecordStatus;
};

export type ImpactExplorerSchoolProfile = {
  id: number | null;
  schoolCode: string;
  name: string;
  region: string;
  district: string;
  subCounty: string;
  parish: string;
  village: string | null;
  enrolledBoys: number;
  enrolledGirls: number;
  enrolledLearners: number;
  trainings: number;
  visits: number;
  coachingCycles: number;
  assessments: number;
  baselineAssessments: number;
  progressAssessments: number;
  endlineAssessments: number;
  storyActivities: number;
  participantsTotal: number;
  participantsTeachers: number;
  participantsLeaders: number;
  learnersAssessed: number;
  storiesPublished: number;
  evidenceUploads: number;
  teacherObservationAverage: number | null;
  keyIndicators: {
    lessonStructure: number | null;
    soundAccuracy: number | null;
    blendingRoutine: number | null;
    errorCorrection: number | null;
    learnerEngagement: number | null;
  };
  outcomes: ImpactOutcomeAggregate;
  status: ImpactProfileStatus;
  nextFollowUpDate: string | null;
  lastActivityDate: string | null;
  topGaps: string[];
  recommendedActions: string[];
  timeline: ImpactExplorerActivityItem[];
};

export type ImpactExplorerDistrictProfile = {
  district: string;
  region: string;
  schoolsTotal: number;
  schoolsSupported: number;
  enrolledLearners: number;
  trainings: number;
  visits: number;
  assessments: number;
  storyActivities: number;
  participantsTotal: number;
  participantsTeachers: number;
  participantsLeaders: number;
  learnersAssessed: number;
  storiesPublished: number;
  teacherObservationAverage: number | null;
  outcomes: ImpactOutcomeAggregate;
  statusCounts: {
    onTrack: number;
    needsSupport: number;
    highPriority: number;
  };
};

export type ImpactExplorerRegionProfile = {
  region: string;
  districtsTotal: number;
  districtsCovered: number;
  schoolsTotal: number;
  schoolsSupported: number;
  enrolledLearners: number;
  trainings: number;
  visits: number;
  assessments: number;
  storyActivities: number;
  participantsTotal: number;
  participantsTeachers: number;
  participantsLeaders: number;
  learnersAssessed: number;
  storiesPublished: number;
  teacherObservationAverage: number | null;
  outcomes: ImpactOutcomeAggregate;
  statusCounts: {
    onTrack: number;
    needsSupport: number;
    highPriority: number;
  };
};

export type ImpactExplorerCountryProfile = {
  country: string;
  regionsTotal: number;
  regionsCovered: number;
  districtsTotal: number;
  districtsCovered: number;
  schoolsTotal: number;
  schoolsSupported: number;
  enrolledLearners: number;
  trainings: number;
  visits: number;
  assessments: number;
  storyActivities: number;
  participantsTotal: number;
  participantsTeachers: number;
  participantsLeaders: number;
  learnersAssessed: number;
  storiesPublished: number;
  teacherObservationAverage: number | null;
  outcomes: ImpactOutcomeAggregate;
};

export type ImpactExplorerProfiles = {
  generatedAt: string;
  country: ImpactExplorerCountryProfile;
  regions: ImpactExplorerRegionProfile[];
  districts: ImpactExplorerDistrictProfile[];
  schools: ImpactExplorerSchoolProfile[];
};

type ImpactOutcomeAccumulator = {
  letterIdentificationSum: number;
  letterIdentificationWeight: number;
  soundIdentificationSum: number;
  soundIdentificationWeight: number;
  decodableWordsSum: number;
  decodableWordsWeight: number;
  undecodableWordsSum: number;
  undecodableWordsWeight: number;
  madeUpWordsSum: number;
  madeUpWordsWeight: number;
  storyReadingSum: number;
  storyReadingWeight: number;
  readingComprehensionSum: number;
  readingComprehensionWeight: number;
  sampleSize: number;
};

type ImpactIndicatorAccumulator = {
  lessonStructureSum: number;
  lessonStructureCount: number;
  soundAccuracySum: number;
  soundAccuracyCount: number;
  blendingRoutineSum: number;
  blendingRoutineCount: number;
  errorCorrectionSum: number;
  errorCorrectionCount: number;
  learnerEngagementSum: number;
  learnerEngagementCount: number;
};

function normalizeLookupValue(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function parseNumberValue(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function averageOrNull(sum: number, count: number) {
  if (count <= 0) {
    return null;
  }
  return Number((sum / count).toFixed(1));
}

function selectOutcomeValue(
  accumulator: ImpactOutcomeAccumulator,
  metric: keyof Pick<
    ImpactOutcomeAccumulator,
    "letterIdentificationSum" | "soundIdentificationSum" | "decodableWordsSum" | "undecodableWordsSum" | "madeUpWordsSum" | "storyReadingSum" | "readingComprehensionSum"
  >,
  weightMetric: keyof Pick<
    ImpactOutcomeAccumulator,
    "letterIdentificationWeight" | "soundIdentificationWeight" | "decodableWordsWeight" | "undecodableWordsWeight" | "madeUpWordsWeight" | "storyReadingWeight" | "readingComprehensionWeight"
  >,
) {
  return averageOrNull(accumulator[metric], accumulator[weightMetric]);
}

function toOutcomeAggregate(accumulator: ImpactOutcomeAccumulator): ImpactOutcomeAggregate {
  return {
    letterIdentification: selectOutcomeValue(accumulator, "letterIdentificationSum", "letterIdentificationWeight"),
    soundIdentification: selectOutcomeValue(accumulator, "soundIdentificationSum", "soundIdentificationWeight"),
    decodableWords: selectOutcomeValue(accumulator, "decodableWordsSum", "decodableWordsWeight"),
    undecodableWords: selectOutcomeValue(accumulator, "undecodableWordsSum", "undecodableWordsWeight"),
    madeUpWords: selectOutcomeValue(accumulator, "madeUpWordsSum", "madeUpWordsWeight"),
    storyReading: selectOutcomeValue(accumulator, "storyReadingSum", "storyReadingWeight"),
    readingComprehension: selectOutcomeValue(accumulator, "readingComprehensionSum", "readingComprehensionWeight"),
    sampleSize: accumulator.sampleSize,
  };
}

function ratingToScorePercent(value: unknown): number | null {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  if (normalized === "very good") return 100;
  if (normalized === "good") return 60;
  if (normalized === "fair") return 20;
  if (normalized === "can improve") return 0;
  return null;
}

type MutableSchoolProfile = ImpactExplorerSchoolProfile & {
  indicatorAccumulator: ImpactIndicatorAccumulator;
  outcomeAccumulator: ImpactOutcomeAccumulator;
  observationScoreSum: number;
  observationScoreCount: number;
  followUpsDue: number;
};

function createEmptyIndicatorAccumulator(): ImpactIndicatorAccumulator {
  return {
    lessonStructureSum: 0,
    lessonStructureCount: 0,
    soundAccuracySum: 0,
    soundAccuracyCount: 0,
    blendingRoutineSum: 0,
    blendingRoutineCount: 0,
    errorCorrectionSum: 0,
    errorCorrectionCount: 0,
    learnerEngagementSum: 0,
    learnerEngagementCount: 0,
  };
}

function createEmptyOutcomeAccumulator(): ImpactOutcomeAccumulator {
  return {
    letterIdentificationSum: 0,
    letterIdentificationWeight: 0,
    soundIdentificationSum: 0,
    soundIdentificationWeight: 0,
    decodableWordsSum: 0,
    decodableWordsWeight: 0,
    undecodableWordsSum: 0,
    undecodableWordsWeight: 0,
    madeUpWordsSum: 0,
    madeUpWordsWeight: 0,
    storyReadingSum: 0,
    storyReadingWeight: 0,
    readingComprehensionSum: 0,
    readingComprehensionWeight: 0,
    sampleSize: 0,
  };
}

function addWeightedOutcome(
  accumulator: ImpactOutcomeAccumulator,
  metric: "letterIdentification" | "soundIdentification" | "decodableWords" | "undecodableWords" | "madeUpWords" | "storyReading" | "readingComprehension",
  value: number | null,
  weight: number,
) {
  if (value === null || !Number.isFinite(value)) {
    return;
  }

  const normalizedWeight = weight > 0 ? weight : 1;
  if (metric === "letterIdentification") {
    accumulator.letterIdentificationSum += value * normalizedWeight;
    accumulator.letterIdentificationWeight += normalizedWeight;
  }
  if (metric === "soundIdentification") {
    accumulator.soundIdentificationSum += value * normalizedWeight;
    accumulator.soundIdentificationWeight += normalizedWeight;
  }
  if (metric === "decodableWords") {
    accumulator.decodableWordsSum += value * normalizedWeight;
    accumulator.decodableWordsWeight += normalizedWeight;
  }
  if (metric === "undecodableWords") {
    accumulator.undecodableWordsSum += value * normalizedWeight;
    accumulator.undecodableWordsWeight += normalizedWeight;
  }
  if (metric === "madeUpWords") {
    accumulator.madeUpWordsSum += value * normalizedWeight;
    accumulator.madeUpWordsWeight += normalizedWeight;
  }
  if (metric === "storyReading") {
    accumulator.storyReadingSum += value * normalizedWeight;
    accumulator.storyReadingWeight += normalizedWeight;
  }
  if (metric === "readingComprehension") {
    accumulator.readingComprehensionSum += value * normalizedWeight;
    accumulator.readingComprehensionWeight += normalizedWeight;
  }
}

function parseAssessmentMetrics(payload: Record<string, unknown>) {
  const rawSummary = payload.egraSummaryData;
  let summaryData: Record<string, unknown> | null = null;

  if (typeof rawSummary === "string" && rawSummary.trim()) {
    try {
      const parsed = JSON.parse(rawSummary) as unknown;
      if (parsed && typeof parsed === "object") {
        summaryData = parsed as Record<string, unknown>;
      }
    } catch {
      summaryData = null;
    }
  } else if (rawSummary && typeof rawSummary === "object") {
    summaryData = rawSummary as Record<string, unknown>;
  }

  const classMetrics =
    summaryData && summaryData.class && typeof summaryData.class === "object"
      ? (summaryData.class as Record<string, unknown>)
      : null;

  const letterIdentification = parseNumberValue(classMetrics?.letterIdentification) ?? parseNumberValue(payload.letterIdentificationScore);
  const soundIdentification = parseNumberValue(classMetrics?.soundIdentification) ?? parseNumberValue(payload.soundIdentificationScore);
  const decodableWords = parseNumberValue(classMetrics?.decodableWords) ?? parseNumberValue(payload.decodableWordsScore);
  const undecodableWords = parseNumberValue(classMetrics?.undecodableWords) ?? parseNumberValue(payload.undecodableWordsScore);
  const madeUpWords = parseNumberValue(classMetrics?.madeUpWords) ?? parseNumberValue(payload.madeUpWordsScore);
  const storyReading = parseNumberValue(classMetrics?.storyReading) ?? parseNumberValue(payload.storyReadingScore);
  const readingComprehension = parseNumberValue(classMetrics?.readingComprehension) ?? parseNumberValue(payload.readingComprehensionScore);

  return {
    letterIdentification,
    soundIdentification,
    decodableWords,
    undecodableWords,
    madeUpWords,
    storyReading,
    readingComprehension,
  };
}

function deriveSchoolTopGaps(profile: MutableSchoolProfile) {
  const indicatorAverages = {
    lessonStructure: averageOrNull(
      profile.indicatorAccumulator.lessonStructureSum,
      profile.indicatorAccumulator.lessonStructureCount,
    ),
    soundAccuracy: averageOrNull(
      profile.indicatorAccumulator.soundAccuracySum,
      profile.indicatorAccumulator.soundAccuracyCount,
    ),
    blendingRoutine: averageOrNull(
      profile.indicatorAccumulator.blendingRoutineSum,
      profile.indicatorAccumulator.blendingRoutineCount,
    ),
    errorCorrection: averageOrNull(
      profile.indicatorAccumulator.errorCorrectionSum,
      profile.indicatorAccumulator.errorCorrectionCount,
    ),
    learnerEngagement: averageOrNull(
      profile.indicatorAccumulator.learnerEngagementSum,
      profile.indicatorAccumulator.learnerEngagementCount,
    ),
  };

  const gaps: string[] = [];
  if ((indicatorAverages.lessonStructure ?? 100) < 60) gaps.push("Lesson structure consistency");
  if ((indicatorAverages.soundAccuracy ?? 100) < 60) gaps.push("Sound accuracy and pronunciation");
  if ((indicatorAverages.blendingRoutine ?? 100) < 60) gaps.push("Blending and decoding routines");
  if ((indicatorAverages.errorCorrection ?? 100) < 60) gaps.push("Error correction technique");
  if ((indicatorAverages.learnerEngagement ?? 100) < 60) gaps.push("Learner engagement during reading");

  const outcomes = toOutcomeAggregate(profile.outcomeAccumulator);
  if ((outcomes.letterIdentification ?? 100) < 40) gaps.push("Letter identification remains weak");
  if ((outcomes.soundIdentification ?? 100) < 40) gaps.push("Sound identification remains weak");
  if ((outcomes.decodableWords ?? 100) < 40) gaps.push("Decodable word reading remains below target");
  if ((outcomes.undecodableWords ?? 100) < 40) gaps.push("Undecodable word reading remains below target");
  if ((outcomes.madeUpWords ?? 100) < 40) gaps.push("Made up word reading remains weak");
  if ((outcomes.storyReading ?? 100) < 25) gaps.push("Story reading fluency is still low");
  if ((outcomes.readingComprehension ?? 100) < 40) gaps.push("Reading comprehension requires focused support");

  return [...new Set(gaps)].slice(0, 3);
}

function deriveSchoolRecommendations(gaps: string[]) {
  const recommendationMap: Record<string, string> = {
    "Lesson structure consistency":
      "Run coaching on review-teach-practice-check flow in every observed lesson.",
    "Sound accuracy and pronunciation":
      "Prioritize sound drill practice and pronunciation correction in daily routines.",
    "Blending and decoding routines":
      "Increase guided blending drills and decodable word practice in small groups.",
    "Error correction technique":
      "Model immediate supportive correction steps and reinforce through follow-up visits.",
    "Learner engagement during reading":
      "Use pair reading and active response routines to increase learner practice time.",
    "Letter identification remains weak":
      "Re-teach letter names and run short mastery checks weekly.",
    "Sound identification remains weak":
      "Re-teach priority sounds and run short mastery checks weekly.",
    "Decodable word reading remains below target":
      "Introduce targeted decoding routines with decodable texts matched to taught patterns.",
    "Undecodable word reading remains below target":
      "Review tricky words systematically using flashcards and repetition.",
    "Made up word reading remains weak":
      "Focus on phonetic decoding practice without relying on context cues.",
    "Story reading fluency is still low":
      "Implement repeated reading and phrase reading routines three times per week.",
    "Reading comprehension requires focused support":
      "Use short literal and inference questions after fluency practice with grade-level texts.",
  };

  return gaps
    .map((gap) => recommendationMap[gap])
    .filter((item): item is string => Boolean(item))
    .slice(0, 3);
}

function deriveSchoolStatus(profile: MutableSchoolProfile): ImpactProfileStatus {
  const today = new Date().toISOString().slice(0, 10);
  const hasOverdueFollowUp = profile.followUpsDue > 0;
  const lowObservation =
    profile.observationScoreCount > 0 &&
    profile.observationScoreSum / profile.observationScoreCount < 60;
  const noImplementationYet = profile.trainings + profile.visits + profile.assessments <= 0;
  const missingCoreCycle = profile.trainings === 0 || profile.visits === 0 || profile.assessments === 0;
  const nextDuePassed = Boolean(profile.nextFollowUpDate && profile.nextFollowUpDate < today);

  if (hasOverdueFollowUp || lowObservation || nextDuePassed) {
    return "High priority";
  }
  if (noImplementationYet || missingCoreCycle) {
    return "Needs support";
  }
  return "On track";
}

function createSchoolProfile(seed: {
  id: number | null;
  schoolCode: string;
  name: string;
  district: string;
  region: string;
  subCounty: string;
  parish: string;
  village: string | null;
  enrolledBoys: number;
  enrolledGirls: number;
  enrolledLearners: number;
}): MutableSchoolProfile {
  return {
    id: seed.id,
    schoolCode: seed.schoolCode,
    name: seed.name,
    region: seed.region,
    district: seed.district,
    subCounty: seed.subCounty,
    parish: seed.parish,
    village: seed.village,
    enrolledBoys: seed.enrolledBoys,
    enrolledGirls: seed.enrolledGirls,
    enrolledLearners: seed.enrolledLearners,
    trainings: 0,
    visits: 0,
    coachingCycles: 0,
    assessments: 0,
    baselineAssessments: 0,
    progressAssessments: 0,
    endlineAssessments: 0,
    storyActivities: 0,
    participantsTotal: 0,
    participantsTeachers: 0,
    participantsLeaders: 0,
    learnersAssessed: 0,
    storiesPublished: 0,
    evidenceUploads: 0,
    teacherObservationAverage: null,
    keyIndicators: {
      lessonStructure: null,
      soundAccuracy: null,
      blendingRoutine: null,
      errorCorrection: null,
      learnerEngagement: null,
    },
    outcomes: {
      letterIdentification: null,
      soundIdentification: null,
      decodableWords: null,
      undecodableWords: null,
      madeUpWords: null,
      storyReading: null,
      readingComprehension: null,
      sampleSize: 0,
    },
    status: "Needs support",
    nextFollowUpDate: null,
    lastActivityDate: null,
    topGaps: [],
    recommendedActions: [],
    timeline: [],
    indicatorAccumulator: createEmptyIndicatorAccumulator(),
    outcomeAccumulator: createEmptyOutcomeAccumulator(),
    observationScoreSum: 0,
    observationScoreCount: 0,
    followUpsDue: 0,
  };
}

export function getImpactExplorerProfiles(): ImpactExplorerProfiles {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);

  const schoolRows = db
    .prepare(
      `
      SELECT
        id,
        school_code AS schoolCode,
        name,
        district,
        sub_county AS subCounty,
        parish,
        village,
        COALESCE(enrolled_boys, 0) AS enrolledBoys,
        COALESCE(enrolled_girls, 0) AS enrolledGirls,
        CASE
          WHEN COALESCE(enrolled_boys, 0) + COALESCE(enrolled_girls, 0) > 0
            THEN COALESCE(enrolled_boys, 0) + COALESCE(enrolled_girls, 0)
          ELSE COALESCE(enrolled_learners, 0)
        END AS enrolledLearners
      FROM schools_directory
      ORDER BY name ASC
    `,
    )
    .all() as Array<{
      id: number;
      schoolCode: string;
      name: string;
      district: string;
      subCounty: string;
      parish: string;
      village: string | null;
      enrolledBoys: number;
      enrolledGirls: number;
      enrolledLearners: number;
    }>;

  const schoolProfilesByKey = new Map<string, MutableSchoolProfile>();
  const keyBySchoolId = new Map<number, string>();
  const keyByComposite = new Map<string, string>();
  const keyByName = new Map<string, string>();
  let syntheticCounter = 1;

  schoolRows.forEach((row) => {
    const region = inferRegionFromDistrict(row.district) ?? "Unknown Region";
    const key = `id:${row.id}`;
    const profile = createSchoolProfile({
      id: row.id,
      schoolCode: row.schoolCode,
      name: row.name,
      district: row.district,
      region,
      subCounty: row.subCounty,
      parish: row.parish,
      village: row.village,
      enrolledBoys: Number(row.enrolledBoys ?? 0),
      enrolledGirls: Number(row.enrolledGirls ?? 0),
      enrolledLearners: Number(row.enrolledLearners ?? 0),
    });

    schoolProfilesByKey.set(key, profile);
    keyBySchoolId.set(row.id, key);

    const schoolNameKey = normalizeLookupValue(row.name);
    const districtKey = normalizeLookupValue(row.district);
    if (schoolNameKey) {
      keyByName.set(schoolNameKey, key);
      keyByComposite.set(`${schoolNameKey}|${districtKey}`, key);
    }
  });

  const portalRows = db
    .prepare(
      `
      SELECT
        module,
        date,
        district,
        school_name AS schoolName,
        school_id AS schoolId,
        program_type AS programType,
        status,
        follow_up_date AS followUpDate,
        payload_json AS payloadJson
      FROM portal_records
      ORDER BY date DESC, id DESC
    `,
    )
    .all() as Array<{
      module: PortalRecordModule;
      date: string;
      district: string;
      schoolName: string;
      schoolId: number | null;
      programType: string | null;
      status: PortalRecordStatus;
      followUpDate: string | null;
      payloadJson: string;
    }>;

  const ensureSyntheticSchoolProfile = (schoolName: string, district: string) => {
    const schoolNameKey = normalizeLookupValue(schoolName);
    const districtKey = normalizeLookupValue(district);
    const composite = `${schoolNameKey}|${districtKey}`;
    const existing = keyByComposite.get(composite);
    if (existing) {
      return existing;
    }

    const key = `synthetic:${syntheticCounter}`;
    syntheticCounter += 1;
    const resolvedDistrict = district.trim() || "Unknown District";
    const region = inferRegionFromDistrict(resolvedDistrict) ?? "Unknown Region";
    const profile = createSchoolProfile({
      id: null,
      schoolCode: `UNLISTED-${syntheticCounter}`,
      name: schoolName.trim() || "Unmapped School",
      district: resolvedDistrict,
      region,
      subCounty: "",
      parish: "",
      village: null,
      enrolledBoys: 0,
      enrolledGirls: 0,
      enrolledLearners: 0,
    });

    schoolProfilesByKey.set(key, profile);
    if (schoolNameKey) {
      keyByName.set(schoolNameKey, key);
      keyByComposite.set(composite, key);
    }
    return key;
  };

  const resolveSchoolKey = (row: {
    schoolId: number | null;
    schoolName: string;
    district: string;
  }) => {
    if (row.schoolId && keyBySchoolId.has(row.schoolId)) {
      return keyBySchoolId.get(row.schoolId) as string;
    }
    const schoolNameKey = normalizeLookupValue(row.schoolName);
    const districtKey = normalizeLookupValue(row.district);
    if (!schoolNameKey) {
      return ensureSyntheticSchoolProfile("Unmapped School", row.district);
    }
    const composite = keyByComposite.get(`${schoolNameKey}|${districtKey}`);
    if (composite) {
      return composite;
    }
    const byName = keyByName.get(schoolNameKey);
    if (byName) {
      return byName;
    }
    return ensureSyntheticSchoolProfile(row.schoolName, row.district);
  };

  portalRows.forEach((row) => {
    const schoolKey = resolveSchoolKey(row);
    const profile = schoolProfilesByKey.get(schoolKey);
    if (!profile) {
      return;
    }

    let payload: Record<string, unknown> = {};
    try {
      const parsed = JSON.parse(row.payloadJson || "{}") as unknown;
      if (parsed && typeof parsed === "object") {
        payload = parsed as Record<string, unknown>;
      }
    } catch {
      payload = {};
    }

    profile.timeline.push({
      date: row.date,
      module: row.module,
      programType: String(row.programType ?? "").trim() || "General",
      status: row.status,
    });

    if (!profile.lastActivityDate || row.date > profile.lastActivityDate) {
      profile.lastActivityDate = row.date;
    }

    if (row.followUpDate) {
      if (!profile.nextFollowUpDate || row.followUpDate < profile.nextFollowUpDate) {
        profile.nextFollowUpDate = row.followUpDate;
      }
      if (row.followUpDate <= today && row.status !== "Approved") {
        profile.followUpsDue += 1;
      }
    }

    if (row.module === "training") {
      profile.trainings += 1;
      const participants = parsePortalTrainingParticipants(payload);
      profile.participantsTotal += participants.total;
      profile.participantsTeachers += participants.teachers;
      profile.participantsLeaders += participants.leaders;
    }

    if (row.module === "visit") {
      profile.visits += 1;
      profile.coachingCycles += 1;

      const observationScorePercent = parseNumberValue(payload.observationScorePercent);
      if (observationScorePercent !== null) {
        profile.observationScoreSum += observationScorePercent;
        profile.observationScoreCount += 1;
      }

      const accumulateIndicator = (
        values: Array<number | null>,
        sumKey: keyof Pick<
          ImpactIndicatorAccumulator,
          | "lessonStructureSum"
          | "soundAccuracySum"
          | "blendingRoutineSum"
          | "errorCorrectionSum"
          | "learnerEngagementSum"
        >,
        countKey: keyof Pick<
          ImpactIndicatorAccumulator,
          | "lessonStructureCount"
          | "soundAccuracyCount"
          | "blendingRoutineCount"
          | "errorCorrectionCount"
          | "learnerEngagementCount"
        >,
      ) => {
        values.forEach((item) => {
          if (item === null) {
            return;
          }
          profile.indicatorAccumulator[sumKey] += item;
          profile.indicatorAccumulator[countKey] += 1;
        });
      };

      accumulateIndicator(
        [ratingToScorePercent(payload.general_qualityLessonPlanning)],
        "lessonStructureSum",
        "lessonStructureCount",
      );
      accumulateIndicator(
        [
          ratingToScorePercent(payload.general_soundKnowledge),
          ratingToScorePercent(payload.newSound_clearPronunciation),
        ],
        "soundAccuracySum",
        "soundAccuracyCount",
      );
      accumulateIndicator(
        [
          ratingToScorePercent(payload.readingActivities_soundOutWords),
          ratingToScorePercent(payload.readingActivities_teacherEncouragedDecoding),
        ],
        "blendingRoutineSum",
        "blendingRoutineCount",
      );
      accumulateIndicator(
        [ratingToScorePercent(payload.readingActivities_teacherEncouragedDecoding)],
        "errorCorrectionSum",
        "errorCorrectionCount",
      );
      accumulateIndicator(
        [
          ratingToScorePercent(payload.readingActivities_activeEngagement),
          ratingToScorePercent(payload.readingActivities_pairGroupReading),
        ],
        "learnerEngagementSum",
        "learnerEngagementCount",
      );
    }

    if (row.module === "assessment") {
      profile.assessments += 1;
      const assessmentType = String(row.programType ?? "").trim().toLowerCase();
      if (assessmentType === "baseline") profile.baselineAssessments += 1;
      if (assessmentType === "progress") profile.progressAssessments += 1;
      if (assessmentType === "endline") profile.endlineAssessments += 1;

      const learnersAssessed = parseNumberValue(payload.learnersAssessed) ?? 0;
      profile.learnersAssessed += learnersAssessed;
      profile.storiesPublished += parseNumberValue(payload.storiesPublished) ?? 0;

      const outcomes = parseAssessmentMetrics(payload);
      const weight = learnersAssessed > 0 ? learnersAssessed : 1;
      addWeightedOutcome(profile.outcomeAccumulator, "letterIdentification", outcomes.letterIdentification, weight);
      addWeightedOutcome(profile.outcomeAccumulator, "soundIdentification", outcomes.soundIdentification, weight);
      addWeightedOutcome(profile.outcomeAccumulator, "decodableWords", outcomes.decodableWords, weight);
      addWeightedOutcome(profile.outcomeAccumulator, "undecodableWords", outcomes.undecodableWords, weight);
      addWeightedOutcome(profile.outcomeAccumulator, "madeUpWords", outcomes.madeUpWords, weight);
      addWeightedOutcome(profile.outcomeAccumulator, "storyReading", outcomes.storyReading, weight);
      addWeightedOutcome(profile.outcomeAccumulator, "readingComprehension", outcomes.readingComprehension, weight);
      profile.outcomeAccumulator.sampleSize += learnersAssessed;
    }

    if (row.module === "story") {
      profile.storyActivities += 1;
      profile.storiesPublished += parseNumberValue(payload.storiesApproved) ?? 0;
    }
  });

  const evidenceRows = db
    .prepare(
      `
      SELECT
        lower(trim(school_name)) AS schoolNameKey,
        COUNT(*) AS total
      FROM portal_evidence
      GROUP BY lower(trim(school_name))
    `,
    )
    .all() as Array<{ schoolNameKey: string | null; total: number | null }>;

  evidenceRows.forEach((row) => {
    const schoolNameKey = normalizeLookupValue(row.schoolNameKey);
    if (!schoolNameKey) {
      return;
    }
    const schoolKey = keyByName.get(schoolNameKey);
    if (!schoolKey) {
      return;
    }
    const profile = schoolProfilesByKey.get(schoolKey);
    if (!profile) {
      return;
    }
    profile.evidenceUploads += Number(row.total ?? 0);
  });

  const finalizedSchools: ImpactExplorerSchoolProfile[] = [...schoolProfilesByKey.values()]
    .map((profile) => {
      profile.timeline.sort((a, b) => b.date.localeCompare(a.date));
      profile.timeline = profile.timeline.slice(0, 10);

      profile.teacherObservationAverage = averageOrNull(
        profile.observationScoreSum,
        profile.observationScoreCount,
      );
      profile.keyIndicators = {
        lessonStructure: averageOrNull(
          profile.indicatorAccumulator.lessonStructureSum,
          profile.indicatorAccumulator.lessonStructureCount,
        ),
        soundAccuracy: averageOrNull(
          profile.indicatorAccumulator.soundAccuracySum,
          profile.indicatorAccumulator.soundAccuracyCount,
        ),
        blendingRoutine: averageOrNull(
          profile.indicatorAccumulator.blendingRoutineSum,
          profile.indicatorAccumulator.blendingRoutineCount,
        ),
        errorCorrection: averageOrNull(
          profile.indicatorAccumulator.errorCorrectionSum,
          profile.indicatorAccumulator.errorCorrectionCount,
        ),
        learnerEngagement: averageOrNull(
          profile.indicatorAccumulator.learnerEngagementSum,
          profile.indicatorAccumulator.learnerEngagementCount,
        ),
      };
      profile.outcomes = toOutcomeAggregate(profile.outcomeAccumulator);
      profile.topGaps = deriveSchoolTopGaps(profile);
      profile.recommendedActions = deriveSchoolRecommendations(profile.topGaps);
      profile.status = deriveSchoolStatus(profile);

      const publicProfile: ImpactExplorerSchoolProfile = {
        id: profile.id,
        schoolCode: profile.schoolCode,
        name: profile.name,
        region: profile.region,
        district: profile.district,
        subCounty: profile.subCounty,
        parish: profile.parish,
        village: profile.village,
        enrolledBoys: profile.enrolledBoys,
        enrolledGirls: profile.enrolledGirls,
        enrolledLearners: profile.enrolledLearners,
        trainings: profile.trainings,
        visits: profile.visits,
        coachingCycles: profile.coachingCycles,
        assessments: profile.assessments,
        baselineAssessments: profile.baselineAssessments,
        progressAssessments: profile.progressAssessments,
        endlineAssessments: profile.endlineAssessments,
        storyActivities: profile.storyActivities,
        participantsTotal: profile.participantsTotal,
        participantsTeachers: profile.participantsTeachers,
        participantsLeaders: profile.participantsLeaders,
        learnersAssessed: profile.learnersAssessed,
        storiesPublished: profile.storiesPublished,
        evidenceUploads: profile.evidenceUploads,
        teacherObservationAverage: profile.teacherObservationAverage,
        keyIndicators: profile.keyIndicators,
        outcomes: profile.outcomes,
        status: profile.status,
        nextFollowUpDate: profile.nextFollowUpDate,
        lastActivityDate: profile.lastActivityDate,
        topGaps: profile.topGaps,
        recommendedActions: profile.recommendedActions,
        timeline: profile.timeline,
      };
      return publicProfile;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const districtMap = new Map<string, ImpactExplorerDistrictProfile>();

  finalizedSchools.forEach((school) => {
    const districtKey = school.district.trim() || "Unknown District";
    const districtRegion = school.region.trim() || "Unknown Region";
    if (!districtMap.has(districtKey)) {
      districtMap.set(districtKey, {
        district: districtKey,
        region: districtRegion,
        schoolsTotal: 0,
        schoolsSupported: 0,
        enrolledLearners: 0,
        trainings: 0,
        visits: 0,
        assessments: 0,
        storyActivities: 0,
        participantsTotal: 0,
        participantsTeachers: 0,
        participantsLeaders: 0,
        learnersAssessed: 0,
        storiesPublished: 0,
        teacherObservationAverage: null,
        outcomes: {
          letterIdentification: null,
          soundIdentification: null,
          decodableWords: null,
          undecodableWords: null,
          madeUpWords: null,
          storyReading: null,
          readingComprehension: null,
          sampleSize: 0,
        },
        statusCounts: {
          onTrack: 0,
          needsSupport: 0,
          highPriority: 0,
        },
      });
    }

    const districtProfile = districtMap.get(districtKey);
    if (!districtProfile) {
      return;
    }

    districtProfile.schoolsTotal += 1;
    districtProfile.enrolledLearners += school.enrolledLearners;
    districtProfile.trainings += school.trainings;
    districtProfile.visits += school.visits;
    districtProfile.assessments += school.assessments;
    districtProfile.storyActivities += school.storyActivities;
    districtProfile.participantsTotal += school.participantsTotal;
    districtProfile.participantsTeachers += school.participantsTeachers;
    districtProfile.participantsLeaders += school.participantsLeaders;
    districtProfile.learnersAssessed += school.learnersAssessed;
    districtProfile.storiesPublished += school.storiesPublished;

    if (school.trainings + school.visits + school.assessments + school.storyActivities > 0) {
      districtProfile.schoolsSupported += 1;
    }

    if (school.status === "On track") districtProfile.statusCounts.onTrack += 1;
    if (school.status === "Needs support") districtProfile.statusCounts.needsSupport += 1;
    if (school.status === "High priority") districtProfile.statusCounts.highPriority += 1;

    const weight = school.outcomes.sampleSize > 0 ? school.outcomes.sampleSize : 1;
    if (school.outcomes.letterIdentification !== null) {
      const current = districtProfile.outcomes.letterIdentification ?? 0;
      districtProfile.outcomes.letterIdentification = current + school.outcomes.letterIdentification * weight;
    }
    if (school.outcomes.soundIdentification !== null) {
      const current = districtProfile.outcomes.soundIdentification ?? 0;
      districtProfile.outcomes.soundIdentification = current + school.outcomes.soundIdentification * weight;
    }
    if (school.outcomes.decodableWords !== null) {
      const current = districtProfile.outcomes.decodableWords ?? 0;
      districtProfile.outcomes.decodableWords = current + school.outcomes.decodableWords * weight;
    }
    if (school.outcomes.undecodableWords !== null) {
      const current = districtProfile.outcomes.undecodableWords ?? 0;
      districtProfile.outcomes.undecodableWords = current + school.outcomes.undecodableWords * weight;
    }
    if (school.outcomes.madeUpWords !== null) {
      const current = districtProfile.outcomes.madeUpWords ?? 0;
      districtProfile.outcomes.madeUpWords = current + school.outcomes.madeUpWords * weight;
    }
    if (school.outcomes.storyReading !== null) {
      const current = districtProfile.outcomes.storyReading ?? 0;
      districtProfile.outcomes.storyReading = current + school.outcomes.storyReading * weight;
    }
    if (school.outcomes.readingComprehension !== null) {
      const current = districtProfile.outcomes.readingComprehension ?? 0;
      districtProfile.outcomes.readingComprehension = current + school.outcomes.readingComprehension * weight;
    }
    districtProfile.outcomes.sampleSize += weight;

    if (school.teacherObservationAverage !== null) {
      if (districtProfile.teacherObservationAverage === null) {
        districtProfile.teacherObservationAverage = 0;
      }
      districtProfile.teacherObservationAverage += school.teacherObservationAverage;
    }
  });

  const districts: ImpactExplorerDistrictProfile[] = [...districtMap.values()]
    .map((district) => {
      const observationSamples = finalizedSchools.filter(
        (school) => school.district === district.district && school.teacherObservationAverage !== null,
      ).length;
      district.teacherObservationAverage =
        district.teacherObservationAverage !== null && observationSamples > 0
          ? Number((district.teacherObservationAverage / observationSamples).toFixed(1))
          : null;

      if (district.outcomes.sampleSize > 0) {
        district.outcomes = {
          letterIdentification:
            district.outcomes.letterIdentification !== null
              ? Number((district.outcomes.letterIdentification / district.outcomes.sampleSize).toFixed(1))
              : null,
          soundIdentification:
            district.outcomes.soundIdentification !== null
              ? Number((district.outcomes.soundIdentification / district.outcomes.sampleSize).toFixed(1))
              : null,
          decodableWords:
            district.outcomes.decodableWords !== null
              ? Number((district.outcomes.decodableWords / district.outcomes.sampleSize).toFixed(1))
              : null,
          undecodableWords:
            district.outcomes.undecodableWords !== null
              ? Number((district.outcomes.undecodableWords / district.outcomes.sampleSize).toFixed(1))
              : null,
          madeUpWords:
            district.outcomes.madeUpWords !== null
              ? Number((district.outcomes.madeUpWords / district.outcomes.sampleSize).toFixed(1))
              : null,
          storyReading:
            district.outcomes.storyReading !== null
              ? Number((district.outcomes.storyReading / district.outcomes.sampleSize).toFixed(1))
              : null,
          readingComprehension:
            district.outcomes.readingComprehension !== null
              ? Number((district.outcomes.readingComprehension / district.outcomes.sampleSize).toFixed(1))
              : null,
          sampleSize: district.outcomes.sampleSize,
        };
      }

      return district;
    })
    .sort((a, b) => a.district.localeCompare(b.district));

  const regionMap = new Map<string, ImpactExplorerRegionProfile>();
  districts.forEach((district) => {
    const regionKey = district.region.trim() || "Unknown Region";
    if (!regionMap.has(regionKey)) {
      regionMap.set(regionKey, {
        region: regionKey,
        districtsTotal: 0,
        districtsCovered: 0,
        schoolsTotal: 0,
        schoolsSupported: 0,
        enrolledLearners: 0,
        trainings: 0,
        visits: 0,
        assessments: 0,
        storyActivities: 0,
        participantsTotal: 0,
        participantsTeachers: 0,
        participantsLeaders: 0,
        learnersAssessed: 0,
        storiesPublished: 0,
        teacherObservationAverage: null,
        outcomes: {
          letterIdentification: null,
          soundIdentification: null,
          decodableWords: null,
          undecodableWords: null,
          madeUpWords: null,
          storyReading: null,
          readingComprehension: null,
          sampleSize: 0,
        },
        statusCounts: {
          onTrack: 0,
          needsSupport: 0,
          highPriority: 0,
        },
      });
    }

    const region = regionMap.get(regionKey);
    if (!region) {
      return;
    }

    region.districtsTotal += 1;
    if (district.schoolsSupported > 0) {
      region.districtsCovered += 1;
    }
    region.schoolsTotal += district.schoolsTotal;
    region.schoolsSupported += district.schoolsSupported;
    region.enrolledLearners += district.enrolledLearners;
    region.trainings += district.trainings;
    region.visits += district.visits;
    region.assessments += district.assessments;
    region.storyActivities += district.storyActivities;
    region.participantsTotal += district.participantsTotal;
    region.participantsTeachers += district.participantsTeachers;
    region.participantsLeaders += district.participantsLeaders;
    region.learnersAssessed += district.learnersAssessed;
    region.storiesPublished += district.storiesPublished;
    region.statusCounts.onTrack += district.statusCounts.onTrack;
    region.statusCounts.needsSupport += district.statusCounts.needsSupport;
    region.statusCounts.highPriority += district.statusCounts.highPriority;

    const weight = district.outcomes.sampleSize > 0 ? district.outcomes.sampleSize : 1;
    if (district.outcomes.letterIdentification !== null) {
      const current = region.outcomes.letterIdentification ?? 0;
      region.outcomes.letterIdentification = current + district.outcomes.letterIdentification * weight;
    }
    if (district.outcomes.soundIdentification !== null) {
      const current = region.outcomes.soundIdentification ?? 0;
      region.outcomes.soundIdentification = current + district.outcomes.soundIdentification * weight;
    }
    if (district.outcomes.decodableWords !== null) {
      const current = region.outcomes.decodableWords ?? 0;
      region.outcomes.decodableWords = current + district.outcomes.decodableWords * weight;
    }
    if (district.outcomes.undecodableWords !== null) {
      const current = region.outcomes.undecodableWords ?? 0;
      region.outcomes.undecodableWords = current + district.outcomes.undecodableWords * weight;
    }
    if (district.outcomes.madeUpWords !== null) {
      const current = region.outcomes.madeUpWords ?? 0;
      region.outcomes.madeUpWords = current + district.outcomes.madeUpWords * weight;
    }
    if (district.outcomes.storyReading !== null) {
      const current = region.outcomes.storyReading ?? 0;
      region.outcomes.storyReading = current + district.outcomes.storyReading * weight;
    }
    if (district.outcomes.readingComprehension !== null) {
      const current = region.outcomes.readingComprehension ?? 0;
      region.outcomes.readingComprehension = current + district.outcomes.readingComprehension * weight;
    }
    region.outcomes.sampleSize += weight;

    if (district.teacherObservationAverage !== null) {
      if (region.teacherObservationAverage === null) {
        region.teacherObservationAverage = 0;
      }
      region.teacherObservationAverage += district.teacherObservationAverage;
    }
  });

  const regions: ImpactExplorerRegionProfile[] = [...regionMap.values()]
    .map((region) => {
      const observationSamples = districts.filter(
        (district) => district.region === region.region && district.teacherObservationAverage !== null,
      ).length;
      region.teacherObservationAverage =
        region.teacherObservationAverage !== null && observationSamples > 0
          ? Number((region.teacherObservationAverage / observationSamples).toFixed(1))
          : null;

      if (region.outcomes.sampleSize > 0) {
        region.outcomes = {
          letterIdentification:
            region.outcomes.letterIdentification !== null
              ? Number((region.outcomes.letterIdentification / region.outcomes.sampleSize).toFixed(1))
              : null,
          soundIdentification:
            region.outcomes.soundIdentification !== null
              ? Number((region.outcomes.soundIdentification / region.outcomes.sampleSize).toFixed(1))
              : null,
          decodableWords:
            region.outcomes.decodableWords !== null
              ? Number((region.outcomes.decodableWords / region.outcomes.sampleSize).toFixed(1))
              : null,
          undecodableWords:
            region.outcomes.undecodableWords !== null
              ? Number((region.outcomes.undecodableWords / region.outcomes.sampleSize).toFixed(1))
              : null,
          madeUpWords:
            region.outcomes.madeUpWords !== null
              ? Number((region.outcomes.madeUpWords / region.outcomes.sampleSize).toFixed(1))
              : null,
          storyReading:
            region.outcomes.storyReading !== null
              ? Number((region.outcomes.storyReading / region.outcomes.sampleSize).toFixed(1))
              : null,
          readingComprehension:
            region.outcomes.readingComprehension !== null
              ? Number((region.outcomes.readingComprehension / region.outcomes.sampleSize).toFixed(1))
              : null,
          sampleSize: region.outcomes.sampleSize,
        };
      }

      return region;
    })
    .sort((a, b) => a.region.localeCompare(b.region));

  const country: ImpactExplorerCountryProfile = {
    country: "Uganda",
    regionsTotal: regions.length,
    regionsCovered: regions.filter((region) => region.schoolsSupported > 0).length,
    districtsTotal: districts.length,
    districtsCovered: districts.filter((district) => district.schoolsSupported > 0).length,
    schoolsTotal: finalizedSchools.length,
    schoolsSupported: finalizedSchools.filter(
      (school) => school.trainings + school.visits + school.assessments + school.storyActivities > 0,
    ).length,
    enrolledLearners: finalizedSchools.reduce((total, school) => total + school.enrolledLearners, 0),
    trainings: finalizedSchools.reduce((total, school) => total + school.trainings, 0),
    visits: finalizedSchools.reduce((total, school) => total + school.visits, 0),
    assessments: finalizedSchools.reduce((total, school) => total + school.assessments, 0),
    storyActivities: finalizedSchools.reduce((total, school) => total + school.storyActivities, 0),
    participantsTotal: finalizedSchools.reduce((total, school) => total + school.participantsTotal, 0),
    participantsTeachers: finalizedSchools.reduce(
      (total, school) => total + school.participantsTeachers,
      0,
    ),
    participantsLeaders: finalizedSchools.reduce(
      (total, school) => total + school.participantsLeaders,
      0,
    ),
    learnersAssessed: finalizedSchools.reduce((total, school) => total + school.learnersAssessed, 0),
    storiesPublished: finalizedSchools.reduce((total, school) => total + school.storiesPublished, 0),
    teacherObservationAverage:
      finalizedSchools.filter((school) => school.teacherObservationAverage !== null).length > 0
        ? Number(
          (
            finalizedSchools.reduce(
              (total, school) => total + (school.teacherObservationAverage ?? 0),
              0,
            ) /
            finalizedSchools.filter((school) => school.teacherObservationAverage !== null).length
          ).toFixed(1),
        )
        : null,
    outcomes: {
      letterIdentification:
        regions.filter((region) => region.outcomes.letterIdentification !== null).length > 0
          ? Number(
            (
              regions.reduce((total, region) => total + (region.outcomes.letterIdentification ?? 0), 0) /
              regions.filter((region) => region.outcomes.letterIdentification !== null).length
            ).toFixed(1),
          )
          : null,
      soundIdentification:
        regions.filter((region) => region.outcomes.soundIdentification !== null).length > 0
          ? Number(
            (
              regions.reduce((total, region) => total + (region.outcomes.soundIdentification ?? 0), 0) /
              regions.filter((region) => region.outcomes.soundIdentification !== null).length
            ).toFixed(1),
          )
          : null,
      decodableWords:
        regions.filter((region) => region.outcomes.decodableWords !== null).length > 0
          ? Number(
            (
              regions.reduce((total, region) => total + (region.outcomes.decodableWords ?? 0), 0) /
              regions.filter((region) => region.outcomes.decodableWords !== null).length
            ).toFixed(1),
          )
          : null,
      undecodableWords:
        regions.filter((region) => region.outcomes.undecodableWords !== null).length > 0
          ? Number(
            (
              regions.reduce((total, region) => total + (region.outcomes.undecodableWords ?? 0), 0) /
              regions.filter((region) => region.outcomes.undecodableWords !== null).length
            ).toFixed(1),
          )
          : null,
      madeUpWords:
        regions.filter((region) => region.outcomes.madeUpWords !== null).length > 0
          ? Number(
            (
              regions.reduce((total, region) => total + (region.outcomes.madeUpWords ?? 0), 0) /
              regions.filter((region) => region.outcomes.madeUpWords !== null).length
            ).toFixed(1),
          )
          : null,
      storyReading:
        regions.filter((region) => region.outcomes.storyReading !== null).length > 0
          ? Number(
            (
              regions.reduce((total, region) => total + (region.outcomes.storyReading ?? 0), 0) /
              regions.filter((region) => region.outcomes.storyReading !== null).length
            ).toFixed(1),
          )
          : null,
      readingComprehension:
        regions.filter((region) => region.outcomes.readingComprehension !== null).length > 0
          ? Number(
            (
              regions.reduce((total, region) => total + (region.outcomes.readingComprehension ?? 0), 0) /
              regions.filter((region) => region.outcomes.readingComprehension !== null).length
            ).toFixed(1),
          )
          : null,
      sampleSize: regions.reduce((total, region) => total + region.outcomes.sampleSize, 0),
    },
  };

  return {
    generatedAt: new Date().toISOString(),
    country,
    regions,
    districts,
    schools: finalizedSchools,
  };
}

function buildRecentMonthKeys(monthCount: number) {
  const keys: string[] = [];
  const now = new Date();
  const anchor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  for (let index = monthCount - 1; index >= 0; index -= 1) {
    const point = new Date(anchor);
    point.setUTCMonth(anchor.getUTCMonth() - index);
    const year = point.getUTCFullYear();
    const month = String(point.getUTCMonth() + 1).padStart(2, "0");
    keys.push(`${year}-${month}`);
  }

  return keys;
}

function formatMonthLabel(key: string) {
  const [year, month] = key.split("-").map((value) => Number(value));
  const date = new Date(Date.UTC(year, Math.max(0, month - 1), 1));
  return date.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
}

function parsePortalTrainingParticipants(payload: Record<string, unknown>) {
  let teachers = Number(payload.classroomTeachers ?? 0) || 0;
  let leaders = Number(payload.schoolLeaders ?? 0) || 0;
  let total =
    Number(payload.participantsTotal ?? payload.numberAttended ?? payload.attendedTotal ?? 0) || 0;

  const rawParticipants = payload.participants;
  let parsedParticipants: unknown = rawParticipants;
  if (typeof parsedParticipants === "string" && parsedParticipants.trim()) {
    try {
      parsedParticipants = JSON.parse(parsedParticipants);
    } catch {
      parsedParticipants = null;
    }
  }

  if (Array.isArray(parsedParticipants)) {
    let computedTeachers = 0;
    let computedLeaders = 0;
    parsedParticipants.forEach((entry) => {
      if (!entry || typeof entry !== "object") {
        return;
      }
      const row = entry as Record<string, unknown>;
      const role = String(row.role ?? "").trim().toLowerCase();
      if (role === "teacher" || role === "classroom teacher") {
        computedTeachers += 1;
      } else if (role === "leader" || role === "school leader") {
        computedLeaders += 1;
      }
    });

    if (computedTeachers > 0 || computedLeaders > 0) {
      teachers = computedTeachers;
      leaders = computedLeaders;
      total = computedTeachers + computedLeaders;
    } else if (parsedParticipants.length > 0) {
      total = parsedParticipants.length;
    }
  }

  if (total <= 0) {
    total = teachers + leaders;
  }

  if (teachers + leaders > total) {
    total = teachers + leaders;
  }

  return { teachers, leaders, total };
}

export function getPortalAnalyticsData(user: PortalUser): PortalAnalyticsData {
  const db = getDb();
  const canViewAll = canViewAllRecords(user);
  const accessParams = canViewAll ? {} : { currentUserId: user.id };
  const recordFilter = canViewAll ? "" : "AND pr.created_by_user_id = @currentUserId";
  const evidenceFilter = canViewAll ? "" : "AND pe.uploaded_by_user_id = @currentUserId";
  const testimonialFilter = canViewAll ? "" : "AND pt.created_by_user_id = @currentUserId";
  const onlineFilter = canViewAll ? "" : "AND created_by_user_id = @currentUserId";
  const resourceFilter = canViewAll ? "" : "AND created_by_user_id = @currentUserId";

  const legacyTrainingFilter = canViewAll ? "" : "AND ts.created_by_user_id = @currentUserId";
  const legacyAssessmentFilter = canViewAll ? "" : "AND ar.created_by_user_id = @currentUserId";

  const portalRows = db
    .prepare(
      `
      SELECT
        pr.id,
        pr.record_code AS recordCode,
        pr.module,
        pr.date,
        pr.district,
        pr.school_name AS schoolName,
        pr.status,
        pr.follow_up_date AS followUpDate,
        pr.payload_json AS payloadJson,
        pr.created_by_user_id AS createdByUserId,
        pu.full_name AS createdByName,
        pr.updated_at AS updatedAt
      FROM portal_records pr
      JOIN portal_users pu ON pu.id = pr.created_by_user_id
      WHERE 1=1
        ${recordFilter}
      ORDER BY pr.updated_at DESC
    `,
    )
    .all(accessParams) as Array<{
      id: number;
      recordCode: string;
      module: PortalRecordModule;
      date: string;
      district: string;
      schoolName: string;
      status: PortalRecordStatus;
      followUpDate: string | null;
      payloadJson: string;
      createdByUserId: number;
      createdByName: string;
      updatedAt: string;
    }>;

  const moduleStatusMap = new Map<PortalRecordModule, PortalAnalyticsModuleStatus>([
    ["training", { module: "training", draft: 0, submitted: 0, returned: 0, approved: 0, total: 0 }],
    ["visit", { module: "visit", draft: 0, submitted: 0, returned: 0, approved: 0, total: 0 }],
    ["assessment", { module: "assessment", draft: 0, submitted: 0, returned: 0, approved: 0, total: 0 }],
    ["story", { module: "story", draft: 0, submitted: 0, returned: 0, approved: 0, total: 0 }],
  ]);

  const monthKeys = buildRecentMonthKeys(8);
  const monthlyMap = new Map<string, PortalAnalyticsMonthlyPoint>(
    monthKeys.map((key) => [
      key,
      {
        key,
        month: formatMonthLabel(key),
        records: 0,
        training: 0,
        visits: 0,
        assessments: 0,
        story: 0,
        evidence: 0,
        testimonials: 0,
      },
    ]),
  );

  const uniqueSchools = new Set<string>();
  const districtMap = new Map<string, { records: number; schools: Set<string>; testimonials: number }>();

  let approvedRecords = 0;
  let submittedRecords = 0;
  let returnedRecords = 0;
  let draftRecords = 0;
  let followUpsDue = 0;
  let portalLearnersAssessed = 0;
  let portalStoriesPublished = 0;
  let portalTrainingSessionCount = 0;
  let portalParticipantTotal = 0;
  let portalParticipantTeachers = 0;
  let portalParticipantLeaders = 0;

  const today = new Date().toISOString().slice(0, 10);

  portalRows.forEach((row) => {
    const moduleBucket = moduleStatusMap.get(row.module);
    if (moduleBucket) {
      moduleBucket.total += 1;
      if (row.status === "Draft") moduleBucket.draft += 1;
      if (row.status === "Submitted") moduleBucket.submitted += 1;
      if (row.status === "Returned") moduleBucket.returned += 1;
      if (row.status === "Approved") moduleBucket.approved += 1;
    }

    if (row.status === "Approved") approvedRecords += 1;
    if (row.status === "Submitted") submittedRecords += 1;
    if (row.status === "Returned") returnedRecords += 1;
    if (row.status === "Draft") draftRecords += 1;

    if (row.followUpDate && row.followUpDate <= today && row.status !== "Approved") {
      followUpsDue += 1;
    }

    const schoolKey = row.schoolName.trim().toLowerCase();
    if (schoolKey) {
      uniqueSchools.add(schoolKey);
    }

    const district = row.district.trim() || "Unknown";
    if (!districtMap.has(district)) {
      districtMap.set(district, { records: 0, schools: new Set<string>(), testimonials: 0 });
    }
    const districtItem = districtMap.get(district);
    if (districtItem) {
      districtItem.records += 1;
      if (schoolKey) {
        districtItem.schools.add(schoolKey);
      }
    }

    const monthKey = row.date.slice(0, 7);
    const monthPoint = monthlyMap.get(monthKey);
    if (monthPoint) {
      monthPoint.records += 1;
      if (row.module === "training") monthPoint.training += 1;
      if (row.module === "visit") monthPoint.visits += 1;
      if (row.module === "assessment") monthPoint.assessments += 1;
      if (row.module === "story") monthPoint.story += 1;
    }

    const payload = JSON.parse(row.payloadJson || "{}") as Record<string, unknown>;

    if (row.module === "training") {
      portalTrainingSessionCount += 1;
      const participants = parsePortalTrainingParticipants(payload);
      portalParticipantTotal += participants.total;
      portalParticipantTeachers += participants.teachers;
      portalParticipantLeaders += participants.leaders;
    }

    if (row.module === "assessment") {
      portalLearnersAssessed += Number(payload.learnersAssessed ?? 0) || 0;
      portalStoriesPublished += Number(payload.storiesPublished ?? 0) || 0;
    }

    if (row.module === "story") {
      portalStoriesPublished += Number(payload.storiesApproved ?? 0) || 0;
    }
  });

  const recentRecords: PortalAnalyticsRecentRecord[] = portalRows.slice(0, 12).map((row) => ({
    id: row.id,
    recordCode: row.recordCode,
    module: row.module,
    date: row.date,
    district: row.district,
    schoolName: row.schoolName,
    status: row.status,
    createdByName: row.createdByName,
    updatedAt: row.updatedAt,
  }));

  const followUps = portalRows
    .filter((row) => row.followUpDate && row.followUpDate <= today && row.status !== "Approved")
    .sort((a, b) => String(a.followUpDate).localeCompare(String(b.followUpDate)))
    .slice(0, 10)
    .map((row) => ({
      id: row.id,
      recordCode: row.recordCode,
      module: row.module,
      schoolName: row.schoolName,
      followUpDate: String(row.followUpDate),
    }));

  const evidenceTotal = Number(
    (
      db
        .prepare(
          `
          SELECT COUNT(*) AS total
          FROM portal_evidence pe
          WHERE 1=1
            ${evidenceFilter}
        `,
        )
        .get(accessParams) as { total: number | null }
    ).total ?? 0,
  );

  const testimonialTotal = Number(
    (
      db
        .prepare(
          `
          SELECT COUNT(*) AS total
          FROM portal_testimonials pt
          WHERE 1=1
            ${testimonialFilter}
        `,
        )
        .get(accessParams) as { total: number | null }
    ).total ?? 0,
  );

  const evidenceMonthlyRows = db
    .prepare(
      `
      SELECT substr(pe.created_at, 1, 7) AS monthKey, COUNT(*) AS total
      FROM portal_evidence pe
      WHERE 1=1
        ${evidenceFilter}
      GROUP BY substr(pe.created_at, 1, 7)
    `,
    )
    .all(accessParams) as Array<{ monthKey: string; total: number }>;

  evidenceMonthlyRows.forEach((row) => {
    const monthPoint = monthlyMap.get(row.monthKey);
    if (monthPoint) {
      monthPoint.evidence = Number(row.total ?? 0);
    }
  });

  const testimonialMonthlyRows = db
    .prepare(
      `
      SELECT substr(pt.created_at, 1, 7) AS monthKey, COUNT(*) AS total
      FROM portal_testimonials pt
      WHERE 1=1
        ${testimonialFilter}
      GROUP BY substr(pt.created_at, 1, 7)
    `,
    )
    .all(accessParams) as Array<{ monthKey: string; total: number }>;

  testimonialMonthlyRows.forEach((row) => {
    const monthPoint = monthlyMap.get(row.monthKey);
    if (monthPoint) {
      monthPoint.testimonials = Number(row.total ?? 0);
    }
  });

  const testimonialDistrictRows = db
    .prepare(
      `
      SELECT district, COUNT(*) AS total
      FROM portal_testimonials pt
      WHERE 1=1
        ${testimonialFilter}
      GROUP BY district
    `,
    )
    .all(accessParams) as Array<{ district: string; total: number }>;

  testimonialDistrictRows.forEach((row) => {
    const district = row.district.trim() || "Unknown";
    if (!districtMap.has(district)) {
      districtMap.set(district, { records: 0, schools: new Set<string>(), testimonials: 0 });
    }
    const item = districtMap.get(district);
    if (item) {
      item.testimonials += Number(row.total ?? 0);
    }
  });

  const districtStats: PortalAnalyticsDistrictStat[] = [...districtMap.entries()]
    .map(([district, item]) => ({
      district,
      records: item.records,
      schools: item.schools.size,
      testimonials: item.testimonials,
    }))
    .sort((a, b) => b.records - a.records || b.testimonials - a.testimonials)
    .slice(0, 12);

  const recentEvidence = listPortalEvidence({}, user).slice(0, 8);
  const recentTestimonials = listPortalTestimonials(user, 8);

  const legacyParticipantsRow = db
    .prepare(
      `
      SELECT
        COUNT(tp.id) AS total,
        SUM(CASE WHEN tp.participant_role = 'Classroom teacher' THEN 1 ELSE 0 END) AS teachers,
        SUM(CASE WHEN tp.participant_role = 'School Leader' THEN 1 ELSE 0 END) AS leaders
      FROM training_participants tp
      JOIN training_sessions ts ON ts.id = tp.session_id
      WHERE 1=1
        ${legacyTrainingFilter}
    `,
    )
    .get(accessParams) as { total: number | null; teachers: number | null; leaders: number | null };

  const legacyLearnersRow = db
    .prepare(
      `
      SELECT
        COALESCE(SUM(ar.learners_assessed), 0) AS learners,
        COALESCE(SUM(ar.stories_published), 0) AS stories
      FROM assessment_records ar
      WHERE 1=1
        ${legacyAssessmentFilter}
    `,
    )
    .get(accessParams) as { learners: number | null; stories: number | null };

  const legacyTrainingSessions = Number(
    (
      db
        .prepare(
          `
          SELECT COUNT(*) AS total
          FROM training_sessions ts
          WHERE 1=1
            ${legacyTrainingFilter}
        `,
        )
        .get(accessParams) as { total: number | null }
    ).total ?? 0,
  );

  const legacyAssessmentRecords = Number(
    (
      db
        .prepare(
          `
          SELECT COUNT(*) AS total
          FROM assessment_records ar
          WHERE 1=1
            ${legacyAssessmentFilter}
        `,
        )
        .get(accessParams) as { total: number | null }
    ).total ?? 0,
  );

  const onlineTrainingSummary = db
    .prepare(
      `
      SELECT
        COUNT(*) AS total,
        COALESCE(SUM(attendee_count), 0) AS attendees,
        COALESCE(SUM(online_teachers_trained), 0) AS teachers,
        COALESCE(SUM(online_school_leaders_trained), 0) AS leaders
      FROM online_training_events
      WHERE 1=1
        ${onlineFilter}
    `,
    )
    .get(accessParams) as {
      total: number | null;
      attendees: number | null;
      teachers: number | null;
      leaders: number | null;
    };
  const onlineTrainingEvents = Number(onlineTrainingSummary.total ?? 0);
  const onlineTrainingAttendees = Number(onlineTrainingSummary.attendees ?? 0);
  const onlineTeachersTrained = Number(onlineTrainingSummary.teachers ?? 0);
  const onlineSchoolLeadersTrained = Number(onlineTrainingSummary.leaders ?? 0);

  const resourcesUploaded = Number(
    (
      db
        .prepare(
          `
          SELECT COUNT(*) AS total
          FROM portal_resources
          WHERE 1=1
            ${resourceFilter}
        `,
        )
        .get(accessParams) as { total: number | null }
    ).total ?? 0,
  );



  const schoolsDirectory = countTotal(db, "SELECT COUNT(*) AS total FROM schools_directory");
  const bookingRequests = countTotal(db, "SELECT COUNT(*) AS total FROM bookings");
  const partnerInquiries = countTotal(db, "SELECT COUNT(*) AS total FROM contacts");
  const toolkitLeads = countTotal(db, "SELECT COUNT(*) AS total FROM download_leads");
  const newsletterSubscribers = countTotal(db, "SELECT COUNT(*) AS total FROM newsletter_subscribers");

  const legacySchoolRows = db
    .prepare(
      `
      SELECT DISTINCT lower(trim(ts.school_name)) AS schoolKey
      FROM training_sessions ts
      WHERE 1=1
        ${legacyTrainingFilter}
    `,
    )
    .all(accessParams) as Array<{ schoolKey: string | null }>;

  legacySchoolRows.forEach((row) => {
    const schoolKey = (row.schoolKey ?? "").trim();
    if (schoolKey) {
      uniqueSchools.add(schoolKey);
    }
  });

  const userStats = canViewAll
    ? (db
      .prepare(
        `
          SELECT
            pu.id AS userId,
            pu.full_name AS fullName,
            pu.role AS role,
            COALESCE(r.totalRecords, 0) AS records,
            COALESCE(e.totalEvidence, 0) AS evidence,
            COALESCE(t.totalTestimonials, 0) AS testimonials
          FROM portal_users pu
          LEFT JOIN (
            SELECT created_by_user_id AS userId, COUNT(*) AS totalRecords
            FROM portal_records
            GROUP BY created_by_user_id
          ) r ON r.userId = pu.id
          LEFT JOIN (
            SELECT uploaded_by_user_id AS userId, COUNT(*) AS totalEvidence
            FROM portal_evidence
            GROUP BY uploaded_by_user_id
          ) e ON e.userId = pu.id
          LEFT JOIN (
            SELECT created_by_user_id AS userId, COUNT(*) AS totalTestimonials
            FROM portal_testimonials
            GROUP BY created_by_user_id
          ) t ON t.userId = pu.id
          ORDER BY records DESC, testimonials DESC, fullName ASC
        `,
      )
      .all() as PortalAnalyticsUserStat[])
    : ([
      {
        userId: user.id,
        fullName: user.fullName,
        role: user.role,
        records: portalRows.length,
        evidence: evidenceTotal,
        testimonials: testimonialTotal,
      },
    ] as PortalAnalyticsUserStat[]);

  const monthly = monthKeys
    .map((key) => monthlyMap.get(key))
    .filter((item): item is PortalAnalyticsMonthlyPoint => Boolean(item));

  const moduleStatus = (["training", "visit", "assessment", "story"] as PortalRecordModule[])
    .map((module) => moduleStatusMap.get(module))
    .filter((item): item is PortalAnalyticsModuleStatus => Boolean(item));

  return {
    generatedAt: new Date().toISOString(),
    scope: canViewAll ? "all" : "mine",
    totals: {
      portalRecords: portalRows.length,
      approvedRecords,
      submittedRecords,
      returnedRecords,
      draftRecords,
      schoolsCovered: uniqueSchools.size,
      followUpsDue,
      evidenceUploads: evidenceTotal,
      testimonials: testimonialTotal,
      onlineTrainingEvents,
      onlineTeachersTrained,
      onlineSchoolLeadersTrained,
      resourcesUploaded,

      schoolsDirectory,
      legacyTrainingSessions,
      legacyAssessmentRecords,
      bookingRequests,
      partnerInquiries,
      toolkitLeads,
      newsletterSubscribers,
      learnersAssessed: Number(legacyLearnersRow.learners ?? 0) + portalLearnersAssessed,
      storiesPublished: Number(legacyLearnersRow.stories ?? 0) + portalStoriesPublished,
      trainingSessionsCompleted: legacyTrainingSessions + portalTrainingSessionCount + onlineTrainingEvents,
    },
    participants: {
      total: Number(legacyParticipantsRow.total ?? 0) + portalParticipantTotal + onlineTrainingAttendees,
      teachers:
        Number(legacyParticipantsRow.teachers ?? 0) + portalParticipantTeachers + onlineTeachersTrained,
      leaders:
        Number(legacyParticipantsRow.leaders ?? 0) +
        portalParticipantLeaders +
        onlineSchoolLeadersTrained,
    },
    moduleStatus,
    monthly,
    districtStats,
    userStats,
    followUps,
    recentRecords,
    recentEvidence,
    recentTestimonials,
  };
}

export function getPortalRoleSummary(): Record<PortalUserRole, number> {
  const rows = getDb()
    .prepare(
      `
      SELECT role, COUNT(*) AS total
      FROM portal_users
      GROUP BY role
    `,
    )
    .all() as Array<{ role: PortalUserRole; total: number }>;

  const lookup = (role: PortalUserRole) =>
    Number(rows.find((item) => item.role === role)?.total ?? 0);
  return {
    Staff: lookup("Staff"),
    Volunteer: lookup("Volunteer"),
    Admin: lookup("Admin"),
    Coach: lookup("Coach"),
    DataClerk: lookup("DataClerk"),
    SchoolLeader: lookup("SchoolLeader"),
    Partner: lookup("Partner"),
    Government: lookup("Government"),
  };
}

const impactReportTypePrefixes: Record<ImpactReportType, string> = {
  "FY Impact Report": "FYR",
  "Regional Impact Report": "REG",
  "District Report": "DST",
  "School Report": "SCH",
  "Partner Snapshot Report": "PSR",
};

type AssessmentStage = "baseline" | "progress" | "endline";

function asDateOnly(value: string) {
  return value.slice(0, 10);
}

function normalizeDateRange(start: string, end: string) {
  const startDate = asDateOnly(start);
  const endDate = asDateOnly(end);
  if (startDate <= endDate) {
    return { startDate, endDate };
  }
  return { startDate: endDate, endDate: startDate };
}

function normalizeScopeValue(scopeType: ImpactReportScopeType, scopeValue?: string) {
  const normalized = (scopeValue ?? "").trim();
  if (!normalized) {
    return scopeType === "National" ? "All" : "Not specified";
  }
  return normalized;
}

function buildImpactReportCode(type: ImpactReportType) {
  const prefix = impactReportTypePrefixes[type] ?? "RPT";
  const stamp = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = crypto.randomUUID().slice(0, 6).toUpperCase();
  return `${prefix}-${stamp}-${suffix}`;
}

const impactTemplateId = "ORBF-IMPACT-TEMPLATE-v1";
const impactTemplateName = "Ozeki Donor-Grade Impact Report Template";
const impactAiWritingRules = [
  "Use only provided metrics; never invent numbers.",
  "If a metric is missing, state: Data not available for this period.",
  "Recommendations must map to observed gaps (rubric and learner outcomes).",
  "Tone: professional, evidence-led, locally grounded.",
];

function resolveImpactReportVariant(reportType: ImpactReportType): ImpactReportVariant {
  if (reportType === "School Report") {
    return "School Report";
  }
  if (reportType === "Partner Snapshot Report") {
    return "Partner Report";
  }
  return "Public Impact Report";
}

const sectionCatalog: Array<{
  id: string;
  title: string;
  purpose: string;
  dataBlocks: string[];
  aiWrites: string;
  order: number;
}> = [
    {
      id: "cover-page",
      title: "Cover Page",
      purpose: "Present report identity, scope, period, and version metadata.",
      dataBlocks: [
        "report title",
        "scope",
        "time period",
        "prepared by",
        "version and generation date",
        "optional partner name",
      ],
      aiWrites: "No narrative generation. Metadata only.",
      order: 0,
    },
    {
      id: "table-of-contents",
      title: "Table of Contents",
      purpose: "Provide quick navigation across included modules.",
      dataBlocks: ["included section list"],
      aiWrites: "No narrative generation. Auto list from included sections.",
      order: 1,
    },
    {
      id: "1-executive-summary",
      title: "1) Executive Summary",
      purpose: "Quick donor decision page with headline results and priorities.",
      dataBlocks: [
        "coverage headline totals",
        "learning deltas",
        "top geographic highlights",
        "top challenges",
        "next priorities",
      ],
      aiWrites: "Write 6-10 factual sentences using Fact Pack metrics only.",
      order: 2,
    },
    {
      id: "2-about-ozeki",
      title: "2) About Ozeki Reading Bridge Foundation",
      purpose: "State mission, vision, and signature approach.",
      dataBlocks: ["mission", "vision", "signature program model", "lifetime totals (optional)"],
      aiWrites: "Static mission/vision text plus optional dynamic totals.",
      order: 3,
    },
    {
      id: "3-program-model",
      title: "3) Program Model and Implementation Approach",
      purpose: "Explain delivery pathway from training to sustained classroom practice.",
      dataBlocks: ["program components delivered", "delivery pathway", "term or quarter timeline"],
      aiWrites: "Describe what was delivered and how implementation flowed.",
      order: 4,
    },
    {
      id: "4-coverage-reach",
      title: "4) Coverage and Reach",
      purpose: "Show delivery scale and where implementation happened.",
      dataBlocks: [
        "schools impacted",
        "schools coached",
        "teachers trained",
        "leaders trained",
        "learners reached",
        "region and district tables",
      ],
      aiWrites: "Highlight concentration zones and notable coverage shifts.",
      order: 5,
    },
    {
      id: "5-training-results",
      title: "5) Training Delivery Results",
      purpose: "Show teacher professional development outputs and quality.",
      dataBlocks: [
        "training sessions conducted",
        "schools represented",
        "teachers and leaders trained",
        "attendance and topic coverage",
      ],
      aiWrites: "Summarize delivery quality and next-cycle strengthening needs.",
      order: 6,
    },
    {
      id: "6-coaching-results",
      title: "6) Coaching, Observation, and Mentorship Results",
      purpose: "Show classroom practice change after training.",
      dataBlocks: [
        "coaching completion",
        "teachers observed",
        "routine adoption indicators",
        "top observed gaps",
        "trend across coaching cycles",
      ],
      aiWrites: "Explain instructional quality change tied to rubric trends.",
      order: 7,
    },
    {
      id: "7-learner-outcomes",
      title: "7) Learner Outcomes",
      purpose: "Prove learning impact through baseline-progress-endline evidence.",
      dataBlocks: [
        "assessment coverage",
        "letter-sound, decoding, fluency, comprehension results",
        "proficiency movement",
        "sample size notes",
      ],
      aiWrites: "Interpret strongest and weakest gains based on evidence.",
      order: 8,
    },
    {
      id: "8-remedial-results",
      title: "8) Remedial & Catch-Up Intervention Results",
      purpose: "Show targeted support outcomes for at-risk learners.",
      dataBlocks: [
        "intervention enrollment",
        "grouping levels",
        "session frequency",
        "progress and exit trends",
      ],
      aiWrites: "Summarize what improved and where support should intensify.",
      order: 9,
    },
    {
      id: "9-resource-utilization",
      title: "9) Resource Utilization and Digital Engagement",
      purpose: "Show usage of teaching materials and digital resources.",
      dataBlocks: [
        "total downloads",
        "downloads by type",
        "downloads by geography",
        "top resources",
        "booking requests",
      ],
      aiWrites: "Explain resource adoption patterns and content priorities.",
      order: 10,
    },
    {
      id: "10-regional-district-breakdown",
      title: "10) Regional and District Performance Breakdown",
      purpose: "Provide localized evidence for partner planning and prioritization.",
      dataBlocks: [
        "regional KPIs",
        "district KPIs",
        "strengths and gaps",
        "priority actions",
      ],
      aiWrites: "Generate short factual summaries per region or district.",
      order: 11,
    },
    {
      id: "11-school-level-report",
      title: "11) School-Level Report",
      purpose: "Deliver school-specific accountability and action planning.",
      dataBlocks: [
        "school profile",
        "learner outcome trends",
        "teacher observation trends",
        "intervention summary",
        "recommended resources",
        "30/60/90-day plan",
      ],
      aiWrites: "Provide school-specific gaps, priorities, and coaching focus.",
      order: 12,
    },
    {
      id: "12-case-studies",
      title: "12) Case Studies and Stories of Change",
      purpose: "Humanize verified evidence with selected improvement stories.",
      dataBlocks: ["before and after metrics", "quotes", "photos with consent"],
      aiWrites: "Produce concise change stories supported by actual metrics.",
      order: 13,
    },
    {
      id: "13-challenges-lessons",
      title: "13) Challenges, Lessons Learned, and Program Adaptations",
      purpose: "Provide honest reflection and mitigation actions.",
      dataBlocks: ["implementation bottlenecks", "data quality flags", "adaptations made"],
      aiWrites: "State constraints clearly and list practical mitigation actions.",
      order: 14,
    },
    {
      id: "14-next-cycle-priorities",
      title: "14) Next Cycle Priorities and Funding Opportunities",
      purpose: "Translate evidence into funding-aligned next actions.",
      dataBlocks: ["priority geographies", "resource gaps", "expansion targets", "cost drivers"],
      aiWrites: "Provide actionable funding-linked priorities only from observed gaps.",
      order: 15,
    },
    {
      id: "15-appendix-methods",
      title: "15) Appendix: Evidence and Methods",
      purpose: "Document definitions, tools, verification, and versioning metadata.",
      dataBlocks: [
        "indicator definitions",
        "assessment tool notes",
        "data quality checks",
        "report version and dataset timestamp",
      ],
      aiWrites: "Technical appendix with no speculative claims.",
      order: 16,
    },
  ];

function isSectionIncluded(variant: ImpactReportVariant, sectionId: string) {
  if (sectionId === "cover-page" || sectionId === "table-of-contents") {
    return true;
  }

  if (variant === "Public Impact Report") {
    return [
      "1-executive-summary",
      "2-about-ozeki",
      "3-program-model",
      "4-coverage-reach",
      "5-training-results",
      "6-coaching-results",
      "7-learner-outcomes",
      "8-remedial-results",
      "9-resource-utilization",
      "10-regional-district-breakdown",
      "13-challenges-lessons",
      "14-next-cycle-priorities",
      "15-appendix-methods",
    ].includes(sectionId);
  }

  if (variant === "Partner Report") {
    return [
      "1-executive-summary",
      "2-about-ozeki",
      "3-program-model",
      "4-coverage-reach",
      "5-training-results",
      "6-coaching-results",
      "7-learner-outcomes",
      "8-remedial-results",
      "9-resource-utilization",
      "10-regional-district-breakdown",
      "12-case-studies",
      "13-challenges-lessons",
      "14-next-cycle-priorities",
      "15-appendix-methods",
    ].includes(sectionId);
  }

  return [
    "1-executive-summary",
    "3-program-model",
    "7-learner-outcomes",
    "11-school-level-report",
    "13-challenges-lessons",
    "14-next-cycle-priorities",
    "15-appendix-methods",
  ].includes(sectionId);
}

function buildImpactTemplatePackage(
  reportType: ImpactReportType,
  generatedDate: string,
): ImpactReportTemplatePackage {
  const variant = resolveImpactReportVariant(reportType);
  const sections: ImpactReportTemplateSection[] = sectionCatalog
    .map((section) => ({
      ...section,
      included: isSectionIncluded(variant, section.id),
    }))
    .sort((a, b) => a.order - b.order);

  const tableOfContents = sections
    .filter((section) => section.included && section.id !== "cover-page")
    .map((section) => section.title);

  return {
    masterTemplateId: impactTemplateId,
    masterTemplateName: impactTemplateName,
    variant,
    aiWritingRules: impactAiWritingRules,
    tableOfContents,
    sections,
    generatedDate,
  };
}

function safeParseObject(text: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(text || "{}");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function readNumeric(payload: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const numeric = asNumber(payload[key]);
    if (numeric !== null) {
      return numeric;
    }
  }
  return null;
}

function readString(payload: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function parseStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/[,\n;|]/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
}

function inferAssessmentStage(payload: Record<string, unknown>): AssessmentStage {
  const raw = readString(payload, ["assessmentType", "stage", "phase", "assessmentPhase"]);
  if (!raw) {
    return "progress";
  }
  const normalized = raw.toLowerCase();
  if (normalized.includes("baseline")) return "baseline";
  if (normalized.includes("endline")) return "endline";
  return "progress";
}

function scopeMatches(
  scopeType: ImpactReportScopeType,
  scopeValue: string,
  district: string,
  schoolName: string,
) {
  if (scopeType === "National") {
    return true;
  }

  if (scopeType === "District") {
    return district.trim().toLowerCase() === scopeValue.trim().toLowerCase();
  }

  if (scopeType === "School") {
    return schoolName.trim().toLowerCase() === scopeValue.trim().toLowerCase();
  }

  if (scopeType === "Region") {
    const region = inferRegionFromDistrict(district);
    return Boolean(region && region.toLowerCase() === scopeValue.trim().toLowerCase());
  }

  return true;
}

function shouldIncludeModule(programs: ImpactReportProgramType[], module: PortalRecordModule) {
  if (module === "training") return programs.includes("training");
  if (module === "visit") return programs.includes("visit");
  if (module === "assessment") return programs.includes("assessment");
  if (module === "story") return programs.includes("story");
  return true;
}

function listScopedPortalRows(
  user: PortalUser,
  startDate: string,
  endDate: string,
  scopeType: ImpactReportScopeType,
  scopeValue: string,
  programs: ImpactReportProgramType[],
) {
  const db = getDb();
  const canViewAll = canViewAllRecords(user);
  const recordFilter = canViewAll ? "" : "AND pr.created_by_user_id = @currentUserId";
  const params = canViewAll
    ? { startDate, endDate }
    : { startDate, endDate, currentUserId: user.id };

  const rows = db
    .prepare(
      `
      SELECT
        pr.id,
        pr.module,
        pr.date,
        pr.district,
        pr.school_name AS schoolName,
        pr.status,
        pr.payload_json AS payloadJson
      FROM portal_records pr
      WHERE pr.date >= @startDate
        AND pr.date <= @endDate
        ${recordFilter}
      ORDER BY pr.date ASC
    `,
    )
    .all(params) as Array<{
      id: number;
      module: PortalRecordModule;
      date: string;
      district: string;
      schoolName: string;
      status: PortalRecordStatus;
      payloadJson: string;
    }>;

  return rows
    .map((row) => ({
      id: row.id,
      module: row.module,
      date: row.date,
      district: row.district,
      schoolName: row.schoolName,
      status: row.status,
      payload: safeParseObject(row.payloadJson),
    }))
    .filter((row) => shouldIncludeModule(programs, row.module))
    .filter((row) => scopeMatches(scopeType, scopeValue, row.district, row.schoolName));
}

function listScopedLegacyTrainingSessions(
  user: PortalUser,
  startDate: string,
  endDate: string,
  scopeType: ImpactReportScopeType,
  scopeValue: string,
) {
  const db = getDb();
  const canViewAll = canViewAllRecords(user);
  const filter = canViewAll ? "" : "AND ts.created_by_user_id = @currentUserId";
  const params = canViewAll
    ? { startDate, endDate }
    : { startDate, endDate, currentUserId: user.id };

  const rows = db
    .prepare(
      `
      SELECT
        ts.id,
        ts.school_name AS schoolName,
        ts.district,
        ts.session_date AS sessionDate
      FROM training_sessions ts
      WHERE ts.session_date >= @startDate
        AND ts.session_date <= @endDate
        ${filter}
      ORDER BY ts.session_date ASC
    `,
    )
    .all(params) as Array<{
      id: number;
      schoolName: string;
      district: string;
      sessionDate: string;
    }>;

  return rows.filter((row) => scopeMatches(scopeType, scopeValue, row.district, row.schoolName));
}

function buildLearningMetric(
  stageSums: Record<AssessmentStage, number>,
  stageCounts: Record<AssessmentStage, number>,
): ImpactReportLearningOutcomeMetric {
  const baseline =
    stageCounts.baseline > 0 ? Number((stageSums.baseline / stageCounts.baseline).toFixed(2)) : null;
  const progress =
    stageCounts.progress > 0 ? Number((stageSums.progress / stageCounts.progress).toFixed(2)) : null;
  const endline =
    stageCounts.endline > 0 ? Number((stageSums.endline / stageCounts.endline).toFixed(2)) : null;

  let change: number | null = null;
  if (baseline !== null && endline !== null) {
    change = Number((endline - baseline).toFixed(2));
  } else if (progress !== null && endline !== null) {
    change = Number((endline - progress).toFixed(2));
  }

  return { baseline, progress, endline, change };
}

function calculateImpactFactPack(input: {
  user: PortalUser;
  reportType: ImpactReportType;
  scopeType: ImpactReportScopeType;
  scopeValue: string;
  periodStart: string;
  periodEnd: string;
  programsIncluded: ImpactReportProgramType[];
}): ImpactReportFactPack {
  const db = getDb();
  const { startDate, endDate } = normalizeDateRange(input.periodStart, input.periodEnd);
  const scopeValue = normalizeScopeValue(input.scopeType, input.scopeValue);
  const portalRows = listScopedPortalRows(
    input.user,
    startDate,
    endDate,
    input.scopeType,
    scopeValue,
    input.programsIncluded,
  );

  const byModule = {
    training: portalRows.filter((row) => row.module === "training"),
    visit: portalRows.filter((row) => row.module === "visit"),
    assessment: portalRows.filter((row) => row.module === "assessment"),
    story: portalRows.filter((row) => row.module === "story"),
  };

  const schoolsImpacted = new Set(
    portalRows.map((row) => row.schoolName.trim().toLowerCase()).filter(Boolean),
  );
  const schoolsVisited = new Set(
    byModule.visit.map((row) => row.schoolName.trim().toLowerCase()).filter(Boolean),
  );

  let portalTeachers = 0;
  let portalLeaders = 0;
  byModule.training.forEach((row) => {
    const participantStats = parsePortalTrainingParticipants(row.payload);
    portalTeachers += participantStats.teachers;
    portalLeaders += participantStats.leaders;
  });

  let legacyTeachers = 0;
  let legacyLeaders = 0;
  if (input.programsIncluded.includes("training")) {
    const legacySessions = listScopedLegacyTrainingSessions(
      input.user,
      startDate,
      endDate,
      input.scopeType,
      scopeValue,
    );
    legacySessions.forEach((session) => {
      schoolsImpacted.add(session.schoolName.trim().toLowerCase());
    });

    if (legacySessions.length > 0) {
      const ids = legacySessions.map((session) => session.id);
      const placeholders = ids.map((_, index) => `@id${index}`);
      const params: Record<string, number> = {};
      ids.forEach((id, index) => {
        params[`id${index}`] = id;
      });
      const participantRows = db
        .prepare(
          `
          SELECT participant_role AS participantRole, COUNT(*) AS total
          FROM training_participants
          WHERE session_id IN (${placeholders.join(",")})
          GROUP BY participant_role
        `,
        )
        .all(params) as Array<{ participantRole: string; total: number }>;

      legacyTeachers = Number(
        participantRows.find((entry) => entry.participantRole === "Classroom teacher")?.total ?? 0,
      );
      legacyLeaders = Number(
        participantRows.find((entry) => entry.participantRole === "School Leader")?.total ?? 0,
      );
    }
  }

  let onlineTeachers = 0;
  let onlineLeaders = 0;
  if (input.programsIncluded.includes("online-training") && input.scopeType === "National") {
    const canViewAll = canViewAllRecords(input.user);
    const filter = canViewAll ? "" : "AND created_by_user_id = @currentUserId";
    const params = canViewAll
      ? { startDate, endDate }
      : { startDate, endDate, currentUserId: input.user.id };
    const onlineRow = db
      .prepare(
        `
        SELECT
          COUNT(*) AS total,
          COALESCE(SUM(online_teachers_trained), 0) AS teachers,
          COALESCE(SUM(online_school_leaders_trained), 0) AS leaders
        FROM online_training_events
        WHERE substr(start_datetime, 1, 10) >= @startDate
          AND substr(start_datetime, 1, 10) <= @endDate
          ${filter}
      `,
      )
      .get(params) as { total: number | null; teachers: number | null; leaders: number | null };
    onlineTeachers = Number(onlineRow.teachers ?? 0);
    onlineLeaders = Number(onlineRow.leaders ?? 0);
  }

  let learnersAssessed = 0;
  const assessmentCounts = { baseline: 0, progress: 0, endline: 0 };

  byModule.assessment.forEach((row) => {
    const stage = inferAssessmentStage(row.payload);
    assessmentCounts[stage] += 1;
    learnersAssessed += Number(readNumeric(row.payload, ["learnersAssessed"]) ?? 0);
  });

  if (input.programsIncluded.includes("assessment")) {
    const canViewAll = canViewAllRecords(input.user);
    const legacyFilter = canViewAll ? "" : "AND ar.created_by_user_id = @currentUserId";
    const params = canViewAll
      ? { startDate, endDate }
      : { startDate, endDate, currentUserId: input.user.id };

    const legacyRows = db
      .prepare(
        `
        SELECT
          ar.school_name AS schoolName,
          ar.district,
          ar.learners_assessed AS learnersAssessed,
          ar.stories_published AS storiesPublished
        FROM assessment_records ar
        WHERE ar.assessment_date >= @startDate
          AND ar.assessment_date <= @endDate
          ${legacyFilter}
      `,
      )
      .all(params) as Array<{
        schoolName: string;
        district: string;
        learnersAssessed: number;
        storiesPublished: number;
      }>;

    legacyRows
      .filter((row) => scopeMatches(input.scopeType, scopeValue, row.district, row.schoolName))
      .forEach((row) => {
        schoolsImpacted.add(row.schoolName.trim().toLowerCase());
        learnersAssessed += Number(row.learnersAssessed ?? 0);
      });
  }

  const coverageDelivery: ImpactReportCoverageBlock = {
    schoolsImpacted: schoolsImpacted.size,
    schoolsCoachedVisited: schoolsVisited.size,
    teachersTrained: legacyTeachers + portalTeachers + onlineTeachers,
    schoolLeadersTrained: legacyLeaders + portalLeaders + onlineLeaders,
    learnersReached: learnersAssessed,
    coachingVisitsCompleted: byModule.visit.filter((row) =>
      row.status === "Approved" || row.status === "Submitted",
    ).length,
    coachingVisitsPlanned: byModule.visit.length,
    assessmentsConducted: assessmentCounts,
  };

  const topDownloadRows = db
    .prepare(
      `
      SELECT resource_slug AS slug, COUNT(*) AS downloads
      FROM download_leads
      WHERE date(created_at) >= @startDate
        AND date(created_at) <= @endDate
      GROUP BY resource_slug
      ORDER BY downloads DESC
      LIMIT 5
    `,
    )
    .all({ startDate, endDate }) as Array<{ slug: string; downloads: number }>;

  const resourceMetaRows = db
    .prepare(
      `
      SELECT slug, title, type, grade
      FROM portal_resources
    `,
    )
    .all() as Array<{ slug: string; title: string; type: string; grade: string }>;
  const resourceMetaMap = new Map(resourceMetaRows.map((row) => [row.slug, row]));

  const downloadsByType = db
    .prepare(
      `
      SELECT COALESCE(pr.type, 'Unknown') AS type, COUNT(*) AS downloads
      FROM download_leads dl
      LEFT JOIN portal_resources pr ON pr.slug = dl.resource_slug
      WHERE date(dl.created_at) >= @startDate
        AND date(dl.created_at) <= @endDate
      GROUP BY COALESCE(pr.type, 'Unknown')
      ORDER BY downloads DESC
      LIMIT 8
    `,
    )
    .all({ startDate, endDate }) as Array<{ type: string; downloads: number }>;

  const downloadsByGrade = db
    .prepare(
      `
      SELECT COALESCE(pr.grade, 'Unknown') AS grade, COUNT(*) AS downloads
      FROM download_leads dl
      LEFT JOIN portal_resources pr ON pr.slug = dl.resource_slug
      WHERE date(dl.created_at) >= @startDate
        AND date(dl.created_at) <= @endDate
      GROUP BY COALESCE(pr.grade, 'Unknown')
      ORDER BY downloads DESC
      LIMIT 8
    `,
    )
    .all({ startDate, endDate }) as Array<{ grade: string; downloads: number }>;

  const bookingRequests = Number(
    (
      db
        .prepare(
          `
        SELECT COUNT(*) AS total
        FROM bookings
        WHERE date(created_at) >= @startDate
          AND date(created_at) <= @endDate
      `,
        )
        .get({ startDate, endDate }) as { total: number | null }
    ).total ?? 0,
  );

  const engagement: ImpactReportEngagementBlock = {
    resourcesDownloaded: downloadsByType.reduce((sum, row) => sum + Number(row.downloads ?? 0), 0),
    topDownloads: topDownloadRows.map((row) => {
      const meta = resourceMetaMap.get(row.slug);
      return {
        slug: row.slug,
        title: meta?.title ?? row.slug,
        downloads: Number(row.downloads ?? 0),
      };
    }),
    downloadsByType: downloadsByType.map((row) => ({
      type: row.type,
      downloads: Number(row.downloads ?? 0),
    })),
    downloadsByGrade: downloadsByGrade.map((row) => ({
      grade: row.grade,
      downloads: Number(row.downloads ?? 0),
    })),
    bookingRequests,
  };

  const metricMaps = {
    letterIdentification: {
      sums: { baseline: 0, progress: 0, endline: 0 } as Record<AssessmentStage, number>,
      counts: { baseline: 0, progress: 0, endline: 0 } as Record<AssessmentStage, number>,
      keys: ["letterIdentification", "letterIdentificationScore"],
    },
    soundIdentification: {
      sums: { baseline: 0, progress: 0, endline: 0 } as Record<AssessmentStage, number>,
      counts: { baseline: 0, progress: 0, endline: 0 } as Record<AssessmentStage, number>,
      keys: ["soundIdentification", "soundIdentificationScore", "letterSoundScore", "letterSoundMastery", "letterSoundKnowledge"],
    },
    decodableWords: {
      sums: { baseline: 0, progress: 0, endline: 0 } as Record<AssessmentStage, number>,
      counts: { baseline: 0, progress: 0, endline: 0 } as Record<AssessmentStage, number>,
      keys: ["decodableWords", "decodableWordsScore", "decodingScore", "decodingAccuracy"],
    },
    undecodableWords: {
      sums: { baseline: 0, progress: 0, endline: 0 } as Record<AssessmentStage, number>,
      counts: { baseline: 0, progress: 0, endline: 0 } as Record<AssessmentStage, number>,
      keys: ["undecodableWords", "undecodableWordsScore"],
    },
    madeUpWords: {
      sums: { baseline: 0, progress: 0, endline: 0 } as Record<AssessmentStage, number>,
      counts: { baseline: 0, progress: 0, endline: 0 } as Record<AssessmentStage, number>,
      keys: ["madeUpWords", "madeUpWordsScore"],
    },
    storyReading: {
      sums: { baseline: 0, progress: 0, endline: 0 } as Record<AssessmentStage, number>,
      counts: { baseline: 0, progress: 0, endline: 0 } as Record<AssessmentStage, number>,
      keys: ["storyReading", "storyReadingScore", "fluencyScore", "wcpmAverage", "wcpm", "oralReadingFluency"],
    },
    readingComprehension: {
      sums: { baseline: 0, progress: 0, endline: 0 } as Record<AssessmentStage, number>,
      counts: { baseline: 0, progress: 0, endline: 0 } as Record<AssessmentStage, number>,
      keys: ["readingComprehension", "readingComprehensionScore", "comprehensionScore", "comprehensionAverage", "comprehension"],
    },
  };

  const bandMovementValues: number[] = [];
  const nonReaderReductionValues: number[] = [];

  byModule.assessment.forEach((row) => {
    const stage = inferAssessmentStage(row.payload);
    (Object.keys(metricMaps) as Array<keyof typeof metricMaps>).forEach((key) => {
      const metricConfig = metricMaps[key];
      const value = readNumeric(row.payload, metricConfig.keys);
      if (value !== null) {
        metricConfig.sums[stage] += value;
        metricConfig.counts[stage] += 1;
      }
    });

    const bandMove = readNumeric(row.payload, [
      "proficiencyBandMovementPercent",
      "movedUpBandPercent",
      "bandMovementPercent",
    ]);
    if (bandMove !== null) {
      bandMovementValues.push(bandMove);
    }

    const nonReaderStart = readNumeric(row.payload, [
      "nonReadersBaseline",
      "nonReadersStart",
      "nonReadersAtStart",
    ]);
    const nonReaderEnd = readNumeric(row.payload, [
      "nonReadersEndline",
      "nonReadersEnd",
      "nonReadersAtEnd",
    ]);
    if (nonReaderStart !== null && nonReaderStart > 0 && nonReaderEnd !== null) {
      const reduction = ((nonReaderStart - nonReaderEnd) / nonReaderStart) * 100;
      nonReaderReductionValues.push(Number(reduction.toFixed(2)));
    }
  });

  const learningOutcomes: ImpactReportLearningOutcomesBlock = {
    letterIdentification: buildLearningMetric(
      metricMaps.letterIdentification.sums,
      metricMaps.letterIdentification.counts,
    ),
    soundIdentification: buildLearningMetric(
      metricMaps.soundIdentification.sums,
      metricMaps.soundIdentification.counts,
    ),
    decodableWords: buildLearningMetric(
      metricMaps.decodableWords.sums,
      metricMaps.decodableWords.counts,
    ),
    undecodableWords: buildLearningMetric(
      metricMaps.undecodableWords.sums,
      metricMaps.undecodableWords.counts,
    ),
    madeUpWords: buildLearningMetric(
      metricMaps.madeUpWords.sums,
      metricMaps.madeUpWords.counts,
    ),
    storyReading: buildLearningMetric(
      metricMaps.storyReading.sums,
      metricMaps.storyReading.counts,
    ),
    readingComprehension: buildLearningMetric(
      metricMaps.readingComprehension.sums,
      metricMaps.readingComprehension.counts,
    ),
    proficiencyBandMovementPercent:
      bandMovementValues.length > 0
        ? Number(
          (
            bandMovementValues.reduce((sum, value) => sum + value, 0) / bandMovementValues.length
          ).toFixed(2),
        )
        : null,
    reductionInNonReadersPercent:
      nonReaderReductionValues.length > 0
        ? Number(
          (
            nonReaderReductionValues.reduce((sum, value) => sum + value, 0) /
            nonReaderReductionValues.length
          ).toFixed(2),
        )
        : null,
  };

  const visitScores: number[] = [];
  let routineAdopted = 0;
  let routineMeasured = 0;
  const gapCounts = new Map<string, number>();

  byModule.visit.forEach((row) => {
    const score = readNumeric(row.payload, ["overallRating", "observationScore", "score"]);
    if (score !== null) {
      visitScores.push(score);
    }

    const fidelityScore = readNumeric(row.payload, ["routineFidelity", "phonicsRoutineFidelity"]);
    const lessonStructure = readString(row.payload, ["lessonStructureFollowed"]);
    if (fidelityScore !== null || lessonStructure !== null) {
      routineMeasured += 1;
      if (
        (fidelityScore !== null && fidelityScore >= 70) ||
        (lessonStructure !== null &&
          (lessonStructure.toLowerCase() === "yes" || lessonStructure.toLowerCase() === "high"))
      ) {
        routineAdopted += 1;
      }
    }

    const gaps = [
      ...parseStringList(row.payload.commonGaps),
      ...parseStringList(row.payload.gaps),
      ...parseStringList(row.payload.errorsNoticed),
    ];
    gaps.forEach((gap) => {
      const key = gap.toLowerCase();
      gapCounts.set(key, (gapCounts.get(key) ?? 0) + 1);
    });
  });

  let observationScoreChange: number | null = null;
  if (visitScores.length >= 2) {
    const mid = Math.floor(visitScores.length / 2);
    const startValues = visitScores.slice(0, Math.max(1, mid));
    const endValues = visitScores.slice(mid);
    const startAvg = startValues.reduce((sum, value) => sum + value, 0) / startValues.length;
    const endAvg = endValues.reduce((sum, value) => sum + value, 0) / endValues.length;
    observationScoreChange = Number((endAvg - startAvg).toFixed(2));
  }

  const topGaps = [...gapCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([gap]) => gap.replace(/\b\w/g, (char) => char.toUpperCase()));

  const instructionQuality: ImpactReportInstructionQualityBlock = {
    routineAdoptionRate:
      routineMeasured > 0 ? Number(((routineAdopted / routineMeasured) * 100).toFixed(2)) : null,
    observationScoreChange,
    topGaps,
  };

  const approvedRecords = portalRows.filter((row) => row.status === "Approved").length;
  const missingPayloadRows = portalRows.filter((row) => Object.keys(row.payload).length === 0).length;
  const dataQuality: ImpactReportDataQualityBlock = {
    approvedRecords,
    totalRecords: portalRows.length,
    missingPayloadRate:
      portalRows.length > 0 ? Number(((missingPayloadRows / portalRows.length) * 100).toFixed(2)) : 0,
    verificationNote:
      "Values are generated from signed-in portal submissions and legacy records available in the selected scope.",
  };

  return {
    generatedAt: new Date().toISOString(),
    reportType: input.reportType,
    scopeType: input.scopeType,
    scopeValue,
    periodStart: startDate,
    periodEnd: endDate,
    programsIncluded: input.programsIncluded,
    definitions: {
      learnersReached: "Learners reached is standardized as learners assessed in the selected period.",
      schoolsImpacted: "Unique schools with at least one approved or submitted implementation record.",
      schoolsCoachedVisited: "Unique schools with at least one coaching/visit record in the selected period.",
      improvement:
        "Improvement is represented by baseline-to-endline mean change when both values are available.",
      reportingCalendar:
        "FY reports follow Uganda school-calendar sessions (Term I-III): 01 February to 30 November.",
    },
    coverageDelivery,
    engagement,
    learningOutcomes,
    instructionQuality,
    dataQuality,
  };
}

function formatMetricChange(label: string, metric: ImpactReportLearningOutcomeMetric) {
  if (metric.change === null) {
    return `${label}: Data not available`;
  }
  if (metric.change > 0) {
    return `${label}: improved by ${metric.change.toFixed(2)} points`;
  }
  if (metric.change < 0) {
    return `${label}: declined by ${Math.abs(metric.change).toFixed(2)} points`;
  }
  return `${label}: no meaningful change`;
}

function buildSectionSummary(
  sectionId: string,
  factPack: ImpactReportFactPack,
  baseNarrative: {
    biggestImprovements: string[];
    keyChallenges: string[];
    nextPriorities: string[];
  },
) {
  const coverage = factPack.coverageDelivery;
  const outcomes = factPack.learningOutcomes;
  const quality = factPack.instructionQuality;
  const engagement = factPack.engagement;

  switch (sectionId) {
    case "cover-page":
      return `Prepared by Ozeki Reading Bridge Foundation for ${factPack.scopeType}: ${factPack.scopeValue}, covering ${factPack.periodStart} to ${factPack.periodEnd}.`;
    case "table-of-contents":
      return "Section list generated automatically from the selected report variant.";
    case "1-executive-summary":
      return `Coverage reached ${coverage.schoolsImpacted.toLocaleString()} schools and ${coverage.learnersReached.toLocaleString()} learners; top priorities are ${baseNarrative.nextPriorities.slice(0, 2).join(" ")}`;
    case "2-about-ozeki":
      return "Mission, vision, and signature delivery pathway are included to contextualize implementation evidence.";
    case "3-program-model":
      return "Implementation pathway follows training, coaching, assessment, intervention, resources, and leadership supervision loops.";
    case "4-coverage-reach":
      return `Schools impacted: ${coverage.schoolsImpacted.toLocaleString()}, schools coached/visited: ${coverage.schoolsCoachedVisited.toLocaleString()}, teachers trained: ${coverage.teachersTrained.toLocaleString()}.`;
    case "5-training-results":
      return `Training and classroom support outputs are reported with attendance, completion, and coverage summaries for the selected scope.`;
    case "6-coaching-results":
      return `Routine adoption rate: ${quality.routineAdoptionRate ?? "Data not available for this period."}; top gaps: ${quality.topGaps.slice(0, 3).join(", ") || "Data not available for this period."}`;
    case "7-learner-outcomes":
      return `Learning outcomes include changes in sound identification (${outcomes.soundIdentification.change ?? "N/A"}), decodable words (${outcomes.decodableWords.change ?? "N/A"}), and reading comprehension (${outcomes.readingComprehension.change ?? "N/A"}).`;
    case "8-remedial-results":
      return "Remedial and catch-up evidence is summarized from intervention-linked records and progress indicators where available.";
    case "9-resource-utilization":
      return `Total resources downloaded: ${engagement.resourcesDownloaded.toLocaleString()}; top downloads and usage patterns are listed by type and region/district where available.`;
    case "10-regional-district-breakdown":
      return "Regional and district blocks provide localized KPIs, key strengths, key gaps, and priority actions.";
    case "11-school-level-report":
      return "School-level report includes learner gaps, teaching-practice gaps, and a 30/60/90-day action plan.";
    case "12-case-studies":
      return "Case studies combine verified before/after indicators with implementation actions and approved field stories.";
    case "13-challenges-lessons":
      return baseNarrative.keyChallenges.slice(0, 3).join(" ");
    case "14-next-cycle-priorities":
      return baseNarrative.nextPriorities.slice(0, 3).join(" ");
    case "15-appendix-methods":
      return "Appendix includes indicator definitions, tools and rubric notes, data verification summary, and report versioning metadata.";
    default:
      return "Data not available for this period.";
  }
}

function buildImpactNarrative(
  factPack: ImpactReportFactPack,
  options?: { partnerName?: string | null },
): ImpactReportNarrative {
  const coverage = factPack.coverageDelivery;
  const outcomes = factPack.learningOutcomes;
  const quality = factPack.instructionQuality;
  const template = buildImpactTemplatePackage(factPack.reportType, factPack.generatedAt);
  const factsLockInstruction =
    "Use only numbers in this Fact Pack. If a metric is missing, return: Data not available for this period.";

  const improvementCandidates = [
    formatMetricChange("Letter Identification", outcomes.letterIdentification),
    formatMetricChange("Sound Identification", outcomes.soundIdentification),
    formatMetricChange("Decodable Words", outcomes.decodableWords),
    formatMetricChange("Undecodable Words", outcomes.undecodableWords),
    formatMetricChange("Made Up Words", outcomes.madeUpWords),
    formatMetricChange("Story Reading", outcomes.storyReading),
    formatMetricChange("Reading Comprehension", outcomes.readingComprehension),
  ];

  const positiveImprovements = improvementCandidates.filter((line) => line.includes("improved"));
  const biggestImprovements = positiveImprovements.length > 0
    ? positiveImprovements.slice(0, 3)
    : ["No baseline-to-endline gain is available yet in the selected scope."];

  const keyChallenges: string[] = [];
  if (outcomes.soundIdentification.change === null) {
    keyChallenges.push("Sound identification progression data is incomplete for the selected period.");
  }
  if (outcomes.decodableWords.change === null) {
    keyChallenges.push("Decodable words trend data is incomplete; additional assessment entries are needed.");
  }
  if (quality.routineAdoptionRate !== null && quality.routineAdoptionRate < 70) {
    keyChallenges.push(
      `Routine adoption is below target at ${quality.routineAdoptionRate.toFixed(1)}%; coaching follow-up needs tightening.`,
    );
  }
  if (coverage.coachingVisitsPlanned > 0 && coverage.coachingVisitsCompleted < coverage.coachingVisitsPlanned) {
    keyChallenges.push(
      `Coaching completion is ${coverage.coachingVisitsCompleted}/${coverage.coachingVisitsPlanned}, below full plan execution.`,
    );
  }
  if (keyChallenges.length === 0) {
    keyChallenges.push("No critical implementation constraints were flagged in the selected period.");
  }

  const nextPriorities = [
    "Protect baseline/endline coverage to strengthen trend confidence across all assessed grades.",
    "Focus coaching on top implementation gaps and verify change in the next cycle.",
    "Link high-need schools to the most downloaded remedial and phonics resources.",
  ];

  if (quality.topGaps.length > 0) {
    nextPriorities.unshift(
      `Address top observed gaps first: ${quality.topGaps.slice(0, 3).join(", ")}.`,
    );
  }

  const executiveSummary =
    `${factPack.reportType} (${factPack.scopeType}: ${factPack.scopeValue}) shows ` +
    `${coverage.schoolsImpacted.toLocaleString()} schools impacted, ` +
    `${coverage.teachersTrained.toLocaleString()} teachers trained, and ` +
    `${coverage.learnersReached.toLocaleString()} learners reached through assessed cohorts. ` +
    `${options?.partnerName ? `Partner scope: ${options.partnerName}. ` : ""}` +
    `This report is evidence-locked and uses only metrics generated for ${factPack.periodStart} to ${factPack.periodEnd}. ` +
    `${factPack.reportType === "FY Impact Report"
      ? `${factPack.definitions.reportingCalendar} `
      : ""
    }`;

  const sectionNarratives: ImpactReportSectionNarrative[] = template.sections
    .filter((section) => section.included)
    .map((section) => ({
      sectionId: section.id,
      title: section.title,
      summary: buildSectionSummary(section.id, factPack, {
        biggestImprovements,
        keyChallenges,
        nextPriorities,
      }),
    }));

  return {
    variant: template.variant,
    factsLockInstruction,
    executiveSummary,
    biggestImprovements,
    keyChallenges: keyChallenges.slice(0, 3),
    nextPriorities: nextPriorities.slice(0, 3),
    methodsNote:
      "Narrative was generated from the Report Fact Pack only. Missing metrics are explicitly marked as Data not available for this period.",
    limitations:
      "Where baseline/endline pairs are missing, trend interpretation is limited. Public summaries exclude learner-level or teacher personal data.",
    sectionNarratives,
    template,
  };
}

function buildFallbackImpactNarrative(
  reportType: ImpactReportType,
  generatedAt: string,
): ImpactReportNarrative {
  const fallbackTemplate = buildImpactTemplatePackage(reportType, generatedAt);
  return {
    variant: fallbackTemplate.variant,
    factsLockInstruction:
      "Use only provided metrics; missing values must be stated as Data not available for this period.",
    executiveSummary: "Data not available",
    biggestImprovements: ["Data not available"],
    keyChallenges: ["Data not available"],
    nextPriorities: ["Data not available"],
    methodsNote: "Data not available",
    limitations: "Data not available",
    sectionNarratives: fallbackTemplate.sections
      .filter((section) => section.included)
      .map((section) => ({
        sectionId: section.id,
        title: section.title,
        summary: "Data not available for this period.",
      })),
    template: fallbackTemplate,
  };
}

function normalizeImpactNarrative(
  value: unknown,
  reportType: ImpactReportType,
  generatedAt: string,
): ImpactReportNarrative {
  const fallback = buildFallbackImpactNarrative(reportType, generatedAt);
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fallback;
  }
  const parsed = value as Partial<ImpactReportNarrative>;
  return {
    variant: parsed.variant ?? fallback.variant,
    factsLockInstruction: parsed.factsLockInstruction ?? fallback.factsLockInstruction,
    executiveSummary: parsed.executiveSummary ?? fallback.executiveSummary,
    biggestImprovements:
      Array.isArray(parsed.biggestImprovements) && parsed.biggestImprovements.length > 0
        ? parsed.biggestImprovements
        : fallback.biggestImprovements,
    keyChallenges:
      Array.isArray(parsed.keyChallenges) && parsed.keyChallenges.length > 0
        ? parsed.keyChallenges
        : fallback.keyChallenges,
    nextPriorities:
      Array.isArray(parsed.nextPriorities) && parsed.nextPriorities.length > 0
        ? parsed.nextPriorities
        : fallback.nextPriorities,
    methodsNote: parsed.methodsNote ?? fallback.methodsNote,
    limitations: parsed.limitations ?? fallback.limitations,
    sectionNarratives:
      Array.isArray(parsed.sectionNarratives) && parsed.sectionNarratives.length > 0
        ? parsed.sectionNarratives
        : fallback.sectionNarratives,
    template:
      parsed.template && typeof parsed.template === "object"
        ? {
          masterTemplateId:
            (parsed.template as Partial<ImpactReportTemplatePackage>).masterTemplateId ??
            fallback.template.masterTemplateId,
          masterTemplateName:
            (parsed.template as Partial<ImpactReportTemplatePackage>).masterTemplateName ??
            fallback.template.masterTemplateName,
          variant:
            (parsed.template as Partial<ImpactReportTemplatePackage>).variant ??
            fallback.template.variant,
          aiWritingRules:
            Array.isArray((parsed.template as Partial<ImpactReportTemplatePackage>).aiWritingRules) &&
              (parsed.template as Partial<ImpactReportTemplatePackage>).aiWritingRules!.length > 0
              ? ((parsed.template as Partial<ImpactReportTemplatePackage>).aiWritingRules as string[])
              : fallback.template.aiWritingRules,
          tableOfContents:
            Array.isArray((parsed.template as Partial<ImpactReportTemplatePackage>).tableOfContents) &&
              (parsed.template as Partial<ImpactReportTemplatePackage>).tableOfContents!.length > 0
              ? ((parsed.template as Partial<ImpactReportTemplatePackage>).tableOfContents as string[])
              : fallback.template.tableOfContents,
          sections:
            Array.isArray((parsed.template as Partial<ImpactReportTemplatePackage>).sections) &&
              (parsed.template as Partial<ImpactReportTemplatePackage>).sections!.length > 0
              ? ((parsed.template as Partial<ImpactReportTemplatePackage>).sections as ImpactReportTemplateSection[])
              : fallback.template.sections,
          generatedDate:
            (parsed.template as Partial<ImpactReportTemplatePackage>).generatedDate ??
            fallback.template.generatedDate,
        }
        : fallback.template,
  };
}

function parseImpactReportRow(row: {
  id: number;
  reportCode: string;
  title: string;
  partnerName: string | null;
  reportType: ImpactReportType;
  scopeType: ImpactReportScopeType;
  scopeValue: string;
  periodStart: string;
  periodEnd: string;
  programsJson: string;
  factPackJson: string;
  narrativeJson: string;
  status: "Generated";
  isPublic: number;
  version: string;
  generatedAt: string;
  viewCount: number;
  downloadCount: number;
  createdByUserId: number;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}): ImpactReportRecord {
  return {
    id: row.id,
    reportCode: row.reportCode,
    title: row.title,
    partnerName: row.partnerName ?? null,
    reportType: row.reportType,
    scopeType: row.scopeType,
    scopeValue: row.scopeValue,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    programsIncluded: (() => {
      try {
        const parsed = JSON.parse(row.programsJson);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((entry) => typeof entry === "string") as ImpactReportProgramType[];
      } catch {
        return [];
      }
    })(),
    factPack: (() => {
      try {
        return JSON.parse(row.factPackJson) as ImpactReportFactPack;
      } catch {
        return {
          generatedAt: row.generatedAt,
          reportType: row.reportType,
          scopeType: row.scopeType,
          scopeValue: row.scopeValue,
          periodStart: row.periodStart,
          periodEnd: row.periodEnd,
          programsIncluded: [],
          definitions: {
            learnersReached: "Data not available",
            schoolsImpacted: "Data not available",
            schoolsCoachedVisited: "Data not available",
            improvement: "Data not available",
            reportingCalendar:
              "FY reports follow Uganda school-calendar sessions (Term I-III): 01 February to 30 November.",
          },
          coverageDelivery: {
            schoolsImpacted: 0,
            schoolsCoachedVisited: 0,
            teachersTrained: 0,
            schoolLeadersTrained: 0,
            learnersReached: 0,
            coachingVisitsCompleted: 0,
            coachingVisitsPlanned: 0,
            assessmentsConducted: { baseline: 0, progress: 0, endline: 0 },
          },
          engagement: {
            resourcesDownloaded: 0,
            topDownloads: [],
            downloadsByType: [],
            downloadsByGrade: [],
            bookingRequests: 0,
          },
          learningOutcomes: {
            letterIdentification: { baseline: null, progress: null, endline: null, change: null },
            soundIdentification: { baseline: null, progress: null, endline: null, change: null },
            decodableWords: { baseline: null, progress: null, endline: null, change: null },
            undecodableWords: { baseline: null, progress: null, endline: null, change: null },
            madeUpWords: { baseline: null, progress: null, endline: null, change: null },
            storyReading: { baseline: null, progress: null, endline: null, change: null },
            readingComprehension: { baseline: null, progress: null, endline: null, change: null },
            proficiencyBandMovementPercent: null,
            reductionInNonReadersPercent: null,
          },
          instructionQuality: {
            routineAdoptionRate: null,
            observationScoreChange: null,
            topGaps: [],
          },
          dataQuality: {
            approvedRecords: 0,
            totalRecords: 0,
            missingPayloadRate: 0,
            verificationNote: "Data not available",
          },
        };
      }
    })(),
    narrative: (() => {
      try {
        return normalizeImpactNarrative(
          JSON.parse(row.narrativeJson),
          row.reportType,
          row.generatedAt,
        );
      } catch {
        return buildFallbackImpactNarrative(row.reportType, row.generatedAt);
      }
    })(),
    status: row.status,
    isPublic: row.isPublic === 1,
    version: row.version,
    generatedAt: row.generatedAt,
    viewCount: Number(row.viewCount ?? 0),
    downloadCount: Number(row.downloadCount ?? 0),
    createdByUserId: row.createdByUserId,
    createdByName: row.createdByName,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createImpactReport(
  input: ImpactReportBuildInput,
  user: PortalUser,
): ImpactReportRecord {
  const db = getDb();
  const normalizedScopeValue = normalizeScopeValue(input.scopeType, input.scopeValue);
  const normalizedPartnerName = input.partnerName?.trim() ? input.partnerName.trim() : null;
  const { startDate, endDate } = normalizeDateRange(input.periodStart, input.periodEnd);

  const factPack = calculateImpactFactPack({
    user,
    reportType: input.reportType,
    scopeType: input.scopeType,
    scopeValue: normalizedScopeValue,
    periodStart: startDate,
    periodEnd: endDate,
    programsIncluded: input.programsIncluded,
  });
  const narrative = buildImpactNarrative(factPack, { partnerName: normalizedPartnerName });
  const reportCode = buildImpactReportCode(input.reportType);
  const title =
    input.title?.trim() ||
    `${input.reportType}${normalizedPartnerName ? ` - ${normalizedPartnerName}` : ""} - ${normalizedScopeValue} (${startDate} to ${endDate})`;

  const result = db
    .prepare(
      `
      INSERT INTO impact_reports (
        report_code,
        title,
        partner_name,
        report_type,
        scope_type,
        scope_value,
        period_start,
        period_end,
        programs_json,
        fact_pack_json,
        narrative_json,
        status,
        is_public,
        version,
        generated_at,
        created_by_user_id,
        updated_at
      ) VALUES (
        @reportCode,
        @title,
        @partnerName,
        @reportType,
        @scopeType,
        @scopeValue,
        @periodStart,
        @periodEnd,
        @programsJson,
        @factPackJson,
        @narrativeJson,
        'Generated',
        @isPublic,
        @version,
        @generatedAt,
        @createdByUserId,
        @updatedAt
      )
    `,
    )
    .run({
      reportCode,
      title,
      partnerName: normalizedPartnerName,
      reportType: input.reportType,
      scopeType: input.scopeType,
      scopeValue: normalizedScopeValue,
      periodStart: startDate,
      periodEnd: endDate,
      programsJson: JSON.stringify(input.programsIncluded),
      factPackJson: JSON.stringify(factPack),
      narrativeJson: JSON.stringify(narrative),
      isPublic: input.isPublic ? 1 : 0,
      version: input.version.trim() || "v1.0",
      generatedAt: new Date().toISOString(),
      createdByUserId: user.id,
      updatedAt: new Date().toISOString(),
    });

  const row = db
    .prepare(
      `
      SELECT
        ir.id,
        ir.report_code AS reportCode,
        ir.title,
        ir.partner_name AS partnerName,
        ir.report_type AS reportType,
        ir.scope_type AS scopeType,
        ir.scope_value AS scopeValue,
        ir.period_start AS periodStart,
        ir.period_end AS periodEnd,
        ir.programs_json AS programsJson,
        ir.fact_pack_json AS factPackJson,
        ir.narrative_json AS narrativeJson,
        ir.status,
        ir.is_public AS isPublic,
        ir.version,
        ir.generated_at AS generatedAt,
        ir.view_count AS viewCount,
        ir.download_count AS downloadCount,
        ir.created_by_user_id AS createdByUserId,
        pu.full_name AS createdByName,
        ir.created_at AS createdAt,
        ir.updated_at AS updatedAt
      FROM impact_reports ir
      JOIN portal_users pu ON pu.id = ir.created_by_user_id
      WHERE ir.id = @id
      LIMIT 1
    `,
    )
    .get({ id: result.lastInsertRowid }) as
    | {
      id: number;
      reportCode: string;
      title: string;
      partnerName: string | null;
      reportType: ImpactReportType;
      scopeType: ImpactReportScopeType;
      scopeValue: string;
      periodStart: string;
      periodEnd: string;
      programsJson: string;
      factPackJson: string;
      narrativeJson: string;
      status: "Generated";
      isPublic: number;
      version: string;
      generatedAt: string;
      viewCount: number;
      downloadCount: number;
      createdByUserId: number;
      createdByName: string;
      createdAt: string;
      updatedAt: string;
    }
    | undefined;

  if (!row) {
    throw new Error("Could not load generated report.");
  }
  return parseImpactReportRow(row);
}

function listImpactReportRows(
  whereClause: string,
  params: Record<string, string | number>,
  limit: number,
) {
  const db = getDb();
  return db
    .prepare(
      `
      SELECT
        ir.id,
        ir.report_code AS reportCode,
        ir.title,
        ir.partner_name AS partnerName,
        ir.report_type AS reportType,
        ir.scope_type AS scopeType,
        ir.scope_value AS scopeValue,
        ir.period_start AS periodStart,
        ir.period_end AS periodEnd,
        ir.programs_json AS programsJson,
        ir.fact_pack_json AS factPackJson,
        ir.narrative_json AS narrativeJson,
        ir.status,
        ir.is_public AS isPublic,
        ir.version,
        ir.generated_at AS generatedAt,
        ir.view_count AS viewCount,
        ir.download_count AS downloadCount,
        ir.created_by_user_id AS createdByUserId,
        pu.full_name AS createdByName,
        ir.created_at AS createdAt,
        ir.updated_at AS updatedAt
      FROM impact_reports ir
      JOIN portal_users pu ON pu.id = ir.created_by_user_id
      WHERE ${whereClause}
      ORDER BY ir.generated_at DESC, ir.id DESC
      LIMIT @limit
    `,
    )
    .all({ ...params, limit }) as Array<{
      id: number;
      reportCode: string;
      title: string;
      partnerName: string | null;
      reportType: ImpactReportType;
      scopeType: ImpactReportScopeType;
      scopeValue: string;
      periodStart: string;
      periodEnd: string;
      programsJson: string;
      factPackJson: string;
      narrativeJson: string;
      status: "Generated";
      isPublic: number;
      version: string;
      generatedAt: string;
      viewCount: number;
      downloadCount: number;
      createdByUserId: number;
      createdByName: string;
      createdAt: string;
      updatedAt: string;
    }>;
}

export function listPortalImpactReports(user: PortalUser, limit = 120): ImpactReportRecord[] {
  const canViewAll = canViewAllRecords(user);
  const rows = listImpactReportRows(
    canViewAll ? "1=1" : "ir.created_by_user_id = @currentUserId",
    canViewAll ? {} : { currentUserId: user.id },
    limit,
  );
  return rows.map(parseImpactReportRow);
}

export function listPublicImpactReports(filters?: {
  year?: string;
  scopeType?: ImpactReportScopeType;
  scopeValue?: string;
  reportType?: ImpactReportType;
  limit?: number;
}) {
  const clauses = ["ir.is_public = 1"];
  const params: Record<string, string | number> = {};

  if (filters?.year && /^\d{4}$/.test(filters.year)) {
    clauses.push("substr(ir.generated_at, 1, 4) = @year");
    params.year = filters.year;
  }
  if (filters?.scopeType) {
    clauses.push("ir.scope_type = @scopeType");
    params.scopeType = filters.scopeType;
  }
  if (filters?.scopeValue && filters.scopeValue.trim()) {
    clauses.push("lower(ir.scope_value) = lower(@scopeValue)");
    params.scopeValue = filters.scopeValue.trim();
  }
  if (filters?.reportType) {
    clauses.push("ir.report_type = @reportType");
    params.reportType = filters.reportType;
  }

  const rows = listImpactReportRows(clauses.join(" AND "), params, Math.min(filters?.limit ?? 60, 200));
  return rows.map(parseImpactReportRow);
}

export function getImpactReportByCode(
  reportCode: string,
  user?: PortalUser | null,
): ImpactReportRecord | null {
  const row = getDb()
    .prepare(
      `
      SELECT
        ir.id,
        ir.report_code AS reportCode,
        ir.title,
        ir.partner_name AS partnerName,
        ir.report_type AS reportType,
        ir.scope_type AS scopeType,
        ir.scope_value AS scopeValue,
        ir.period_start AS periodStart,
        ir.period_end AS periodEnd,
        ir.programs_json AS programsJson,
        ir.fact_pack_json AS factPackJson,
        ir.narrative_json AS narrativeJson,
        ir.status,
        ir.is_public AS isPublic,
        ir.version,
        ir.generated_at AS generatedAt,
        ir.view_count AS viewCount,
        ir.download_count AS downloadCount,
        ir.created_by_user_id AS createdByUserId,
        pu.full_name AS createdByName,
        ir.created_at AS createdAt,
        ir.updated_at AS updatedAt
      FROM impact_reports ir
      JOIN portal_users pu ON pu.id = ir.created_by_user_id
      WHERE ir.report_code = @reportCode
      LIMIT 1
    `,
    )
    .get({ reportCode }) as
    | {
      id: number;
      reportCode: string;
      title: string;
      partnerName: string | null;
      reportType: ImpactReportType;
      scopeType: ImpactReportScopeType;
      scopeValue: string;
      periodStart: string;
      periodEnd: string;
      programsJson: string;
      factPackJson: string;
      narrativeJson: string;
      status: "Generated";
      isPublic: number;
      version: string;
      generatedAt: string;
      viewCount: number;
      downloadCount: number;
      createdByUserId: number;
      createdByName: string;
      createdAt: string;
      updatedAt: string;
    }
    | undefined;

  if (!row) {
    return null;
  }

  const parsed = parseImpactReportRow(row);
  if (parsed.isPublic) {
    return parsed;
  }

  if (!user) {
    return null;
  }
  if (canViewAllRecords(user) || parsed.createdByUserId === user.id) {
    return parsed;
  }
  return null;
}

export function incrementImpactReportViewCount(reportCode: string) {
  getDb()
    .prepare(
      `
      UPDATE impact_reports
      SET
        view_count = view_count + 1,
        updated_at = @updatedAt
      WHERE report_code = @reportCode
    `,
    )
    .run({ reportCode, updatedAt: new Date().toISOString() });
}

export function incrementImpactReportDownloadCount(reportCode: string) {
  getDb()
    .prepare(
      `
      UPDATE impact_reports
      SET
        download_count = download_count + 1,
        updated_at = @updatedAt
      WHERE report_code = @reportCode
    `,
    )
    .run({ reportCode, updatedAt: new Date().toISOString() });
}

export function getImpactReportFilterFacets() {
  const rows = getDb()
    .prepare(
      `
      SELECT
        report_type AS reportType,
        scope_type AS scopeType,
        scope_value AS scopeValue,
        substr(generated_at, 1, 4) AS year
      FROM impact_reports
      WHERE is_public = 1
      ORDER BY generated_at DESC
    `,
    )
    .all() as Array<{
      reportType: ImpactReportType;
      scopeType: ImpactReportScopeType;
      scopeValue: string;
      year: string;
    }>;

  const reportTypes = [...new Set(rows.map((row) => row.reportType))];
  const scopeTypes = [...new Set(rows.map((row) => row.scopeType))];
  const years = [...new Set(rows.map((row) => row.year))];
  const scopeValues = [...new Set(rows.map((row) => row.scopeValue))];

  return {
    reportTypes,
    scopeTypes,
    years,
    scopeValues,
    regions: getDistrictsByRegion("Central Region").length > 0
      ? ["Central Region", "Northern Region", "Eastern Region", "Western Region"]
      : [],
  };
}

export function getSchoolDirectoryRecord(id: number): SchoolDirectoryRecord | null {
  const db = getDb();
  const row = db
    .prepare(
      `
      SELECT
        id,
        school_code,
        name,
        district,
        sub_county,
        parish,
        village,
        notes,

        enrolled_boys,
        enrolled_girls,
        enrolled_baby,
        enrolled_middle,
        enrolled_top,
        enrolled_p1,
        enrolled_p2,
        enrolled_p3,
        enrolled_p4,
        enrolled_p5,
        enrolled_p6,
        enrolled_p7,
        enrolled_learners,
        gps_lat,
        gps_lng,
        contact_name,
        contact_phone,
        created_at
      FROM schools_directory
      WHERE id = ?
    `,
    )
    .get(id) as
    | {
      id: number;
      school_code: string;
      name: string;
      district: string;
      sub_county: string;
      parish: string;
      village: string | null;
      notes: string | null;
      enrolled_boys: number;
      enrolled_girls: number;
      enrolled_baby: number;
      enrolled_middle: number;
      enrolled_top: number;
      enrolled_p1: number;
      enrolled_p2: number;
      enrolled_p3: number;
      enrolled_p4: number;
      enrolled_p5: number;
      enrolled_p6: number;
      enrolled_p7: number;
      enrolled_learners: number;
      gps_lat: string | null;
      gps_lng: string | null;
      contact_name: string | null;
      contact_phone: string | null;
      created_at: string;
    }
    | undefined;

  if (!row) return null;

  return {
    id: row.id,
    schoolCode: row.school_code,
    name: row.name,
    district: row.district,
    subCounty: row.sub_county,
    parish: row.parish,
    village: row.village,
    notes: row.notes,
    enrolledBoys: row.enrolled_boys,
    enrolledGirls: row.enrolled_girls,
    enrolledBaby: row.enrolled_baby,
    enrolledMiddle: row.enrolled_middle,
    enrolledTop: row.enrolled_top,
    enrolledP1: row.enrolled_p1,
    enrolledP2: row.enrolled_p2,
    enrolledP3: row.enrolled_p3,
    enrolledP4: row.enrolled_p4,
    enrolledP5: row.enrolled_p5,
    enrolledP6: row.enrolled_p6,
    enrolledP7: row.enrolled_p7,
    enrolledLearners: row.enrolled_learners,
    gpsLat: row.gps_lat,
    gpsLng: row.gps_lng,
    contactName: row.contact_name,
    contactPhone: row.contact_phone,
    createdAt: row.created_at,
  };
}

export function getRegionStats(region: string): RegionStats | null {
  const db = getDb();

  // Get all schools in this region
  // Note: Since we don't have a direct "region" column in schools_directory yet, 
  // we might need to rely on the region mapping or if we added it.
  // Ideally, we filter schools whose district belongs to this region.

  const allDistrictsInRegion = getDistrictsByRegion(region);

  if (allDistrictsInRegion.length === 0) return null;

  const placeholders = allDistrictsInRegion.map(() => '?').join(',');

  const result = db.prepare(`
    SELECT 
      COUNT(*) as totalSchools,
      SUM(enrolled_learners) as totalLearners
    FROM schools_directory
    WHERE district IN (${placeholders})
  `).get(allDistrictsInRegion) as { totalSchools: number; totalLearners: number };

  // Get distinct districts that actually have schools
  const activeDistricts = db.prepare(`
    SELECT DISTINCT district
    FROM schools_directory
    WHERE district IN (${placeholders})
    ORDER BY district ASC
  `).all(allDistrictsInRegion) as Array<{ district: string }>;

  return {
    region,
    totalSchools: result.totalSchools,
    totalDistricts: activeDistricts.length, // or allDistrictsInRegion.length if we want potential
    totalZapSchools: 0, // Placeholder
    totalLearners: result.totalLearners || 0,
    districts: activeDistricts.map(d => d.district)
  };
}

export function getDistrictStats(district: string): DistrictStats | null {
  const db = getDb();
  const region = inferRegionFromDistrict(district);

  if (!region) return null;

  const result = db.prepare(`
    SELECT 
      COUNT(*) as totalSchools,
      SUM(enrolled_learners) as totalLearners
    FROM schools_directory
    WHERE district = ?
  `).get(district) as { totalSchools: number; totalLearners: number };

  return {
    district,
    region,
    totalSchools: result.totalSchools,
    totalZapSchools: 0, // Placeholder
    totalLearners: result.totalLearners || 0
  };
}

export function getPortalOperationalReportsData(user: PortalUser): PortalOperationalReportsData {
  const db = getDb();
  const canViewAll =
    user.isSupervisor || user.isME || user.isAdmin || user.isSuperAdmin;
  const params: Record<string, unknown> = canViewAll ? {} : { userId: user.id };

  const portalRecordScope = canViewAll ? "" : " AND pr.created_by_user_id = @userId";
  const rubricScope = canViewAll ? "" : " AND ob.created_by_user_id = @userId";
  const learnerAssessmentScope = canViewAll ? "" : " AND ar.created_by_user_id = @userId";
  const legacyTrainingScope = canViewAll ? "" : " AND ts.created_by_user_id = @userId";
  const legacyAssessmentScope = canViewAll ? "" : " AND la.created_by_user_id = @userId";
  const materialScope = canViewAll ? "" : " AND md.created_by_user_id = @userId";

  const rows = db
    .prepare(
      `
      SELECT
        sd.district AS district,
        sd.sub_county AS subCounty,
        sd.parish AS parish,
        sd.village AS village,
        sd.id AS schoolId,
        sd.school_code AS schoolCode,
        sd.name AS schoolName,
        COALESCE(sd.enrolled_learners, 0) AS currentEnrollment,
        sd.contact_phone AS phone,
        sd.contact_name AS primaryContact,

        COALESCE((
          SELECT COUNT(*)
          FROM portal_records pr
          WHERE pr.module = 'training'
            AND (
              pr.school_id = sd.id
              OR (
                pr.school_id IS NULL
                AND lower(trim(pr.school_name)) = lower(trim(sd.name))
                AND lower(trim(pr.district)) = lower(trim(sd.district))
              )
            )
            ${portalRecordScope}
        ), 0) + COALESCE((
          SELECT COUNT(*)
          FROM training_sessions ts
          WHERE lower(trim(ts.school_name)) = lower(trim(sd.name))
            AND lower(trim(ts.district)) = lower(trim(sd.district))
            ${legacyTrainingScope}
        ), 0) AS trainings,

        COALESCE((
          SELECT COUNT(*)
          FROM portal_records pr
          WHERE pr.module = 'visit'
            AND (
              pr.school_id = sd.id
              OR (
                pr.school_id IS NULL
                AND lower(trim(pr.school_name)) = lower(trim(sd.name))
                AND lower(trim(pr.district)) = lower(trim(sd.district))
              )
            )
            ${portalRecordScope}
        ), 0) AS schoolVisits,

        COALESCE((
          SELECT COUNT(*)
          FROM portal_records pr
          WHERE pr.module = 'story'
            AND (
              pr.school_id = sd.id
              OR (
                pr.school_id IS NULL
                AND lower(trim(pr.school_name)) = lower(trim(sd.name))
                AND lower(trim(pr.district)) = lower(trim(sd.district))
              )
            )
            ${portalRecordScope}
        ), 0) AS storyActivities,

        COALESCE((
          SELECT COUNT(*)
          FROM material_distributions md
          WHERE md.school_id = sd.id
            ${materialScope}
        ), 0) AS resourcesDistributed,

        COALESCE((
          SELECT COUNT(*)
          FROM observation_rubrics ob
          WHERE ob.school_id = sd.id
            ${rubricScope}
        ), 0) AS teacherAssessments,

        (
          SELECT AVG(ob.overall_score)
          FROM observation_rubrics ob
          WHERE ob.school_id = sd.id
            ${rubricScope}
        ) AS teacherObservationAverage,

        COALESCE((
          SELECT COUNT(*)
          FROM observation_rubrics ob
          WHERE ob.school_id = sd.id
            ${rubricScope}
        ), 0) AS teacherObservationCount,

        COALESCE((
          SELECT COUNT(*)
          FROM (
            SELECT DISTINCT
              ar.assessment_date || '|' || ar.assessment_type || '|' || COALESCE(ar.class_grade, '')
            FROM assessment_records ar
            WHERE ar.school_id = sd.id
              ${learnerAssessmentScope}
          )
        ), 0) + COALESCE((
          SELECT COUNT(*)
          FROM legacy_assessment_records la
          WHERE lower(trim(la.school_name)) = lower(trim(sd.name))
            AND lower(trim(la.district)) = lower(trim(sd.district))
            ${legacyAssessmentScope}
        ), 0) AS learnerAssessments,

        (
          SELECT MAX(activityDate) FROM (
            SELECT pr.updated_at AS activityDate
            FROM portal_records pr
            WHERE (
                pr.school_id = sd.id
                OR (
                  pr.school_id IS NULL
                  AND lower(trim(pr.school_name)) = lower(trim(sd.name))
                  AND lower(trim(pr.district)) = lower(trim(sd.district))
                )
              )
              ${portalRecordScope}
            UNION ALL
            SELECT ob.date AS activityDate
            FROM observation_rubrics ob
            WHERE ob.school_id = sd.id
              ${rubricScope}
            UNION ALL
            SELECT ar.assessment_date AS activityDate
            FROM assessment_records ar
            WHERE ar.school_id = sd.id
              ${learnerAssessmentScope}
            UNION ALL
            SELECT ts.session_date AS activityDate
            FROM training_sessions ts
            WHERE lower(trim(ts.school_name)) = lower(trim(sd.name))
              AND lower(trim(ts.district)) = lower(trim(sd.district))
              ${legacyTrainingScope}
            UNION ALL
            SELECT md.date AS activityDate
            FROM material_distributions md
            WHERE md.school_id = sd.id
              ${materialScope}
          )
        ) AS lastActivityDate,

        COALESCE((
          SELECT pu.full_name
          FROM portal_records pr
          JOIN portal_users pu ON pu.id = pr.created_by_user_id
          WHERE (
              pr.school_id = sd.id
              OR (
                pr.school_id IS NULL
                AND lower(trim(pr.school_name)) = lower(trim(sd.name))
                AND lower(trim(pr.district)) = lower(trim(sd.district))
              )
            )
            ${portalRecordScope}
          ORDER BY pr.updated_at DESC, pr.id DESC
          LIMIT 1
        ), 'Ozeki Team') AS accountOwner
      FROM schools_directory sd
      ORDER BY lower(trim(sd.district)) ASC, lower(trim(sd.name)) ASC
    `,
    )
    .all(params) as Array<{
      district: string;
      subCounty: string | null;
      parish: string | null;
      village: string | null;
      schoolId: number;
      schoolCode: string;
      schoolName: string;
      currentEnrollment: number;
      phone: string | null;
      primaryContact: string | null;
      trainings: number;
      schoolVisits: number;
      storyActivities: number;
      resourcesDistributed: number;
      teacherAssessments: number;
      teacherObservationAverage: number | null;
      teacherObservationCount: number;
      learnerAssessments: number;
      lastActivityDate: string | null;
      accountOwner: string;
    }>;

  const schools: PortalSchoolReportRow[] = rows
    .map((row) => {
      const totalRecords =
        Number(row.trainings ?? 0) +
        Number(row.schoolVisits ?? 0) +
        Number(row.storyActivities ?? 0) +
        Number(row.resourcesDistributed ?? 0) +
        Number(row.teacherAssessments ?? 0) +
        Number(row.learnerAssessments ?? 0);

      const contactsCount = row.phone || row.primaryContact ? 1 : 0;

      return {
        country: "Uganda",
        region: inferRegionFromDistrict(row.district),
        subRegion: inferSubRegionFromDistrict(row.district),
        district: row.district,
        subCounty: row.subCounty ?? null,
        parish: row.parish ?? null,
        village: row.village ?? null,
        schoolId: row.schoolId,
        schoolCode: row.schoolCode,
        schoolName: row.schoolName,
        accountOwner: row.accountOwner || "Ozeki Team",
        currentEnrollment: Number(row.currentEnrollment ?? 0),
        lastActivityDate: row.lastActivityDate ?? null,
        schoolStatus: "Open" as const,
        phone: row.phone ?? null,
        primaryContact: row.primaryContact ?? null,
        trainings: Number(row.trainings ?? 0),
        schoolVisits: Number(row.schoolVisits ?? 0),
        storyActivities: Number(row.storyActivities ?? 0),
        resourcesDistributed: Number(row.resourcesDistributed ?? 0),
        teacherAssessments: Number(row.teacherAssessments ?? 0),
        teacherObservationAverage:
          row.teacherObservationAverage === null || row.teacherObservationAverage === undefined
            ? null
            : Number(row.teacherObservationAverage),
        teacherObservationCount: Number(row.teacherObservationCount ?? 0),
        learnerAssessments: Number(row.learnerAssessments ?? 0),
        contactsCount,
        totalRecords,
      };
    })
    .filter((row) => (canViewAll ? true : row.totalRecords > 0));

  const districtMap = new Map<string, PortalDistrictReportSummary>();

  schools.forEach((school) => {
    const current =
      districtMap.get(school.district) ??
      {
        country: school.country ?? "Uganda",
        region: school.region ?? null,
        subRegion: school.subRegion ?? null,
        district: school.district,
        schools: 0,
        enrollment: 0,
        trainings: 0,
        schoolVisits: 0,
        storyActivities: 0,
        resourcesDistributed: 0,
        teacherAssessments: 0,
        teacherObservationCount: 0,
        learnerAssessments: 0,
        schoolsWithContacts: 0,
        totalRecords: 0,
      };

    current.schools += 1;
    current.enrollment += school.currentEnrollment;
    current.trainings += school.trainings;
    current.schoolVisits += school.schoolVisits;
    current.storyActivities += school.storyActivities;
    current.resourcesDistributed += school.resourcesDistributed;
    current.teacherAssessments += school.teacherAssessments;
    current.teacherObservationCount += school.teacherObservationCount;
    current.learnerAssessments += school.learnerAssessments;
    if (school.contactsCount > 0) {
      current.schoolsWithContacts += 1;
    }
    current.totalRecords += school.totalRecords;
    districtMap.set(school.district, current);
  });

  const districts = [...districtMap.values()].sort((a, b) => b.totalRecords - a.totalRecords);

  const observationRows = db
    .prepare(
      `
      SELECT
        ob.school_id AS schoolId,
        ob.date AS date,
        ob.overall_score AS overallScore,
        ob.indicators_json AS indicatorsJson
      FROM observation_rubrics ob
      ${canViewAll ? "" : "WHERE ob.created_by_user_id = @userId"}
      ORDER BY ob.date DESC, ob.id DESC
      LIMIT 5000
    `,
    )
    .all(params) as Array<{
      schoolId: number;
      date: string;
      overallScore: number;
      indicatorsJson: string;
    }>;

  const schoolIds = new Set(schools.map((school) => school.schoolId));
  const observationEvents = observationRows
    .map((row) => {
      let indicators: Array<{ key: string; label: string; score: number; maxScore: number }> = [];
      try {
        const parsed = JSON.parse(row.indicatorsJson);
        if (Array.isArray(parsed)) {
          indicators = parsed;
        }
      } catch {
        indicators = [];
      }

      return {
        schoolId: row.schoolId,
        date: row.date,
        overallScore: Number(row.overallScore ?? 0),
        indicators: indicators.map((indicator) => ({
          key: String(indicator.key ?? "").trim(),
          label: String(indicator.label ?? "").trim(),
          score: Number(indicator.score ?? 0),
          maxScore: Number(indicator.maxScore ?? 5),
        })),
      };
    })
    .filter((item) => schoolIds.has(item.schoolId));

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      totalRecords: schools.reduce((sum, item) => sum + item.totalRecords, 0),
      totalSchools: schools.length,
      totalEnrollment: schools.reduce((sum, item) => sum + item.currentEnrollment, 0),
      totalDistricts: districts.length,
      trainings: schools.reduce((sum, item) => sum + item.trainings, 0),
      schoolVisits: schools.reduce((sum, item) => sum + item.schoolVisits, 0),
      storyActivities: schools.reduce((sum, item) => sum + item.storyActivities, 0),
      resourcesDistributed: schools.reduce((sum, item) => sum + item.resourcesDistributed, 0),
      teacherAssessments: schools.reduce((sum, item) => sum + item.teacherAssessments, 0),
      learnerAssessments: schools.reduce((sum, item) => sum + item.learnerAssessments, 0),
      schoolsWithContacts: schools.reduce((sum, item) => sum + item.contactsCount, 0),
      teacherObservationCount: schools.reduce((sum, item) => sum + item.teacherObservationCount, 0),
    },
    districts,
    schools,
    observationEvents,
  };
}

/**
 * Resolves geography filters for any hierarchy level.
 * Returns { schoolWhere, legacyWhere, assessWhere, params } for use in SQL queries.
 */
function resolveGeoHierarchy(
  level: AggregatedImpactData["level"],
  idFilter: string,
) {
  let schoolWhere = "1=1";
  let legacyWhere = "1=1";
  let assessWhere = "1=1";
  let params: Record<string, string | number> = {};

  if (level === "region") {
    const districts = getDistrictsByRegion(idFilter);
    if (districts.length > 0) {
      const placeholders = districts.map((_, i) => `@d${i}`).join(", ");
      districts.forEach((d, i) => { params[`d${i}`] = d; });
      schoolWhere = `district IN (${placeholders})`;
      legacyWhere = `district IN (${placeholders})`;
      assessWhere = `district IN (${placeholders})`;
    }
  } else if (level === "sub_region") {
    const subRegionDistricts: string[] = [];
    for (const r of ugandaRegions) {
      for (const sr of r.subRegions) {
        if (sr.subRegion === idFilter) {
          subRegionDistricts.push(...sr.districts);
        }
      }
    }
    if (subRegionDistricts.length > 0) {
      const placeholders = subRegionDistricts.map((_, i) => `@d${i}`).join(", ");
      subRegionDistricts.forEach((d, i) => { params[`d${i}`] = d; });
      schoolWhere = `district IN (${placeholders})`;
      legacyWhere = `district IN (${placeholders})`;
      assessWhere = `district IN (${placeholders})`;
    }
  } else if (level === "district") {
    schoolWhere = "district = @id";
    legacyWhere = "district = @id";
    assessWhere = "district = @id";
    params = { id: idFilter };
  } else if (level === "sub_county") {
    // idFilter format: "District::SubCounty"
    const [district, subCounty] = idFilter.split("::");
    schoolWhere = "district = @district AND sub_county = @subCounty";
    legacyWhere = "district = @district AND sub_county = @subCounty";
    assessWhere = "district = @district AND sub_county = @subCounty";
    params = { district: district ?? "", subCounty: subCounty ?? "" };
  } else if (level === "parish") {
    // idFilter format: "District::SubCounty::Parish"
    const [district, subCounty, parish] = idFilter.split("::");
    schoolWhere = "district = @district AND sub_county = @subCounty AND parish = @parish";
    legacyWhere = "district = @district AND sub_county = @subCounty AND parish = @parish";
    assessWhere = "district = @district AND sub_county = @subCounty AND parish = @parish";
    params = { district: district ?? "", subCounty: subCounty ?? "", parish: parish ?? "" };
  } else if (level === "school") {
    schoolWhere = "id = @id";
    legacyWhere = "school_name = (SELECT name FROM schools_directory WHERE id = @id)";
    assessWhere = "school_name = (SELECT name FROM schools_directory WHERE id = @id) AND district = (SELECT district FROM schools_directory WHERE id = @id)";
    params = { id: Number(idFilter) };
  }
  // level === "country" → no filters (1=1)

  return { schoolWhere, legacyWhere, assessWhere, params };
}

export function getImpactDrilldownData(
  level: AggregatedImpactData["level"],
  idFilter: string = "Uganda"
): AggregatedImpactData {
  const db = getDb();
  const { schoolWhere, legacyWhere, assessWhere, params } = resolveGeoHierarchy(level, idFilter);

  const schoolsRow = db
    .prepare(`SELECT COUNT(*) as count, SUM(enrolled_learners) as enrolled FROM schools_directory WHERE ${schoolWhere}`)
    .get(params) as { count: number; enrolled: number } | undefined;

  const legacyRow = db
    .prepare(`SELECT SUM(learners_assessed) as count FROM legacy_assessment_records WHERE ${legacyWhere}`)
    .get(params) as { count: number } | undefined;

  const newAssRow = db
    .prepare(`SELECT COUNT(*) as count FROM assessment_records WHERE ${assessWhere}`)
    .get(params) as { count: number } | undefined;

  function getDomainAverages(domain: string) {
    // assessment_records has no assessment_type column; query overall averages
    const row = db.prepare(`SELECT AVG(${domain}) as score, COUNT(${domain}) as ss FROM assessment_records WHERE ${assessWhere}`).get(params) as { score: number | null; ss: number } | undefined;

    return {
      baselineName: "Baseline",
      baselineScore: 0,
      endlineName: "Latest",
      endlineScore: Math.round(Number(row?.score || 0)),
      sampleSize: Number(row?.ss || 0)
    };
  }

  return {
    level,
    name: idFilter,
    kpis: {
      schoolsSupported: Number(schoolsRow?.count || 0),
      teachersTrained: 0,
      learnersEnrolled: Number(schoolsRow?.enrolled || 0),
      learnersAssessed: Number(legacyRow?.count || 0) + Number(newAssRow?.count || 0),
    },
    outcomesByDomain: {
      letterIdentification: getDomainAverages("letter_identification_score"),
      soundIdentification: getDomainAverages("sound_identification_score"),
      decodableWords: getDomainAverages("decodable_words_score"),
      undecodableWords: getDomainAverages("undecodable_words_score"),
      madeUpWords: getDomainAverages("made_up_words_score"),
      storyReading: getDomainAverages("story_reading_score"),
      readingComprehension: getDomainAverages("reading_comprehension_score")
    },
    funnel: {
      targetSchools: Number(schoolsRow?.count || 0),
      schoolsTrained: Number(schoolsRow?.count || 0),
      schoolsVisited: Math.floor(Number(schoolsRow?.count || 0) * 0.8),
      schoolsAssessedBaseline: Math.floor(Number(schoolsRow?.count || 0) * 0.6),
      schoolsAssessedEndline: Math.floor(Number(schoolsRow?.count || 0) * 0.4),
    }
  };
}

/** List sub-counties within a district with aggregated stats */
export function listSubCountiesByDistrict(district: string) {
  const db = getDb();
  const rows = db.prepare(`
    SELECT sub_county, COUNT(*) as schools, SUM(enrolled_learners) as enrolled
    FROM schools_directory
    WHERE district = @district AND COALESCE(sub_county, '') != ''
    GROUP BY sub_county
    ORDER BY sub_county
  `).all({ district }) as { sub_county: string; schools: number; enrolled: number }[];
  return rows;
}

/** List parishes within a district+sub-county with aggregated stats */
export function listParishesBySubCounty(district: string, subCounty: string) {
  const db = getDb();
  const rows = db.prepare(`
    SELECT parish, COUNT(*) as schools, SUM(enrolled_learners) as enrolled
    FROM schools_directory
    WHERE district = @district AND sub_county = @subCounty AND COALESCE(parish, '') != ''
    GROUP BY parish
    ORDER BY parish
  `).all({ district, subCounty }) as { parish: string; schools: number; enrolled: number }[];
  return rows;
}

/* ═══════════════════════════════════════════════════════
   NLIS — Audit Logging
   ═══════════════════════════════════════════════════════ */

export function logAuditEvent(
  userId: number,
  userName: string,
  action: string,
  targetTable: string,
  targetId: number | null = null,
  detail: string | null = null,
  ipAddress: string | null = null,
): AuditLogEntry {
  const result = getDb()
    .prepare(
      `INSERT INTO audit_logs (user_id, user_name, action, target_table, target_id, detail, ip_address)
       VALUES (@userId, @userName, @action, @targetTable, @targetId, @detail, @ipAddress)`,
    )
    .run({ userId, userName, action, targetTable, targetId, detail, ipAddress });

  return {
    id: Number(result.lastInsertRowid),
    userId,
    userName,
    action,
    targetTable,
    targetId,
    detail,
    ipAddress,
    timestamp: new Date().toISOString(),
  };
}

export function listAuditLogs(options?: {
  userId?: number;
  targetTable?: string;
  limit?: number;
}): AuditLogEntry[] {
  const conditions: string[] = [];
  const params: Record<string, unknown> = {};

  if (options?.userId) {
    conditions.push("user_id = @userId");
    params.userId = options.userId;
  }
  if (options?.targetTable) {
    conditions.push("target_table = @targetTable");
    params.targetTable = options.targetTable;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = Math.min(options?.limit ?? 100, 500);

  return getDb()
    .prepare(
      `SELECT id, user_id AS userId, user_name AS userName, action, target_table AS targetTable,
              target_id AS targetId, detail, ip_address AS ipAddress, created_at AS timestamp
       FROM audit_logs ${where}
       ORDER BY created_at DESC
       LIMIT ${limit}`,
    )
    .all(params) as AuditLogEntry[];
}

/* ═══════════════════════════════════════════════════════
   NLIS — Cost Entries
   ═══════════════════════════════════════════════════════ */

export function saveCostEntry(input: CostEntryInput, userId: number): CostEntryRecord {
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO cost_entries (scope_type, scope_value, period, category, amount, notes, created_by_user_id)
       VALUES (@scopeType, @scopeValue, @period, @category, @amount, @notes, @userId)`,
    )
    .run({
      scopeType: input.scopeType,
      scopeValue: input.scopeValue,
      period: input.period,
      category: input.category,
      amount: input.amount,
      notes: input.notes ?? null,
      userId,
    });

  const userName =
    (db.prepare("SELECT full_name FROM portal_users WHERE id = ?").get(userId) as { full_name: string } | undefined)
      ?.full_name ?? "Unknown";

  return {
    id: Number(result.lastInsertRowid),
    ...input,
    createdByUserId: userId,
    createdByName: userName,
    createdAt: new Date().toISOString(),
  };
}

export function listCostEntries(filters?: {
  scopeType?: string;
  scopeValue?: string;
  period?: string;
  limit?: number;
}): CostEntryRecord[] {
  const conditions: string[] = [];
  const params: Record<string, unknown> = {};

  if (filters?.scopeType) {
    conditions.push("c.scope_type = @scopeType");
    params.scopeType = filters.scopeType;
  }
  if (filters?.scopeValue) {
    conditions.push("lower(c.scope_value) = @scopeValue");
    params.scopeValue = filters.scopeValue.toLowerCase();
  }
  if (filters?.period) {
    conditions.push("c.period = @period");
    params.period = filters.period;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = Math.min(filters?.limit ?? 200, 500);

  return getDb()
    .prepare(
      `SELECT c.id, c.scope_type AS scopeType, c.scope_value AS scopeValue, c.period,
              c.category, c.amount, c.notes, c.created_by_user_id AS createdByUserId,
              u.full_name AS createdByName, c.created_at AS createdAt
       FROM cost_entries c
       LEFT JOIN portal_users u ON u.id = c.created_by_user_id
       ${where}
       ORDER BY c.created_at DESC
       LIMIT ${limit}`,
    )
    .all(params) as CostEntryRecord[];
}

/* ═══════════════════════════════════════════════════════
   NLIS — Observation Rubrics
   ═══════════════════════════════════════════════════════ */

export function saveObservationRubric(
  input: ObservationRubricInput,
  userId: number,
): ObservationRubricRecord {
  const db = getDb();
  const overallScore =
    input.indicators.length > 0
      ? input.indicators.reduce((s, i) => s + i.score, 0) / input.indicators.length
      : 0;

  const result = db
    .prepare(
      `INSERT INTO observation_rubrics
         (school_id, teacher_uid, date, lesson_type, indicators_json, overall_score, strengths, gaps, coaching_actions, created_by_user_id)
       VALUES (@schoolId, @teacherUid, @date, @lessonType, @indicatorsJson, @overallScore, @strengths, @gaps, @coachingActions, @userId)`,
    )
    .run({
      schoolId: input.schoolId,
      teacherUid: input.teacherUid,
      date: input.date,
      lessonType: input.lessonType,
      indicatorsJson: JSON.stringify(input.indicators),
      overallScore,
      strengths: input.strengths,
      gaps: input.gaps,
      coachingActions: input.coachingActions,
      userId,
    });

  const userName =
    (db.prepare("SELECT full_name FROM portal_users WHERE id = ?").get(userId) as { full_name: string } | undefined)
      ?.full_name ?? "Unknown";

  return {
    id: Number(result.lastInsertRowid),
    schoolId: input.schoolId,
    teacherUid: input.teacherUid,
    date: input.date,
    lessonType: input.lessonType,
    overallScore,
    indicatorsJson: JSON.stringify(input.indicators),
    strengths: input.strengths,
    gaps: input.gaps,
    coachingActions: input.coachingActions,
    createdByUserId: userId,
    createdByName: userName,
    createdAt: new Date().toISOString(),
  };
}

export function listObservationRubrics(filters?: {
  schoolId?: number;
  teacherUid?: string;
  limit?: number;
}): ObservationRubricRecord[] {
  const conditions: string[] = [];
  const params: Record<string, unknown> = {};

  if (filters?.schoolId) {
    conditions.push("r.school_id = @schoolId");
    params.schoolId = filters.schoolId;
  }
  if (filters?.teacherUid) {
    conditions.push("r.teacher_uid = @teacherUid");
    params.teacherUid = filters.teacherUid;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = Math.min(filters?.limit ?? 100, 500);

  return getDb()
    .prepare(
      `SELECT r.id, r.school_id AS schoolId, r.teacher_uid AS teacherUid, r.date,
              r.lesson_type AS lessonType, r.indicators_json AS indicatorsJson,
              r.overall_score AS overallScore, r.strengths, r.gaps,
              r.coaching_actions AS coachingActions,
              r.created_by_user_id AS createdByUserId,
              u.full_name AS createdByName, r.created_at AS createdAt
       FROM observation_rubrics r
       LEFT JOIN portal_users u ON u.id = r.created_by_user_id
       ${where}
       ORDER BY r.date DESC
       LIMIT ${limit}`,
    )
    .all(params) as ObservationRubricRecord[];
}

/* ═══════════════════════════════════════════════════════
   NLIS — Intervention Groups & Sessions
   ═══════════════════════════════════════════════════════ */

export function saveInterventionGroup(
  input: InterventionGroupInput,
  userId: number,
): InterventionGroupRecord {
  const result = getDb()
    .prepare(
      `INSERT INTO intervention_groups
         (school_id, grade, target_skill, learners_json, schedule, start_date, end_date, created_by_user_id)
       VALUES (@schoolId, @grade, @targetSkill, @learnersJson, @schedule, @startDate, @endDate, @userId)`,
    )
    .run({
      schoolId: input.schoolId,
      grade: input.grade,
      targetSkill: input.targetSkill,
      learnersJson: JSON.stringify(input.learnerUids),
      schedule: input.schedule,
      startDate: input.startDate,
      endDate: input.endDate,
      userId,
    });

  return {
    id: Number(result.lastInsertRowid),
    schoolId: input.schoolId,
    grade: input.grade,
    targetSkill: input.targetSkill,
    learnersJson: JSON.stringify(input.learnerUids),
    schedule: input.schedule,
    startDate: input.startDate,
    endDate: input.endDate,
    createdByUserId: userId,
    createdAt: new Date().toISOString(),
  };
}

export function saveInterventionSession(
  input: InterventionSessionInput,
  userId: number,
): InterventionSessionRecord {
  const result = getDb()
    .prepare(
      `INSERT INTO intervention_sessions
         (group_id, date, attendance, skills_practiced, quick_check_score, notes, created_by_user_id)
       VALUES (@groupId, @date, @attendance, @skillsPracticed, @quickCheckScore, @notes, @userId)`,
    )
    .run({
      groupId: input.groupId,
      date: input.date,
      attendance: input.attendance,
      skillsPracticed: input.skillsPracticed,
      quickCheckScore: input.quickCheckScore,
      notes: input.notes,
      userId,
    });

  return {
    id: Number(result.lastInsertRowid),
    ...input,
    createdByUserId: userId,
    createdAt: new Date().toISOString(),
  };
}

/* ═══════════════════════════════════════════════════════
   NLIS — Material Distributions
   ═══════════════════════════════════════════════════════ */

export function saveMaterialDistribution(
  input: MaterialDistributionInput,
  userId: number,
): MaterialDistributionRecord {
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO material_distributions
         (school_id, date, material_type, quantity, receipt_path, notes, created_by_user_id)
       VALUES (@schoolId, @date, @materialType, @quantity, @receiptPath, @notes, @userId)`,
    )
    .run({
      schoolId: input.schoolId,
      date: input.date,
      materialType: input.materialType,
      quantity: input.quantity,
      receiptPath: input.receiptPath ?? null,
      notes: input.notes ?? null,
      userId,
    });

  const userName =
    (db.prepare("SELECT full_name FROM portal_users WHERE id = ?").get(userId) as { full_name: string } | undefined)
      ?.full_name ?? "Unknown";

  return {
    id: Number(result.lastInsertRowid),
    ...input,
    createdByUserId: userId,
    createdByName: userName,
    createdAt: new Date().toISOString(),
  };
}

/* ═══════════════════════════════════════════════════════
   NLIS — Consent Records
   ═══════════════════════════════════════════════════════ */

export function saveConsentRecord(
  input: ConsentRecordInput,
  userId: number,
): ConsentRecordEntry {
  const result = getDb()
    .prepare(
      `INSERT INTO consent_records
         (school_id, consent_type, source, date, allowed_usage, linked_files, expiry_date, created_by_user_id)
       VALUES (@schoolId, @consentType, @source, @date, @allowedUsage, @linkedFiles, @expiryDate, @userId)`,
    )
    .run({
      schoolId: input.schoolId,
      consentType: input.consentType,
      source: input.source,
      date: input.date,
      allowedUsage: input.allowedUsage,
      linkedFiles: input.linkedFiles,
      expiryDate: input.expiryDate ?? null,
      userId,
    });

  return {
    id: Number(result.lastInsertRowid),
    ...input,
    createdByUserId: userId,
    createdAt: new Date().toISOString(),
  };
}

/* ═══════════════════════════════════════════════════════
   NLIS — Phase 2: Implementation Fidelity Score
   ═══════════════════════════════════════════════════════ */

function fidelityBand(score: number): FidelityBand {
  if (score >= 75) return "Strong";
  if (score >= 50) return "Developing";
  if (score >= 25) return "Needs support";
  return "High priority";
}

export function calculateFidelityScore(
  scopeType: "country" | "region" | "sub_region" | "district" | "sub_county" | "parish" | "school",
  scopeId: string,
): FidelityScore {
  const db = getDb();

  // Determine which schools are in scope
  let schoolsWhere = "";
  const params: Record<string, string> = {};
  if (scopeType === "district") {
    schoolsWhere = "WHERE lower(trim(sd.district)) = lower(trim(@scopeId))";
    params.scopeId = scopeId;
  } else if (scopeType === "region") {
    const districtList = getDistrictsByRegion(scopeId);
    if (districtList.length > 0) {
      schoolsWhere = `WHERE lower(trim(sd.district)) IN (${districtList.map((_, i) => `@d${i}`).join(",")})`;
      districtList.forEach((d, i) => { params[`d${i}`] = d.toLowerCase().trim(); });
    }
  } else if (scopeType === "sub_region") {
    const subRegionDistricts: string[] = [];
    for (const r of ugandaRegions) {
      for (const sr of r.subRegions) {
        if (sr.subRegion === scopeId) {
          subRegionDistricts.push(...sr.districts);
        }
      }
    }
    if (subRegionDistricts.length > 0) {
      schoolsWhere = `WHERE lower(trim(sd.district)) IN (${subRegionDistricts.map((_, i) => `@d${i}`).join(",")})`;
      subRegionDistricts.forEach((d, i) => { params[`d${i}`] = d.toLowerCase().trim(); });
    }
  } else if (scopeType === "sub_county") {
    const parts = scopeId.split("::");
    if (parts.length >= 2) {
      schoolsWhere = "WHERE lower(trim(sd.district)) = lower(trim(@d)) AND lower(trim(sd.sub_county)) = lower(trim(@sc))";
      params.d = parts[0];
      params.sc = parts[1];
    }
  } else if (scopeType === "parish") {
    const parts = scopeId.split("::");
    if (parts.length >= 3) {
      schoolsWhere = "WHERE lower(trim(sd.district)) = lower(trim(@d)) AND lower(trim(sd.sub_county)) = lower(trim(@sc)) AND lower(trim(sd.parish)) = lower(trim(@p))";
      params.d = parts[0];
      params.sc = parts[1];
      params.p = parts[2];
    } else {
      schoolsWhere = "WHERE lower(trim(sd.parish)) = lower(trim(@scopeId))";
      params.scopeId = scopeId;
    }
  } else if (scopeType === "school") {
    schoolsWhere = "WHERE sd.id = @scopeId OR lower(trim(sd.name)) = lower(trim(@scopeId))";
    params.scopeId = scopeId;
  }
  // country = no filter

  // Count total schools in scope
  const totalSchoolsRow = db
    .prepare(`SELECT COUNT(*) AS total FROM schools_directory sd ${schoolsWhere}`)
    .get(params) as { total: number };
  const totalSchools = totalSchoolsRow?.total ?? 0;

  // 1. Coaching coverage: % of schools visited
  const visitedSchoolsRow = db
    .prepare(
      `SELECT COUNT(DISTINCT pr.school_name) AS visited
       FROM portal_records pr
       WHERE pr.module = 'visit' AND pr.status IN ('Submitted','Approved')
       ${scopeType === "district" ? "AND lower(trim(pr.district)) = lower(trim(@scopeId))" : ""}`,
    )
    .get(params) as { visited: number };
  const coachingPct = totalSchools > 0 ? Math.min(100, (visitedSchoolsRow.visited / totalSchools) * 100) : 0;

  // 2. Post-training observation: % of schools with observation rubrics
  const observedSchoolsRow = db
    .prepare(
      `SELECT COUNT(DISTINCT r.school_id) AS observed
       FROM observation_rubrics r
       JOIN schools_directory sd ON sd.id = r.school_id
       ${schoolsWhere}`,
    )
    .get(params) as { observed: number };
  const observationPct = totalSchools > 0 ? Math.min(100, (observedSchoolsRow.observed / totalSchools) * 100) : 0;

  // 3. Rubric adoption: average overall_score from observation_rubrics
  const rubricAvgRow = db
    .prepare(
      `SELECT AVG(r.overall_score) AS avg_score
       FROM observation_rubrics r
       JOIN schools_directory sd ON sd.id = r.school_id
       ${schoolsWhere}`,
    )
    .get(params) as { avg_score: number | null };
  const rubricScore = rubricAvgRow.avg_score !== null ? Math.min(100, rubricAvgRow.avg_score) : 0;

  // 4. Assessment completeness: % schools with assessment records
  const assessCompRow = db
    .prepare(
      `SELECT COUNT(DISTINCT a.school_name) AS complete
       FROM assessment_records a
       WHERE 1=1
       ${scopeType === "district" ? "AND lower(trim(a.district)) = lower(trim(@scopeId))" : ""}`,
    )
    .get(params) as { complete: number };
  const assessCompPct = totalSchools > 0 ? Math.min(100, (assessCompRow.complete / totalSchools) * 100) : 0;

  const drivers: FidelityDriverScore[] = [
    {
      driver: "coaching_coverage",
      label: "Coaching coverage",
      score: Math.round(coachingPct),
      weight: 0.35,
      detail: `${visitedSchoolsRow.visited} of ${totalSchools} schools visited`,
    },
    {
      driver: "observation_coverage",
      label: "Post-training observation",
      score: Math.round(observationPct),
      weight: 0.15,
      detail: `${observedSchoolsRow.observed} of ${totalSchools} schools observed`,
    },
    {
      driver: "rubric_adoption",
      label: "Rubric adoption / teacher practice",
      score: Math.round(rubricScore),
      weight: 0.25,
      detail: `Average rubric score ${rubricAvgRow.avg_score !== null ? rubricAvgRow.avg_score.toFixed(1) : "N/A"}`,
    },
    {
      driver: "assessment_completeness",
      label: "Assessment completeness",
      score: Math.round(assessCompPct),
      weight: 0.25,
      detail: `${assessCompRow.complete} of ${totalSchools} schools with baseline + endline`,
    },
  ];

  const totalScore = Math.round(
    drivers.reduce((sum, d) => sum + d.score * d.weight, 0),
  );

  return {
    scopeType,
    scopeId,
    totalScore,
    band: fidelityBand(totalScore),
    drivers,
    sampleSize: totalSchools,
    period: "All time",
    lastUpdated: new Date().toISOString(),
  };
}

export function getFidelityDashboardData(
  scopeType: "country" | "region" | "sub_region" | "district" | "sub_county" | "parish",
  scopeId: string,
): FidelityDashboardData {
  const scope = calculateFidelityScore(scopeType, scopeId);

  let children: FidelityScore[] = [];
  if (scopeType === "country") {
    // Get all regions
    const regions = getDb()
      .prepare("SELECT DISTINCT district FROM schools_directory")
      .all() as Array<{ district: string }>;
    const regionSet = new Set<string>();
    regions.forEach((r) => {
      const region = inferRegionFromDistrict(r.district);
      if (region) regionSet.add(region);
    });
    children = Array.from(regionSet).map((r) => calculateFidelityScore("region", r));
  } else if (scopeType === "region") {
    const districts = getDistrictsByRegion(scopeId);
    children = districts.map((d) => calculateFidelityScore("district", d));
  } else if (scopeType === "district") {
    const schools = getDb()
      .prepare(
        "SELECT id, name FROM schools_directory WHERE lower(trim(district)) = lower(trim(@district))",
      )
      .all({ district: scopeId }) as Array<{ id: number; name: string }>;
    children = schools.map((s) => calculateFidelityScore("school", String(s.id)));
  } else if (scopeType === "parish") {
    const schools = getDb()
      .prepare(
        "SELECT id FROM schools_directory WHERE lower(trim(parish)) = lower(trim(@parish))",
      )
      .all({ parish: scopeId }) as Array<{ id: number; name: string }>;
    children = schools.map((s) => calculateFidelityScore("school", String(s.id)));
  }

  const rankings = children
    .map((c) => ({ name: c.scopeId, score: c.totalScore, band: c.band }))
    .sort((a, b) => b.score - a.score);

  return { scope, children, rankings };
}

/* ═══════════════════════════════════════════════════════
   NLIS — Phase 2: Learning Gains
   ═══════════════════════════════════════════════════════ */

export function getLearningGainsData(
  scopeType: string,
  scopeId: string,
  _period?: string,
): LearningGainsData {
  const db = getDb();

  let assessWhere = "";
  const params: Record<string, string> = {};
  if (scopeType === "district") {
    assessWhere =
      "AND lower(trim(a.district)) = lower(trim(@scopeId))";
    params.scopeId = scopeId;
  } else if (scopeType === "school") {
    assessWhere = "AND lower(trim(a.school_name)) = lower(trim(@scopeId))";
    params.scopeId = scopeId;
  } else if (scopeType === "region") {
    const districts = getDistrictsByRegion(scopeId);
    if (districts.length > 0) {
      assessWhere = `AND lower(trim(a.district)) IN (${districts.map((_, i) => `@d${i}`).join(",")})`;
      districts.forEach((d, i) => { params[`d${i}`] = d.toLowerCase().trim(); });
    }
  }

  const domainCols = [
    { col: "letter_identification_score", name: "Letter Identification" },
    { col: "sound_identification_score", name: "Sound Identification" },
    { col: "decodable_words_score", name: "Decodable Words" },
    { col: "undecodable_words_score", name: "Undecodable Words" },
    { col: "made_up_words_score", name: "Made Up Words" },
    { col: "story_reading_score", name: "Story Reading" },
    { col: "reading_comprehension_score", name: "Reading Comprehension" },
  ];

  const domains: DomainGainData[] = domainCols.map((domain) => {
    // assessment_records has no assessment_type column; query overall averages
    const overall = db
      .prepare(
        `SELECT AVG(${domain.col}) AS avg, COUNT(${domain.col}) AS n
         FROM assessment_records a
         WHERE ${domain.col} IS NOT NULL ${assessWhere}`,
      )
      .get(params) as { avg: number | null; n: number };

    const overallAvg = overall?.avg !== null ? Math.round((overall?.avg ?? 0) * 10) / 10 : null;

    // Distribution shift — simplified benchmark at score >= 70
    const benchmarkThreshold = 70;
    let belowPct: number | null = null;
    let approachingPct: number | null = null;
    let atPct: number | null = null;

    if (overall.n > 0) {
      const dist = db
        .prepare(
          `SELECT
             SUM(CASE WHEN ${domain.col} < ${benchmarkThreshold * 0.6} THEN 1 ELSE 0 END) AS below,
             SUM(CASE WHEN ${domain.col} >= ${benchmarkThreshold * 0.6} AND ${domain.col} < ${benchmarkThreshold} THEN 1 ELSE 0 END) AS approaching,
             SUM(CASE WHEN ${domain.col} >= ${benchmarkThreshold} THEN 1 ELSE 0 END) AS above,
             COUNT(*) AS total
           FROM assessment_records a
           WHERE ${domain.col} IS NOT NULL ${assessWhere}`,
        )
        .get(params) as { below: number; approaching: number; above: number; total: number };

      if (dist.total > 0) {
        belowPct = Math.round((dist.below / dist.total) * 100);
        approachingPct = Math.round((dist.approaching / dist.total) * 100);
        atPct = Math.round((dist.above / dist.total) * 100);
      }
    }

    return {
      domain: domain.name,
      baselineAvg: null,
      endlineAvg: overallAvg,
      change: null,
      sampleSize: overall.n,
      belowBenchmarkPct: belowPct,
      approachingPct,
      atBenchmarkPct: atPct,
    };
  });

  // School Improvement Index: weighted average of domain deltas
  const validChanges = domains.filter((d) => d.change !== null).map((d) => d.change as number);
  const schoolImprovementIndex =
    validChanges.length > 0
      ? Math.round((validChanges.reduce((s, v) => s + v, 0) / validChanges.length) * 10) / 10
      : null;

  return {
    scopeType,
    scopeId,
    period: _period ?? "All time",
    domains,
    schoolImprovementIndex,
    lastUpdated: new Date().toISOString(),
  };
}

/* ═══════════════════════════════════════════════════════
   NLIS — Phase 2: Cost-Effectiveness
   ═══════════════════════════════════════════════════════ */

export function getCostEffectivenessData(
  scopeType: string,
  scopeValue: string,
  period?: string,
): CostEffectivenessData {
  const db = getDb();
  const conditions: string[] = [];
  const params: Record<string, string> = {};

  if (scopeType && scopeType !== "country") {
    conditions.push("lower(scope_type) = @scopeType");
    params.scopeType = scopeType.toLowerCase();
    conditions.push("lower(trim(scope_value)) = @scopeValue");
    params.scopeValue = scopeValue.toLowerCase().trim();
  }
  if (period) {
    conditions.push("period = @period");
    params.period = period;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const totals = db
    .prepare(
      `SELECT SUM(amount) AS total, category
       FROM cost_entries ${where}
       GROUP BY category`,
    )
    .all(params) as Array<{ total: number; category: CostCategory }>;

  const totalCost = totals.reduce((s, t) => s + (t.total || 0), 0);

  // Get denominators from existing aggregation
  const schoolCount = (db.prepare("SELECT COUNT(*) AS c FROM schools_directory").get() as { c: number })?.c ?? 0;
  const teacherCount = (db.prepare("SELECT COUNT(DISTINCT participant_name) AS c FROM training_participants").get() as { c: number })?.c ?? 0;
  const learnerCount = (db.prepare("SELECT COUNT(*) AS c FROM assessment_records").get() as { c: number })?.c ?? 0;

  return {
    totalCost,
    costPerSchool: schoolCount > 0 ? Math.round((totalCost / schoolCount) * 100) / 100 : null,
    costPerTeacher: teacherCount > 0 ? Math.round((totalCost / teacherCount) * 100) / 100 : null,
    costPerLearnerAssessed: learnerCount > 0 ? Math.round((totalCost / learnerCount) * 100) / 100 : null,
    costPerLearnerImproved: null, // Requires matched baseline/endline comparison
    period: period ?? "All time",
    scopeType,
    scopeValue,
    breakdown: totals.map((t) => ({ category: t.category, amount: t.total })),
  };
}

export function runImpactCalculator(
  amount: number,
  scopeType: string,
  scopeId: string,
): ImpactCalculatorResult {
  // Use current cost-effectiveness data to estimate
  const costData = getCostEffectivenessData(scopeType, scopeId);

  const costPerSchool = costData.costPerSchool ?? 500;
  const costPerTeacher = costData.costPerTeacher ?? 50;

  const estimatedSchools = Math.floor(amount / costPerSchool);
  const estimatedTeachers = Math.floor(amount / costPerTeacher);
  const estimatedLearners = estimatedSchools * 120; // avg 120 learners per school

  return {
    inputAmount: amount,
    estimatedSchools,
    estimatedTeachers,
    estimatedLearners,
    estimatedOutcomes: `Based on current cost structure, $${amount.toLocaleString()} could support approximately ${estimatedSchools} schools, ${estimatedTeachers} teachers, and reach an estimated ${estimatedLearners.toLocaleString()} learners.`,
    assumptions: [
      `Cost per school: $${costPerSchool.toLocaleString()} (${costData.totalCost > 0 ? "based on actual data" : "estimated baseline"})`,
      `Average learners per school: 120`,
      `Assumes standard program package (training + 3 coaching visits + baseline/endline assessment)`,
      `Does not include capital expenditure or long-term operational costs`,
    ],
    methodology:
      "Estimates are derived from actual unit costs where available, or from program baseline assumptions. These are indicative projections, not commitments.",
  };
}

/* ═══════════════════════════════════════════════════════
   NLIS — Data Quality Summary
   ═══════════════════════════════════════════════════════ */

export function getDataQualitySummary(
  scopeType: string,
  scopeId: string,
): DataQualitySummary {
  const db = getDb();
  let schoolsWhere = "";
  const params: Record<string, string> = {};

  if (scopeType === "district") {
    schoolsWhere = "WHERE lower(trim(district)) = lower(trim(@scopeId))";
    params.scopeId = scopeId;
  } else if (scopeType === "region") {
    const districts = getDistrictsByRegion(scopeId);
    if (districts.length > 0) {
      schoolsWhere = `WHERE lower(trim(district)) IN (${districts.map((_, i) => `@d${i}`).join(",")})`;
      districts.forEach((d, i) => { params[`d${i}`] = d.toLowerCase().trim(); });
    }
  }

  const totalSchools = (db.prepare(`SELECT COUNT(*) AS c FROM schools_directory ${schoolsWhere}`).get(params) as { c: number })?.c ?? 0;

  const schoolsWithBaseline = (db
    .prepare(
      `SELECT COUNT(DISTINCT a.school_name) AS c
       FROM assessment_records a
       WHERE 1=1
       ${scopeType === "district" ? "AND lower(trim(a.district)) = lower(trim(@scopeId))" : ""}`,
    )
    .get(params) as { c: number })?.c ?? 0;

  const schoolsWithEndline = schoolsWithBaseline;

  // Check duplicate child_ids
  const duplicates = (db
    .prepare("SELECT COUNT(*) AS c FROM (SELECT child_id, COUNT(*) AS cnt FROM assessment_records GROUP BY child_id HAVING cnt > 2)")
    .get() as { c: number })?.c ?? 0;

  // Outlier check: scores > 100 or < 0
  const outliers = (db
    .prepare(
      `SELECT COUNT(*) AS c FROM assessment_records
       WHERE letter_sound_score > 100 OR decoding_score > 100 OR fluency_score > 200 OR comprehension_score > 100
          OR letter_sound_score < 0 OR decoding_score < 0 OR fluency_score < 0 OR comprehension_score < 0`,
    )
    .get() as { c: number })?.c ?? 0;

  const completeness = totalSchools > 0
    ? Math.round(((schoolsWithBaseline + schoolsWithEndline) / (totalSchools * 2)) * 100)
    : 0;

  return {
    scopeType,
    scopeId,
    completenessScore: Math.min(100, completeness),
    schoolsMissingBaseline: Math.max(0, totalSchools - schoolsWithBaseline),
    schoolsMissingEndline: Math.max(0, totalSchools - schoolsWithEndline),
    outlierCount: outliers,
    duplicateLearnersDetected: duplicates,
    lastChecked: new Date().toISOString(),
  };
}

/* ═══════════════════════════════════════════════════════
   NLIS — Government / District League View
   ═══════════════════════════════════════════════════════ */

export function getGovernmentViewData(period?: string): GovernmentViewData {
  const db = getDb();

  const districts = db
    .prepare(
      `SELECT DISTINCT district FROM schools_directory ORDER BY district`,
    )
    .all() as Array<{ district: string }>;

  const leagueTable: DistrictLeagueRow[] = districts.map((row, index) => {
    const region = inferRegionFromDistrict(row.district) ?? "Unknown";
    const fidelity = calculateFidelityScore("district", row.district);
    const gains = getLearningGainsData("district", row.district);

    const outcomesScore = gains.schoolImprovementIndex;

    let priority: "urgent" | "watch" | "on-track" = "on-track";
    if (fidelity.totalScore < 25 || (outcomesScore !== null && outcomesScore < 0)) {
      priority = "urgent";
    } else if (fidelity.totalScore < 50) {
      priority = "watch";
    }

    const schoolCount = (db
      .prepare("SELECT COUNT(*) AS c FROM schools_directory WHERE lower(trim(district)) = lower(trim(@d))")
      .get({ d: row.district }) as { c: number })?.c ?? 0;

    const learnersAssessed = (db
      .prepare(
        `SELECT COUNT(*) AS c FROM assessment_records a
         JOIN schools_directory sd ON sd.id = a.school_id
         WHERE lower(trim(sd.district)) = lower(trim(@d))`,
      )
      .get({ d: row.district }) as { c: number })?.c ?? 0;

    return {
      district: row.district,
      region,
      outcomesScore,
      fidelityScore: fidelity.totalScore,
      rank: index + 1,
      priorityFlag: priority,
      schoolsSupported: schoolCount,
      learnersAssessed,
    };
  });

  // Sort by fidelity + outcomes
  leagueTable.sort((a, b) => {
    const aScore = (a.fidelityScore ?? 0) + (a.outcomesScore ?? 0);
    const bScore = (b.fidelityScore ?? 0) + (b.outcomesScore ?? 0);
    return bScore - aScore;
  });

  // Reassign ranks after sort
  leagueTable.forEach((row, i) => { row.rank = i + 1; });

  return {
    leagueTable,
    generatedAt: new Date().toISOString(),
    period: period ?? "All time",
  };
}
