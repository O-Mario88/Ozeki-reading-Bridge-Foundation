# PDF Branding Architecture

## Objective
Enforce consistent Ozeki branding across generated PDFs with one shared pipeline and one organization metadata source.

## Shared Components
- Branding metadata source:
  - PostgreSQL table `organization_profile` (migration `database/postgres/0033_organization_profile.sql`)
  - Repository: `src/lib/server/postgres/repositories/organization-profile.ts`
- Shared branding builders:
  - `src/lib/pdf-branding.ts` (pdf-lib drawing helpers)
  - `src/lib/browser-pdf-branding.ts` (HTML/Puppeteer branding payload)
- Shared render service:
  - `src/lib/server/pdf/render.ts`
  - Entry: `renderBrandedPdf(...) -> Buffer`

## Admin Management
- API:
  - `GET /api/portal/admin/organization-profile`
  - `PUT /api/portal/admin/organization-profile`
- UI:
  - `/portal/admin/settings`
  - component `OrganizationProfileManager`

## Verification Paths
- Runtime sample endpoint:
  - `/api/portal/admin/pdf-branding-sample`
- Local dev sample script:
  - `npm run generate:pdf-sample`
  - output: `data/qa/pdf-branding-sample.pdf`

## Current Coverage
- Routed to shared render service:
  - `src/app/api/newsletter/[slug]/pdf/route.ts`
  - `src/app/api/pdf-engine/route.ts`
  - `src/lib/server/pdf/financial-report-puppeteer.ts`
- Existing pdf-lib generators now consume org metadata through updated `src/lib/pdf-branding.ts`.

## Remaining Follow-up
- Route remaining direct PDF generation endpoints through `renderBrandedPdf` where applicable.
- Add CI check to reject new direct PDF generation paths that bypass shared branding utilities.
