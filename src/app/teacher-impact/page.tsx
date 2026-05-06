import type { Metadata } from "next";
import Link from "next/link";
import { SectionWrapper } from "@/components/public/SectionWrapper";
import {
  getPublicTeacherImpactSnapshot,
  getPublicCoachingCompletionRate,
} from "@/lib/server/postgres/repositories/public-metrics";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Teacher Impact — Ozeki Reading Bridge Foundation",
  description:
    "How many teachers we have trained, how many we have observed in classrooms, and where their instruction stands today.",
  openGraph: {
    title: "Teacher Impact",
    description: "Teacher training, classroom coaching, and lesson-quality data — refreshed live.",
  },
};

function formatNumber(n: number): string {
  return n.toLocaleString();
}

export default async function TeacherImpactPage() {
  const [snapshot, coachingCompletion] = await Promise.all([
    getPublicTeacherImpactSnapshot().catch(() => null),
    getPublicCoachingCompletionRate().catch(() => null),
  ]);

  const noData = !snapshot && !coachingCompletion;

  return (
    <>
      {/* Hero */}
      <SectionWrapper theme="brand" className="py-20">
        <div className="max-w-3xl mx-auto text-center">
          <span className="text-charius-orange font-semibold tracking-wider text-sm uppercase block mb-3">
            Teacher Impact Dashboard
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight mb-4">
            Reading lifts when teachers do
          </h1>
          <p className="text-lg text-white/85 leading-relaxed">
            We measure two things. First — how many teachers have actually completed our training. Second — how their
            classrooms look when a coach observes a real lesson. Both come from the live database.
          </p>
        </div>
      </SectionWrapper>

      {noData ? (
        <SectionWrapper theme="light" className="py-20">
          <div className="max-w-2xl mx-auto text-center bg-white rounded-2xl border border-gray-200 p-10">
            <p className="text-lg font-semibold text-[#111] mb-2">No teacher data to publish yet</p>
            <p className="text-gray-500 text-sm">
              Once teachers attend training and coaches start logging observations, this dashboard will populate
              automatically.
            </p>
          </div>
        </SectionWrapper>
      ) : (
        <>
          {/* Top stats */}
          {snapshot && (
            <SectionWrapper theme="light" className="py-14 border-t border-gray-100">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
                <div className="text-center">
                  <p className="text-4xl font-extrabold text-[#111] tabular-nums">
                    {formatNumber(snapshot.teachersTrainedTotal)}
                  </p>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mt-2">
                    Teachers trained <span className="block normal-case font-normal text-gray-400 mt-1">all-time</span>
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-extrabold text-[#066a67] tabular-nums">
                    {formatNumber(snapshot.teachersTrainedLast90d)}
                  </p>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mt-2">
                    Trained in last 90 days
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-extrabold text-[#111] tabular-nums">
                    {formatNumber(snapshot.teachersObserved)}
                  </p>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mt-2">
                    Teachers observed in classroom
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-extrabold text-[#111] tabular-nums">
                    {formatNumber(snapshot.observationsLast90d)}
                  </p>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mt-2">
                    Observations in last 90 days
                  </p>
                </div>
              </div>
            </SectionWrapper>
          )}

          {/* Lesson-quality distribution */}
          {snapshot && snapshot.ratedObservationsLast90d > 0 && (
            <SectionWrapper theme="off-white" className="py-16">
              <div className="max-w-4xl mx-auto">
                <div className="text-center mb-8">
                  <h2 className="text-2xl md:text-3xl font-bold text-[#111] tracking-tight">
                    Lesson quality across {formatNumber(snapshot.ratedObservationsLast90d)} observations (last 90 days)
                  </h2>
                  <p className="text-gray-600 mt-2 text-sm md:text-base">
                    Each rated observation falls into one of three post-observation tiers. We don&rsquo;t round these — they
                    come straight from the coach&rsquo;s rubric.
                  </p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
                  {[
                    { key: "fidelity", label: "Fidelity",  share: snapshot.fidelitySharePct, tone: "bg-emerald-600", chip: "Strong delivery" },
                    { key: "partial",  label: "Partial",   share: snapshot.partialSharePct,  tone: "bg-amber-500",   chip: "Coaching in progress" },
                    { key: "low",      label: "Low",       share: snapshot.lowSharePct,      tone: "bg-red-500",     chip: "Targeted support" },
                  ].map((tier) => (
                    <div key={tier.key} className="grid grid-cols-[160px_1fr_auto] items-center gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#111]">{tier.label}</p>
                        <p className="text-[11px] text-gray-500">{tier.chip}</p>
                      </div>
                      <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${tier.tone}`}
                          style={{ width: `${Math.max(tier.share ?? 0, (tier.share ?? 0) > 0 ? 2 : 0)}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-[#111] tabular-nums whitespace-nowrap">
                        {tier.share != null ? `${tier.share}%` : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </SectionWrapper>
          )}

          {/* Coaching delivery rate */}
          {coachingCompletion && (
            <SectionWrapper theme="light" className="py-16">
              <div className="max-w-3xl mx-auto bg-gradient-to-br from-emerald-50 to-white border border-emerald-100 rounded-2xl p-8 text-center">
                <span className="text-charius-orange font-semibold tracking-wider text-xs uppercase block mb-2">
                  Coaching follow-through
                </span>
                <p className="text-5xl md:text-6xl font-extrabold text-[#066a67] tabular-nums leading-none">
                  {coachingCompletion.completionPct}%
                </p>
                <p className="text-gray-700 text-base mt-4">
                  of {formatNumber(coachingCompletion.scheduledLast90d)} scheduled coaching visits in the last 90 days were actually delivered ({formatNumber(coachingCompletion.completedLast90d)}). Trained teachers don&rsquo;t learn alone — coaches walk into classrooms and observe.
                </p>
              </div>
            </SectionWrapper>
          )}
        </>
      )}

      {/* Methodology footer */}
      <SectionWrapper theme="charius-beige" className="py-14">
        <div className="max-w-3xl mx-auto text-center">
          <h3 className="text-xl font-bold text-[#111] mb-3">How this is computed</h3>
          <p className="text-gray-700 leading-relaxed text-sm md:text-base mb-4">
            <strong>Trained</strong> = distinct teachers who were marked attended on a portal training record.{" "}
            <strong>Observed</strong> = teachers with at least one classroom observation submitted by a coach.{" "}
            <strong>Lesson quality</strong> shares are computed only from the post-observation rating field, restricted
            to the trailing 90 days so the picture is current. <strong>Coaching follow-through</strong> measures the
            share of scheduled coaching visits whose implementation status is anything other than &quot;not started.&quot;
          </p>
          <Link href="/transparency" className="text-charius-orange font-semibold hover:underline">
            Read the full transparency methodology →
          </Link>
        </div>
      </SectionWrapper>
    </>
  );
}
