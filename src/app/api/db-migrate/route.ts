import { NextResponse } from "next/server";
import { withPostgresClient } from "@/lib/server/postgres/client";
import fs from "node:fs";
import path from "node:path";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Run all migration SQL files from database/postgres/ in order.
 * Each file uses IF NOT EXISTS / ON CONFLICT to be idempotent.
 * 
 * GET  /api/db-migrate  →  Show status (which files exist, which tables present)
 * POST /api/db-migrate  →  Run all migrations
 */

async function getTableCount() {
  const { queryPostgres } = await import("@/lib/server/postgres/client");
  const result = await queryPostgres(
    "SELECT COUNT(*)::int AS count FROM information_schema.tables WHERE table_schema = 'public'"
  );
  return Number((result.rows[0] as Record<string, unknown>)?.count ?? 0);
}

async function getExistingTables() {
  const { queryPostgres } = await import("@/lib/server/postgres/client");
  const result = await queryPostgres(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
  );
  return result.rows.map((r: Record<string, unknown>) => String(r.table_name));
}

function getMigrationFiles(): string[] {
  const migrationDir = path.join(process.cwd(), "database", "postgres");
  try {
    const files = fs.readdirSync(migrationDir)
      .filter(f => f.endsWith(".sql"))
      .sort();
    return files;
  } catch {
    return [];
  }
}

function readMigrationFile(filename: string): string {
  const filePath = path.join(process.cwd(), "database", "postgres", filename);
  return fs.readFileSync(filePath, "utf-8");
}

export async function GET() {
  try {
    const tableCount = await getTableCount();
    const tables = await getExistingTables();
    const migrationFiles = getMigrationFiles();

    return NextResponse.json({
      status: "ready",
      tableCount,
      tables,
      migrationFiles,
      instructions: "Send a POST request to this endpoint to run all migrations.",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({
      error: `Failed to check status: ${error instanceof Error ? error.message : String(error)}`,
    }, { status: 500 });
  }
}

export async function POST() {
  const results: { file: string; status: string; error?: string }[] = [];
  const migrationFiles = getMigrationFiles();

  if (migrationFiles.length === 0) {
    return NextResponse.json({
      error: "No migration files found in database/postgres/",
    }, { status: 404 });
  }

  const tablesBefore = await getTableCount();

  for (const file of migrationFiles) {
    try {
      const sql = readMigrationFile(file);
      await withPostgresClient(async (client) => {
        await client.query(sql);
      });
      results.push({ file, status: "success" });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      results.push({ file, status: "error", error: errorMsg });
      // Continue with other files - don't stop on first error
    }
  }

  const tablesAfter = await getTableCount();
  const succeeded = results.filter(r => r.status === "success").length;
  const failed = results.filter(r => r.status === "error").length;

  return NextResponse.json({
    summary: {
      totalFiles: migrationFiles.length,
      succeeded,
      failed,
      tablesBefore,
      tablesAfter,
      tablesCreated: tablesAfter - tablesBefore,
    },
    results,
  }, {
    status: failed > 0 ? 207 : 200,
    headers: { "Cache-Control": "no-store" },
  });
}
