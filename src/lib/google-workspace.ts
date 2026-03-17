import { google } from "googleapis";

export const GOOGLE_WORKSPACE_REQUIRED_SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/meetings.space.readonly",
] as const;

export type GoogleWorkspaceDiagnostics = {
  configured: boolean;
  googleConnected: boolean;
  calendarId: string | null;
  missingEnv: string[];
  grantedScopes: string[];
  missingScopes: string[];
  calendarAccessible: boolean;
  calendarSummary: string | null;
  tokenValid: boolean;
  error: string | null;
};

function getOptionalEnv(name: string) {
  return process.env[name]?.trim() ?? "";
}

export function getRequiredEnv(name: string) {
  const value = getOptionalEnv(name);
  if (!value) {
    throw new Error(`Missing ${name} environment variable.`);
  }
  return value;
}

export function getGoogleWorkspaceConfig() {
  const clientId = getOptionalEnv("GOOGLE_CLIENT_ID");
  const clientSecret = getOptionalEnv("GOOGLE_CLIENT_SECRET");
  const refreshToken = getOptionalEnv("GOOGLE_REFRESH_TOKEN");
  const calendarId = getOptionalEnv("GOOGLE_CALENDAR_ID");
  const redirectUri =
    getOptionalEnv("GOOGLE_WORKSPACE_OAUTH_REDIRECT_URI")
    || getOptionalEnv("GOOGLE_OAUTH_REDIRECT_URI")
    || getOptionalEnv("GOOGLE_REDIRECT_URI");

  return {
    clientId,
    clientSecret,
    refreshToken,
    calendarId,
    redirectUri,
  };
}

export function getGoogleWorkspaceMissingEnv() {
  const config = getGoogleWorkspaceConfig();
  const missing: string[] = [];
  if (!config.clientId) missing.push("GOOGLE_CLIENT_ID");
  if (!config.clientSecret) missing.push("GOOGLE_CLIENT_SECRET");
  if (!config.refreshToken) missing.push("GOOGLE_REFRESH_TOKEN");
  if (!config.calendarId) missing.push("GOOGLE_CALENDAR_ID");
  return missing;
}

export function isGoogleWorkspaceConfigured() {
  return getGoogleWorkspaceMissingEnv().length === 0;
}

export function createGoogleOAuthClient() {
  const config = getGoogleWorkspaceConfig();
  const oauth2Client = new google.auth.OAuth2(
    getRequiredEnv("GOOGLE_CLIENT_ID"),
    getRequiredEnv("GOOGLE_CLIENT_SECRET"),
    config.redirectUri || undefined,
  );
  oauth2Client.setCredentials({
    refresh_token: getRequiredEnv("GOOGLE_REFRESH_TOKEN"),
  });
  return oauth2Client;
}

export function createGoogleCalendarClient() {
  return google.calendar({ version: "v3", auth: createGoogleOAuthClient() });
}

export function createGoogleMeetClient() {
  return google.meet({ version: "v2", auth: createGoogleOAuthClient() });
}

function normalizeScopes(value: string | null | undefined) {
  if (!value) {
    return [];
  }
  return value
    .split(" ")
    .map((scope) => scope.trim())
    .filter(Boolean);
}

async function getGrantedScopesFromToken(accessToken: string) {
  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`,
    {
      method: "GET",
      cache: "no-store",
    },
  );
  if (!response.ok) {
    throw new Error("Could not validate Google access token scopes.");
  }
  const payload = (await response.json()) as { scope?: string };
  return normalizeScopes(payload.scope);
}

export async function getGoogleWorkspaceDiagnostics(): Promise<GoogleWorkspaceDiagnostics> {
  const config = getGoogleWorkspaceConfig();
  const missingEnv = getGoogleWorkspaceMissingEnv();

  if (missingEnv.length > 0) {
    return {
      configured: false,
      googleConnected: false,
      calendarId: config.calendarId || null,
      missingEnv,
      grantedScopes: [],
      missingScopes: [...GOOGLE_WORKSPACE_REQUIRED_SCOPES],
      calendarAccessible: false,
      calendarSummary: null,
      tokenValid: false,
      error: "Google Workspace environment configuration is incomplete.",
    };
  }

  try {
    const auth = createGoogleOAuthClient();
    const tokenResponse = await auth.getAccessToken();
    const accessToken =
      typeof tokenResponse === "string"
        ? tokenResponse
        : tokenResponse?.token ?? null;

    if (!accessToken) {
      return {
        configured: true,
        googleConnected: false,
        calendarId: config.calendarId || null,
        missingEnv: [],
        grantedScopes: [],
        missingScopes: [...GOOGLE_WORKSPACE_REQUIRED_SCOPES],
        calendarAccessible: false,
        calendarSummary: null,
        tokenValid: false,
        error: "Google access token could not be obtained from refresh token.",
      };
    }

    const grantedScopes = await getGrantedScopesFromToken(accessToken);
    const grantedScopeSet = new Set(grantedScopes);
    const missingScopes = GOOGLE_WORKSPACE_REQUIRED_SCOPES.filter(
      (scope) => !grantedScopeSet.has(scope),
    );

    const calendar = google.calendar({ version: "v3", auth });
    const calendarResponse = await calendar.calendars.get({
      calendarId: config.calendarId || "primary",
    });

    const calendarSummary = calendarResponse.data.summary ?? config.calendarId ?? null;
    const googleConnected = missingScopes.length === 0;

    return {
      configured: true,
      googleConnected,
      calendarId: config.calendarId || null,
      missingEnv: [],
      grantedScopes,
      missingScopes,
      calendarAccessible: true,
      calendarSummary,
      tokenValid: true,
      error: null,
    };
  } catch (error) {
    return {
      configured: true,
      googleConnected: false,
      calendarId: config.calendarId || null,
      missingEnv: [],
      grantedScopes: [],
      missingScopes: [...GOOGLE_WORKSPACE_REQUIRED_SCOPES],
      calendarAccessible: false,
      calendarSummary: null,
      tokenValid: false,
      error: error instanceof Error ? error.message : "Google Workspace diagnostics failed.",
    };
  }
}
