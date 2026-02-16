import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import {
  AssessmentRecord,
  AssessmentRecordInput,
  DashboardActivityItem,
  DashboardAgendaItem,
  DashboardFollowUpItem,
  OnlineTrainingEventInput,
  OnlineTrainingEventRecord,
  PortalDashboardData,
  PortalRecord,
  PortalRecordFilters,
  PortalRecordInput,
  PortalRecordModule,
  PortalRecordStatus,
  PortalUser,
  PortalUserRole,
  PortalEvidenceRecord,
  SchoolDirectoryInput,
  SchoolDirectoryRecord,
  TrainingSessionInput,
  TrainingSessionRecord,
} from "@/lib/types";

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
    },
    {
      fullName: "ORB Admin",
      email: process.env.PORTAL_ADMIN_EMAIL?.toLowerCase() ?? "admin@ozekireadingbridge.org",
      phone: process.env.PORTAL_ADMIN_PHONE ?? "+256700100005",
      role: "Staff" as PortalUserRole,
      password: process.env.PORTAL_ADMIN_PASSWORD ?? "Admin@12345",
      isSupervisor: 0,
      isME: 0,
      isAdmin: 1,
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
      is_admin
    ) VALUES (
      @fullName,
      @email,
      @role,
      @passwordHash,
      @phone,
      @isSupervisor,
      @isME,
      @isAdmin
    )
    ON CONFLICT(email) DO UPDATE SET
      full_name = excluded.full_name,
      role = excluded.role,
      password_hash = excluded.password_hash,
      phone = excluded.phone,
      is_supervisor = excluded.is_supervisor,
      is_me = excluded.is_me,
      is_admin = excluded.is_admin
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
      passwordHash: hashPassword(account.password),
    });
  });
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

  CREATE TABLE IF NOT EXISTS assessment_records (
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
    calendar_event_id TEXT,
    calendar_link TEXT,
    meet_link TEXT,
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
    gps_lat TEXT,
    gps_lng TEXT,
    contact_name TEXT,
    contact_phone TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS portal_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_code TEXT NOT NULL UNIQUE,
    module TEXT NOT NULL CHECK(module IN ('training', 'visit', 'assessment', 'story')),
    date TEXT NOT NULL,
    district TEXT NOT NULL,
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
  `);

  ensurePortalUserColumns(db);
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
        is_supervisor AS isSupervisor,
        is_me AS isME,
        is_admin AS isAdmin,
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
        isSupervisor: number;
        isME: number;
        isAdmin: number;
        passwordHash: string;
      }
    | undefined;

  if (!row) {
    return null;
  }

  if (row.passwordHash !== hashPassword(password)) {
    return null;
  }

  return {
    id: row.id,
    fullName: row.fullName,
    email: row.email,
    phone: row.phone,
    role: row.role,
    isSupervisor: Boolean(row.isSupervisor),
    isME: Boolean(row.isME),
    isAdmin: Boolean(row.isAdmin),
  };
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
        u.is_supervisor AS isSupervisor,
        u.is_me AS isME,
        u.is_admin AS isAdmin
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
        isSupervisor: number;
        isME: number;
        isAdmin: number;
      }
    | undefined;

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    fullName: row.fullName,
    email: row.email,
    phone: row.phone,
    role: row.role,
    isSupervisor: Boolean(row.isSupervisor),
    isME: Boolean(row.isME),
    isAdmin: Boolean(row.isAdmin),
  };
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
        school_name,
        district,
        sub_county,
        parish,
        village,
        learners_assessed,
        stories_published,
        assessment_date,
        created_by_user_id
      ) VALUES (
        @schoolName,
        @district,
        @subCounty,
        @parish,
        @village,
        @learnersAssessed,
        @storiesPublished,
        @assessmentDate,
        @createdByUserId
      )
    `,
    )
    .run({
      schoolName: payload.schoolName,
      district: payload.district,
      subCounty: payload.subCounty,
      parish: payload.parish,
      village: payload.village?.trim() ? payload.village : null,
      learnersAssessed: payload.learnersAssessed,
      storiesPublished: payload.storiesPublished,
      assessmentDate: payload.assessmentDate,
      createdByUserId,
    });

  const assessmentId = Number(insertResult.lastInsertRowid);
  const row = db
    .prepare(
      `
      SELECT
        id,
        school_name AS schoolName,
        district,
        sub_county AS subCounty,
        parish,
        village,
        learners_assessed AS learnersAssessed,
        stories_published AS storiesPublished,
        assessment_date AS assessmentDate,
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

  return {
    ...row,
    learnersAssessed: Number(row.learnersAssessed ?? 0),
    storiesPublished: Number(row.storiesPublished ?? 0),
  };
}

export function listAssessmentRecords(limit = 20): AssessmentRecord[] {
  const rows = getDb()
    .prepare(
      `
      SELECT
        id,
        school_name AS schoolName,
        district,
        sub_county AS subCounty,
        parish,
        village,
        learners_assessed AS learnersAssessed,
        stories_published AS storiesPublished,
        assessment_date AS assessmentDate,
        created_at AS createdAt
      FROM assessment_records
      ORDER BY assessment_date DESC, id DESC
      LIMIT @limit
    `,
    )
    .all({ limit }) as AssessmentRecord[];

  return rows.map((row) => ({
    ...row,
    learnersAssessed: Number(row.learnersAssessed ?? 0),
    storiesPublished: Number(row.storiesPublished ?? 0),
  }));
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
        calendar_event_id AS calendarEventId,
        calendar_link AS calendarLink,
        meet_link AS meetLink,
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
        calendar_event_id AS calendarEventId,
        calendar_link AS calendarLink,
        meet_link AS meetLink,
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
  }));
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
  return user.isSupervisor || user.isME || user.isAdmin;
}

function canViewAllRecords(user: PortalUser) {
  return user.isSupervisor || user.isME || user.isAdmin;
}

function parsePortalRecord(
  row: {
    id: number;
    recordCode: string;
    module: PortalRecordModule;
    date: string;
    district: string;
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

function checkPortalDuplicate(
  db: Database.Database,
  module: PortalRecordModule,
  date: string,
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
        AND lower(school_name) = lower(@schoolName)
        ${excludeId ? "AND id != @excludeId" : ""}
      LIMIT 1
    `,
    )
    .get({ module, date, schoolName, excludeId }) as { id?: number } | undefined;

  return Boolean(row?.id);
}

export function createPortalRecord(input: PortalRecordInput, user: PortalUser): PortalRecord {
  const db = getDb();

  if (checkPortalDuplicate(db, input.module, input.date, input.schoolName)) {
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
      district: input.district,
      schoolName: input.schoolName,
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

  if (checkPortalDuplicate(db, input.module, input.date, input.schoolName, id)) {
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
    district: input.district,
    schoolName: input.schoolName,
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

  return {
    kpis: {
      trainingsLogged: getCount("training"),
      schoolVisits: getCount("visit"),
      assessments: getCount("assessment"),
      storyActivities: getCount("story"),
    },
    weekAgenda: agendaRows,
    dueFollowUps: followUpRows,
    recentActivity: recentRows,
  };
}

export function createSchoolDirectoryRecord(input: SchoolDirectoryInput): SchoolDirectoryRecord {
  const db = getDb();
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
        gps_lat,
        gps_lng,
        contact_name,
        contact_phone
      ) VALUES (
        @schoolCode,
        @name,
        @district,
        @subCounty,
        @parish,
        @village,
        @gpsLat,
        @gpsLng,
        @contactName,
        @contactPhone
      )
    `,
    )
    .run({
      schoolCode: "SCH-PENDING",
      name: input.name,
      district: input.district,
      subCounty: input.subCounty,
      parish: input.parish,
      village: input.village?.trim() ? input.village : null,
      gpsLat: input.gpsLat?.trim() ? input.gpsLat : null,
      gpsLng: input.gpsLng?.trim() ? input.gpsLng : null,
      contactName: input.contactName?.trim() ? input.contactName : null,
      contactPhone: input.contactPhone?.trim() ? input.contactPhone : null,
    });

  const id = Number(insertResult.lastInsertRowid);
  const schoolCode = `SCH-${id.toString().padStart(4, "0")}`;
  db.prepare("UPDATE schools_directory SET school_code = @schoolCode WHERE id = @id").run({
    id,
    schoolCode,
  });

  const row = db
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
        gps_lat AS gpsLat,
        gps_lng AS gpsLng,
        contact_name AS contactName,
        contact_phone AS contactPhone,
        created_at AS createdAt
      FROM schools_directory
      WHERE id = @id
      LIMIT 1
    `,
    )
    .get({ id }) as SchoolDirectoryRecord | undefined;

  if (!row) {
    throw new Error("Could not load created school.");
  }

  return row;
}

export function listSchoolDirectoryRecords(filters?: {
  district?: string;
  query?: string;
}): SchoolDirectoryRecord[] {
  const where: string[] = ["1=1"];
  const params: Record<string, string> = {};

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
        gps_lat AS gpsLat,
        gps_lng AS gpsLng,
        contact_name AS contactName,
        contact_phone AS contactPhone,
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
  const onlineTrainingSessionsCompleted = countTotal(
    db,
    "SELECT COUNT(*) AS total FROM online_training_events",
  );

  const learnersAssessedRow = db
    .prepare("SELECT COALESCE(SUM(learners_assessed), 0) AS total FROM assessment_records")
    .get() as { total: number | null };
  const storiesPublishedRow = db
    .prepare("SELECT COALESCE(SUM(stories_published), 0) AS total FROM assessment_records")
    .get() as { total: number | null };

  const portalRows = db
    .prepare(
      `
      SELECT module, school_name AS schoolName, payload_json AS payloadJson
      FROM portal_records
    `,
    )
    .all() as Array<{
    module: PortalRecordModule;
    schoolName: string;
    payloadJson: string;
  }>;

  let portalTeachersTrained = 0;
  let portalLearnersAssessed = 0;
  let portalStoriesPublished = 0;
  let portalTrainingSessions = 0;
  const legacySchoolRows = db
    .prepare("SELECT DISTINCT lower(trim(school_name)) AS schoolKey FROM training_sessions")
    .all() as Array<{ schoolKey: string | null }>;
  const uniqueTrainingSchools = new Set(
    legacySchoolRows
      .map((row) => row.schoolKey ?? "")
      .map((value) => value.trim())
      .filter(Boolean),
  );

  portalRows.forEach((row) => {
    const payload = JSON.parse(row.payloadJson || "{}") as Record<string, unknown>;

    if (row.module === "training") {
      portalTrainingSessions += 1;
      const schoolKey = row.schoolName.trim().toLowerCase();
      uniqueTrainingSchools.add(schoolKey);

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
      { label: "Teachers trained", value: teachersTrained + portalTeachersTrained },
      { label: "Schools trained", value: uniqueTrainingSchools.size },
      {
        label: "Learners assessed",
        value: Number(learnersAssessedRow.total ?? 0) + portalLearnersAssessed,
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

  return {
    Staff: Number(rows.find((item) => item.role === "Staff")?.total ?? 0),
    Volunteer: Number(rows.find((item) => item.role === "Volunteer")?.total ?? 0),
  };
}
