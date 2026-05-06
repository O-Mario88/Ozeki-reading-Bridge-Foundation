import Link from "next/link";
import type { Metadata } from "next";
import { SectionWrapper } from "@/components/public/SectionWrapper";
import { CTAStrip } from "@/components/public/CTAStrip";
import {
  Key, Database, FileCode, Clock, Shield, Globe, BookOpen,
  Download, Zap, Users, Scale,
} from "lucide-react";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "National Intelligence API — Developer Documentation | Ozeki Reading Bridge Foundation",
  description:
    "Authenticated read-only API for Uganda primary-literacy data. Endpoints, authentication, data dictionary, and client quickstarts for Ministry, UNICEF, and university research partners.",
  openGraph: {
    title: "Ozeki National Intelligence API — Developer Documentation",
    description: "Standardised, EGRA-style literacy data for Uganda. Research-grade, CC BY 4.0.",
  },
};

type Endpoint = {
  method: string;
  path: string;
  description: string;
  category: string;
};

const ENDPOINTS: Endpoint[] = [
  { method: "GET", path: "/api/v1", description: "Self-describing index (no auth required).", category: "Meta" },
  { method: "GET", path: "/api/v1/openapi", description: "OpenAPI 3.1 spec for auto-generated clients.", category: "Meta" },
  { method: "GET", path: "/api/v1/districts", description: "All districts with school counts.", category: "Geography" },
  { method: "GET", path: "/api/v1/districts/{district}/literacy-indicators", description: "EGRA-style indicators for one district.", category: "Geography" },
  { method: "GET", path: "/api/v1/regions", description: "All regions with school + district counts.", category: "Geography" },
  { method: "GET", path: "/api/v1/regions/{region}/literacy-indicators", description: "Indicators for one region.", category: "Geography" },
  { method: "GET", path: "/api/v1/schools", description: "Paginated, anonymised school aggregates. ?region, ?district, ?limit, ?offset.", category: "Schools" },
  { method: "GET", path: "/api/v1/national/benchmarks", description: "Uganda-wide reading norms by grade × cycle.", category: "National" },
  { method: "GET", path: "/api/v1/national/time-series", description: "Monthly delivery + outcome trajectory. ?months=12 default.", category: "National" },
  { method: "GET", path: "/api/v1/national/gender-parity", description: "Gender parity index — overall + by grade.", category: "National" },
  { method: "GET", path: "/api/v1/outcomes/by-grade", description: "Domain-level averages by grade.", category: "Outcomes" },
  { method: "GET", path: "/api/v1/data-quality", description: "Per-district data-quality scores.", category: "Data Quality" },
  { method: "GET", path: "/api/v1/programmes/comparisons", description: "Programme-level distributions by grade.", category: "Programmes" },
];

const CATEGORIES = Array.from(new Set(ENDPOINTS.map((e) => e.category)));

export default function DeveloperDocsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#006b61] pt-28 pb-24 md:pt-36 md:pb-28">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.08),_transparent_60%)] pointer-events-none" />
        <div className="container mx-auto px-4 md:px-6 max-w-5xl relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white/90 font-semibold text-sm mb-8 border border-white/20">
            <FileCode className="w-4 h-4" /> API Documentation · v1.0
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight leading-tight mb-6">
            National Intelligence<br className="hidden md:block" /> API
          </h1>
          <p className="text-xl md:text-2xl text-white/80 max-w-3xl mx-auto leading-relaxed mb-8">
            Standardised, authenticated read-only access to Uganda primary-literacy data for Ministry,
            UNICEF, university researchers, and partner NGOs.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-3">
            <Link
              href="/contact"
              className="btn-orange px-6 py-3 rounded-xl font-bold inline-flex items-center gap-2"
            >
              <Key className="w-4 h-4" /> Request API Key
            </Link>
            <a
              href="/api/v1/openapi"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-green px-6 py-3 rounded-xl font-bold inline-flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> OpenAPI Spec
            </a>
          </div>
        </div>
      </section>

      {/* Quick-reference cards */}
      <SectionWrapper theme="off-white" className="!pb-0">
        <div className="max-w-5xl mx-auto grid md:grid-cols-4 gap-4 -mt-12">
          {[
            { icon: Shield, title: "Secure", body: "Bearer-token auth, sha256 key hashing, per-key rate limits." },
            { icon: Clock, title: "Cached", body: "ETag + Cache-Control on every response. Send If-None-Match for 304s." },
            { icon: Database, title: "Complete", body: "Districts, regions, schools, national time-series, gender parity, data quality." },
            { icon: Scale, title: "Open", body: "CC BY 4.0 — use in research, policy, and dashboards with attribution." },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="bg-white rounded-2xl border border-gray-100 shadow-md p-5">
              <Icon className="w-6 h-6 text-[#006b61] mb-3" />
              <p className="text-sm font-bold text-gray-900 mb-1">{title}</p>
              <p className="text-xs text-gray-600 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </SectionWrapper>

      {/* Quickstart */}
      <SectionWrapper theme="off-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-2 flex items-center gap-2">
            <Zap className="w-7 h-7 text-[#ff7235]" />
            Quickstart
          </h2>
          <p className="text-gray-600 mb-8">
            Three steps to your first API call. Total time: about 10 minutes from request to response.
          </p>

          <div className="space-y-6">
            {/* Step 1 */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-[#006b61] text-white font-bold flex items-center justify-center shrink-0">1</div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Request an API key</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Email <a href="mailto:data@ozekiread.org" className="text-[#006b61] font-semibold underline">data@ozekiread.org</a>{" "}
                    with your organisation name, intended use case, and a contact person. Keys are typically
                    issued within 2 business days. All keys start with <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">ork_</code>.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-[#006b61] text-white font-bold flex items-center justify-center shrink-0">2</div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Make your first request</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Send the key in the <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">Authorization</code> header:
                  </p>
                  <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-xs leading-relaxed">
{`# curl
curl -H "Authorization: Bearer ork_YOUR_KEY" \\
     https://ozeki.org/api/v1/national/benchmarks

# Python
import requests
r = requests.get(
    "https://ozeki.org/api/v1/national/benchmarks",
    headers={"Authorization": "Bearer ork_YOUR_KEY"},
)
print(r.json())

# JavaScript
const r = await fetch("https://ozeki.org/api/v1/national/benchmarks", {
  headers: { Authorization: "Bearer ork_YOUR_KEY" },
});
console.log(await r.json());`}
                  </pre>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-[#006b61] text-white font-bold flex items-center justify-center shrink-0">3</div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Download as CSV</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Researchers often prefer CSV for Stata, R, or Excel. Append <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">?format=csv</code> or send <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">Accept: text/csv</code>:
                  </p>
                  <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-xs leading-relaxed">
{`curl -H "Authorization: Bearer ork_YOUR_KEY" \\
     "https://ozeki.org/api/v1/schools?region=Northern&format=csv" \\
     -o northern-schools.csv`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SectionWrapper>

      {/* Endpoint reference */}
      <SectionWrapper theme="off-white" id="endpoints">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-2 flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-[#006b61]" />
            Endpoint Reference
          </h2>
          <p className="text-gray-600 mb-8">
            All endpoints require <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">Authorization: Bearer ork_...</code> unless noted.
            Full JSON schema is available at <a href="/api/v1/openapi" className="text-[#006b61] font-semibold underline">/api/v1/openapi</a>.
          </p>

          {CATEGORIES.map((cat) => (
            <div key={cat} className="mb-6">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">{cat}</h3>
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                {ENDPOINTS.filter((e) => e.category === cat).map((e, i, arr) => (
                  <div
                    key={e.path}
                    className={`px-5 py-4 flex items-start gap-4 ${i < arr.length - 1 ? "border-b border-gray-50" : ""}`}
                  >
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase bg-emerald-50 text-[#066a67] border border-emerald-100 shrink-0">
                      {e.method}
                    </span>
                    <div className="flex-1 min-w-0">
                      <code className="text-sm font-mono font-semibold text-gray-900 break-all">{e.path}</code>
                      <p className="text-sm text-gray-600 mt-1">{e.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </SectionWrapper>

      {/* Response envelope + caching */}
      <SectionWrapper theme="charius-beige">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <FileCode className="w-5 h-5 text-[#006b61]" />
              Response envelope
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              All list endpoints return a uniform envelope:
            </p>
            <pre className="bg-gray-50 rounded-lg p-3 text-xs font-mono text-gray-700 overflow-x-auto">
{`{
  "data": [ ... ],
  "meta": {
    "count": 100,
    "total": 247,
    "limit": 100,
    "offset": 0,
    "hasMore": true,
    "asOf": "2026-04-19T10:00:00Z"
  }
}`}
            </pre>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#006b61]" />
              Caching headers
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              Every GET response includes an <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">ETag</code>.
              Send it back as <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">If-None-Match</code> and the
              server returns <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">304 Not Modified</code> —
              saving bandwidth on slow connections.
            </p>
            <pre className="bg-gray-50 rounded-lg p-3 text-xs font-mono text-gray-700 overflow-x-auto">
{`ETag: "a3f9c1b2d4e5f678"
Cache-Control: public, max-age=3600
X-RateLimit-Limit-Minute: 60
X-RateLimit-Limit-Day: 5000`}
            </pre>
          </div>
        </div>
      </SectionWrapper>

      {/* Data dictionary */}
      <SectionWrapper theme="off-white" id="data-dictionary">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-2 flex items-center gap-2">
            <Database className="w-7 h-7 text-[#006b61]" />
            Data Dictionary
          </h2>
          <p className="text-gray-600 mb-8">
            Short definitions of frequently-returned fields. See the OpenAPI schema for the full list.
          </p>

          <div className="space-y-3">
            {[
              { field: "compositeScore / composite / compositeAvg", desc: "Average of five reading-domain scores: letter identification, sound identification, decodable words, fluency accuracy, reading comprehension. Each on 0–100; composite is the simple mean." },
              { field: "cycleType", desc: "Assessment cycle: baseline (start of programme), progress (mid-term), endline (end of programme)." },
              { field: "atOrAboveBenchmarkPct", desc: "% of learners whose expected-vs-actual status is meeting/exceeding grade expectations, OR whose composite score is ≥ 60%." },
              { field: "fidelityPct", desc: "% of submitted lesson observations rated as full programme fidelity (vs partial or developing)." },
              { field: "learnersAssessed", desc: "Distinct learner UIDs counted once even if they appear in multiple cycles." },
              { field: "improvementPp", desc: "Endline composite − baseline composite, in percentage points. Positive = gain." },
              { field: "parityIndex", desc: "female average ÷ male average. 1.00 = parity. Values 0.97–1.03 are within the equity target range." },
              { field: "dataQualityScore", desc: "0–100 composite: 25pts baseline coverage + 25pts endline coverage + 20pts UID completeness + 15pts visits/school + 15pts observations/school." },
            ].map(({ field, desc }) => (
              <div key={field} className="bg-white rounded-xl border border-gray-100 p-4">
                <code className="text-sm font-mono font-bold text-[#006b61]">{field}</code>
                <p className="text-sm text-gray-600 mt-1">{desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-xl bg-blue-50 border border-blue-100 p-4">
            <p className="text-sm text-blue-800">
              <strong>Methodology:</strong> every composite or aggregate has a minimum cell size of 10 unique learners;
              cells below threshold are suppressed to protect against re-identification. Assessments follow an
              EGRA-compatible 5-domain schema.
            </p>
          </div>
        </div>
      </SectionWrapper>

      {/* Partners */}
      <SectionWrapper theme="charius-beige">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Who uses this API</h2>
          <p className="text-gray-600 max-w-2xl mx-auto mb-8">
            The Ozeki National Intelligence API is designed to serve the literacy ecosystem — not replace it.
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: Shield, title: "Ministry of Education", body: "Policy-analysis teams running district-level dashboards without waiting on ad-hoc exports." },
              { icon: Globe, title: "UNICEF & Development Partners", body: "Programme M&E teams integrating Ozeki delivery data into country dashboards." },
              { icon: Users, title: "University Researchers", body: "Quantitative researchers citing Uganda reading norms in policy papers, under CC BY 4.0." },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="bg-white rounded-2xl border border-gray-100 p-5">
                <Icon className="w-8 h-8 text-[#006b61] mb-3" />
                <p className="font-bold text-gray-900 mb-1">{title}</p>
                <p className="text-sm text-gray-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </SectionWrapper>

      {/* Versioning + status */}
      <SectionWrapper theme="off-white">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6">
          <div className="rounded-2xl bg-white border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Versioning policy</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              <strong>v1</strong> is stable. Breaking changes (renamed fields, removed endpoints, changed auth) will ship as <strong>v2</strong> on a new path prefix;
              v1 will remain available for at least 12 months after v2 launch. Non-breaking additions (new fields, new endpoints, new optional filters) ship in v1.
            </p>
          </div>
          <div className="rounded-2xl bg-white border border-gray-100 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Status &amp; uptime</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Operational health is published at{" "}
              <a href="/api/health/db" className="text-[#006b61] font-semibold underline">/api/health/db</a>{" "}
              (returns pool utilisation + SELECT latency). For incidents or scheduled maintenance notifications, subscribe via the contact form.
            </p>
          </div>
        </div>
      </SectionWrapper>

      <CTAStrip
        heading="Ready to integrate?"
        subheading="Request an API key or send the OpenAPI spec to your team's developer."
        primaryButtonText="Request API Key"
        primaryButtonHref="/contact"
        secondaryButtonText="View OpenAPI Spec"
        secondaryButtonHref="/api/v1/openapi"
        theme="brand"
      />
    </div>
  );
}
