# Rebuild Summary

## Major Audit Findings
- Legacy architecture mixed frontend/backend/data concerns in one Next.js runtime.
- SQLite runtime mutation and monolithic route sprawl were primary production risks.

## What Was Preserved
- Core product domains and workflows:
  schools, contacts, learners, trainings, visits, lesson evaluations, assessments,
  stories/blog, finance, reports, and audit trail concepts.
- Existing media assets retained for frontend continuity.
- SQLite source database retained only as migration input and backup artifact.

## What Was Removed
- Next.js API backend as source-of-truth.
- Production dependency on SQLite and `better-sqlite3`.
- Legacy duplicated route/module paths and stale deployment assumptions.

## Django Rebuild
- Modular apps implemented:
  `accounts`, `geography`, `schools`, `learners`, `training`, `visits`,
  `evaluations`, `assessments`, `content`, `interventions`, `finance`, `reports`, `auditlog`.
- DRF APIs split into public-safe and staff-protected layers.
- JWT auth and role-based API permissions added.

## SQLite -> PostgreSQL Migration
- Deterministic migration script created:
  `backend/scripts/migrate_sqlite_to_postgres.py`.
- Backup utility added:
  `backend/scripts/backup_sqlite.sh`.
- Legacy ID preservation included for traceability.

## AWS Deployment Structure
- Frontend (`frontend/`) prepared for Amplify SSR build.
- Backend (`backend/`) prepared for Python runtime deployment (EB/App Runner style).
- PostgreSQL-only runtime via `DATABASE_URL` (RDS target).
- S3-ready media/static strategy via environment configuration.

## Verification Steps Completed
- Backend lint/check + migrations generation + test smoke (see root README runbook).
- Frontend build and lint in new app.
- API connectivity validated through frontend contracts and endpoint wiring.

## Remaining Risks / Follow-up
- Phase 2 advanced analytics and AI/report automation flows are deferred.
- Production rollout requires staging validation for CORS/cookie/domain behavior.
- Final migration dry-run on staging data is required before cutover.
