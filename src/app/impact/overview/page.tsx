import type { Metadata } from "next";
import Link from "next/link";
import { queryPostgres } from "@/lib/server/postgres/client";
import { getPublicObservationFidelityStatsPostgres } from "@/lib/server/postgres/repositories/phonics-observations";
import { SectionWrapper } from "@/components/public/SectionWrapper";
import { CTAStrip } from "@/components/public/CTAStrip";
import {
  School, Users, BookOpen, Activity, TrendingUp, Heart,
  Award, BarChart3, ChevronRight, CheckCircle
} from "lucide-react";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Our Impact | Ozeki Reading Bridge Foundation",
  description:
    "See the real numbers behind our literacy work — schools supported, teachers trained, learners reached, and measurable reading gains across Uganda.",
  openGraph: {
    title: "Our Impact | Ozeki Reading Bridge Foundation",
    description: "Live literacy impact data from schools across Uganda.",
  },
};

async function getLiveImpactKpis() {
  try {
    const [schools, teachers, learners, visits, trainings, assessments] = await Promise.all([
      queryPostgres(`SELECT COUNT(*)::int AS c FROM schools_directory`),
      queryPostgres(`SELECT COUNT(DISTINCT teacher_uid)::int AS c FROM teacher_roster`),
      queryPostgres(`SELECT COALESCE(SUM(direct_impact_total), 0)::int AS c FROM impact_public_school_scope`),
      queryPostgres(`SELECT COUNT(*)::int AS c FROM portal_records WHERE module = 'visit'`),
      queryPostgres(`SELECT COUNT(*)::int AS c FROM portal_records WHERE module = 'training'`),
      queryPostgres(`SELECT COUNT(DISTINCT learner_uid)::int AS c FROM assessment_records WHERE learner_uid IS NOT NULL`),
    ]);
    return {
      schools: Number(schools.rows[0]?.c ?? 0),
      teachers: Number(teachers.rows[0]?.c ?? 0),
      learners: Number(learners.rows[0]?.c ?? 0),
      visits: Number(visits.rows[0]?.c ?? 0),
      trainings: Number(trainings.rows[0]?.c ?? 0),
      assessedLearners: Number(assessments.rows[0]?.c ?? 0),
    };
  } catch {
    return { schools: 0, teachers: 0, learners: 0, visits: 0, trainings: 0, assessedLearners: 0 };
  }
}

async function getReadingOutcomeStats() {
  try {
    const res = await queryPostgres(`
      SELECT
        AVG(reading_comprehension_score) FILTER (WHERE assessment_type = 'baseline') AS baseline_comp,
        AVG(reading_comprehension_score) FILTER (WHERE assessment_type = 'endline')  AS endline_comp,
        COUNT(*) FILTER (WHERE assessment_type = 'baseline')::int AS baseline_count,
        COUNT(*) FILTER (WHERE assessment_type = 'endline')::int  AS endline_count
      FROM assessment_records
    `);
    const row = res.rows[0];
    const b = Number(row?.baseline_comp ?? 0);
    const e = Number(row?.endline_comp ?? 0);
    return {
      baselineComp: Math.round(b),
      endlineComp: Math.round(e),
      delta: e > 0 && b > 0 ? Math.round(((e - b) / b) * 100) : null,
      baselineCount: Number(row?.baseline_count ?? 0),
      endlineCount: Number(row?.endline_count ?? 0),
    };
  } catch {
    return { baselineComp: 0, endlineComp: 0, delta: null, baselineCount: 0, endlineCount: 0 };
  }
}

function fmt(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return n.toLocaleString();
}

export default async function ImpactOverviewPage() {
  const [kpis, reading, fidelity] = await Promise.all([
    getLiveImpactKpis(),
    getReadingOutcomeStats(),
    getPublicObservationFidelityStatsPostgres().catch(() => null),
  ]);

  const primaryKpis = [
    { label: "Schools Supported", value: fmt(kpis.schools), icon: School, color: "text-[#006b61]", bg: "bg-[#006b61]/10" },
    { label: "Teachers Trained", value: fmt(kpis.teachers), icon: Users, color: "text-[#FA7D15]", bg: "bg-[#FA7D15]/10" },
    { label: "Learners Reached", value: fmt(kpis.learners), icon: BookOpen, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Coaching Visits", value: fmt(kpis.visits), icon: Activity, color: "text-purple-600", bg: "bg-purple-50" },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#006b61] pt-28 pb-24 md:pt-36 md:pb-32">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.08),_transparent_60%)] pointer-events-none" />
        <div className="container mx-auto px-4 md:px-6 max-w-5xl relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white/90 font-semibold text-sm mb-8 border border-white/20">
            <TrendingUp className="w-4 h-4" /> Live Program Data
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight leading-tight mb-6">
            Reading Changes<br className="hidden md:block" /> Everything
          </h1>
          <p className="text-xl md:text-2xl text-white/80 max-w-3xl mx-auto leading-relaxed mb-10">
            Every number below is pulled live from our program database — schools reached,
            teachers coached, and learners whose reading improved because of your support.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/donate"
              className="btn-orange px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-2"
            >
              <Heart className="w-5 h-5" /> Donate Now
            </Link>
            <Link
              href="/sponsor"
              className="btn-green px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-2"
            >
              Sponsor a School <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Primary KPI Grid */}
      <SectionWrapper theme="off-white" className="!pb-0">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 -mt-12">
          {primaryKpis.map(({ label, value, icon: Icon, color, bg }) => (
            <div
              key={label}
              className="bg-white rounded-2xl border border-gray-100 shadow-md p-5 md:p-7 flex flex-col items-center text-center"
            >
              <div className={`w-12 h-12 rounded-full ${bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-6 h-6 ${color}`} />
              </div>
              <p className={`text-3xl md:text-4xl font-extrabold ${color}`}>{value}</p>
              <p className="text-sm text-gray-500 font-medium mt-1">{label}</p>
            </div>
          ))}
        </div>
      </SectionWrapper>

      {/* Reading Outcomes */}
      {reading.endlineCount > 0 && (
        <SectionWrapper theme="off-white">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#006b61]/10 text-[#006b61] text-sm font-semibold mb-4">
                <BarChart3 className="w-4 h-4" /> Reading Assessment Outcomes
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3">
                Measurable Reading Gains
              </h2>
              <p className="text-lg text-gray-500 max-w-2xl mx-auto">
                We track every learner from baseline through endline. These are the real
                comprehension score averages across {reading.endlineCount.toLocaleString()} endline assessments.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7 text-center">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Baseline Average</p>
                <p className="text-5xl font-extrabold text-gray-800">{reading.baselineComp}<span className="text-2xl text-gray-400">%</span></p>
                <p className="text-sm text-gray-500 mt-2">{reading.baselineCount.toLocaleString()} learners assessed</p>
              </div>
              <div className="bg-[#006b61] rounded-2xl shadow-md p-7 text-center flex flex-col items-center justify-center">
                {reading.delta !== null && reading.delta > 0 ? (
                  <>
                    <p className="text-xs font-bold text-white/60 uppercase tracking-widest mb-2">Improvement</p>
                    <p className="text-5xl font-extrabold text-white">+{reading.delta}<span className="text-2xl text-white/70">%</span></p>
                    <p className="text-sm text-white/80 mt-2">relative comprehension gain</p>
                  </>
                ) : (
                  <>
                    <p className="text-xs font-bold text-white/60 uppercase tracking-widest mb-2">Progress</p>
                    <p className="text-3xl font-extrabold text-white">Tracked</p>
                    <p className="text-sm text-white/80 mt-2">ongoing assessment cycle</p>
                  </>
                )}
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7 text-center">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Endline Average</p>
                <p className="text-5xl font-extrabold text-[#006b61]">{reading.endlineComp}<span className="text-2xl text-[#006b61]/50">%</span></p>
                <p className="text-sm text-gray-500 mt-2">{reading.endlineCount.toLocaleString()} learners assessed</p>
              </div>
            </div>
          </div>
        </SectionWrapper>
      )}

      {/* Teaching Quality (Fidelity) */}
      {fidelity && fidelity.totalSubmitted > 0 && (
        <SectionWrapper theme="charius-beige">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FA7D15]/10 text-[#FA7D15] text-sm font-semibold mb-4">
                <Award className="w-4 h-4" /> Teaching Quality Observations
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3">
                Coaching That Moves the Needle
              </h2>
              <p className="text-lg text-gray-500 max-w-2xl mx-auto">
                Every lesson observation is scored against a structured fidelity rubric.
                Fidelity means the teacher delivered the lesson with full program quality.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
              <div className="grid grid-cols-3 gap-6 mb-8">
                <div className="text-center">
                  <p className="text-4xl font-extrabold text-blue-700">{fidelity.fidelityCount}</p>
                  <p className="text-sm text-blue-600 font-semibold mt-1">Fidelity</p>
                  <p className="text-xs text-gray-400">full quality delivery</p>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-extrabold text-amber-600">{fidelity.partialCount}</p>
                  <p className="text-sm text-amber-600 font-semibold mt-1">Partial</p>
                  <p className="text-xs text-gray-400">in development</p>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-extrabold text-red-500">{fidelity.lowCount}</p>
                  <p className="text-sm text-red-500 font-semibold mt-1">Developing</p>
                  <p className="text-xs text-gray-400">needs coaching</p>
                </div>
              </div>

              {/* Fidelity bar */}
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                  <span>{fidelity.totalSubmitted} observations submitted</span>
                  <span>{fidelity.fidelityPct}% fidelity rate</span>
                </div>
                <div className="h-3 rounded-full bg-gray-100 overflow-hidden flex">
                  {fidelity.fidelityCount > 0 && (
                    <div
                      className="h-full bg-blue-500 transition-all"
                      style={{ width: `${(fidelity.fidelityCount / fidelity.totalSubmitted) * 100}%` }}
                    />
                  )}
                  {fidelity.partialCount > 0 && (
                    <div
                      className="h-full bg-amber-400"
                      style={{ width: `${(fidelity.partialCount / fidelity.totalSubmitted) * 100}%` }}
                    />
                  )}
                  {fidelity.lowCount > 0 && (
                    <div
                      className="h-full bg-red-400"
                      style={{ width: `${(fidelity.lowCount / fidelity.totalSubmitted) * 100}%` }}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </SectionWrapper>
      )}

      {/* What Your Support Funds */}
      <SectionWrapper theme="off-white">
        <div className="max-w-4xl mx-auto text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">
            What Your Support Makes Possible
          </h2>
          <p className="text-lg text-gray-500">
            Every contribution is linked directly to a program activity on the ground.
          </p>
        </div>
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-5">
          {[
            { amount: "$25", outcome: "Funds one coaching visit to a teacher in their classroom" },
            { amount: "$100", outcome: "Sponsors a full teacher training workshop day" },
            { amount: "$250", outcome: "Equips one school with structured phonics resources and baseline assessment" },
            { amount: "$1,000", outcome: "Funds a term of structured literacy support across 4–5 schools" },
          ].map(({ amount, outcome }) => (
            <div key={amount} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-start gap-4">
              <div className="shrink-0 w-14 h-14 rounded-xl bg-[#006b61]/10 flex items-center justify-center">
                <span className="text-lg font-extrabold text-[#006b61]">{amount}</span>
              </div>
              <div className="flex items-center gap-3 min-w-0">
                <CheckCircle className="w-5 h-5 text-[#006b61] shrink-0" />
                <p className="text-gray-700 font-medium leading-snug">{outcome}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionWrapper>

      {/* Secondary stats */}
      <SectionWrapper theme="brand">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { label: "Training Sessions", value: fmt(kpis.trainings) },
            { label: "Coaching Visits", value: fmt(kpis.visits) },
            { label: "Learners Assessed", value: fmt(kpis.assessedLearners) },
            { label: "Fidelity Rate", value: fidelity ? `${fidelity.fidelityPct}%` : "—" },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-4xl md:text-5xl font-extrabold text-white mb-2">{value}</p>
              <p className="text-white/70 text-sm font-medium uppercase tracking-wider">{label}</p>
            </div>
          ))}
        </div>
      </SectionWrapper>

      <CTAStrip
        heading="Ready to invest in a child's future?"
        subheading="Your donation directly funds schools, teachers, and reading programs. Every shilling is tracked and reported."
        primaryButtonText="Donate Now"
        primaryButtonHref="/donate"
        secondaryButtonText="Explore Full Data"
        secondaryButtonHref="/impact/dashboard"
        primaryButtonColor="bg-[#FA7D15]"
        primaryButtonHoverColor="hover:bg-[#FA7D15]/90"
        theme="brand"
      />
    </div>
  );
}
