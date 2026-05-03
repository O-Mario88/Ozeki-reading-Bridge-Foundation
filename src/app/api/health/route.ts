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

type CredentialStatus = "ok" | "missing" | "partial" | "not_configured";

interface PesapalConfigCheck {
  configured: boolean;
  status: CredentialStatus;
  environment: "live" | "sandbox" | null;
  missing: string[];
}

function checkPesapalCredentials(): PesapalConfigCheck {
  const required = ["PESAPAL_CONSUMER_KEY", "PESAPAL_CONSUMER_SECRET", "PESAPAL_IPN_ID"] as const;
  const missing = required.filter((k) => !process.env[k]?.trim());
  const env = (process.env.PESAPAL_ENVIRONMENT?.trim() || "sandbox").toLowerCase();
  const environment: "live" | "sandbox" | null = env === "live" ? "live" : env === "sandbox" ? "sandbox" : null;

  if (missing.length === required.length) {
    return { configured: false, status: "not_configured", environment, missing };
  }
  if (missing.length > 0) {
    return { configured: false, status: "partial", environment, missing };
  }
  return { configured: true, status: "ok", environment, missing: [] };
}

interface SmtpConfigCheck {
  configured: boolean;
  status: CredentialStatus;
  hasFromAddress: boolean;
  port: number | null;
  secure: boolean;
  missing: string[];
}

function checkSmtpCredentials(): SmtpConfigCheck {
  const host = process.env.SMTP_HOST?.trim() ?? "";
  const user = process.env.SMTP_USER?.trim() ?? "";
  const pass = process.env.SMTP_PASS?.trim() ?? "";
  const portRaw = process.env.SMTP_PORT?.trim();
  const port = portRaw ? Number(portRaw) : null;
  const secure = String(process.env.SMTP_SECURE ?? "false").toLowerCase() === "true";
  const hasFrom = Boolean(
    (process.env.FINANCE_EMAIL_FROM ?? process.env.SMTP_FROM ?? "").trim(),
  );

  const missing: string[] = [];
  if (!host) missing.push("SMTP_HOST");
  if (!user) missing.push("SMTP_USER");
  if (!pass) missing.push("SMTP_PASS");
  if (!hasFrom) missing.push("SMTP_FROM (or FINANCE_EMAIL_FROM)");

  let status: CredentialStatus;
  if (missing.length === 4) status = "not_configured";
  else if (missing.length > 0) status = "partial";
  else status = "ok";

  return {
    configured: status === "ok",
    status,
    hasFromAddress: hasFrom,
    port: port != null && Number.isFinite(port) ? port : null,
    secure,
    missing,
  };
}

export async function GET(request: Request) {
  const timestamp = new Date().toISOString();
  const openAiConfig = getOpenAiServerConfig("gpt-4o-mini");
  const { searchParams } = new URL(request.url);
  const aiProbeRequested = searchParams.get("aiProbe") === "1";
  let aiProbeStatus: "not_requested" | "not_configured" | "ok" | "error" = "not_requested";
  let aiProbeError: string | null = null;
  const pesapal = checkPesapalCredentials();
  const smtp = checkSmtpCredentials();

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
          pesapal: pesapal.status,
          smtp: smtp.status,
        },
        ai: {
          configured: openAiConfig.configured,
          status: openAiConfig.status,
          model: openAiConfig.model,
        },
        pesapal,
        smtp,
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
          pesapal: pesapal.status,
          smtp: smtp.status,
        },
        ai: {
          configured: openAiConfig.configured,
          status: openAiConfig.status,
          model: openAiConfig.model,
        },
        pesapal,
        smtp,
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
    const runtimeInfo = getPostgresRuntimeInfo();
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
          pesapal: pesapal.status,
          smtp: smtp.status,
        },
        ai: {
          configured: openAiConfig.configured,
          status: openAiConfig.status,
          model: openAiConfig.model,
        },
        pesapal,
        smtp,
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
