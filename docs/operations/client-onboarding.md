# Ozeki Reading Bridge Foundation — Client Onboarding Guide

A 5-minute orientation for the team taking over the platform. Read this
first; the more detailed deployment + Pesapal docs live alongside in
[docs/operations/](.) and the runtime envvar list lives in
[.env.example](../../.env.example).

---

## What the platform is

Two surfaces, one Next.js 15 codebase:

- **Public site** (`https://www.ozekiread.org` and similar) — marketing
  pages, programmes, donations, public live dashboards (impact, reading
  outcomes), and Pesapal-backed donation/sponsorship checkout.
- **Staff portal** (`/portal`) — the operational data-entry app:
  schools, learner reading assessments, classroom observations,
  coaching visits, teacher trainings, reading interventions, story
  library, finance, reports.

A single Postgres database serves both surfaces. The portal is
installable as a PWA on phones for field workers (the install prompt
only surfaces after 10 minutes of authenticated use — see
[InstallAppGate](../../src/components/InstallAppGate.tsx)).

## First-week checklist for the new operator

1. **Get a Super Admin account** on the live portal. The previous
   operator should issue this from `/portal/superadmin` → New User →
   Role: **Super Admin**.
2. **Sign in once and verify MFA** is required (`BYPASS_MFA` must be
   `false` in production env vars — check Railway dashboard).
3. **Open `/portal/finance/transparency`** — verify the live numbers
   match what you expect from Pesapal's merchant dashboard.
4. **Open `/portal/data-quality`** — anything red here is the data
   backlog the team should clear in week one.
5. **Walk through the four roles below** so you know what each user
   can see.

## Roles (the tier dropdown)

The platform has exactly four onboarding tiers. Choose one in the
"Role" dropdown when creating a user at
`/portal/superadmin` → New User. Each tier collapses into the
underlying boolean flags via [`tierToRoleAndFlags`](../../src/lib/permissions.ts):

| Tier | Can do | Cannot do |
| --- | --- | --- |
| **Super Admin** | Everything: Finance, user management, exports, reports, all data entry | (nothing — full system access) |
| **Admin** | Everything except Finance and adding users; can export, generate reports, edit data | View Finance, create/edit users |
| **Staff** | Data entry + generate reports for schools/coaching | Export data (no PDF/CSV downloads), access Finance |
| **Volunteer** | Data entry only — assessments, observations, visits, story uploads | Generate reports, export, access Finance |

The dropdown is the single source of truth — the legacy supervisor /
M&E checkboxes are gone. Changes take effect on the user's next
sign-in.

## Critical day-one operator tasks

1. **Confirm Pesapal env vars are set in Railway** —
   `PESAPAL_ENVIRONMENT`, `_CONSUMER_KEY`, `_CONSUMER_SECRET`,
   `_IPN_ID`. If `_IPN_ID` is unset, donations error out with a clear
   message. Follow [pesapal-ipn-runbook.md](pesapal-ipn-runbook.md) to
   register.
2. **Confirm SMTP env vars are set** (`SMTP_HOST`, `SMTP_USER`,
   `SMTP_PASS`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_FROM`). Without
   these, password resets, MFA codes, finance receipts, and training
   certificates can't ship.
3. **Confirm `BYPASS_MFA` is `false` or unset.** If it's `true` in
   production, every account is one-factor.
4. **Confirm `FINANCE_SYSTEM_ACTOR_ID`** points at an existing super
   admin user id — automated finance writes (Pesapal IPN ledger
   entries, reset batches) attribute themselves to this user.
5. **Confirm DB backups are enabled** in your AWS RDS console.

## Daily / weekly rhythms

| Frequency | What to check | Where |
| --- | --- | --- |
| Daily | Failed payments / pending IPN replays | `/portal/finance/transparency` + Pesapal merchant console |
| Daily | New support tickets | `/portal/support` |
| Weekly | Data Quality dashboard — schools missing reading assessments | `/portal/data-quality` |
| Weekly | Coach Workload — overdue coaching visits | `/portal/coach-workload` |
| Weekly | Audit Trail — anything unexpected from non-super-admin accounts | `/portal/admin/audit-trail` |
| Monthly | Finance reconciliation + reports | `/portal/finance/reports` |
| Quarterly | Rotate `PESAPAL_CONSUMER_SECRET` + `SMTP_PASS` |  |

## "I broke something — how do I undo it?"

| Issue | Fix |
| --- | --- |
| Locked yourself out (forgot password) | Another super admin issues a password reset via `/portal/superadmin` |
| All super admins locked out | Rotate `PORTAL_PASSWORD_SALT` won't help. Run the auto-seed via the env vars `PORTAL_AUTO_SEED_USERS=true` + `PORTAL_SUPERADMIN_*` and redeploy once; immediately disable auto-seed afterwards |
| Wrong finance posting | `/portal/finance/reset-batch` — voids a batch and re-archives the rows. Idempotent. |
| Lost data after a deploy | Postgres point-in-time-restore via AWS RDS console. The codebase is stateless. |
| Pesapal IPN didn't fire | Replay manually — see Pesapal runbook §6 |

## Where things live (codebase map)

| You want to find… | Look in |
| --- | --- |
| A page route | `src/app/<route>/page.tsx` |
| An API endpoint | `src/app/api/<...>/route.ts` |
| A SQL query | `src/lib/server/postgres/repositories/<topic>.ts` |
| A database column | `database/postgres/<NNNN>_<name>.sql` (idempotent migrations, run on every deploy via `npm run postgres:bootstrap`) |
| The active feature flags | `.env.example` is the canonical reference |
| Type definitions | `src/lib/types.ts` |
| Permission helpers | `src/lib/permissions.ts` |
| Mobile vs desktop split | Each page renders both — mobile views live in `src/components/portal/<topic>-mobile/` |

## Migration safety rules

The bootstrap script runs every migration in `database/postgres/` on
every deploy. Two rules are non-negotiable:

1. **Never pair `ADD COLUMN` and `DROP COLUMN` across migrations.**
   Postgres has a 1600-column-per-table hard limit; dropped columns
   leave placeholders that count toward it. If you regret a column,
   edit the original ADD migration to remove it (Postgres treats the
   bootstrap re-run as a no-op since `IF NOT EXISTS` is used) — or
   open a one-shot migration that only drops the column for DBs that
   have it.
2. **Idempotency guards must match the object kind:** `pg_constraint`
   for `ADD CONSTRAINT`, `pg_indexes` / `IF NOT EXISTS` for indexes,
   `information_schema.columns` for columns. A guard against the wrong
   table fails silently the first run and explodes on the second.

## What to ship to your client

When you're ready to hand the platform to a non-technical client:

1. The two-line summary: "URL is `https://www.ozekiread.org`, sign in
   at `/portal/login`, your role determines what you see."
2. The four-role breakdown above.
3. The "Daily / weekly rhythms" table.
4. A printed copy of the [Pesapal IPN runbook](pesapal-ipn-runbook.md)
   for whoever owns the merchant account.
5. The credentials for: Railway service, AWS RDS, Pesapal merchant
   console, the Google OAuth project, the SMTP provider, the domain
   registrar. **All of these should live in the operator's password
   manager, not in the repo.**

That's the whole onboarding. The rest is in
[`docs/deployment-checklist.md`](../deployment-checklist.md) and the
inline code comments.
