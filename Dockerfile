# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
ENV PUPPETEER_SKIP_DOWNLOAD=true
WORKDIR /app

FROM base AS deps
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV APP_DATA_DIR=/app/data

# Needed for newsletter PDF generation via Puppeteer.
RUN apt-get update \
  && apt-get install -y --no-install-recommends chromium \
  && rm -rf /var/lib/apt/lists/*
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

# Create the runtime data directory used by APP_DATA_DIR (evidence
# photos, generated PDFs, queued offline payloads).
#
# Persistence is the host platform's job — Railway Volumes, Cloud Run
# / Firebase App Hosting writable layer with caveats, AWS Amplify
# ephemeral disk. The Dockerfile no longer declares VOLUME because:
#   • Railway rejects Docker VOLUME — they require their managed
#     Volumes feature attached at deploy time via the Railway console.
#   • The original VOLUME was added when the app used SQLite; Postgres
#     replaced SQLite long ago, so the directive only matters for
#     uploaded files now.
# If you need persistent uploads on the platform you choose, attach a
# managed volume (Railway Volumes / GCS bucket via Cloud Storage FUSE /
# EFS) and mount it at /app/data — no Dockerfile change required.
RUN mkdir -p /app/data && chown -R node:node /app

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/health').then((res)=>{if(!res.ok) process.exit(1);}).catch(()=>process.exit(1));"

CMD ["node", "server.js"]
