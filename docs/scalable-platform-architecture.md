# Scalable Platform Architecture

This document defines the recommended production architecture for the Ozeki Reading Bridge Foundation platform as it grows from a single-instance app into a multi-tenant data and delivery system.

## 1) Recommended Stack

### Frontend
- Next.js (App Router) for SEO, performance, and PWA support in low-bandwidth contexts.
- Tailwind + component library for consistent UI system.
- Internationalization-ready structure (English now, local languages later).

### Backend
- Supabase Postgres as the primary database.
- Supabase Auth for portal identity and role mapping.
- Row-Level Security (RLS) for tenant-safe data access.
- Supabase Storage for resources, evidence media, and anthology files.
- Supabase Edge Functions for scheduled and integration endpoints.
- `pgvector` for semantic retrieval ("Ask Ozeki").

### Analytics
- Metabase for internal and partner-facing operational dashboards.
- PostHog for web and product analytics (booking funnels, downloads, retention).

### Automations
- Scheduled jobs (Supabase cron / external scheduler) for:
  - monthly partner reports
  - coaching reminders
  - data quality checks
  - publishing workflows

## 2) Core Product Modules

- School and Program Management (district -> school -> class hierarchy, cycle planning, staff assignments)
- Training Management (events, attendance, pre/post checks, outputs)
- Coaching and Observation (digital rubrics, action plans, follow-up tracking)
- Learner Assessment and Progress (baseline/progress/endline, fluency + comprehension)
- Remedial Intervention Tracker (grouping, weekly logs, exit criteria)
- Resource Library (tagged uploads, preview + download, usage analytics)
- Booking and Appointments (services, location + dates, assignment workflow)
- Blog and Content Hub (SEO publishing and internal linking)

## 3) AI Features (Practical and Controlled)

- Ask Ozeki (RAG over approved documents with source-grounded responses)
- Smart Resource Recommender (grade/gap -> recommended packs + 7-day micro plan)
- Coaching Copilot (coach-reviewed guidance, never auto-published)
- Automated Partner Reports (coverage, quality, outcomes)
- Early Warning Scores (stalled progress and low implementation risk flags)

## 4) Security and Data Governance

- Learner records use anonymous learner IDs (no full names in analytics exports).
- Strict role-based access enforced through RLS.
- Audit logging for sensitive writes.
- Minimized PII and encrypted storage paths for evidence files.
- Public impact pages use aggregated indicators only.

## 5) SEO and Discoverability

- Program pillar pages and district landing pages.
- Resource pages indexable with structured metadata.
- Blog taxonomy with internal linking to resources and booking flows.
- Structured data (Organization, Article, FAQ, Breadcrumb).
- Mobile-first, fast page delivery, clean URL strategy.

## 6) Delivery Sequence

1. Supabase schema + auth + roles + RLS
2. Training and coaching modules
3. Assessments and intervention grouping
4. Resource library and download tracking
5. Metabase dashboards and partner reporting
6. Ask Ozeki and report generation AI
7. Booking automations and route optimization

## 7) Implementation Assets in This Repo

- Supabase schema scaffold:
  - `supabase/migrations/20260215_000001_core_platform.sql`
- Environment scaffolding:
  - `.env.example`
