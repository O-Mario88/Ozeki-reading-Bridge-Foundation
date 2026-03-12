# Finance PostgreSQL Migration Plan

## Decision
Finance should be migrated as the next isolated cutover unit after the current staging verification of the public-impact PostgreSQL path.

Do not mix long-term SQLite writes and PostgreSQL writes for finance.
The safe pattern is:
- import finance data into PostgreSQL
- switch finance repository reads/writes together
- move file artifacts off local disk in the same stream or immediately after

## Current Finance Surface in This Repo
### Core implementation
- [src/lib/finance-db.ts](/Users/omario/Desktop/Notebook%20LM/Ozeki%20reading%20Bridge%20Foundation/src/lib/finance-db.ts)
- [src/lib/finance-documents.ts](/Users/omario/Desktop/Notebook%20LM/Ozeki%20reading%20Bridge%20Foundation/src/lib/finance-documents.ts)
- [src/lib/finance-email.ts](/Users/omario/Desktop/Notebook%20LM/Ozeki%20reading%20Bridge%20Foundation/src/lib/finance-email.ts)

### Route surface
Current finance API routes under [src/app/api/portal/finance](/Users/omario/Desktop/Notebook%20LM/Ozeki%20reading%20Bridge%20Foundation/src/app/api/portal/finance):
- contacts
- dashboard
- invoices
- invoice payments
- receipts
- expenses
- ledger
- reconciliation
- statements
- budgets
- settings
- files
- restricted balances
- transparency snapshot/audited uploads/downloads
- audit-center compliance/high-risk/exceptions/receipt-registry/run

### Current SQLite tables and row counts
| Table | Rows |
| --- | ---: |
| `finance_contacts` | 32 |
| `finance_invoices` | 32 |
| `finance_invoice_items` | 32 |
| `finance_receipts` | 30 |
| `finance_payments` | 15 |
| `finance_payment_allocations` | 0 |
| `finance_expenses` | 15 |
| `finance_transactions_ledger` | 45 |
| `finance_statement_lines` | 0 |
| `finance_reconciliation_matches` | 0 |
| `finance_monthly_statements` | 3 |
| `finance_settings` | 1 |
| `finance_email_logs` | 2 |
| `finance_files` | 167 |
| `finance_public_snapshots` | 0 |
| `finance_audit_exceptions` | 15 |
| `finance_txn_risk_scores` | 15 |
| `finance_budgets_monthly` | 0 |
| `finance_audited_statements` | 0 |
| `finance_expense_receipts` | 15 |

## Current Production Risk
Finance is not only relational data.
It still depends on local disk in multiple places.

### Local-disk dependencies that must be removed
- `finance_files.stored_path`
- `finance_invoices.pdf_stored_path`
- `finance_receipts.pdf_stored_path`
- `finance_monthly_statements.pdf_stored_path`
- `finance_public_snapshots.stored_path`
- `finance_audited_statements.stored_path`

Concrete code examples:
- [src/lib/finance-documents.ts](/Users/omario/Desktop/Notebook%20LM/Ozeki%20reading%20Bridge%20Foundation/src/lib/finance-documents.ts) writes PDFs under `data/finance/pdfs/*`
- [src/app/api/portal/finance/transparency/upload/route.ts](/Users/omario/Desktop/Notebook%20LM/Ozeki%20reading%20Bridge%20Foundation/src/app/api/portal/finance/transparency/upload/route.ts) writes PDFs directly to runtime disk
- [src/app/api/portal/finance/transparency/download/route.ts](/Users/omario/Desktop/Notebook%20LM/Ozeki%20reading%20Bridge%20Foundation/src/app/api/portal/finance/transparency/download/route.ts) reads from `data/finance`
- [src/app/api/portal/finance/files/[id]/route.ts](/Users/omario/Desktop/Notebook%20LM/Ozeki%20reading%20Bridge%20Foundation/src/app/api/portal/finance/files/[id]/route.ts) serves files through `loadFinanceFileForDownload(...)`

Conclusion:
- PostgreSQL cutover alone is not enough for finance production stability
- finance relational migration and finance object storage migration must be planned together

## Target Finance Architecture
### Relational store
Add PostgreSQL schema for:
- `finance_contacts`
- `finance_invoices`
- `finance_invoice_items`
- `finance_receipts`
- `finance_payments`
- `finance_payment_allocations`
- `finance_expenses`
- `finance_transactions_ledger`
- `finance_statement_lines`
- `finance_reconciliation_matches`
- `finance_monthly_statements`
- `finance_settings`
- `finance_email_logs`
- `finance_files`
- `finance_public_snapshots`
- `finance_audit_exceptions`
- `finance_txn_risk_scores`
- `finance_budgets_monthly`
- `finance_audited_statements`
- `finance_expense_receipts`

### Object storage
Move finance documents and uploaded evidence to S3-compatible storage:
- invoices PDF
- receipts PDF
- statements PDF
- transparency snapshot PDF
- audited statements PDF
- expense receipt files

Recommended object key shape:
- `finance/invoices/<invoice-number>.pdf`
- `finance/receipts/<receipt-number>.pdf`
- `finance/statements/<period-type>/<month>-<currency>.pdf`
- `finance/transparency/snapshots/<fy>-<quarter-or-annual>.pdf`
- `finance/transparency/audited/<fy>/<uuid>.pdf`
- `finance/expenses/<expense-number>/<sha256>-<original-name>`

## Implementation Plan
### Step 1: Add PostgreSQL finance schema
Add a new migration file:
- `database/postgres/0003_finance.sql`

Rules:
- preserve business keys exactly: `invoice_number`, `receipt_number`, `expense_number`
- use foreign keys for invoice/contact/payment/ledger relationships
- keep current enum constraints compatible with existing route behavior
- carry `pdf_file_id` and file metadata references, but stop treating local path as authoritative

### Step 2: Add PostgreSQL finance repository layer
Add:
- `src/lib/server/postgres/repositories/finance.ts`

First repository surface should cover the highest-volume functions from [src/lib/finance-db.ts](/Users/omario/Desktop/Notebook%20LM/Ozeki%20reading%20Bridge%20Foundation/src/lib/finance-db.ts):
- list/create/update invoices
- list/create/update receipts
- list/create/post/void payments
- list/create/submit/post/void expenses
- ledger reads
- statement generation reads/writes
- finance settings
- audit exception reads/writes
- email logs
- file metadata

### Step 3: Add import script
Add:
- `scripts/postgres-import-finance.ts`

Import order should be:
1. `finance_contacts`
2. `finance_settings`
3. `finance_invoices`
4. `finance_invoice_items`
5. `finance_receipts`
6. `finance_payments`
7. `finance_payment_allocations`
8. `finance_expenses`
9. `finance_transactions_ledger`
10. `finance_files`
11. `finance_expense_receipts`
12. `finance_statement_lines`
13. `finance_reconciliation_matches`
14. `finance_monthly_statements`
15. `finance_email_logs`
16. `finance_public_snapshots`
17. `finance_audit_exceptions`
18. `finance_txn_risk_scores`
19. `finance_budgets_monthly`
20. `finance_audited_statements`

Use table truncation plus identity reset only in staging/import flows, never in request-time code.

### Step 4: Switch finance-db exports to repository delegation
Keep [src/lib/finance-db.ts](/Users/omario/Desktop/Notebook%20LM/Ozeki%20reading%20Bridge%20Foundation/src/lib/finance-db.ts) as the public call surface at first.
Internally:
- if `DATABASE_URL` is set, delegate to PostgreSQL finance repository
- otherwise keep SQLite fallback temporarily

This mirrors the migration pattern already used for auth, school directory, impact summary, and public impact aggregates.

### Step 5: Separate files from records
Add object-storage abstraction for finance files.
Suggested modules:
- `src/lib/server/storage/finance.ts`
- `src/lib/server/storage/s3.ts`

Required behavior:
- relational tables store object key + metadata
- download routes issue signed access or stream from object storage
- no path assumptions like `path.resolve('data/finance')` in production code

## Data Mapping Notes
### Invoices
Preserve exactly:
- `invoice_number`
- `status`
- `issue_date`
- `due_date`
- `subtotal`, `tax`, `total`, `paid_amount`, `balance_due`
- `contact_id`
- `pdf_file_id`
- `emailed_at`, `last_sent_to`

### Receipts
Preserve exactly:
- `receipt_number`
- `related_invoice_id`
- `payment_method`
- `amount_received`
- `received_from`
- `status`
- `pdf_file_id`

### Expenses
Preserve exactly:
- approval workflow fields
- mismatch override fields
- restricted funds fields
- creator/submitted/posting user IDs

### Ledger
Preserve exactly:
- `txn_type`
- `category`
- `display_category`
- `subcategory`
- `source_type`
- `source_id`
- `posted_status`
- `evidence_file_ids_json`

### Files
Relational migration must keep:
- `id`
- `source_type`
- `source_id`
- `file_name`
- `mime_type`
- `size_bytes`
- uploader + timestamp

But replace:
- `stored_path` -> `object_key`

If keeping compatibility during transition, store both temporarily and mark `stored_path` deprecated.

## Verification Plan for Finance Cutover
After finance PostgreSQL import, these flows must pass end to end:

### Invoice flow
1. create invoice
2. edit draft invoice
3. send invoice email
4. download/open invoice PDF
5. void draft or void sent invoice

### Receipt flow
1. create receipt
2. issue receipt
3. send receipt email
4. download/open receipt PDF
5. void receipt

### Payment flow
1. add payment to invoice
2. verify invoice `paid_amount` and `balance_due`
3. verify ledger row exists
4. void payment and verify reversal behavior

### Expense flow
1. create expense with receipt files
2. submit expense
3. post expense
4. verify ledger row and evidence metadata
5. verify mismatch/audit rules still fire

### Statement flow
1. generate monthly statement
2. download/open generated PDFs
3. verify totals reconcile to ledger

### Transparency flow
1. generate public finance snapshot
2. publish snapshot
3. upload audited statement PDF
4. download audited statement from admin route

### Audit flow
1. run finance audit sweep
2. verify exception rows are written
3. verify high-risk and compliance endpoints still read correctly

## Acceptance Criteria
Finance PostgreSQL cutover is complete only when all are true:
- relational finance data imports with matching row counts
- invoice, receipt, payment, expense, ledger, statement, and audit routes all work with `DATABASE_URL`
- finance email logs still record accurate send/fail/skipped states
- PDF generation still works
- file downloads no longer depend on local runtime disk in production

## Recommended Next Repo Changes
1. add `database/postgres/0003_finance.sql`
2. add `scripts/postgres-import-finance.ts`
3. add `src/lib/server/postgres/repositories/finance.ts`
4. add storage abstraction for finance files
5. switch finance routes through repository-backed `src/lib/finance-db.ts`
