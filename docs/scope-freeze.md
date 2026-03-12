# Scope Freeze for Rebuild

## Must-Have for Launch (Implemented)
- Public website pages:
  - Home
  - Impact summary
  - Stories list/detail
  - Blog list/detail
  - Partner data room
- Staff portal:
  - Authentication (JWT)
  - Schools and contacts
  - Trainings and participants
  - Visits and lesson evaluations
  - Assessment sessions and results
  - Finance (contacts, invoices, receipts, expenses, ledger, statements)
  - Reports and public aggregates
- Backend governance:
  - Role-based API permissions
  - Public-safe API layer separate from staff API layer
  - Audit logging middleware
- Data migration:
  - SQLite backup and deterministic migration script to PostgreSQL models

## Phase 2
- Advanced national intelligence automation dashboards.
- AI narrative generation in report flow.
- Expanded workflow-specific moderation and support tooling.
- Deep analytics visualizations and map interactions.

## Archived from Launch Path
- Runtime SQLite mutation logic.
- Legacy Next API backend handlers as source of truth.
- Duplicate/stale schema pathways and dead route experiments.
