# User Management Walkthrough

How to add, edit, deactivate, or troubleshoot portal user accounts. This
guide is for the **Super Admin** — adding/managing users is restricted to
that role.

## The four roles

| Tier | What they can do |
|---|---|
| **Super Admin** | Everything: finance + add/manage users + every operational feature. |
| **Admin** | Everything except finance and user management. Full reporting + data export. |
| **Staff** | Data entry + read-only reports for the schools/coaching they own. Cannot export data. |
| **Volunteer** | Data entry only. No reports, no exports. |

Source of truth: [src/lib/permissions.ts](../../src/lib/permissions.ts).

## Add a new user

1. Log in as **Super Admin**.
2. Open **Portal → Super Admin → New User** (or go to
   `/portal/superadmin/audit-invites` and click **New User**).
3. Fill in the form:
   - **Full name** — exactly as the user wants it on certificates.
   - **E-mail** — must be unique. The login identifier.
   - **Phone** — optional but useful for SMS-based password reset later.
   - **Role / Tier** — pick one of Super Admin / Admin / Staff /
     Volunteer. The dropdown is the single source of truth; the
     internal boolean flags are derived automatically.
   - **Department / Geography Scope** — free-text labels used for
     filtering reports. "Northern Region", "Finance", "M&E", etc.
   - **Send invite e-mail?** — leave checked. The user receives a
     temporary password and is forced to change it on first login.
4. Click **Create**. You should see a green confirmation and the new user
   in the list below.

If the invite e-mail doesn't arrive within 5 minutes:

- Check the recipient's spam folder.
- Verify SMTP is configured (Railway → web → Variables → `SMTP_*`).
- The user account exists either way — you can read out the temporary
  password to them by phone, or reset it (see below).

## Reset a forgotten password

The user can self-serve via **Forgot password** on the login page (this
sends an OTP to their e-mail, then lets them set a new password).

If their e-mail no longer works:

1. Open **Portal → Super Admin → Users**.
2. Find the row, click **Edit**.
3. Set a new password in the **Password** field — must be at least 8
   characters and pass the policy (length + complexity, see
   [src/lib/server/auth/password-policy.ts](../../src/lib/server/auth/password-policy.ts)).
4. Click **Save**. The user will be forced to change it again on next
   login.

## Change someone's role

1. **Portal → Super Admin → Users** → **Edit** on the user.
2. Change the **Role / Tier** dropdown.
3. Save.

A super admin **cannot demote themselves** (the API blocks this — see
[src/app/api/portal/users/route.ts](../../src/app/api/portal/users/route.ts)).
Have another super admin do it, or create a new super admin first then
demote yourself.

If you have only one super admin and they leave the org, see "Recover the
last super admin" below.

## Deactivate a user (instead of deleting)

Deletion removes the row and breaks audit trails — only do it if the user
was added by mistake. For people who leave the org, **deactivate**:

1. **Portal → Super Admin → Users** → **Edit**.
2. Set **Status** to `deactivated`.
3. Save.

Deactivated users cannot log in but their historical work (assessments
they recorded, donations they processed) remains attributed correctly.

## Recover the last super admin

If your only super admin lost access AND you don't have another super
admin AND e-mail-based reset doesn't work:

1. SSH-equivalent into Railway (Railway dashboard → web service → Connect).
2. Re-run the bootstrap, which re-seeds the default super admin row:
   ```
   curl -X POST -H "Authorization: Bearer $MIGRATE_TOKEN" \
     https://<your-domain>/api/migrate/bootstrap
   ```
3. Log in as the seed super admin. The credentials are documented in
   [client-onboarding.md](./client-onboarding.md) (rotate them
   immediately after — see [secret-rotation.md](./secret-rotation.md)).

## Common questions

**Why can't an Admin add users?** By design. User management is a
sensitive operation — only Super Admin can do it so the org always knows
who has the keys.

**Why does adding a user as "Staff" not show finance pages?**
Permission-gated. Switch them to "Super Admin" if they need finance
access. Most ops people should be Admin, not Super Admin.

**A user says they "can't see their schools".** Either:
- Their role is Volunteer (no read access), or
- Their **Geography Scope** filter doesn't match the schools' regions.
  Edit the user and update the scope, or clear it to allow nationwide.

**Bulk-add users?** There is no bulk upload UI yet. Add 1-by-1 through
the form. If you need to onboard >20 staff, that work item is documented
under "module gaps" in
[2026-03-12-platform-audit.md](../2026-03-12-platform-audit.md).

## Audit trail

Every user creation, role change, password reset, and deletion is
recorded in the audit log. Open **Portal → Audit & Compliance → Audit
Trail** and filter by `targetTable = portal_users` to see the history.

## See also

- [client-onboarding.md](./client-onboarding.md) — the orientation document
- [secret-rotation.md](./secret-rotation.md) — credential rotation cadence
- [src/lib/permissions.ts](../../src/lib/permissions.ts) — full permission spec
