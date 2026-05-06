# Secret Rotation & Railway Env-Var Migration Checklist

Use this runbook (a) once before client handover to rotate every
credential that has touched the dev machine, and (b) on a quarterly
cadence afterwards.

The repo's `.gitignore` excludes `.env*` (with a single allow-list for
`.env.example`), so the secret files have never been pushed to GitHub —
but they have been on a developer laptop, so treat them as exposed.

---

## 1. The full secret inventory

These are the secrets the running platform reads. Anything in
[.env.example](../../.env.example) that says `replace-with-…` or is
intentionally blank is a secret. The high-value ones:

| Secret | What it unlocks | Rotate where |
| --- | --- | --- |
| `DATABASE_URL` | Full read/write to production Postgres | AWS RDS console → modify master password |
| `PORTAL_PASSWORD_SALT` | Stored password hashes — **don't rotate without a re-hash plan** | (rotate ONLY during a planned password reset for everyone) |
| `PORTAL_SESSION_SECRET` | Active sign-in cookies (rotating logs everyone out) | Generate `openssl rand -hex 32` |
| `SECRET_KEY` | General signing key | Generate `openssl rand -hex 32` |
| `FINANCE_FILE_SIGNING_SECRET` | Signed receipt-PDF download URLs | Generate `openssl rand -hex 32` |
| `RESEARCH_DATASET_SALT` | Cohort-id salt for research dataset privacy | Generate; **note: rotating breaks linkage to prior research exports** |
| `SMTP_PASS` | Outbound email | Provider console (Gmail App Password, SES SMTP creds, etc.) |
| `PESAPAL_CONSUMER_SECRET` | Live payment gateway | Pesapal merchant console → Reset Secret |
| `GOOGLE_CLIENT_SECRET` / `GOOGLE_OAUTH_CLIENT_SECRET` | Staff portal sign-in | Google Cloud Console → APIs & Services → Credentials |
| `GOOGLE_REFRESH_TOKEN` | Long-lived Google API access | Re-run the OAuth consent flow → grab new refresh token |
| `OPENAI_API_KEY` | OpenAI report generation | OpenAI dashboard → Revoke + create new |
| `VIMEO_ACCESS_TOKEN` | Recorded-lesson sync | Vimeo developer console |
| `ZENODO_TOKEN` | Research dataset publishing | Zenodo account → API tokens |
| `EMIS_API_TOKEN` | Uganda EMIS sync | Whoever issued the token at Ministry of Education |
| `CRON_SECRET` / `CRON_SECRET_TOKEN` / `CRON_TOKEN` | Background-job auth | Generate `openssl rand -hex 24`; set all three to the same value |
| `MIGRATE_TOKEN` | Admin migration endpoints | Generate `openssl rand -hex 24` |

## 2. Pre-handover rotation (do this once)

The dev laptop has touched live values. Treat all of the above as
known-exposed and rotate before the client takes over.

Order matters — rotate in this sequence so you're never simultaneously
locked out of two systems:

1. **Generate the new values offline** in your password manager. Don't
   put them in a Slack message or an email.
2. **Pesapal**: log into the merchant console, reset the consumer
   secret. Save the new value. `PESAPAL_CONSUMER_KEY` doesn't change
   on a reset; only `_SECRET` does.
3. **Google OAuth**: in Cloud Console → Credentials → click your OAuth
   client → "Reset secret". Save. Note: this immediately invalidates
   any active refresh tokens, so step 4 is required.
4. **Google refresh token**: re-run the staff OAuth consent flow once
   (sign in to `/portal` with a Google Workspace account that has
   admin scopes). Grab the new `GOOGLE_REFRESH_TOKEN` from the auth
   callback log.
5. **SMTP**: revoke the old App Password / SES SMTP credential, issue
   a new one.
6. **OpenAI / Vimeo / Zenodo / EMIS**: rotate via each provider's
   console.
7. **Internal signing secrets** (`SECRET_KEY`,
   `FINANCE_FILE_SIGNING_SECRET`, `CRON_SECRET*`, `MIGRATE_TOKEN`,
   `PORTAL_SESSION_SECRET`): generate fresh `openssl rand -hex 32` (or
   `-hex 24` for shorter ones). `PORTAL_SESSION_SECRET` will sign
   everyone out — schedule that for a low-traffic window.
8. **Update Railway service variables** (next section).
9. **Delete `.env.local.pre-rotate.bak`** from the dev laptop. Do **not**
   commit it — `.gitignore` already excludes it, but it's still a
   physical artifact on disk.
10. **Verify nothing was committed**: `git log --all -- .env .env.local
    .env.local.pre-rotate.bak` should return zero commits. If it
    returns commits, those secrets are in git history and must be
    treated as still-exposed even after rotation.

## 3. Move secrets into Railway (or a managed secrets store)

Production should never read from `.env.local`. The codebase reads
`process.env.*` with no special prefix — Railway supplies these via
its **service → Variables tab** page.

For each variable in [.env.example](../../.env.example):

1. Decide if it's a build-time or runtime var. Most are runtime.
2. In Railway dashboard → your app → **Environment variables** →
   **New Variable**:
   - **Variable**: the name (`PESAPAL_IPN_ID`)
   - **Value**: the secret
   - **Environment**: select your production environment (Railway defaults to a single "production" env)
3. Save.
4. Trigger a redeploy so the running pods pick the new value up.
   Railway does not hot-reload service variables.

For very-high-value secrets (`DATABASE_URL`, `PORTAL_SESSION_SECRET`,
`PESAPAL_CONSUMER_SECRET`), prefer a dedicated secrets manager (Doppler, 1Password Secrets Automation, AWS Secrets Manager) referenced from Railway
*Secrets* feature over plain env vars. Railway will inject the secret
at deploy time without it ever appearing in the deploy manifest
or build logs.

## 4. Quarterly rotation cadence (calendar this)

| Cadence | What |
| --- | --- |
| **Every 90 days** | `SMTP_PASS`, `PESAPAL_CONSUMER_SECRET`, `GOOGLE_CLIENT_SECRET`, `OPENAI_API_KEY`, `VIMEO_ACCESS_TOKEN`, `ZENODO_TOKEN`, `EMIS_API_TOKEN` |
| **Every 90 days** | `CRON_SECRET*`, `MIGRATE_TOKEN`, `FINANCE_FILE_SIGNING_SECRET` |
| **Every 12 months** | `PORTAL_SESSION_SECRET` (forces global re-login — schedule + announce) |
| **Never auto-rotate** | `PORTAL_PASSWORD_SALT` (rotating invalidates every stored password hash; only do as part of a forced password reset for the entire user base) |
| **Never auto-rotate** | `RESEARCH_DATASET_SALT` (rotating breaks the cohort-id linkage to prior research exports — only rotate if a privacy incident demands re-anonymisation) |
| **On compromise** | `DATABASE_URL` (master password reset in RDS console), then re-issue all derived secrets |

Add a recurring calendar event ("Ozeki RBF: rotate Pesapal + SMTP +
Google secrets") with this doc linked.

## 5. Verifying a rotation worked

After every rotation, run a 30-second smoke test:

1. Sign in to `/portal/login` (verifies `PORTAL_SESSION_SECRET`,
   `BYPASS_MFA`).
2. Trigger an MFA email (verifies SMTP).
3. Submit a £1 / UGX 1,000 sandbox donation (verifies Pesapal and
   the IPN flow).
4. Open `/portal/finance/transparency` and check the donation appears
   (verifies the IPN reached you and `FINANCE_SYSTEM_ACTOR_ID` writes
   succeeded).
5. Sign out and back in via Google (verifies Google OAuth).

If any of those fail after rotation, the most likely culprit is that
Railway hasn't redeployed; trigger a new deploy and try again.

## 6. The "I exposed a secret" emergency drill

If a secret leaks (committed to git, posted in a public issue, etc.):

1. **Immediately** rotate that specific secret per the table above.
   Do this before anything else.
2. **Then** purge the secret from git history if it's in a commit:
   `git filter-repo` is the modern tool. After purging, force-push
   and ask any team member with a clone to re-clone.
3. Check application logs for any usage of the leaked credential
   between leak time and rotation time.
4. If you can't tell whether it was used: assume it was. Audit
   downstream systems (Pesapal transactions, SMTP send logs, OpenAI
   usage dashboard).
5. File the incident in your issue tracker so the next operator
   sees the precedent.

---

**Owner:** the operator on file. Set a quarterly calendar reminder
linking back to this document.
