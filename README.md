# Ozeki Reading Bridge Foundation

Next.js 15 platform for public impact reporting and portal operations, running on **PostgreSQL only**.

## Stack
- Next.js App Router (`src/app`)
- PostgreSQL (`pg` client, repository-based server modules)
- Tailwind CSS

## PostgreSQL-Only Rule
- SQLite is disabled in all runtime environments.
- `DATABASE_URL` is required for production.
- Any SQLite runtime path throws a hard policy error.

## Local Setup

### 1) Start PostgreSQL (Docker Compose)
```bash
docker compose up -d postgres
```

Optional full app+db compose:
```bash
docker compose up --build
```

### 2) Configure environment
```bash
cp .env.example .env.local
```

Required minimum:
- `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ozeki`
- `PORTAL_PASSWORD_SALT=...`
- `PORTAL_SESSION_SECRET=...`

### 3) Bootstrap schema
```bash
npm install
npm run postgres:bootstrap
```

### 4) Run app
```bash
npm run dev
```

## Build and Verification
```bash
npm run ci:verify
```

This runs lint, tests, and production build.
- If `DATABASE_URL` is set, it runs the full test suite.
- If `DATABASE_URL` is missing, it runs DB-optional tests only (artifact-safe mode).

For AWS build pipelines (Amplify/App Runner), use:
```bash
npm run build:aws
```

For strict production readiness (env/security gate + full CI checks), use:
```bash
npm run ci:verify:strict
```

## Bulk Imports

### Schools
- Open `/portal/schools/import`.
- Download the official templates from:
  - `/api/import/templates/schools.xlsx`
  - `/api/import/templates/schools.csv`
- Upload the completed file and run preview first.
- The preview shows `CREATE`, `UPDATE`, `SKIP`, and `ERROR` row outcomes before commit.

### Training Participants
- Open `/portal/trainings/import-participants` or launch from a specific training:
  - `/portal/trainings/import-participants?trainingId=<portal_record_id>`
- Download the official templates from:
  - `/api/import/templates/training-participants.xlsx`
  - `/api/import/templates/training-participants.csv`
- Preview always validates against existing PostgreSQL training and school records before commit.

### Missing School Workflow
- If participant preview finds schools that do not yet exist, the preview blocks commit for those rows.
- The preview shows:
  - unique missing school count
  - affected participant row count
  - a `Download Missing Schools Template` action
- Use the generated file to import schools first, then re-run the participant import.
- Missing schools template generation endpoint:
  - `POST /api/import/training-participants/missing-schools-template`

### Manual Participant Entry
- Open `/portal/trainings/participants/new` or use:
  - `/portal/trainings/participants/new?trainingId=<portal_record_id>`
- Manual entry uses the same PostgreSQL participant write service as bulk import.

## Health Check
`GET /api/health` verifies:
- PostgreSQL configured
- Database reachable (`SELECT 1`)
- Active runtime DB reported as `postgres`

## Deployment Notes
- Use `npm run start:standalone` in production.
- Startup includes DB preflight and logs:
  - `DB=postgres host=... port=... database=... ssl=...`
- Keep secrets in deployment environment manager, not in repository files.

## Key Docs
- [Deployment checklist](/Users/omario/Desktop/Notebook%20LM/Ozeki%20reading%20Bridge%20Foundation/docs/deployment-checklist.md)
- [SQLite cutover audit](/Users/omario/Desktop/Notebook%20LM/Ozeki%20reading%20Bridge%20Foundation/docs/sqlite-cutover-audit.md)
- [Intelligence roadmap](/Users/omario/Desktop/Notebook%20LM/Ozeki%20reading%20Bridge%20Foundation/docs/intelligence-platform-roadmap.md)
