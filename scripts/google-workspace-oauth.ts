import { google } from "googleapis";
import { GOOGLE_WORKSPACE_REQUIRED_SCOPES } from "../src/lib/google-workspace";

type Mode = "url" | "exchange";

function readArg(name: string) {
  const arg = process.argv.find((value) => value.startsWith(`--${name}=`));
  return arg ? arg.slice(name.length + 3).trim() : "";
}

function resolveOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() ?? "";
  const appOrigin = process.env.APP_ORIGIN?.trim() || "http://localhost:3000";
  const redirectUri =
    process.env.GOOGLE_WORKSPACE_OAUTH_REDIRECT_URI?.trim() || `${appOrigin}/oauth2callback`;

  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET. Set them in your environment first.",
    );
  }

  return { clientId, clientSecret, redirectUri };
}

async function printAuthUrl() {
  const { clientId, clientSecret, redirectUri } = resolveOAuthConfig();
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [...GOOGLE_WORKSPACE_REQUIRED_SCOPES],
  });

  console.log("Open this URL and approve access:");
  console.log(authUrl);
  console.log("");
  console.log(`Redirect URI in use: ${redirectUri}`);
}

async function exchangeCodeForTokens() {
  const { clientId, clientSecret, redirectUri } = resolveOAuthConfig();
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  const code = readArg("code");

  if (!code) {
    throw new Error("Missing authorization code. Use --code=YOUR_AUTH_CODE");
  }

  const { tokens } = await oauth2Client.getToken(code);
  console.log(
    JSON.stringify(
      {
        refreshToken: tokens.refresh_token ?? null,
        accessToken: tokens.access_token ?? null,
        expiryDate: tokens.expiry_date ?? null,
        scope: tokens.scope ?? null,
        tokenType: tokens.token_type ?? null,
      },
      null,
      2,
    ),
  );

  if (!tokens.refresh_token) {
    console.log(
      "No refresh token returned. Retry using prompt=consent and remove previous app consent in Google Account permissions.",
    );
  }
}

async function main() {
  const mode = (process.argv[2] ?? "url") as Mode;

  if (mode === "url") {
    await printAuthUrl();
    return;
  }

  if (mode === "exchange") {
    await exchangeCodeForTokens();
    return;
  }

  throw new Error(`Unknown mode "${mode}". Use "url" or "exchange".`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Google OAuth script failed.");
  process.exit(1);
});
