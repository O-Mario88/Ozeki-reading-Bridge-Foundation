import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { getPostgresPool, isPostgresConfigured } from "@/lib/server/postgres/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlitePath = path.resolve(
  process.env.SQLITE_DB_PATH?.trim() || path.resolve(__dirname, "../data/app.db"),
);

const FOUNDATION_TABLES = [
  "portal_users",
  "portal_sessions",
  "audit_logs",
  "geo_regions",
  "geo_subregions",
  "geo_districts",
  "geo_subcounties",
  "geo_parishes",
  "schools_directory",
  "school_contacts",
  "school_learners",
  "teacher_roster",
  "learner_roster",
  "training_sessions",
  "training_participants",
  "online_training_events",
  "legacy_assessment_records",
  "assessment_sessions",
  "assessment_session_results",
  "assessment_records",
  "portal_records",
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

const FINANCE_TABLES = [
  "finance_contacts",
  "finance_files",
  "finance_settings",
  "finance_invoices",
  "finance_invoice_items",
  "finance_receipts",
  "finance_payments",
  "finance_payment_allocations",
  "finance_expenses",
  "finance_transactions_ledger",
  "finance_expense_receipts",
  "finance_audit_exceptions",
  "finance_txn_risk_scores",
  "finance_statement_lines",
  "finance_reconciliation_matches",
  "finance_monthly_statements",
  "finance_email_logs",
  "finance_public_snapshots",
  "finance_budgets_monthly",
  "finance_audited_statements",
] as const;

const CONTENT_TABLES = [
  "portal_resources",
  "newsletter_issues",
  "newsletter_dispatch_logs",
  "portal_blog_posts",
  "blog_post_views",
  "blog_post_likes",
  "blog_post_comments",
] as const;

const ONLINE_TRAINING_TABLES = [
  "online_training_sessions",
  "online_training_participants",
  "online_training_resources",
  "online_training_artifacts",
  "online_training_notes",
] as const;

const OPERATIONAL_TABLES = [
  "coaching_visits",
  "visit_participants",
  "visit_demo",
  "visit_leadership_meeting",
  "material_distributions",
  "school_support_status_snapshots",
  "teacher_support_status_snapshots",
  "assessment_item_responses",
] as const;

const INTELLIGENCE_TABLES = [
  "training_report_artifacts",
  "benchmark_profiles",
  "benchmark_rules",
  "edu_audit_exceptions",
  "edu_data_quality_summary",
  "edu_priority_queue_assignments",
  "intervention_plan",
  "intervention_actions",
  "national_report_packs",
  "partner_api_clients",
  "partner_export_audit_logs",
] as const;

const VIEW_NAMES = [
  "impact_public_school_scope",
  "impact_public_teacher_support",
  "teaching_quality_by_school_period",
  "story_participation_by_school_period",
  "teaching_learning_alignment_by_school_period",
] as const;

const UNIQUE_CHECKS = [
  { table: "finance_invoices", column: "invoice_number" },
  { table: "finance_receipts", column: "receipt_number" },
  { table: "finance_expenses", column: "expense_number" },
] as const;

type VerificationFailure = {
  scope: "table" | "view" | "unique";
  name: string;
  message: string;
};

function parseScopes(args: string[]) {
  const requested = new Set<string>();
  for (const arg of args) {
    if (!arg.startsWith("--scope=")) {
      continue;
    }
    const raw = arg.slice("--scope=".length);
    raw
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
      .forEach((item) => requested.add(item));
  }

  if (requested.size === 0 || requested.has("all")) {
    return {
      foundation: true,
      finance: true,
      content: true,
      onlineTraining: true,
      operational: true,
      intelligence: true,
    };
  }

  return {
    foundation: requested.has("foundation"),
    finance: requested.has("finance"),
    content: requested.has("content"),
    onlineTraining: requested.has("online-training") || requested.has("online_training"),
    operational: requested.has("operational"),
    intelligence: requested.has("intelligence") || requested.has("reporting"),
  };
}

function logPass(message: string) {
  console.log(`PASS ${message}`);
}

function logInfo(message: string) {
  console.log(`INFO ${message}`);
}

function logFail(message: string) {
  console.error(`FAIL ${message}`);
}

function quoteIdentifier(identifier: string) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function getSqliteRowCount(sqlite: Database.Database, table: string) {
  const row = sqlite.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as { count: number };
  return Number(row.count || 0);
}

function sqliteTableColumns(sqlite: Database.Database, table: string) {
  return sqlite.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
}

function sqliteHasColumns(sqlite: Database.Database, table: string, required: string[]) {
  const columns = sqliteTableColumns(sqlite, table).map((column) => column.name);
  return required.every((column) => columns.includes(column));
}

async function postgresRelationExists(name: string) {
  const pool = getPostgresPool();
  const result = await pool.query<{ exists: boolean }>(
    `SELECT to_regclass($1) IS NOT NULL AS exists`,
    [name],
  );
  return Boolean(result.rows[0]?.exists);
}

async function getPostgresRowCount(table: string) {
  const pool = getPostgresPool();
  const result = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM ${quoteIdentifier(table)}`,
  );
  return Number(result.rows[0]?.count ?? 0);
}

async function verifyTables(
  sqlite: Database.Database,
  tables: readonly string[],
  failures: VerificationFailure[],
) {
  for (const table of tables) {
    if (sqliteTableColumns(sqlite, table).length === 0) {
      logInfo(`Skipping ${table}: not found in SQLite source`);
      continue;
    }
    const sqliteCount = getSqliteRowCount(sqlite, table);
    const exists = await postgresRelationExists(table);
    if (!exists) {
      failures.push({
        scope: "table",
        name: table,
        message: "missing in PostgreSQL",
      });
      logFail(`table ${table}: missing in PostgreSQL`);
      continue;
    }

    const postgresCount = await getPostgresRowCount(table);
    if (postgresCount !== sqliteCount) {
      failures.push({
        scope: "table",
        name: table,
        message: `row count mismatch sqlite=${sqliteCount} postgres=${postgresCount}`,
      });
      logFail(`table ${table}: sqlite=${sqliteCount} postgres=${postgresCount}`);
      continue;
    }

    logPass(`table ${table}: ${postgresCount} rows`);
  }
}

async function verifyOnlineTrainingTables(sqlite: Database.Database, failures: VerificationFailure[]) {
  const sessionSource = sqliteHasColumns(
    sqlite,
    "online_training_sessions",
    ["id", "title", "agenda", "start_time", "end_time", "host_user_id", "created_by_user_id"],
  )
    ? "online_training_sessions"
    : sqliteHasColumns(
          sqlite,
          "online_training_events",
          ["id", "title", "audience", "start_datetime", "end_datetime", "created_by_user_id"],
        )
      ? "online_training_events"
      : null;

  if (!sessionSource) {
    failures.push({
      scope: "table",
      name: "online_training_sessions",
      message: "no compatible SQLite source table found",
    });
    logFail("table online_training_sessions: no compatible SQLite source table found");
    return;
  }

  const sqliteSessionCount = getSqliteRowCount(sqlite, sessionSource);
  const postgresSessionCount = await getPostgresRowCount("online_training_sessions");
  if (sqliteSessionCount !== postgresSessionCount) {
    failures.push({
      scope: "table",
      name: "online_training_sessions",
      message: `row count mismatch sqlite(${sessionSource})=${sqliteSessionCount} postgres=${postgresSessionCount}`,
    });
    logFail(
      `table online_training_sessions: sqlite(${sessionSource})=${sqliteSessionCount} postgres=${postgresSessionCount}`,
    );
  } else {
    logPass(`table online_training_sessions: ${postgresSessionCount} rows from ${sessionSource}`);
  }

  await verifyTables(sqlite, ONLINE_TRAINING_TABLES.slice(1), failures);
}

async function verifyViews(failures: VerificationFailure[]) {
  for (const viewName of VIEW_NAMES) {
    const exists = await postgresRelationExists(viewName);
    if (!exists) {
      failures.push({
        scope: "view",
        name: viewName,
        message: "missing in PostgreSQL",
      });
      logFail(`view ${viewName}: missing in PostgreSQL`);
      continue;
    }

    try {
      const count = await getPostgresRowCount(viewName);
      logPass(`view ${viewName}: ${count} rows`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push({
        scope: "view",
        name: viewName,
        message,
      });
      logFail(`view ${viewName}: ${message}`);
    }
  }

  const schoolCount = await getPostgresRowCount("schools_directory");
  const schoolScopeCount = await getPostgresRowCount("impact_public_school_scope");
  if (schoolScopeCount !== schoolCount) {
    failures.push({
      scope: "view",
      name: "impact_public_school_scope",
      message: `expected ${schoolCount} schools, got ${schoolScopeCount}`,
    });
    logFail(`view impact_public_school_scope: expected ${schoolCount} schools, got ${schoolScopeCount}`);
    return;
  }
  logPass(`view impact_public_school_scope matches schools_directory: ${schoolScopeCount}`);
}

async function verifyUniqueKeys(failures: VerificationFailure[]) {
  const pool = getPostgresPool();
  for (const check of UNIQUE_CHECKS) {
    const exists = await postgresRelationExists(check.table);
    if (!exists) {
      continue;
    }
    const result = await pool.query<{ duplicates: string }>(
      `
        SELECT COUNT(*)::text AS duplicates
        FROM (
          SELECT ${quoteIdentifier(check.column)}
          FROM ${quoteIdentifier(check.table)}
          GROUP BY ${quoteIdentifier(check.column)}
          HAVING COUNT(*) > 1
        ) dupes
      `,
    );
    const duplicates = Number(result.rows[0]?.duplicates ?? 0);
    if (duplicates > 0) {
      failures.push({
        scope: "unique",
        name: `${check.table}.${check.column}`,
        message: `${duplicates} duplicate business keys`,
      });
      logFail(`unique ${check.table}.${check.column}: ${duplicates} duplicate business keys`);
      continue;
    }
    logPass(`unique ${check.table}.${check.column}`);
  }
}

async function main() {
  const scopes = parseScopes(process.argv.slice(2));
  if (!scopes.foundation && !scopes.finance && !scopes.content && !scopes.onlineTraining && !scopes.operational && !scopes.intelligence) {
    throw new Error(
      "Nothing to verify. Use --scope=foundation, --scope=finance, --scope=content, --scope=online-training, --scope=operational, --scope=intelligence, or --scope=all.",
    );
  }
  if (!isPostgresConfigured()) {
    throw new Error("DATABASE_URL is not configured.");
  }
  if (!fs.existsSync(sqlitePath)) {
    throw new Error(`SQLite source not found at ${sqlitePath}`);
  }

  const sqlite = new Database(sqlitePath, { readonly: true });
  const failures: VerificationFailure[] = [];
  logInfo(`SQLite source: ${sqlitePath}`);
  logInfo(
    `Scopes: ${[
      scopes.foundation ? "foundation" : null,
      scopes.finance ? "finance" : null,
      scopes.content ? "content" : null,
      scopes.onlineTraining ? "online-training" : null,
      scopes.operational ? "operational" : null,
      scopes.intelligence ? "intelligence" : null,
    ]
      .filter(Boolean)
      .join(", ")}`,
  );

  try {
    if (scopes.foundation) {
      logInfo("Verifying foundation tables");
      await verifyTables(sqlite, FOUNDATION_TABLES, failures);
      logInfo("Verifying public-impact views");
      await verifyViews(failures);
    }

    if (scopes.finance) {
      logInfo("Verifying finance tables");
      await verifyTables(sqlite, FINANCE_TABLES, failures);
      logInfo("Verifying finance business-key uniqueness");
      await verifyUniqueKeys(failures);
    }

    if (scopes.content) {
      logInfo("Verifying content/public tables");
      await verifyTables(sqlite, CONTENT_TABLES, failures);
    }

    if (scopes.onlineTraining) {
      logInfo("Verifying online training tables");
      await verifyOnlineTrainingTables(sqlite, failures);
    }

    if (scopes.operational) {
      logInfo("Verifying operational delivery tables");
      await verifyTables(sqlite, OPERATIONAL_TABLES, failures);
    }

    if (scopes.intelligence) {
      logInfo("Verifying intelligence/reporting tables");
      await verifyTables(sqlite, INTELLIGENCE_TABLES, failures);
    }
  } finally {
    sqlite.close();
  }

  if (failures.length > 0) {
    logFail(`Verification failed with ${failures.length} issue(s).`);
    for (const failure of failures) {
      logFail(`[${failure.scope}] ${failure.name}: ${failure.message}`);
    }
    process.exitCode = 1;
    return;
  }

  logPass("PostgreSQL staging verification completed with no mismatches.");
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
