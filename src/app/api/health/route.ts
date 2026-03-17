import { NextResponse } from "next/server";
import OpenAI from "openai";
import {
  checkPostgresConnectivity,
  getPostgresRuntimeInfo,
  isPostgresConfigured,
  queryPostgres,
} from "@/lib/server/postgres/client";
import { getOpenAiServerConfig } from "@/lib/server/openai-config";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const timestamp = new Date().toISOString();
  const runtimeInfo = getPostgresRuntimeInfo();
  const openAiConfig = getOpenAiServerConfig("gpt-5.2-mini");
  const { searchParams } = new URL(request.url);
  const aiProbeRequested = searchParams.get("aiProbe") === "1";
  let aiProbeStatus: "not_requested" | "not_configured" | "ok" | "error" = "not_requested";
  let aiProbeError: string | null = null;

  if (aiProbeRequested) {
    if (!openAiConfig.configured || !openAiConfig.apiKey) {
      aiProbeStatus = "not_configured";
    } else {
      try {
        const client = new OpenAI({ apiKey: openAiConfig.apiKey });
        await client.models.retrieve(openAiConfig.model);
        aiProbeStatus = "ok";
      } catch (error) {
        aiProbeStatus = "error";
        aiProbeError = error instanceof Error ? error.message : "OpenAI probe failed.";
      }
    }
  }

  if (!isPostgresConfigured()) {
    return NextResponse.json(
      {
        status: "error",
        activeDb: "unknown",
        timestamp,
        checks: {
          postgresConfigured: false,
          database: "error",
          aiConfig: openAiConfig.status,
          aiProbe: aiProbeStatus,
        },
        ai: {
          configured: openAiConfig.configured,
          status: openAiConfig.status,
          model: openAiConfig.model,
        },
        error: "DATABASE_URL is not configured. PostgreSQL is required.",
        ...(aiProbeError ? { aiProbeError } : {}),
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    );
  }

  try {
    const connection = await checkPostgresConnectivity();
    const schemaProbe = await queryPostgres<{
      portalUsers: string | null;
      schoolsDirectory: string | null;
      impactReports: string | null;
    }>(
      `
      SELECT
        to_regclass('public.portal_users') AS "portalUsers",
        to_regclass('public.schools_directory') AS "schoolsDirectory",
        to_regclass('public.impact_reports') AS "impactReports"
      `,
    );
    const schemaReady = Boolean(
      schemaProbe.rows[0]?.portalUsers &&
      schemaProbe.rows[0]?.schoolsDirectory &&
      schemaProbe.rows[0]?.impactReports,
    );

    const degradedForAiProbe = aiProbeRequested && aiProbeStatus !== "ok";
    return NextResponse.json(
      {
        status: degradedForAiProbe ? "degraded" : "ok",
        activeDb: "postgres",
        timestamp,
        runtime: {
          host: connection.host,
          port: connection.port,
          database: connection.database,
          ssl: connection.ssl,
        },
        checks: {
          postgresConfigured: true,
          database: "ok",
          schema: schemaReady ? "ok" : "degraded",
          aiConfig: openAiConfig.status,
          aiProbe: aiProbeStatus,
        },
        ai: {
          configured: openAiConfig.configured,
          status: openAiConfig.status,
          model: openAiConfig.model,
        },
        ...(aiProbeError ? { aiProbeError } : {}),
      },
      {
        status: degradedForAiProbe ? 503 : 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: "degraded",
        activeDb: "postgres",
        timestamp,
        runtime: {
          host: runtimeInfo.host,
          port: runtimeInfo.port,
          database: runtimeInfo.database,
          ssl: runtimeInfo.ssl,
        },
        checks: {
          postgresConfigured: true,
          database: "error",
          aiConfig: openAiConfig.status,
          aiProbe: aiProbeStatus,
        },
        ai: {
          configured: openAiConfig.configured,
          status: openAiConfig.status,
          model: openAiConfig.model,
        },
        error: error instanceof Error ? error.message : "Database health check failed.",
        ...(aiProbeError ? { aiProbeError } : {}),
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    );
  }
}
