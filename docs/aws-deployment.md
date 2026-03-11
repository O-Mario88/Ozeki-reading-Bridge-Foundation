# AWS Deployment Guide

This project is prepared for AWS deployment with:
- standalone Next.js server startup (`npm run start:standalone`)
- writable runtime storage fallback (`APP_DATA_DIR`, `SQLITE_DB_PATH`)
- health endpoint (`GET /api/health`)
- Docker healthcheck + native dependency hardening

## Recommended Path (ECS Fargate + ECR)

1. Build and push image:
```bash
aws ecr get-login-password --region <region> \
  | docker login --username AWS --password-stdin <account-id>.dkr.ecr.<region>.amazonaws.com

docker build -t ozeki-reading-bridge-foundation:latest .
docker tag ozeki-reading-bridge-foundation:latest <account-id>.dkr.ecr.<region>.amazonaws.com/ozeki-reading-bridge-foundation:latest
docker push <account-id>.dkr.ecr.<region>.amazonaws.com/ozeki-reading-bridge-foundation:latest
```

2. ECS task/container settings:
- Container port: `3000`
- Health check path: `/api/health`
- Health check grace period: at least `45s`
- Persistent storage: mount EFS to `/app/data` (recommended if you need durable SQLite/files)

3. Required environment variables:
- `NODE_ENV=production`
- `APP_ORIGIN=https://<your-domain>`
- `PORTAL_AUTO_SEED_USERS=false`
- `PORTAL_PASSWORD_SALT=<strong-random-secret>`
- Portal/admin credential variables from `.env.example`
- Optional Google/OpenAI/SMTP/Supabase variables as needed by enabled features

4. Runtime storage options:
- Durable: `APP_DATA_DIR=/app/data` (with EFS mount at `/app/data`)
- Ephemeral: `APP_DATA_DIR=/tmp/ozeki-data` (data resets on restart)
- Explicit DB path: `SQLITE_DB_PATH=/app/data/app.db` (or `DATABASE_PATH`)

## AWS Source Deployments (Elastic Beanstalk/App Runner source)

- Start command: `npm run start:standalone`
- Build command: `npm ci && npm run build`
- Health check path: `/api/health`
- Runtime storage env (recommended): `APP_DATA_DIR=/tmp/ozeki-data` unless persistent volume is configured

`Procfile` is included so Elastic Beanstalk picks the correct web command by default.
`apprunner.yaml` is included so App Runner source deployments use the same build/run commands.

## AWS Amplify

`amplify.yml` is included and does the following:
- switches build Node runtime to `22`
- runs `npm ci`
- rebuilds `better-sqlite3` in the Amplify build environment
- runs `npm run build`

If you configure Amplify in the console, keep the same command sequence to avoid native module mismatch errors.
