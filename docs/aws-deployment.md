# AWS Deployment Guide (Rebuilt Architecture)

## Target Architecture
- Frontend: Next.js app in `frontend/` deployed with AWS Amplify SSR.
- Backend: Django app in `backend/` deployed on Elastic Beanstalk or App Runner Python runtime.
- Database: Amazon RDS PostgreSQL.
- Media/static: S3-backed storage for production (optional local filesystem in development only).

## Frontend (Amplify)
- App root: `frontend/`.
- Build config: `frontend/amplify.yml` (or root `amplify.yml` with `cd frontend`).
- Required env vars:
  - `NEXT_PUBLIC_API_BASE_URL=https://<backend-domain>`
  - `GOOGLE_OAUTH_CLIENT_ID=<google oauth client id>`
  - `GOOGLE_OAUTH_CLIENT_SECRET=<google oauth client secret>`
  - `GOOGLE_OAUTH_ALLOWED_DOMAIN=ozekiread.org`

### Google Workspace sign-in
- The portal Google OAuth callback is `/api/auth/google/callback`.
- For the live admin host, configure the Google OAuth redirect URI:
  - `https://admin.ozekiread.org/api/auth/google/callback`
- If the portal can also be served from the main public host, add:
  - `https://ozekiread.org/api/auth/google/callback`
- The portal now enforces approved Google Workspace email domains. By default this is `ozekiread.org`.
- Edwin must sign in with `edwin@ozekiread.org`, and that email must also exist in `portal_users`.

## Backend (Elastic Beanstalk / App Runner)
- Runtime: Python 3.12.
- Entrypoint: `gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-8000}`.
- Files:
  - `backend/Procfile`
  - `backend/apprunner.yaml`

### Required environment variables
- `DJANGO_SECRET_KEY`
- `DATABASE_URL=postgresql://...`
- `DJANGO_ALLOWED_HOSTS`
- `CORS_ALLOWED_ORIGINS`
- `CSRF_TRUSTED_ORIGINS`
- `DB_SSL_REQUIRE=true`
- Optional S3 storage keys

## Database
- Use RDS PostgreSQL only.
- Run migrations during deploy:
  - `python manage.py migrate`
- Never run production with SQLite.

## Static and Media
- Run collectstatic:
  - `python manage.py collectstatic --noinput`
- Configure S3 env vars for persistent media/static.

## Release Workflow
1. Deploy backend and confirm `/health` responds `{"status":"ok"}`.
2. Run backend migrations.
3. Deploy frontend with backend URL env.
4. Smoke-check public pages and staff workflows.
5. Run data migration in controlled window if cutover is pending.
