import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { getPostgresPool, isPostgresConfigured } from "@/lib/server/postgres/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlitePath = path.resolve(process.env.SQLITE_DB_PATH?.trim() || path.resolve(__dirname, "../data/app.db"));
const schemaDir = path.resolve(__dirname, "../database/postgres");

function getSchemaPaths() {
  return fs
    .readdirSync(schemaDir)
    .filter((entry) => entry.endsWith(".sql"))
    .sort((left, right) => left.localeCompare(right))
    .map((entry) => path.join(schemaDir, entry));
}

function sqliteColumns(sqlite: Database.Database, table: string) {
  return sqlite.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
}

function sqliteHasColumns(sqlite: Database.Database, table: string, required: string[]) {
  const columns = sqliteColumns(sqlite, table).map((column) => column.name);
  return required.every((column) => columns.includes(column));
}

function resolveSourceTable(
  sqlite: Database.Database,
  preferredTable: string,
  fallbackTable: string,
  requiredColumns: string[],
) {
  if (sqliteHasColumns(sqlite, preferredTable, requiredColumns)) {
    return preferredTable;
  }
  if (sqliteHasColumns(sqlite, fallbackTable, requiredColumns)) {
    return fallbackTable;
  }
  return null;
}

async function resetIdentitySequence(table: string) {
  const pool = getPostgresPool();
  const sequenceResult = await pool.query<{ sequence_name: string | null }>(
    `SELECT pg_get_serial_sequence($1, 'id') AS sequence_name`,
    [table],
  );
  const sequenceName = sequenceResult.rows[0]?.sequence_name;
  if (!sequenceName) {
    return;
  }

  const maxIdResult = await pool.query<{ max_id: number | null; row_count: string }>(
    `SELECT MAX(id) AS max_id, COUNT(*)::text AS row_count FROM ${table}`,
  );
  const maxId = Number(maxIdResult.rows[0]?.max_id ?? 0);
  const hasRows = Number(maxIdResult.rows[0]?.row_count ?? 0) > 0;
  await pool.query(`SELECT setval($1::regclass, $2, $3)`, [
    sequenceName,
    hasRows ? Math.max(maxId, 1) : 1,
    hasRows,
  ]);
}

async function main() {
  if (!isPostgresConfigured()) {
    throw new Error("DATABASE_URL is not configured.");
  }
  if (!fs.existsSync(sqlitePath)) {
    throw new Error(`SQLite source not found at ${sqlitePath}`);
  }

  const sqlite = new Database(sqlitePath, { readonly: true });
  const pool = getPostgresPool();
  for (const schemaPath of getSchemaPaths()) {
    await pool.query(fs.readFileSync(schemaPath, "utf8"));
  }

  const sessionSource = resolveSourceTable(
    sqlite,
    "online_training_sessions",
    "training_sessions",
    ["id", "title", "agenda", "start_time", "end_time", "host_user_id", "created_by_user_id"],
  );
  const participantSource = resolveSourceTable(
    sqlite,
    "online_training_participants",
    "training_participants",
    ["id", "session_id", "role", "attendance_status"],
  );
  const resourceSource = resolveSourceTable(
    sqlite,
    "online_training_resources",
    "training_resources",
    ["id", "session_id", "title"],
  );
  const artifactSource = resolveSourceTable(
    sqlite,
    "online_training_artifacts",
    "training_artifacts",
    ["session_id", "type", "source", "status"],
  );
  const notesSource = resolveSourceTable(
    sqlite,
    "online_training_notes",
    "training_notes",
    ["session_id", "facts_json", "narrative_html"],
  );

  await pool.query("TRUNCATE TABLE online_training_notes, online_training_artifacts, online_training_resources, online_training_participants, online_training_sessions RESTART IDENTITY CASCADE");

  if (sessionSource) {
    const rows = sqlite.prepare(`SELECT * FROM ${sessionSource}`).all() as Array<Record<string, unknown>>;
    console.log(`Importing ${rows.length} online training sessions from ${sessionSource}`);
    for (const row of rows) {
      await pool.query(
        `
          INSERT INTO online_training_sessions (
            id,
            legacy_id,
            title,
            agenda,
            objectives,
            program_tags_json,
            scope_type,
            scope_id,
            start_time,
            end_time,
            timezone,
            host_user_id,
            calendar_event_id,
            meet_join_url,
            conference_record_id,
            status,
            visibility,
            created_by_user_id,
            created_at,
            updated_at
          ) VALUES (
            $1, $1, $2, $3, $4, $5, $6, $7, $8::timestamptz, $9::timestamptz, $10, $11, $12, $13, $14, $15, $16, $17, $18::timestamptz, $19::timestamptz
          )
        `,
        [
          Number(row.id),
          String(row.title ?? ""),
          String(row.agenda ?? ""),
          row.objectives ? String(row.objectives) : null,
          String(row.program_tags_json ?? row.program_tags ?? "[]"),
          String(row.scope_type ?? "country"),
          row.scope_id ? String(row.scope_id) : null,
          String(row.start_time ?? ""),
          String(row.end_time ?? ""),
          String(row.timezone ?? "Africa/Kampala"),
          Number(row.host_user_id ?? 0),
          row.calendar_event_id ? String(row.calendar_event_id) : null,
          row.meet_join_url ? String(row.meet_join_url) : null,
          row.conference_record_id ? String(row.conference_record_id) : null,
          String(row.status ?? "draft"),
          String(row.visibility ?? "private"),
          Number(row.created_by_user_id ?? 0),
          String(row.created_at ?? new Date().toISOString()),
          String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
        ],
      );
    }
    await resetIdentitySequence("online_training_sessions");
  } else {
    console.warn("Skipping online training sessions: no compatible SQLite source table found.");
  }

  if (participantSource) {
    const rows = sqlite.prepare(`SELECT * FROM ${participantSource}`).all() as Array<Record<string, unknown>>;
    console.log(`Importing ${rows.length} online training participants from ${participantSource}`);
    for (const row of rows) {
      await pool.query(
        `
          INSERT INTO online_training_participants (
            id,
            legacy_id,
            session_id,
            school_id,
            teacher_user_id,
            role,
            attendance_status,
            joined_at,
            left_at,
            created_at
          ) VALUES ($1, $1, $2, $3, $4, $5, $6, $7::timestamptz, $8::timestamptz, $9::timestamptz)
        `,
        [
          Number(row.id),
          Number(row.session_id ?? 0),
          row.school_id === null || row.school_id === undefined ? null : Number(row.school_id),
          row.teacher_user_id === null || row.teacher_user_id === undefined ? null : Number(row.teacher_user_id),
          String(row.role ?? "attendee"),
          String(row.attendance_status ?? "invited"),
          row.joined_at ? String(row.joined_at) : null,
          row.left_at ? String(row.left_at) : null,
          String(row.created_at ?? new Date().toISOString()),
        ],
      );
    }
    await resetIdentitySequence("online_training_participants");
  }

  if (resourceSource) {
    const rows = sqlite.prepare(`SELECT * FROM ${resourceSource}`).all() as Array<Record<string, unknown>>;
    console.log(`Importing ${rows.length} online training resources from ${resourceSource}`);
    for (const row of rows) {
      await pool.query(
        `
          INSERT INTO online_training_resources (
            id,
            legacy_id,
            session_id,
            title,
            file_name,
            stored_path,
            mime_type,
            size_bytes,
            external_url,
            visibility,
            sort_order,
            uploaded_by_user_id,
            created_at
          ) VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::timestamptz)
        `,
        [
          Number(row.id),
          Number(row.session_id ?? 0),
          String(row.title ?? ""),
          row.file_name ? String(row.file_name) : null,
          row.stored_path ? String(row.stored_path) : null,
          row.mime_type ? String(row.mime_type) : null,
          row.size_bytes === null || row.size_bytes === undefined ? null : Number(row.size_bytes),
          row.external_url ? String(row.external_url) : null,
          String(row.visibility ?? "internal"),
          Number(row.sort_order ?? 0),
          row.uploaded_by_user_id === null || row.uploaded_by_user_id === undefined
            ? null
            : Number(row.uploaded_by_user_id),
          String(row.created_at ?? new Date().toISOString()),
        ],
      );
    }
    await resetIdentitySequence("online_training_resources");
  }

  if (artifactSource) {
    const rows = sqlite.prepare(`SELECT * FROM ${artifactSource}`).all() as Array<Record<string, unknown>>;
    console.log(`Importing ${rows.length} online training artifacts from ${artifactSource}`);
    for (const row of rows) {
      await pool.query(
        `
          INSERT INTO online_training_artifacts (
            session_id,
            type,
            source,
            source_url,
            status,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6::timestamptz, $7::timestamptz)
        `,
        [
          Number(row.session_id ?? 0),
          String(row.type ?? "recording"),
          String(row.source ?? "google_meet"),
          row.source_url ? String(row.source_url) : null,
          String(row.status ?? "pending"),
          String(row.created_at ?? new Date().toISOString()),
          String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
        ],
      );
    }
  }

  if (notesSource) {
    const rows = sqlite.prepare(`SELECT * FROM ${notesSource}`).all() as Array<Record<string, unknown>>;
    console.log(`Importing ${rows.length} online training notes from ${notesSource}`);
    for (const row of rows) {
      await pool.query(
        `
          INSERT INTO online_training_notes (
            id,
            session_id,
            facts_json,
            narrative_html,
            pdf_stored_path,
            ai_model,
            guardrail_version,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz, $9::timestamptz)
        `,
        [
          Number(row.id),
          Number(row.session_id ?? 0),
          String(row.facts_json ?? "{}"),
          String(row.narrative_html ?? ""),
          row.pdf_stored_path ? String(row.pdf_stored_path) : null,
          row.ai_model ? String(row.ai_model) : null,
          row.guardrail_version ? String(row.guardrail_version) : null,
          String(row.created_at ?? new Date().toISOString()),
          String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
        ],
      );
    }
    await resetIdentitySequence("online_training_notes");
  }

  sqlite.close();
  console.log(`Imported online training tables from ${sqlitePath}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (isPostgresConfigured()) {
      await getPostgresPool().end();
    }
  });
