import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { getPostgresPool, isPostgresConfigured } from "@/lib/server/postgres/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlitePath = path.resolve(process.env.SQLITE_DB_PATH?.trim() || path.resolve(__dirname, "../data/app.db"));
const schemaDir = path.resolve(__dirname, "../database/postgres");

const TABLES = [
  "portal_users",
  "portal_sessions",
  "audit_logs",
  "schools_directory",
  "school_contacts",
  "school_learners",
  "teacher_roster",
  "learner_roster",
  "training_sessions",
  "training_participants",
  "online_training_events",
  "legacy_assessment_records",
  "portal_records",
  "assessment_sessions",
  "assessment_session_results",
  "assessment_records",
  "bookings",
  "contacts",
  "download_leads",
  "newsletter_subscribers",
  "teaching_improvement_settings",
  "portal_training_attendance",
  "lesson_evaluations",
  "lesson_evaluation_items",
  "story_activities",
  "story_anthologies",
  "story_library",
  "observation_rubrics",
] as const;

const COLUMN_ALIASES: Partial<Record<(typeof TABLES)[number], Record<string, string>>> = {
  audit_logs: {
    created_at: "timestamp",
  },
  training_participants: {
    session_id: "training_id",
  },
  assessment_session_results: {
    assessment_session_id: "session_id",
  },
};

const CUSTOM_COLUMN_RESOLVERS: Partial<
  Record<(typeof TABLES)[number], Record<string, (row: Record<string, unknown>) => unknown>>
> = {
  assessment_session_results: {
    result_json: (row) =>
      JSON.stringify({
        sourceRowKey: row.source_row_key ?? null,
        learnerId: row.learner_id ?? null,
        learnerUid: row.learner_uid ?? null,
        scores: {
          letterSounds: row.letter_sounds_score ?? null,
          decoding: row.decoding_score ?? null,
          fluency: row.fluency_score ?? null,
          comprehension: row.comprehension_score ?? null,
          fluencyAccuracy: row.fluency_accuracy_score ?? null,
        },
        computedReading: {
          level: row.computed_reading_level ?? null,
          levelBand: row.computed_level_band ?? null,
          stageLabel: row.reading_stage_label ?? null,
          stageOrder: row.reading_stage_order ?? null,
          benchmarkGradeLevel: row.benchmark_grade_level ?? null,
          expectedVsActualStatus: row.expected_vs_actual_status ?? null,
          rulesVersion: row.rules_version ?? null,
          computedAt: row.computed_at ?? null,
          stageReasonCode: row.stage_reason_code ?? null,
          stageReasonSummary: row.stage_reason_summary ?? null,
        },
        masteryProfileSummaryJson: row.mastery_profile_summary_json ?? null,
        modelVersion: row.model_version ?? null,
        benchmarkVersion: row.benchmark_version ?? null,
        scoringProfileVersion: row.scoring_profile_version ?? null,
        domainMetrics: {
          phonemicAwareness: {
            scoreRaw: row.phonemic_awareness_score_raw ?? null,
            accuracy: row.phonemic_awareness_accuracy ?? null,
            latencyAvg: row.phonemic_awareness_latency_avg ?? null,
            attemptsAvg: row.phonemic_awareness_attempts_avg ?? null,
            supportUsageRate: row.phonemic_awareness_support_usage_rate ?? null,
            masteryStatus: row.phonemic_awareness_mastery_status ?? null,
          },
          graphemePhonemeCorrespondence: {
            scoreRaw: row.grapheme_phoneme_correspondence_score_raw ?? null,
            accuracy: row.grapheme_phoneme_correspondence_accuracy ?? null,
            latencyAvg: row.grapheme_phoneme_correspondence_latency_avg ?? null,
            attemptsAvg: row.grapheme_phoneme_correspondence_attempts_avg ?? null,
            supportUsageRate: row.grapheme_phoneme_correspondence_support_usage_rate ?? null,
            masteryStatus: row.grapheme_phoneme_correspondence_mastery_status ?? null,
          },
          blendingDecoding: {
            scoreRaw: row.blending_decoding_score_raw ?? null,
            accuracy: row.blending_decoding_accuracy ?? null,
            latencyAvg: row.blending_decoding_latency_avg ?? null,
            attemptsAvg: row.blending_decoding_attempts_avg ?? null,
            supportUsageRate: row.blending_decoding_support_usage_rate ?? null,
            masteryStatus: row.blending_decoding_mastery_status ?? null,
          },
          wordRecognitionFluency: {
            scoreRaw: row.word_recognition_fluency_score_raw ?? null,
            accuracy: row.word_recognition_fluency_accuracy ?? null,
            latencyAvg: row.word_recognition_fluency_latency_avg ?? null,
            attemptsAvg: row.word_recognition_fluency_attempts_avg ?? null,
            supportUsageRate: row.word_recognition_fluency_support_usage_rate ?? null,
            masteryStatus: row.word_recognition_fluency_mastery_status ?? null,
          },
          sentenceParagraphConstruction: {
            scoreRaw: row.sentence_paragraph_construction_score_raw ?? null,
            accuracy: row.sentence_paragraph_construction_accuracy ?? null,
            latencyAvg: row.sentence_paragraph_construction_latency_avg ?? null,
            attemptsAvg: row.sentence_paragraph_construction_attempts_avg ?? null,
            supportUsageRate: row.sentence_paragraph_construction_support_usage_rate ?? null,
            masteryStatus: row.sentence_paragraph_construction_mastery_status ?? null,
          },
          comprehension: {
            scoreRaw: row.comprehension_score_raw ?? null,
            accuracy: row.comprehension_accuracy ?? null,
            latencyAvg: row.comprehension_latency_avg ?? null,
            attemptsAvg: row.comprehension_attempts_avg ?? null,
            supportUsageRate: row.comprehension_support_usage_rate ?? null,
            masteryStatus: row.comprehension_mastery_status ?? null,
          },
        },
        overrides: {
          reason: row.override_reason ?? null,
          byUserId: row.override_by_user_id ?? null,
          at: row.override_at ?? null,
        },
      }),
  },
};

function getSchemaPaths() {
  return fs
    .readdirSync(schemaDir)
    .filter((entry) => entry.endsWith(".sql"))
    .sort((left, right) => left.localeCompare(right))
    .map((entry) => path.join(schemaDir, entry));
}

function sqliteValue(value: unknown) {
  if (typeof value === "bigint") {
    return Number(value);
  }
  return value;
}

async function getPostgresColumns(table: string) {
  const pool = getPostgresPool();
  const result = await pool.query<{ column_name: string }>(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
      ORDER BY ordinal_position
    `,
    [table],
  );
  return result.rows.map((row) => row.column_name);
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

async function importGeography(sqlite: Database.Database) {
  const pool = getPostgresPool();

  const regionRows = sqlite.prepare(`SELECT * FROM geo_regions ORDER BY name ASC`).all() as Array<Record<string, unknown>>;
  const subregionRows = sqlite.prepare(`SELECT * FROM geo_subregions ORDER BY name ASC`).all() as Array<Record<string, unknown>>;
  const districtRows = sqlite.prepare(`SELECT * FROM geo_districts ORDER BY name ASC`).all() as Array<Record<string, unknown>>;
  const subcountyRows = sqlite.prepare(`SELECT * FROM geo_subcounties ORDER BY name ASC`).all() as Array<Record<string, unknown>>;
  const parishRows = sqlite.prepare(`SELECT * FROM geo_parishes ORDER BY name ASC`).all() as Array<Record<string, unknown>>;
  const subregionsByLegacyId = new Map(
    subregionRows.map((row) => [String(row.id ?? "").trim(), row] as const),
  );
  const subcountiesByLegacyId = new Map(
    subcountyRows.map((row) => [String(row.id ?? "").trim(), row] as const),
  );

  await pool.query(
    `TRUNCATE TABLE geo_parishes, geo_subcounties, geo_districts, geo_subregions, geo_regions RESTART IDENTITY CASCADE`,
  );

  const regionIdMap = new Map<string, number>();
  for (const [index, row] of regionRows.entries()) {
    const id = index + 1;
    const legacyId = String(row.id ?? "").trim();
    regionIdMap.set(legacyId, id);
    await pool.query(
      `INSERT INTO geo_regions (id, region_id, name) VALUES ($1, $2, $3)`,
      [id, legacyId || null, String(row.name ?? "")],
    );
  }

  const subregionIdMap = new Map<string, number>();
  for (const [index, row] of subregionRows.entries()) {
    const id = index + 1;
    const legacyId = String(row.id ?? "").trim();
    const legacyRegionId = String(row.region_id ?? "").trim();
    subregionIdMap.set(legacyId, id);
    await pool.query(
      `INSERT INTO geo_subregions (id, subregion_id, region_id, name) VALUES ($1, $2, $3, $4)`,
      [id, legacyId || null, regionIdMap.get(legacyRegionId) ?? null, String(row.name ?? "")],
    );
  }

  const districtIdMap = new Map<string, number>();
  for (const [index, row] of districtRows.entries()) {
    const id = index + 1;
    const legacyId = String(row.id ?? "").trim();
    const legacySubregionId = String(row.subregion_id ?? "").trim();
    districtIdMap.set(legacyId, id);
    await pool.query(
      `INSERT INTO geo_districts (id, district_id, subregion_id, region_id, name) VALUES ($1, $2, $3, $4, $5)`,
      [
        id,
        legacyId || null,
        subregionIdMap.get(legacySubregionId) ?? null,
        regionIdMap.get(String(subregionsByLegacyId.get(legacySubregionId)?.region_id ?? "").trim()) ?? null,
        String(row.name ?? ""),
      ],
    );
  }

  const subcountyIdMap = new Map<string, number>();
  for (const [index, row] of subcountyRows.entries()) {
    const id = index + 1;
    const legacyId = String(row.id ?? "").trim();
    const legacyDistrictId = String(row.district_id ?? "").trim();
    subcountyIdMap.set(legacyId, id);
    await pool.query(
      `INSERT INTO geo_subcounties (id, subcounty_id, district_id, name) VALUES ($1, $2, $3, $4)`,
      [id, legacyId || null, districtIdMap.get(legacyDistrictId) ?? null, String(row.name ?? "")],
    );
  }

  for (const [index, row] of parishRows.entries()) {
    const id = index + 1;
    const legacySubcountyId = String(row.subcounty_id ?? "").trim();
    const subcountyId = subcountyIdMap.get(legacySubcountyId) ?? null;
    const districtId =
      districtIdMap.get(String(subcountiesByLegacyId.get(legacySubcountyId)?.district_id ?? "").trim()) ?? null;
    await pool.query(
      `INSERT INTO geo_parishes (id, parish_id, subcounty_id, district_id, name) VALUES ($1, $2, $3, $4, $5)`,
      [id, String(row.id ?? "").trim() || null, subcountyId, districtId, String(row.name ?? "")],
    );
  }
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
    const schemaSql = fs.readFileSync(schemaPath, "utf8");
    await pool.query(schemaSql);
  }

  await importGeography(sqlite);

  for (const table of TABLES) {
    const sqliteColumns = sqlite
      .prepare(`PRAGMA table_info(${table})`)
      .all() as Array<{ name: string }>;
    if (sqliteColumns.length === 0) {
      console.warn(`Skipping ${table}: not found in SQLite source.`);
      continue;
    }

    const postgresColumns = await getPostgresColumns(table);
    if (postgresColumns.length === 0) {
      console.warn(`Skipping ${table}: not found in PostgreSQL schema.`);
      continue;
    }

    const rows = sqlite.prepare(`SELECT * FROM ${table}`).all() as Array<Record<string, unknown>>;
    const sqliteColumnNames = sqliteColumns.map((column) => column.name);
    const aliases = COLUMN_ALIASES[table] ?? {};
    const customResolvers = CUSTOM_COLUMN_RESOLVERS[table] ?? {};
    const mappedColumns = new Map<string, string>();
    for (const sqliteColumnName of sqliteColumnNames) {
      const postgresColumnName = aliases[sqliteColumnName] ?? sqliteColumnName;
      if (!postgresColumns.includes(postgresColumnName) || mappedColumns.has(postgresColumnName)) {
        continue;
      }
      mappedColumns.set(postgresColumnName, sqliteColumnName);
    }
    const customColumns = postgresColumns.filter(
      (postgresColumn) => !mappedColumns.has(postgresColumn) && typeof customResolvers[postgresColumn] === "function",
    );
    const columnNames = [...mappedColumns.keys(), ...customColumns];
    if (columnNames.length === 0) {
      console.warn(`Skipping ${table}: no shared columns between SQLite and PostgreSQL.`);
      continue;
    }
    console.log(`Importing ${table}: ${rows.length} rows`);

    await pool.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
    if (rows.length === 0) {
      continue;
    }

    for (const row of rows) {
      const placeholders = columnNames.map((_, index) => `$${index + 1}`).join(", ");
      const values = columnNames.map((column) => {
        const sqliteColumnName = mappedColumns.get(column);
        if (sqliteColumnName) {
          return sqliteValue(row[sqliteColumnName]);
        }
        return sqliteValue(customResolvers[column]?.(row));
      });
      await pool.query(
        `INSERT INTO ${table} (${columnNames.join(", ")}) VALUES (${placeholders})`,
        values,
      );
    }

    if (columnNames.includes("id")) {
      await resetIdentitySequence(table);
    }
  }

  sqlite.close();
  console.log(`Imported foundation tables from ${sqlitePath}`);
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
