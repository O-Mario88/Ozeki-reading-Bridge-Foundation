# Ozeki Financial Management System (V2)

A production-ready, double-entry financial management system built for nonprofits, focused on fund accounting, budgeting, and mandatory record linkage.

## Tech Stack
- **Database**: PostgreSQL (Migrations in `database/postgres/0003_finance.sql` & `0024_finance_v2_core.sql`)
- **Backend**: Next.js 15 App Router (Server Actions & Repositories)
- **Accounting**: Custom double-entry engine for balanced journal entries
- **PDF Generation**: `pdf-lib` for receipts and financial reports
- **Branding**: Integrated with Ozeki Reading Bridge Foundation identity

## Core Features
1. **Fund Accounting**: Track Restricted, Unrestricted, and Designated funds.
2. **Chart of Accounts**: Standardized nonprofit COA with Assets, Liabilities, Equity, Income, and Expenses.
3. **Grant Management**: Link grantor contacts to funds and track utilization.
4. **Mandatory Linkage**: Every donation and expense must link to a fund, program/project, and its corresponding GL journal entry.
5. **PDF Reporting**: Server-side generation of Donor Receipts, Trial Balance, and Balance Sheet.

## Setup & Running Locally

### 1. Environment Config
Ensure your `.env.local` contains a valid `DATABASE_URL` for PostgreSQL:
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/ozeki
PORTAL_PASSWORD_SALT=your-salt
PORTAL_SESSION_SECRET=your-secret
```

### 2. Apply Migrations
Run the bootstrap script to apply all PostgreSQL migrations:
```bash
npm run postgres:bootstrap
```

### 3. Seed Demo Data
Populate the system with a sample Chart of Accounts, Funds, Programs, and linked transactions:
```bash
tsx scripts/postgres-seed-finance-v2.ts
```

### 4. Start the App
```bash
npm run dev
```

## Demo Credentials
Since the system integrates with the Ozeki Staff Portal, use an existing Admin account or create one via the `postgres:bootstrap` defaults.
- **Default Super Admin**: Search in `portal_users` table for the first admin.

## Key Modules
- **Dashboard**: `/portal/finance`
- **General Ledger**: `/portal/finance/gl`
- **Grants**: `/portal/finance/grants`
- **Budgets**: `/portal/finance/budgets`

## Record Linkage Verification
To verify the linkage, check the `finance_journal_lines` table. Every line for a financial transaction will have:
- `fund_id`
- `program_id` (if applicable)
- `project_id` (if applicable)
- `grant_id` (if applicable)
- Linked `source_type` and `source_id` in `finance_journal_entries`.
