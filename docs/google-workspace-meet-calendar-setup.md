# Google Meet + Calendar Setup (Ozeki)

This guide configures Google Calendar API and Google Meet API for Ozeki booking, online training, and training-session workflows.

## 1) Enable APIs in Google Cloud

Use a Google Cloud project connected to your Workspace tenant, then enable:
- Google Calendar API
- Google Meet API

## 2) Configure OAuth consent + client

Create an OAuth 2.0 **Web application** client and add authorized redirect URIs:
- `http://localhost:3000/oauth2callback` (local token generation helper)
- `https://YOUR_DOMAIN/api/auth/google/callback` (portal Google sign-in, if used)

## 3) Required scopes

Grant these scopes during OAuth consent:
- `https://www.googleapis.com/auth/calendar`
- `https://www.googleapis.com/auth/calendar.events`
- `https://www.googleapis.com/auth/meetings.space.readonly`

## 4) Environment variables

Set in `.env.local`:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`
- `GOOGLE_CALENDAR_ID` (use `primary` or a specific calendar ID)
- `GOOGLE_CALENDAR_TIMEZONE` (example: `Africa/Kampala`)
- `GOOGLE_WORKSPACE_OAUTH_REDIRECT_URI` (example: `http://localhost:3000/oauth2callback`)
- `APP_ORIGIN` (example: `http://localhost:3000`)

## 5) Generate refresh token (once)

From project root:

```bash
npm run google:auth:url
```

Open the printed URL, approve consent, then copy the `code` from the redirect URL and exchange it:

```bash
npm run google:auth:exchange -- --code=PASTE_CODE_HERE
```

Use the returned `refreshToken` as `GOOGLE_REFRESH_TOKEN`.

## 6) Verify integration status

Terminal check:

```bash
npm run google:status
```

Portal admin check (requires admin/super-admin session):
- `GET /api/portal/integrations/google/status`

Expected healthy status:
- `configured: true`
- `googleConnected: true`
- `calendarAccessible: true`
- `missingScopes: []`

## 7) What this powers in Ozeki

- Booking form calendar invites + optional Meet links
- Online training event scheduling with Meet links
- Training session meeting creation and downstream artifact sync hooks

