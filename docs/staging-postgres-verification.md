# Staging PostgreSQL Verification Checklist

## Purpose
Use this checklist to verify the current `main` branch against a real staging PostgreSQL database before any wider production cutover.

This checklist is for the parts of the app that already support PostgreSQL on `main`:
- portal auth/session paths
- school directory reads
- impact summary
- public impact aggregate and report-engine reads

This checklist does **not** mean the whole app is PostgreSQL-complete yet.
Finance and file/media persistence still have separate migration work.

## Preconditions
- A staging PostgreSQL database is provisioned and reachable.
- `DATABASE_URL` is set for the shell or staging host.
- The local SQLite source database is available at `data/app.db` unless `SQLITE_DB_PATH` is overridden.
- No production environment is pointed at the staging database.

## Required Environment
Minimum env for this stage:

```bash
export DATABASE_URL='postgres://USER:PASSWORD@HOST:5432/DBNAME'
```

Optional but useful:

```bash
export DATABASE_SSL=true
export SQLITE_DB_PATH='/absolute/path/to/data/app.db'
```

## Bootstrap and Import
Apply PostgreSQL schema files in order:

```bash
npm run postgres:bootstrap
```

Import the current foundation + public-impact source tables from SQLite:

```bash
npm run postgres:import:foundation
```

Automated verification for the imported foundation/public-impact scope:

```bash
npx tsx scripts/postgres-verify-staging.ts --scope=foundation
```

## Import Integrity Checks
Run these checks directly in PostgreSQL after import.

### Core cutover tables
Expected current SQLite counts on this repo:

| Table | Expected rows |
| --- | ---: |
| `portal_users` | 6 |
| `portal_sessions` | 4 |
| `audit_logs` | 322 |
| `schools_directory` | 42 |
| `school_contacts` | 65 |
| `teacher_roster` | 23 |
| `learner_roster` | 20 |
| `assessment_sessions` | 18 |
| `assessment_records` | 19 |
| `portal_records` | verify by import count |
| `portal_training_attendance` | 19 |
| `lesson_evaluations` | 1 |
| `lesson_evaluation_items` | 21 |
| `teaching_improvement_settings` | 1 |

Suggested SQL:

```sql
SELECT 'portal_users' AS table_name, COUNT(*) FROM portal_users
UNION ALL SELECT 'portal_sessions', COUNT(*) FROM portal_sessions
UNION ALL SELECT 'audit_logs', COUNT(*) FROM audit_logs
UNION ALL SELECT 'schools_directory', COUNT(*) FROM schools_directory
UNION ALL SELECT 'school_contacts', COUNT(*) FROM school_contacts
UNION ALL SELECT 'teacher_roster', COUNT(*) FROM teacher_roster
UNION ALL SELECT 'learner_roster', COUNT(*) FROM learner_roster
UNION ALL SELECT 'assessment_sessions', COUNT(*) FROM assessment_sessions
UNION ALL SELECT 'assessment_records', COUNT(*) FROM assessment_records
UNION ALL SELECT 'portal_training_attendance', COUNT(*) FROM portal_training_attendance
UNION ALL SELECT 'lesson_evaluations', COUNT(*) FROM lesson_evaluations
UNION ALL SELECT 'lesson_evaluation_items', COUNT(*) FROM lesson_evaluation_items
UNION ALL SELECT 'teaching_improvement_settings', COUNT(*) FROM teaching_improvement_settings;
```

### Public-impact views
Confirm the PostgreSQL views exist and return rows:

```sql
SELECT COUNT(*) FROM impact_public_school_scope;
SELECT COUNT(*) FROM impact_public_teacher_support;
SELECT COUNT(*) FROM teaching_quality_by_school_period;
SELECT COUNT(*) FROM story_participation_by_school_period;
SELECT COUNT(*) FROM teaching_learning_alignment_by_school_period;
```

Minimum expectation:
- `impact_public_school_scope` must return the imported schools
- `impact_public_teacher_support` should be non-zero if teacher support data exists
- `teaching_quality_by_school_period` should be non-zero if lesson evaluations exist

## Application Verification
Start the app with PostgreSQL enabled:

```bash
npm run test:privacy
npm run test:school-first
npm run dev
```

If using production-like runtime locally:

```bash
npm run build
npm start
```

Do not treat the build as a blocker for this checklist if the pre-existing local build stall reproduces independently of PostgreSQL.
Record that separately.

## Route Smoke Tests
Assume local app base URL is `http://localhost:3000`.

### Public impact routes
```bash
curl -s 'http://localhost:3000/api/impact' | jq
curl -s 'http://localhost:3000/api/impact/country?period=FY' | jq '.kpis'
curl -s 'http://localhost:3000/api/impact/region/Central?period=FY' | jq '.scope'
curl -s 'http://localhost:3000/api/impact/subregion/Central?period=FY' | jq '.scope'
curl -s 'http://localhost:3000/api/impact/district/Kampala?period=FY' | jq '.scope'
```

Pass criteria:
- `200` responses
- payload contains `scope`, `kpis`, `outcomes`, `meta`
- payload is not structurally broken when `DATABASE_URL` is set
- restricted keys are still absent from the public payload

### Public report engine
```bash
curl -s 'http://localhost:3000/api/impact/report-engine?scopeLevel=country&scopeId=Uganda&period=FY&format=json' | jq '.report.summary'
```

Pass criteria:
- `200` response
- report JSON renders from PostgreSQL-backed aggregate data

### Pages that now await the PostgreSQL-backed aggregate
Open in browser:
- `/methodology`
- `/districts/Kampala`
- `/regions/Central`
- `/sub-regions/Central`
- `/schools/<valid-school-id-or-school-uid>`

Pass criteria:
- page renders successfully
- no server crash from awaiting the aggregate path
- teacher evaluation cards and reading blocks still render when data exists

## Auth and Staff Checks
These paths were already adapted earlier and should be rechecked with PostgreSQL enabled.

### Login
- Sign in through `/portal/login`
- confirm dashboard access survives navigation

### School directory read path
Open:
- `/portal/schools`
- `/portal/assessments`
- `/portal/trainings`
- `/portal/visits`

Pass criteria:
- pages load without redirect loops
- school lists are populated from PostgreSQL path when `DATABASE_URL` is set

## Test Commands
Minimum targeted test set for this stage:

```bash
npm run test:privacy
npm run test:school-first
```

Targeted aggregate tests:

```bash
npx tsx --test src/tests/public-impact-privacy.test.ts src/tests/decision-engine-sprint.test.ts
```

## Known Exclusions at This Stage
These are **not** part of this staging sign-off yet:
- finance routes in `src/app/api/portal/finance/*`
- finance writes in `src/lib/finance-db.ts`
- local-disk file persistence under `data/finance`, `data/about`, `data/blog`, and similar directories
- transparency PDF upload/download persistence
- full report artifact storage cutover

## No-Go Conditions
Do **not** proceed to broader deploy work if any of these happen:
- import row counts diverge unexpectedly from SQLite source
- public impact routes return 500s with `DATABASE_URL` set
- portal login works but navigation drops session again under PostgreSQL
- public payloads expose restricted fields
- PostgreSQL views fail to build or return incompatible field names

## Exit Criteria for This Stage
This stage is complete only when all of the following are true:
- schema bootstrap succeeds
- import succeeds
- row counts match expected source counts for adapted tables
- public impact routes render from PostgreSQL-backed data path
- targeted tests pass with `DATABASE_URL` set
- staff auth and school-directory pages remain functional

## Next Step After This Checklist
After this staging sign-off, the next migration unit should be finance:
- add PostgreSQL finance schema
- import finance relational tables
- separate finance file/object storage from local disk paths
- switch `src/lib/finance-db.ts` exported functions to PostgreSQL repositories
