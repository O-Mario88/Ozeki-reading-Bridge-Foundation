import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  serverExternalPackages: ["better-sqlite3"],
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: { unoptimized: true },
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
      "database/**/*",
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
  async headers() {
    return [
      {
        source: "/:path*",
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
    ];
  },
};

export default nextConfig;
