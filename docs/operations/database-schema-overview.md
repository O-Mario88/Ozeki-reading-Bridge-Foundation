# Database Schema Overview

The platform's PostgreSQL database has ~240 tables across 82 migration
files in [database/postgres/](../../database/postgres/). This document
maps the tables to product features so you don't have to read every
migration to find what you need.

## How migrations are applied

The schema is bootstrap-on-deploy: every `database/postgres/*.sql` file
runs in lex order on every deploy via
`POST /api/migrate/bootstrap`. All migrations are idempotent (CREATE IF
NOT EXISTS, ALTER IF NOT EXISTS, ON CONFLICT DO NOTHING) so repeated
runs are no-ops. To re-run after a restore:

```bash
curl -X POST -H "Authorization: Bearer $MIGRATE_TOKEN" \
  https://<your-domain>/api/migrate/bootstrap
```

To list current tables and row counts:

```bash
curl -H "Authorization: Bearer $MIGRATE_TOKEN" \
  https://<your-domain>/api/admin/db-info | jq .
```

## Tables grouped by feature

### Authentication & users

| Table | What it stores |
|---|---|
| `portal_users` | Staff accounts. Includes role flags, password hash, MFA secret, status. |
| `portal_sessions` | Active session tokens (server-side fallback). |
| `mfa_login_attempts` | Rate-limit & audit table for failed login + MFA challenges. |
| `audit_invite_tokens` | One-time tokens for invited users to set their first password. |
| `external_users`, `external_user_sessions`, `external_user_magic_links` | Donor/government/government-officer portal logins. |

Migrations: 0028, 0031, 0037, 0039a, 0044, 0065.

### Schools, contacts, CRM

| Table | What it stores |
|---|---|
| `schools_directory` | Master list of partner schools. |
| `school_classes` | Per-school class roster (P1 stream A, etc.). |
| `school_contact_roles` | Headteacher / coach / inspector roles per school. |
| `school_engagements` | Visit log: every coaching visit, training, observation. |
| `crm_accounts`, `crm_contacts`, `crm_interactions`, `crm_tasks`, `crm_affiliations` | Donor / partner CRM. |
| `contacts` | Lightweight public contact-form submissions. |

Migrations: 0001, 0007, 0020, 0021, 0025, 0036, 0040, 0060, 0071, 0074.

### Assessments & learning outcomes

| Table | What it stores |
|---|---|
| `assessment_records` | One row per learner-assessment event (the canonical fact table). |
| `assessment_sessions`, `assessment_session_results` | Per-session aggregate (multiple learners assessed in one visit). |
| `assessment_schedule_windows` | When each cohort gets assessed. |
| `assessment_item_responses` | Per-question responses for itemised assessments. |
| `assessment_benchmark_settings`, `benchmark_profiles`, `benchmark_rules`, `assessment_model_settings` | Benchmark thresholds and the rules engine that decides who's at-risk. |

Migrations: 0001, 0009, 0013, 0052a, 0072.

### Coaching visits & lesson observations

| Table | What it stores |
|---|---|
| `coaching_visits` | Visit metadata + coach/observer + summary. |
| `lesson_evaluations`, `lesson_evaluation_items` | Lesson-observation rubric scores. |
| `observation_rubrics` | The rubric definitions (per-domain criteria). |

Migrations: 0001, 0049, 0058a.

### Trainings (online + in-person)

| Table | What it stores |
|---|---|
| `online_training_sessions` | Live or scheduled online training sessions. |
| `online_training_participants`, `online_training_resources`, `online_training_artifacts`, `online_training_notes` | Per-session attendees + materials. |
| `portal_training_attendance` | In-person training attendance. |
| `training_certificates` (issued via cron) | Digital certificates with signed PDF URLs. |

Migrations: 0004, 0006, 0023, 0038, 0048, 0050, 0051a, 0051b.

### Reading interventions

| Table | What it stores |
|---|---|
| `intervention_plans` | Top-of-funnel: one row per intervention. |
| `intervention_plan_actions` | Action items inside a plan. |
| `intervention_evidence` | Photos/PDFs uploaded as evidence of completion. |
| `intervention_activity` | Append-only activity log per plan. |

Migrations: 0061.

### Stories & content

| Table | What it stores |
|---|---|
| `story_library`, `story_anthologies`, `story_activities` | Reader-facing library + ratings + activities. |
| `recorded_lessons` | Vimeo/YouTube-hosted lesson recordings (telemetry, quizzes, ratings). |
| `blog_post_comments`, `blog_post_likes`, `blog_post_views` | Public blog engagement. |

Migrations: 0005, 0034, 0046, 0047.

### Finance

| Table | What it stores |
|---|---|
| `finance_invoices`, `finance_invoice_items` | Invoices to clients/funders. |
| `finance_receipts`, `finance_payments` | Money received. |
| `finance_assets`, `finance_settings`, `finance_files`, `finance_contacts` | Supporting tables. |
| `finance_approvals`, `finance_approval_workflows`, `finance_approval_logs`, `finance_approval_thresholds` | Multi-step approval workflow for expense + payment authorisation. |
| `finance_audit_chain`, `finance_audit_checkpoints`, `finance_audit_trail`, `finance_audit_exceptions` | Tamper-evident audit log (hash chain verified by the `verify-audit-chain` cron). |
| `cost_entries`, `cost_peer_benchmarks` | Cost-per-learner benchmarking. |
| `currency_rates` | FX rates for multi-currency invoices. |

Migrations: 0003, 0024, 0043, 0057, 0058b, 0059, 0073.

### Donations & sponsorships (Pesapal)

| Table | What it stores |
|---|---|
| `donations` | One row per donation transaction (created from runtime endpoint, see caveat below). |
| `sponsorships` | Active recurring sponsorships. |
| `donation_receipts` | Issued tax receipts. |
| `donor_recurring_subscriptions` | Pesapal recurring billing tokens. |
| `donor_allocations`, `donor_impact_snapshots` | Donor-portal aggregates. |
| `sponsorship_school_allocations` | Many-to-many between sponsorships and schools. |

⚠️ **Caveat:** `donations` and `sponsorships` are created by the legacy
runtime endpoint `/api/migrate/sponsorships`, not by a `database/postgres/*.sql`
file. Repos expect ~25 columns; the runtime endpoint creates ~10. Production
has been running with manually-applied ALTERs. Tier-2 work item: write a
canonical migration. Reference [project memory →
project_railway_deploy.md].

Migrations: 0054b, 0066.

### Reporting, KPIs, public dashboards

| Table | What it stores |
|---|---|
| `kpi_snapshots`, `district_kpi_snapshot` | Pre-aggregated KPI tables refreshed by `refresh-kpis` cron. |
| `activity_insights`, `activity_recommendations` | The "what should I do today" feed on the Reading Command Center. |
| `district_intervention_schedule`, `district_officer_assignments` | Government district-portal data. |
| `edu_audit_exceptions`, `edu_data_quality_summary`, `edu_priority_queue_assignments` | Data-quality exceptions surfaced in the priority queue. |

Migrations: 0011, 0032, 0053a, 0067.

### Audit, compliance, security

| Table | What it stores |
|---|---|
| `audit_logs` | Append-only operations log (who did what, when). |
| `consent_records` | GDPR-style consent tracking. |
| `automation_logs` | Cron + scheduled-task audit trail. |
| `idempotency_keys` | Pesapal IPN replay protection (cleaned by `clean-idempotency`). |
| `api_keys`, `api_key_usage_logs` | External API access. |
| `fact_check_attestations` | Public-impact transparency claims. |

Migrations: 0028, 0044, 0055a, 0063.

### EMIS integration (opt-in)

| Table | What it stores |
|---|---|
| `emis_config` | Singleton row with sync settings. |
| `emis_school_links` | Ozeki-school-id → EMIS-school-code mapping. |
| `emis_sync_runs` | One row per pull/push run, with status + counts. |

Disabled unless `EMIS_ENABLED=true`. Migration: 0070.

### Other (research, downloads, IATI, etc.)

| Table | What it stores |
|---|---|
| `download_leads` | Marketing: who downloaded what brochure. |
| `bookings`, `concept_note_requests`, `cluster_service_requests` | Public service-request inflow. |
| `evidence_photos` | Photo evidence linked to interventions/visits. |

Migrations: 0042, 0062, 0068, 0069.

## Quick "where does X live?" lookup

| You're looking for | Table |
|---|---|
| Login credentials | `portal_users` |
| Who logged in when | `audit_logs` (filter by action='LOGIN_SUCCESS') |
| Schools list | `schools_directory` |
| Reading test results | `assessment_records` |
| Visit log | `coaching_visits` + `school_engagements` |
| Donations | `donations` (created by runtime endpoint) |
| Money paid out | `finance_payments` |
| Training certificates | `training_certificates` |
| What the home dashboard shows | `kpi_snapshots` (refreshed by cron every 3h) |

## Inspecting the live database

Easiest: hit the diagnostic endpoint:

```bash
curl -H "Authorization: Bearer $MIGRATE_TOKEN" \
  https://<your-domain>/api/admin/db-info | jq .
```

Returns the public-schema table list + row counts on canary tables.

For ad-hoc queries, use Railway → Postgres service → Query tab, or
connect from `psql` using the `DATABASE_PUBLIC_URL` (see
[backup-and-restore.md](./backup-and-restore.md) for the connection
string).

## See also

- [backup-and-restore.md](./backup-and-restore.md) — backups, restores, dumps
- [system-architecture.md](./system-architecture.md) — the bigger picture
- Actual migration files: [database/postgres/](../../database/postgres/)
