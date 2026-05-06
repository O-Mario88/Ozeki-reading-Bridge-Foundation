import type { Metadata } from "next";
import Link from "next/link";
import { SectionWrapper } from "@/components/public/SectionWrapper";
import {
  listPublicRegionOverview,
  type RegionOverviewRow,
} from "@/lib/server/postgres/repositories/public-metrics";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Regions — Ozeki Reading Bridge Foundation",
  description:
    "Region-by-region literacy footprint across Uganda. Districts, schools, learners assessed, and coaching delivery — refreshed live from our database.",
  openGraph: {
    title: "Regions — Where we work",
    description: "Live region-level rollup of Ozeki schools, learners and coaching activity.",
  },
};

function formatNumber(n: number): string {
  return n.toLocaleString();
}

function deliveryTone(pct: number | null): string {
  if (pct == null) return "text-gray-400";
  if (pct >= 80) return "text-[#066a67]";
  if (pct >= 60) return "text-emerald-600";
  if (pct >= 40) return "text-amber-600";
  return "text-red-600";
}

export default async function RegionsOverviewPage() {
  const regions: RegionOverviewRow[] = await listPublicRegionOverview().catch(() => []);

  const totals = regions.reduce(
    (acc, r) => ({
      regions: acc.regions + 1,
      districts: acc.districts + r.districts,
      schools: acc.schools + r.schools,
      learners: acc.learners + r.learnersAssessedAllTime,
    }),
    { regions: 0, districts: 0, schools: 0, learners: 0 },
  );

  return (
    <>
      {/* Hero */}
      <SectionWrapper theme="brand" className="py-20">
        <div className="max-w-3xl mx-auto text-center">
          <span className="text-charius-orange font-semibold tracking-wider text-sm uppercase block mb-3">
            Where We Work
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight mb-4">
            Our footprint, region by region
          </h1>
          <p className="text-lg text-white/85 leading-relaxed">
            Every region card below is built from live data — the schools we&rsquo;ve registered, the learners
            assessed, and the coaching visits delivered in the last 90 days. Tap any region to drill into the
            district-level profile.
          </p>
        </div>
      </SectionWrapper>

      {/* Top stats */}
      {regions.length > 0 && (
        <SectionWrapper theme="light" className="py-14 border-t border-gray-100">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <div className="text-center">
              <p className="text-4xl font-extrabold text-[#111] tabular-nums">{formatNumber(totals.regions)}</p>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mt-2">Regions covered</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-extrabold text-[#111] tabular-nums">{formatNumber(totals.districts)}</p>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mt-2">Districts</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-extrabold text-[#111] tabular-nums">{formatNumber(totals.schools)}</p>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mt-2">Schools</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-extrabold text-[#111] tabular-nums">{formatNumber(totals.learners)}</p>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mt-2">Learners assessed</p>
            </div>
          </div>
        </SectionWrapper>
      )}

      {/* Region cards */}
      <SectionWrapper theme="off-white" className="py-16">
        <div className="max-w-6xl mx-auto">
          {regions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center max-w-2xl mx-auto">
              <p className="text-lg font-semibold text-[#111] mb-2">No region data to publish yet</p>
              <p className="text-gray-500 text-sm">
                As schools get registered and assessment data flows in, this overview lights up automatically.
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {regions.map((r) => (
                <Link
                  key={r.region}
                  href={`/regions/${encodeURIComponent(r.region)}`}
                  className="group block bg-white rounded-2xl border border-gray-200 p-6 hover:border-charius-orange hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Region</p>
                      <h2 className="text-xl font-extrabold text-[#111] tracking-tight mt-1 truncate">
                        {r.region}
                      </h2>
                    </div>
                    <span
                      className="text-charius-orange opacity-0 group-hover:opacity-100 transition-opacity text-2xl leading-none"
                      aria-hidden
                    >
                      →
                    </span>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <div>
                      <dt className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Districts</dt>
                      <dd className="text-2xl font-bold text-[#111] tabular-nums">{r.districts}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Schools</dt>
                      <dd className="text-2xl font-bold text-[#111] tabular-nums">{r.schools}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Learners assessed</dt>
                      <dd className="text-2xl font-bold text-[#111] tabular-nums">{formatNumber(r.learnersAssessedAllTime)}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Avg composite</dt>
                      <dd className="text-2xl font-bold text-[#111] tabular-nums">
                        {r.latestAvgComposite ?? "—"}
                      </dd>
                    </div>
                  </dl>
                  {r.coachingDeliverySharePct != null && (
                    <div className="mt-5 pt-4 border-t border-gray-100 flex items-baseline justify-between">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                        Coaching delivery (90d)
                      </span>
                      <span className={`text-lg font-extrabold tabular-nums ${deliveryTone(r.coachingDeliverySharePct)}`}>
                        {r.coachingDeliverySharePct}%
                      </span>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </SectionWrapper>

      {/* Methodology footer */}
      <SectionWrapper theme="charius-beige" className="py-14">
        <div className="max-w-3xl mx-auto text-center">
          <h3 className="text-xl font-bold text-[#111] mb-3">How this is computed</h3>
          <p className="text-gray-700 leading-relaxed text-sm md:text-base mb-4">
            Schools, districts, and regions come from our school directory. The composite-score column is each
            learner&rsquo;s most-recent assessment, averaged across the region. Coaching delivery is the share of
            visits scheduled in the last 90 days whose implementation status is anything other than &ldquo;not started.&rdquo;
          </p>
          <Link href="/transparency" className="text-charius-orange font-semibold hover:underline">
            Read the full transparency methodology →
          </Link>
        </div>
      </SectionWrapper>
    </>
  );
}
