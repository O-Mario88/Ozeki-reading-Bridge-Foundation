import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/portal/",
          "/api/",
          "/admin/",
          "/actions/",
          "/embed/",
          "/donors/",
          "/_next/",
          "/offline",
          "/impact/for-donors/lookup",
        ],
      },
      // AI crawlers — allow indexing content; they pay attention to robots.txt.
      { userAgent: "GPTBot", allow: "/" },
      { userAgent: "ClaudeBot", allow: "/" },
      { userAgent: "PerplexityBot", allow: "/" },
      { userAgent: "Google-Extended", allow: "/" },
    ],
    host: "https://www.ozekiread.org",
    sitemap: "https://www.ozekiread.org/sitemap.xml",
  };
}
