# Intelligence Platform Roadmap (NLIP/NLIS)

## Current Baseline (confirmed in code)
- Platform data backbone: PostgreSQL schema migrations in `database/postgres/` and repository layer in `src/lib/server/postgres/repositories/*`.
- Core operational modules live in portal routes under `src/app/portal/*`:
  - Schools, contacts, assessments, visits, trainings, reports, finance, support, national intelligence.
- RBAC foundation exists:
  - `database/postgres/0028_rbac_security.sql`
  - `src/lib/server/postgres/repositories/rbac.ts`
- Existing intelligence surfaces:
  - `src/app/portal/national-intelligence/page.tsx`
  - related API routes under `src/app/api/portal/national-intelligence/*`.
- Reporting/PDF outputs exist across finance, impact, training, and transparency modules.

## Priority Gaps (high impact first)
1. Full SQLite debt retirement in remaining legacy modules.
2. Unified intelligence scoring/insights domain model with explicit tables and services.
3. Evidence lifecycle maturity (storage abstraction + audit trail + verification workflow).
4. Governance UX (targets, recompute controls, audit explorer, role assignment UI).
5. Monitoring/reporting automation hardening (scheduled jobs + idempotent runs + SLA visibility).

## Missing for NLIP-style maturity
- Offline-first sync queue for field workflows.
- Standardized interventions outcomes tracking linked to risk factors.
- District/national role dashboards with shared KPI language and alerts.
- End-to-end governance audit UI (who changed what, before/after, reason codes).
- Integrations layer (EMIS/LMS/data exchange adapters).

## Likely Fragile Areas
- Legacy service functions in mixed modules still carrying SQLite-era assumptions.
- File storage paths that rely on runtime filesystem for generated artifacts.
- Partial duplication between old and new reporting flows.
- Mixed route patterns (legacy direct lib calls vs dedicated postgres repositories).

## Phased Execution Plan
1. Stabilization (now)
- Enforce PostgreSQL-only runtime policy and fail-fast startup checks.
- Remove silent fallback behavior.
- Harden health check for DB connectivity and schema presence.

2. Core Intelligence MVP
- Normalize insights + risk scoring tables and APIs.
- Add deterministic rule execution and recompute endpoints.
- Surface explainable risk factors in school and district views.

3. Intervention + Impact Loop
- Intervention planning + action tracking + baseline/endline outcomes.
- School timeline unifying assessments, visits, trainings, interventions, evidence.

4. Governance + Automation
- Admin control center for targets/recompute/audit exports.
- Scheduled report generation and notification digests.

5. Scale Readiness
- Storage abstraction, export controls, monitoring dashboards, and integration adapters.
