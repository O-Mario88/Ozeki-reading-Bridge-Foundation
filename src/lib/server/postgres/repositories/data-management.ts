import { queryPostgres, withPostgresClient } from "@/lib/server/postgres/client";

/**
 * Granular super-admin data management.
 *
 * Each "category" groups related tables so the admin can wipe e.g. all
 * test finance records without touching schools or assessments. The
 * `everything` category is a full slate-clear (equivalent to the
 * wipe-all-data.sql script), and preserves a hardcoded keep-list of
 * config/reference tables.
 *
 * All clears run inside BEGIN/COMMIT. Missing tables are silently skipped
 * (filtered via information_schema before TRUNCATE) so partially-migrated
 * deployments don't error out.
 */

export type CategoryKey =
  | "finance"
  | "donations"
  | "sponsorships"
  | "services"
  | "schools"
  | "learners"
  | "teachers"
  | "assessments"
  | "training"
  | "visits"
  | "content"
  | "logs"
  | "api_keys"
  | "everything";

export type CategoryDefinition = {
  key: CategoryKey;
  label: string;
  description: string;
  /** Tables this category clears. "everything" computes its set dynamically. */
  tables: string[];
  /** Extra warning shown to admin before clearing (used for high-impact categories). */
  warning?: string;
};

const KEEP_TABLES: readonly string[] = [
  "portal_users",
  "portal_sessions",
  "system_settings",
  "currency_rates",
  "sponsorship_tiers",
  "service_catalog",
  "finance_chart_of_accounts",
  "finance_funds",
  "finance_grants",
  "finance_settings",
  "finance_audited_statements",
  "geo_regions",
  "geo_districts",
  "geo_subregions",
  "geo_subcounties",
  "geo_parishes",
  "benchmark_profiles",
  "benchmark_rules",
  "assessment_benchmark_settings",
  "organization_profile",
  "teaching_improvement_settings",
  "portal_dashboard_pins",
  "portal_dashboard_settings",
];

export const DATA_MANAGEMENT_CATEGORIES: CategoryDefinition[] = [
  {
    key: "finance",
    label: "Finance Ledger",
    description: "Invoices, receipts, expenses, journal entries, contacts, snapshots, audit exceptions.",
    tables: [
      "finance_invoice_items",
      "finance_receipt_items",
      "finance_expense_receipts",
      "finance_audit_exceptions",
      "finance_journal_lines",
      "finance_journal_entries",
      "finance_monthly_statements",
      "finance_public_snapshots",
      "finance_invoices",
      "finance_receipts",
      "finance_expenses",
      "finance_contacts",
    ],
  },
  {
    key: "donations",
    label: "Donations",
    description: "Public donations and their receipts.",
    tables: ["donation_receipts", "donations"],
  },
  {
    key: "sponsorships",
    label: "Sponsorships",
    description: "School / district / region sponsorships and their receipts.",
    tables: ["sponsorship_receipts", "sponsorships"],
  },
  {
    key: "services",
    label: "Service Bookings & Payments",
    description: "Pesapal service payments, quotations, delivery schedules, receipts.",
    tables: [
      "payment_receipts",
      "quotation_items",
      "service_delivery_schedules",
      "service_quotations",
      "service_payments",
      "service_requests",
    ],
  },
  {
    key: "schools",
    label: "Schools",
    description: "Schools directory, contacts, enrollments. ⚠ Cascades into assessments, training, and all programme data for those schools.",
    warning: "Clearing schools will CASCADE into assessments, training attendance, evaluations, and all programme records tied to those schools.",
    tables: [
      "school_contacts",
      "school_enrollments",
      "school_literacy_impacts",
      "schools_directory",
    ],
  },
  {
    key: "learners",
    label: "Learners",
    description: "Learner roster — individual learner records.",
    tables: ["school_learners", "learner_roster"],
  },
  {
    key: "teachers",
    label: "Teachers",
    description: "Teacher roster.",
    tables: ["teacher_roster"],
  },
  {
    key: "assessments",
    label: "Assessments & Observations",
    description: "Assessment records, sessions, item responses, lesson evaluations, teacher observations.",
    tables: [
      "assessment_item_responses",
      "assessment_session_results",
      "assessment_records",
      "assessment_sessions",
      "lesson_evaluation_items",
      "lesson_evaluations",
      "observation_lesson_structure_items",
      "observation_scored_items",
      "observation_strengths",
      "observation_development_areas",
      "observation_action_plans",
      "teacher_lesson_observations",
    ],
  },
  {
    key: "training",
    label: "Training",
    description: "Online sessions, participants, programmes, chapters, discussions, attendance.",
    tables: [
      "online_training_notes",
      "online_training_artifacts",
      "online_training_resources",
      "online_training_participants",
      "online_training_session_chapters",
      "online_training_session_discussions",
      "online_training_programme_enrollments",
      "online_training_programme_sessions",
      "online_training_programmes",
      "online_training_sessions",
      "training_participants",
      "training_sessions",
      "training_schedule_registrations",
      "training_schedule",
      "portal_training_attendance",
    ],
  },
  {
    key: "visits",
    label: "Coaching Visits & Portal Records",
    description: "Coaching visits, portal records, evidence uploads.",
    tables: ["portal_evidence", "portal_records", "coaching_visits"],
  },
  {
    key: "content",
    label: "Content",
    description: "Blog posts, testimonials, newsletter, story library, impact reports, gallery.",
    tables: [
      "blog_post_comments",
      "blog_posts",
      "portal_testimonials",
      "newsletter_subscribers",
      "newsletter_issues",
      "story_activities",
      "story_library",
      "story_anthologies",
      "impact_reports",
      "impact_gallery",
    ],
  },
  {
    key: "logs",
    label: "Logs & Telemetry",
    description: "Audit logs, API usage logs, automation logs, platform events.",
    tables: ["automation_logs", "platform_events", "api_key_usage_logs", "audit_logs"],
  },
  {
    key: "api_keys",
    label: "API Keys",
    description: "Read-only API keys issued to research partners (Ministry, UNICEF, universities).",
    tables: ["api_keys"],
  },
  {
    key: "everything",
    label: "Everything (Nuclear)",
    description: "Clear all transactional + content data. Preserves login, app config, geo hierarchy, benchmarks, audited PDFs.",
    warning: "This wipes ALL transactional data — not just one category. Use this only when you want a completely fresh database.",
    tables: [], // resolved dynamically
  },
];

/* ────────────────────────────────────────────────────────────────────────── */
/* Queries                                                                    */
/* ────────────────────────────────────────────────────────────────────────── */

/** Returns only the tables that actually exist in the public schema. */
async function filterExistingTables(tables: string[]): Promise<string[]> {
  if (tables.length === 0) return [];
  const res = await queryPostgres(
    `SELECT tablename FROM pg_tables
     WHERE schemaname = 'public' AND tablename = ANY($1::text[])`,
    [tables],
  );
  return res.rows.map((r) => String((r as { tablename?: string }).tablename ?? ""));
}

/** List every user table in the public schema (for the "everything" category). */
async function listAllPublicTables(): Promise<string[]> {
  const res = await queryPostgres(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
  );
  return res.rows.map((r) => String((r as { tablename?: string }).tablename ?? ""));
}

async function resolveCategoryTables(category: CategoryDefinition): Promise<string[]> {
  if (category.key === "everything") {
    const all = await listAllPublicTables();
    return all.filter((t) => !KEEP_TABLES.includes(t));
  }
  return filterExistingTables(category.tables);
}

export type CategoryCount = {
  key: CategoryKey;
  label: string;
  description: string;
  warning: string | null;
  tableCount: number;
  rowCount: number;
};

/** Row counts per category, for the dashboard display. */
export async function getCategoryCountsPostgres(): Promise<CategoryCount[]> {
  const out: CategoryCount[] = [];
  for (const cat of DATA_MANAGEMENT_CATEGORIES) {
    const tables = await resolveCategoryTables(cat);
    if (tables.length === 0) {
      out.push({
        key: cat.key,
        label: cat.label,
        description: cat.description,
        warning: cat.warning ?? null,
        tableCount: 0,
        rowCount: 0,
      });
      continue;
    }
    // Build a UNION ALL of row counts per table and sum.
    const unionSql = tables
      .map((t) => `SELECT COUNT(*)::bigint AS c FROM "${t}"`)
      .join(" UNION ALL ");
    try {
      const res = await queryPostgres(`SELECT COALESCE(SUM(c), 0)::bigint AS total FROM (${unionSql}) s`);
      const total = Number((res.rows[0] as { total?: string | number })?.total ?? 0);
      out.push({
        key: cat.key,
        label: cat.label,
        description: cat.description,
        warning: cat.warning ?? null,
        tableCount: tables.length,
        rowCount: total,
      });
    } catch {
      // If any table errors, just mark the category as 0 instead of failing the whole page.
      out.push({
        key: cat.key,
        label: cat.label,
        description: cat.description,
        warning: cat.warning ?? null,
        tableCount: tables.length,
        rowCount: 0,
      });
    }
  }
  return out;
}

export type ClearCategoryResult = {
  key: CategoryKey;
  tablesCleared: string[];
  rowsCleared: number;
};

/** Clear all tables in a category inside a single transaction. */
export async function clearCategoryPostgres(
  key: CategoryKey,
  actorUserId: number,
  actorName: string,
): Promise<ClearCategoryResult> {
  const category = DATA_MANAGEMENT_CATEGORIES.find((c) => c.key === key);
  if (!category) throw new Error(`Unknown category: ${key}`);

  const tables = await resolveCategoryTables(category);
  if (tables.length === 0) {
    return { key, tablesCleared: [], rowsCleared: 0 };
  }

  return withPostgresClient(async (client) => {
    await client.query("BEGIN");
    try {
      // Count rows BEFORE the truncate so we can return the number cleared.
      const unionSql = tables
        .map((t) => `SELECT COUNT(*)::bigint AS c FROM "${t}"`)
        .join(" UNION ALL ");
      const countRes = await client.query(
        `SELECT COALESCE(SUM(c), 0)::bigint AS total FROM (${unionSql}) s`,
      );
      const rowsCleared = Number((countRes.rows[0] as { total?: string | number })?.total ?? 0);

      const quoted = tables.map((t) => `"${t.replace(/"/g, '""')}"`).join(", ");
      await client.query(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE`);

      // Write a single audit entry AFTER truncation so the record persists
      // (audit_logs is in the "logs" category — if we're clearing that, this
      // entry is its first new row).
      await client.query(
        `INSERT INTO audit_logs (user_id, user_name, action, target_table, target_id, detail)
         VALUES ($1, $2, 'clear_category', $3, $4, $5)`,
        [
          actorUserId,
          actorName,
          "public",
          key,
          `Cleared category "${category.label}" — ${tables.length} tables, ${rowsCleared.toLocaleString()} rows`,
        ],
      );

      await client.query("COMMIT");
      return { key, tablesCleared: tables, rowsCleared };
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      throw err;
    }
  });
}
