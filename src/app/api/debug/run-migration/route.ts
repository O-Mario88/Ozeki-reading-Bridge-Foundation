import { NextResponse } from "next/server";
import { queryPostgres } from "@/lib/server/postgres/client";

export const runtime = "nodejs";

/**
 * Temporary endpoint to apply missing migrations to production.
 * DELETE THIS FILE after migrations are applied.
 */
export async function POST() {
  const results: { migration: string; status: string; error?: string }[] = [];

  // Migration 0036: Add classes_json column
  try {
    await queryPostgres(
      `ALTER TABLE schools_directory ADD COLUMN IF NOT EXISTS classes_json TEXT DEFAULT '[]'`,
      [],
    );
    results.push({ migration: "0036_school_classes", status: "applied" });
  } catch (error) {
    results.push({
      migration: "0036_school_classes",
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Also ensure updated_at exists on schools_directory (referenced by enrollment route)
  try {
    await queryPostgres(
      `ALTER TABLE schools_directory ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`,
      [],
    );
    results.push({ migration: "add_updated_at", status: "applied" });
  } catch (error) {
    results.push({
      migration: "add_updated_at",
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return NextResponse.json({ results });
}
