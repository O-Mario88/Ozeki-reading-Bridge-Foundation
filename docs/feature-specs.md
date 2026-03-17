# Feature Specs (Short)

## 1) PostgreSQL-only Runtime Guardrail
- Production requires `DATABASE_URL`.
- Any SQLite code path invocation throws a policy error.
- Non-production follows the same hard-disable policy (SQLite unavailable).

## 2) Health and Startup Safety
- `/api/health` reports:
  - PostgreSQL configured state
  - connectivity check (`SELECT 1`)
  - schema readiness probe (`portal_users`, `schools_directory`, `impact_reports`)
  - active DB runtime metadata (host/port/database/ssl, no secrets)
- Startup preflight in standalone runtime verifies PostgreSQL reachability before app boot.

## 3) PDF Branding System (Shared)
- Shared renderer: `src/lib/server/pdf/render.ts`.
- Shared branding loader: `src/lib/server/pdf/branding.ts` + `src/lib/browser-pdf-branding.ts`.
- Organization metadata source: PostgreSQL `organization_profile` table (migration `0033_organization_profile.sql`).
- Header metadata block rendered from active profile.
- Watermark and footer applied consistently across branded HTML->PDF outputs.

## 4) Admin Branding Management
- API: `GET/PUT /api/portal/admin/organization-profile`
- UI: `src/app/portal/admin/settings/page.tsx`
- Manager component: `src/components/portal/admin/OrganizationProfileManager.tsx`
- Sample verification endpoint: `/api/portal/admin/pdf-branding-sample`

## 5) UI/App Shell Upgrade (Low Rewrite)
- Updated `PortalShell` with:
  - left sidebar module navigation
  - top bar search
  - quick-create menu
  - notifications/profile actions
- Global typography switched to Roboto via `next/font/google`.
