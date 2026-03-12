# API Contracts (Django DRF)

## Auth
- `POST /api/v1/auth/token/`
- `POST /api/v1/auth/token/refresh/`

## Public-safe APIs
- `GET /api/v1/public/impact/summary`
- `GET /api/v1/public/stories`
- `GET /api/v1/public/stories/{slug}`
- `GET /api/v1/public/blog`
- `GET /api/v1/public/blog/{slug}`
- `GET /api/v1/public/reports`
- `GET /api/v1/public/reports/{report_code}`
- `GET /api/v1/public/finance/snapshots`

Public APIs expose aggregate/published information only.

## Staff APIs (JWT required)
- Accounts: `/api/v1/staff/accounts/users/`
- Geography: `/api/v1/staff/geography/{regions|subregions|districts|subcounties|parishes}/`
- Schools: `/api/v1/staff/schools/{schools|contacts|teachers|graduation-workflows}/`
- Learners: `/api/v1/staff/learners/learners/`
- Training: `/api/v1/staff/training/{sessions|participants}/`
- Visits: `/api/v1/staff/visits/{records|participants}/`
- Lesson evaluations: `/api/v1/staff/evaluations/{lessons|items}/`
- Assessments: `/api/v1/staff/assessments/{sessions|results}/`
- Content: `/api/v1/staff/content/{stories|anthologies|blog|newsletter|resources}/`
- Interventions: `/api/v1/staff/interventions/{plans|actions|groups|sessions|graduation-settings}/`
- Finance: `/api/v1/staff/finance/{contacts|invoices|receipts|expenses|ledger|statements|audit-exceptions|public-snapshots}/`
- Reports: `/api/v1/staff/reports/{impact-reports|public-aggregates}/`
- Audit logs: `/api/v1/staff/audit/logs/`

## Role Model
- `staff`, `volunteer`, `supervisor`, `me`, `admin`, `superadmin`, `accountant`.
- Finance endpoints restricted to `accountant|admin|superadmin`.
- User/role admin restricted to admin roles.
