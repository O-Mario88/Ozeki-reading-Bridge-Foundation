# Ozeki Reading Bridge Foundation - Production Rebuild

Production architecture rebuilt into:
- `frontend/`: Next.js (public site + staff portal UI)
- `backend/`: Django + Django REST Framework
- PostgreSQL-only data layer

## Why This Rebuild
The previous stack mixed frontend rendering, backend logic, and SQLite schema mutation in one runtime. This rebuild separates concerns, enforces API permissions, and hardens deployment for AWS.

## Repository Layout
- `frontend/` Next.js app consuming Django APIs
- `backend/` Django project with modular domain apps
- `data/` legacy SQLite backups for migration input only
- `docs/` audit, scope freeze, API contracts, migration map, deployment notes

## Setup (Local)

### 1) Start PostgreSQL
Use your local Postgres or Docker Compose (below).

### 2) Backend
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env
# set DATABASE_URL and secrets
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver 0.0.0.0:8000
```

### 3) Frontend
```bash
cd frontend
npm install
cp ../.env.example .env.local
# ensure NEXT_PUBLIC_API_BASE_URL points to backend
npm run dev
```

## SQLite -> PostgreSQL Migration
1. Backup legacy SQLite:
```bash
cd backend
./scripts/backup_sqlite.sh ../data/app.db ../data/backups
```
2. Run migration script:
```bash
python scripts/migrate_sqlite_to_postgres.py
```

## AWS Deployment Targets
- Frontend: AWS Amplify SSR (`frontend/amplify.yml`)
- Backend: AWS Elastic Beanstalk/App Runner style Python runtime (`backend/Procfile`, `backend/apprunner.yaml`)
- Database: Amazon RDS PostgreSQL (`DATABASE_URL`)

## Production Configuration Checklist
- `DJANGO_SECRET_KEY`, `DATABASE_URL`, `DJANGO_ALLOWED_HOSTS`
- `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS`
- S3 media/static variables if using bucket storage
- `NEXT_PUBLIC_API_BASE_URL` on frontend

## Documentation
- Audit: `docs/2026-03-12-platform-audit.md`
- Scope freeze: `docs/scope-freeze.md`
- API contracts: `docs/api-contracts.md`
- Migration map: `docs/data-migration-map.md`
- Rebuild summary: `docs/rebuild-summary.md`
