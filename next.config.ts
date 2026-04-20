import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // amplify.yml + scripts/start-standalone.mjs serve from .next/standalone/server.js;
  // that directory is only produced when output: "standalone" is set.
  output: "standalone",
  serverExternalPackages: ["exceljs", "xlsx", "pg", "puppeteer", "puppeteer-core", "pdf-lib"],
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
  compress: true,
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
    qualities: [25, 50, 75, 90],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // Amplify SSR does NOT auto-pass env vars to Lambda. This block inlines
  // them at build time — the only mechanism that works on Amplify.
  // The client.ts getDatabaseUrlRaw() auto-corrects missing database names.
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    DATABASE_SSL: process.env.DATABASE_SSL,
    GOOGLE_OAUTH_CLIENT_ID: process.env.GOOGLE_OAUTH_CLIENT_ID,
    GOOGLE_OAUTH_CLIENT_SECRET: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    GOOGLE_OAUTH_REDIRECT_URI: process.env.GOOGLE_OAUTH_REDIRECT_URI,
    // SMTP / Email
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_SECURE: process.env.SMTP_SECURE,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    SMTP_FROM: process.env.SMTP_FROM,
    FINANCE_EMAIL_FROM: process.env.FINANCE_EMAIL_FROM,
    // Automation-layer env vars (added 2026-04)
    CRON_SECRET_TOKEN: process.env.CRON_SECRET_TOKEN,
    DIGEST_RECIPIENTS: process.env.DIGEST_RECIPIENTS,
    PROGRAMMES_EMAIL_FROM: process.env.PROGRAMMES_EMAIL_FROM,
    FINANCE_EMAIL_ALWAYS_CC: process.env.FINANCE_EMAIL_ALWAYS_CC,
  },
  outputFileTracingExcludes: {
    "*": [
      "node_modules/puppeteer-core/lib/esm/puppeteer/node/install.js",
      ".next_backup_*/**/*",
      ".next_buildcache_*/**/*",
      ".next_prev_build_*/**/*",
      ".next_stale_*/**/*",
      ".next_stale_blog_*/**/*",
      ".next_stale_blog2_*/**/*",
      ".next_stale_local_*/**/*",
      ".next_tmp_*/**/*",
      "backend/**/*",
      "docs/**/*",
      "frontend/**/*",
      "public/assets 3/**/*",
      "public/downloads 2/**/*",
      "public/downloads 3/**/*",
      "public/maps 2/**/*",
      "public/partners 2/**/*",
      "public/partners 3/**/*",
      "public/photos 2/**/*",
      "public/uploads 2/**/*",
      "public/uploads 3/**/*",
      "public/assets 2/**/*",
      "src/app 2/**/*",
      "src/app 3/**/*",
      "src/components 2/**/*",
      "src/components 3/**/*",
      "src/hooks 2/**/*",
      "src/lib 2/**/*",
      "src/styles 2/**/*",
      "src/tests 2/**/*",
      "src/ui 2/**/*",
      "src/ui 3/**/*",
      "assets/videos/**/*",
      "data/**/*",
      "data/finance/**/*",
    ],
  },
  outputFileTracingIncludes: {
    "/api/*": ["assets/photos/**/*"],
  },
  async redirects() {
    return [
      // Canonicalise apex → www so Google does not index two copies.
      // Using a permanent (308) redirect preserves crawl signals.
      {
        source: "/:path*",
        has: [{ type: "host", value: "ozekiread.org" }],
        destination: "https://www.ozekiread.org/:path*",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      // Embed routes MUST be iframe-able from external sites (donor pages,
      // NGO reports). Use Content-Security-Policy frame-ancestors and omit
      // X-Frame-Options (the more specific rule wins over the global :path*).
      {
        source: "/embed/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors *;" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Cache-Control", value: "public, max-age=600, stale-while-revalidate=1800" },
        ],
      },
      {
        source: "/((?!embed).*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      {
        source: "/assets/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/photos/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        source: "/downloads/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        source: "/maps/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        source: "/partners/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        source: "/uploads/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, stale-while-revalidate=86400",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
