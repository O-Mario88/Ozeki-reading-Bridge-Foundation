import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 3600;

/**
 * Public: self-describing index of Ozeki National Intelligence v1 API endpoints.
 * No authentication required — this is the "front door" for partners.
 */
export async function GET(req: Request) {
  const base = new URL(req.url);
  const origin = `${base.protocol}//${base.host}`;

  return NextResponse.json({
    name: "Ozeki National Intelligence API",
    version: "1.0",
    description:
      "Standardised, authenticated read-only data endpoints for Ministry of Education, UNICEF, university research partners, and other Uganda primary-literacy stakeholders.",
    documentation: `${origin}/developers/api`,
    openapi: `${origin}/api/v1/openapi.json`,
    authentication: {
      scheme: "Bearer",
      header: "Authorization",
      example: "Authorization: Bearer ork_...",
      obtain: "Contact Ozeki programme lead or email data@ozekiread.org",
    },
    rateLimits: {
      default: "60 requests per minute, 5,000 per day",
      responseHeaders: ["X-RateLimit-Limit-Minute", "X-RateLimit-Limit-Day"],
      exceeded: "HTTP 429 with Retry-After header",
    },
    contentNegotiation: {
      json: "default; Accept: application/json",
      csv: "Accept: text/csv or append ?format=csv to list endpoints",
    },
    caching: {
      eTag: "All GET responses include ETag; send If-None-Match to receive 304",
      cacheControl: "public, max-age=N varies by endpoint",
    },
    endpoints: [
      { method: "GET", path: "/api/v1/districts", description: "List all districts with school counts." },
      { method: "GET", path: "/api/v1/districts/{district}/literacy-indicators", description: "Literacy indicators for one district." },
      { method: "GET", path: "/api/v1/regions", description: "List all regions with school + district counts." },
      { method: "GET", path: "/api/v1/regions/{region}/literacy-indicators", description: "Literacy indicators for one region." },
      { method: "GET", path: "/api/v1/schools", description: "Paginated, anonymised list of schools. Filters: ?region, ?district, ?limit, ?offset." },
      { method: "GET", path: "/api/v1/national/benchmarks", description: "Uganda-wide reading norms by grade × cycle." },
      { method: "GET", path: "/api/v1/national/time-series", description: "Monthly trajectory of assessment, coaching, training, fidelity. ?months=12 default." },
      { method: "GET", path: "/api/v1/national/gender-parity", description: "Gender parity index — overall + by-grade." },
      { method: "GET", path: "/api/v1/outcomes/by-grade", description: "Domain-level averages by grade." },
      { method: "GET", path: "/api/v1/data-quality", description: "Per-district data-quality score (baseline/endline coverage, UID %, coaching frequency)." },
      { method: "GET", path: "/api/v1/programmes/comparisons", description: "Programme-level benchmark distributions by grade." },
    ],
    license: "CC BY 4.0 — aggregated, de-identified data for research use with attribution to Ozeki Reading Bridge Foundation.",
    status: "stable",
    contact: "data@ozekiread.org",
  });
}
