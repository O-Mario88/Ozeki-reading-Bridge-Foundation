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

For AWS build pipelines (Amplify/App Runner), use:
```bash
npm run build:aws
```

For strict production readiness (env/security gate + full CI checks), use:
```bash
npm run ci:verify:strict
```

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
