import Link from "next/link";
import {
  ShieldCheck, FileText, PieChart, Target, Heart, Scale,
  BookOpen, Users, Building, Activity, LineChart, Download,
  CheckCircle, Shield, FileCheck, ArrowRight, BookText, ClipboardCheck,
  TrendingUp, Award, BarChart3
} from "lucide-react";
import { SectionWrapper } from "@/components/public/SectionWrapper";
import { PremiumCard } from "@/components/public/PremiumCard";
import { CTAStrip } from "@/components/public/CTAStrip";
import { PublicReportDownloader } from "@/components/public/PublicReportDownloader";
import type { FinanceCurrency, FinancePublicSnapshotRecord, FinanceAuditedStatementRecord } from "@/lib/types";
import { getPublicObservationFidelityStatsPostgres } from "@/lib/server/postgres/repositories/phonics-observations";
import { getTransparencyLiveStatsPostgres } from "@/lib/server/postgres/repositories/finance-intelligence";
import { queryPostgres } from "@/lib/server/postgres/client";
import { DollarSign, PercentCircle } from "lucide-react";

export const revalidate = 300;

export const metadata = {
  title: "Financial Transparency | Ozeki Reading Bridge Foundation",
  description: "Responsible stewardship, clear reporting, and accountability in support of literacy impact.",
};

async function getLiveImpactKpis() {
  try {
    const [schools, teachers, learners, activities] = await Promise.all([
      queryPostgres("SELECT count(*)::int as count FROM schools_directory"),
      queryPostgres("SELECT count(*)::int as count FROM school_contacts WHERE category ILIKE '%Teacher%' OR category ILIKE '%Head%'"),
      queryPostgres("SELECT count(*)::int as count FROM school_learners"),
      queryPostgres("SELECT count(*)::int as count FROM portal_evidence")
    ]);
    return {
      schools: schools.rows[0]?.count || 0,
      teachers: teachers.rows[0]?.count || 0,
      learners: learners.rows[0]?.count || 0,
      activities: activities.rows[0]?.count || 0,
    };
  } catch (err) {
    console.error("Failed to fetch transparency KPIs", err);
    // Return zeros on failure rather than stale placeholder numbers; the UI
    // treats 0 as "data unavailable" and messaging is reviewed via Sentry alerts.
    return { schools: 0, teachers: 0, learners: 0, activities: 0 };
  }
}

async function getTransparencyData(): Promise<{
  snapshots: FinancePublicSnapshotRecord[];
  audited: FinanceAuditedStatementRecord[];
}> {
  // Direct repository call — self-fetching /api/* during SSG causes
  // "socket hang up" on build hosts (no dev server running).
  try {
    const { listFinancePublicSnapshotsPostgres, listFinanceAuditedStatementsPostgres } =
      await import("@/lib/server/postgres/repositories/finance");
    const [snapshots, audited] = await Promise.all([
      listFinancePublicSnapshotsPostgres({ publishedOnly: true }),
      listFinanceAuditedStatementsPostgres({ publishedOnly: true }),
    ]);
    return {
      snapshots: snapshots as unknown as FinancePublicSnapshotRecord[],
      audited: audited as unknown as FinanceAuditedStatementRecord[],
    };
  } catch {
    return { snapshots: [], audited: [] };
  }
}

const formatMoney = (curr: FinanceCurrency, amt: number) => {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: curr, maximumFractionDigits: 0 }).format(amt);
};

async function getProgramEvidenceData() {
  try {
    const [fidelityStats, outcomeRes, trainingRes] = await Promise.all([
      getPublicObservationFidelityStatsPostgres(),
      queryPostgres(`
        SELECT
          AVG(reading_comprehension_score) FILTER (WHERE assessment_type = 'baseline')::numeric AS baseline_comp,
          AVG(reading_comprehension_score) FILTER (WHERE assessment_type = 'endline')::numeric  AS endline_comp,
          COUNT(*) FILTER (WHERE assessment_type = 'endline')::int AS endline_count
        FROM assessment_records
      `),
      queryPostgres(`
        SELECT COUNT(*)::int AS training_count FROM portal_records WHERE module = 'training'
      `),
    ]);
    const row = outcomeRes.rows[0];
    const b = Number(row?.baseline_comp ?? 0);
    const e = Number(row?.endline_comp ?? 0);
    return {
      fidelity: fidelityStats,
      baselineComp: Math.round(b),
      endlineComp: Math.round(e),
      compDelta: e > 0 && b > 0 ? Math.round(((e - b) / b) * 100) : null,
      endlineCount: Number(row?.endline_count ?? 0),
      trainingCount: Number(trainingRes.rows[0]?.training_count ?? 0),
    };
  } catch {
    return null;
  }
}

export default async function FinancialTransparencyPage() {
  const [{ snapshots, audited }, liveKpis, programEvidence, liveFinance] = await Promise.all([
    getTransparencyData(),
    getLiveImpactKpis(),
    getProgramEvidenceData(),
    getTransparencyLiveStatsPostgres().catch(() => null),
  ]);
  const fnSnapshots = snapshots.filter(s => s.snapshotType === "fy");

  return (
    <div className="pt-[72px] md:pt-20">
        
        {/* 1. Hero Section */}
        <section className="relative overflow-hidden bg-brand-background pt-24 pb-20 md:pt-32 md:pb-32">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-[#006b61]/10 via-white to-white pointer-events-none" />
          <div className="container mx-auto px-4 md:px-6 max-w-5xl relative z-10 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-[#006b61] font-semibold text-sm mb-6 shadow-sm border border-[#006b61]/10">
              <ShieldCheck className="w-4 h-4" /> Stewardship
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold text-[#006b61] tracking-tight leading-tight mb-8">
              Financial Transparency
            </h1>
            <p className="text-xl md:text-2xl text-[#006b61]/80 max-w-3xl mx-auto leading-relaxed mb-6 font-medium">
              Responsible stewardship, clear reporting, and accountability in support of literacy impact.
            </p>
            <p className="text-lg text-gray-500 max-w-3xl mx-auto leading-relaxed mb-10">
              At Ozeki, we are committed to managing resources with integrity and linking financial stewardship to meaningful educational outcomes for children, schools, and communities.
            </p>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
              <a href="#reports" className="px-8 py-4 rounded-xl bg-[#006b61] text-white font-bold hover:bg-[#006b61]/90 transition-all shadow-md flex items-center gap-2">
                <FileText size={18} /> View Financial Reports
              </a>
              <Link href="/contact" className="px-8 py-4 rounded-xl bg-[#FA7D15] text-white font-bold hover:bg-[#FA7D15]/90 transition-all shadow-md">
                Contact Us
              </Link>
            </div>
          </div>
        </section>

        {/* 2. Intro Section */}
        <SectionWrapper theme="charius-beige" id="intro">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-[#111] mb-6">Why Financial Transparency Matters</h2>
            <p className="text-xl text-gray-500 leading-relaxed">
              Transparency is central to how Ozeki builds trust with partners, supporters, schools, and communities. We believe that every resource entrusted to us should be managed responsibly, applied purposefully, and reported clearly. Our financial transparency work is designed to show not only how funds are used, but also how those resources contribute to literacy and education outcomes.
            </p>
          </div>
        </SectionWrapper>

        {/* 3. Three highlight cards */}
        <SectionWrapper theme="charius-beige">
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <PremiumCard variant="charius" className="p-10 flex flex-col items-start bg-white" withHover>
              <div className="w-14 h-14 rounded-2xl bg-[#006b61]/10 flex items-center justify-center mb-6">
                <Heart className="w-7 h-7 text-[#006b61]" />
              </div>
              <h3 className="text-2xl font-bold text-[#111] mb-4">Stewardship</h3>
              <p className="text-gray-500 leading-relaxed text-lg">
                We manage financial resources with care, discipline, and a strong commitment to mission alignment.
              </p>
            </PremiumCard>
            <PremiumCard variant="charius" className="p-10 flex flex-col items-start bg-white" withHover>
              <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center mb-6">
                <Scale className="w-7 h-7 text-[#FA7D15]" />
              </div>
              <h3 className="text-2xl font-bold text-[#111] mb-4">Accountability</h3>
              <p className="text-gray-500 leading-relaxed text-lg">
                We strengthen internal controls, documentation, and reporting processes to support responsible oversight.
              </p>
            </PremiumCard>
            <PremiumCard variant="charius" className="p-10 flex flex-col items-start bg-white" withHover>
              <div className="w-14 h-14 rounded-2xl bg-[#006b61]/10 flex items-center justify-center mb-6">
                <Target className="w-7 h-7 text-[#006b61]" />
              </div>
              <h3 className="text-2xl font-bold text-[#111] mb-4">Impact</h3>
              <p className="text-gray-500 leading-relaxed text-lg">
                We aim to connect funding to program delivery, educational reach, and measurable literacy outcomes.
              </p>
            </PremiumCard>
          </div>
        </SectionWrapper>

        {/* 4. Our Commitment section */}
        <SectionWrapper theme="charius-beige">
          <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-[#111] mb-6">Our Commitment to Responsible Financial Management</h2>
              <p className="text-xl text-gray-500 leading-relaxed mb-8">
                Ozeki is committed to maintaining sound financial practices that promote trust, accountability, and sustainability. We work to ensure that our financial systems support program delivery, responsible decision-making, and transparent communication with stakeholders.
              </p>
            </div>
            <div className="bg-white p-8 md:p-10 rounded-3xl shadow-sm border border-gray-100">
              <ul className="space-y-4">
                {[
                  "Accurate and timely financial recordkeeping",
                  "Budget planning and expenditure oversight",
                  "Clear documentation of financial activity",
                  "Transparent reporting to stakeholders",
                  "Alignment between funding and mission priorities",
                  "Continuous strengthening of financial systems and controls"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-[#FA7D15] shrink-0 mt-0.5" />
                    <span className="text-lg text-gray-700 font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </SectionWrapper>

        {/* 5. How Funds Are Used */}
        <SectionWrapper theme="charius-beige">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#111] mb-6">How Resources Support Our Work</h2>
            <p className="text-xl text-gray-500 leading-relaxed">
              Financial resources support the implementation of Ozeki’s literacy and education mission across programmatic and operational areas. We aim to direct resources toward activities that create meaningful and measurable benefit for schools, teachers, and learners.
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 max-w-5xl mx-auto mb-10">
            {[
              { title: "Literacy Programs", icon: BookOpen },
              { title: "Teacher Training", icon: Users },
              { title: "School Support Visits", icon: Building },
              { title: "Learner Assessments", icon: LineChart },
              { title: "Educational Resources", icon: FileText },
              { title: "1001 Story Program", icon: BookText },
              { title: "Training Follow Ups", icon: Target },
              { title: "Teacher Reading Lesson Evaluation and Coaching", icon: ClipboardCheck },
              { title: "Systems and Operations", icon: Activity }
            ].map((block, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center text-center hover:border-[#006b61]/20 transition-colors">
                <div className="w-12 h-12 rounded-full bg-[#006b61]/10 flex items-center justify-center mb-4">
                  <block.icon className="w-6 h-6 text-[#006b61]" />
                </div>
                <h4 className="font-bold text-brand-primary">{block.title}</h4>
              </div>
            ))}
          </div>
          <p className="text-center text-gray-500 max-w-3xl mx-auto font-medium">
            These investments help Ozeki deliver, monitor, and strengthen interventions that support learning improvement.
          </p>
        </SectionWrapper>

        {/* 6. Finance and Impact */}
        <SectionWrapper theme="brand">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Linking Financial Stewardship to Educational Impact</h2>
            <p className="text-xl text-white/90 leading-relaxed">
              We believe financial reporting should go beyond expenditure totals. It should also help explain what those resources make possible. Ozeki is strengthening its ability to link funding to outputs and outcomes such as schools reached, teachers supported, learners engaged, and literacy progress achieved.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-4 max-w-6xl mx-auto mb-12">
            {[
              { label: "Schools Supported", value: liveKpis.schools },
              { label: "Teachers Reached", value: liveKpis.teachers },
              { label: "Learners Impacted", value: liveKpis.learners },
              { label: "Activities Delivered", value: liveKpis.activities }
            ].map((kpi, i) => (
              <div key={i} className="bg-white/10 border border-white/20 p-6 flex flex-col items-center text-center rounded-2xl backdrop-blur-sm">
                <PieChart className="w-8 h-8 text-white mb-4 opacity-80" />
                <span className="text-white/80 uppercase text-xs font-bold tracking-wider mb-1">{kpi.label}</span>
                <span className="text-white font-extrabold text-3xl">{kpi.value.toLocaleString()}</span>
              </div>
            ))}
          </div>

          <div className="text-center">
            <p className="inline-block bg-white/10 text-white/80 px-6 py-2 rounded-full text-sm font-medium border border-white/10">
              As our systems continue to improve, this page will increasingly connect financial information with program evidence and results.
            </p>
          </div>
        </SectionWrapper>

        {/* 6B. LIVE Financial Snapshot — receipts, expenditure, cost-per-learner */}
        {liveFinance && liveFinance.totalSpentUgx > 0 && (
          <SectionWrapper theme="off-white">
            <div className="max-w-4xl mx-auto text-center mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                LIVE DATA · Updated {new Date(liveFinance.updatedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-[#111] mb-4">
                Live Financial Snapshot
              </h2>
              <p className="text-xl text-gray-500 leading-relaxed">
                Every figure below reflects the actual state of our ledger right now,
                pulled directly from the programme database.
              </p>
            </div>

            <div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-4 mb-8">
              <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5 text-center">
                <div className="flex items-center gap-2 justify-center mb-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Total Received</p>
                </div>
                <p className="text-2xl font-extrabold text-emerald-700">
                  UGX {liveFinance.totalReceivedUgx.toLocaleString()}
                </p>
                <p className="text-xs text-gray-400 mt-1">≈ ${liveFinance.totalReceivedUsd.toLocaleString()}</p>
              </div>
              <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5 text-center">
                <div className="flex items-center gap-2 justify-center mb-2">
                  <DollarSign className="w-4 h-4 text-blue-600" />
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Total Spent</p>
                </div>
                <p className="text-2xl font-extrabold text-blue-700">
                  UGX {liveFinance.totalSpentUgx.toLocaleString()}
                </p>
                <p className="text-xs text-gray-400 mt-1">≈ ${liveFinance.totalSpentUsd.toLocaleString()}</p>
              </div>
              <div className="rounded-2xl bg-[#006b61] shadow-md p-5 text-center">
                <div className="flex items-center gap-2 justify-center mb-2">
                  <PercentCircle className="w-4 h-4 text-white/70" />
                  <p className="text-xs font-bold text-white/70 uppercase tracking-widest">Programme Delivery</p>
                </div>
                <p className="text-2xl font-extrabold text-white">
                  {liveFinance.programmeDeliveryPct}%
                </p>
                <p className="text-xs text-white/70 mt-1">direct-to-classroom spend</p>
              </div>
              <div className="rounded-2xl bg-[#FA7D15] shadow-md p-5 text-center">
                <div className="flex items-center gap-2 justify-center mb-2">
                  <PercentCircle className="w-4 h-4 text-white/70" />
                  <p className="text-xs font-bold text-white/70 uppercase tracking-widest">Cost per Learner</p>
                </div>
                <p className="text-2xl font-extrabold text-white">
                  UGX {liveFinance.costPerLearnerUgx.toLocaleString()}
                </p>
                <p className="text-xs text-white/70 mt-1">≈ ${liveFinance.costPerLearnerUsd.toLocaleString()} per learner assessed</p>
              </div>
            </div>

            {/* Programme delivery bar */}
            <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex justify-between items-baseline mb-2">
                <p className="text-sm font-bold text-gray-700">
                  Programme delivery vs administration
                </p>
                <p className="text-xs text-gray-400">of total expenditure</p>
              </div>
              <div className="h-8 rounded-lg bg-gray-100 overflow-hidden flex">
                <div
                  className="h-full bg-[#006b61] flex items-center justify-center text-white text-xs font-bold"
                  style={{ width: `${liveFinance.programmeDeliveryPct}%` }}
                >
                  {liveFinance.programmeDeliveryPct}% Programme
                </div>
                <div
                  className="h-full bg-gray-400 flex items-center justify-center text-white text-xs font-bold"
                  style={{ width: `${100 - liveFinance.programmeDeliveryPct}%` }}
                >
                  {100 - liveFinance.programmeDeliveryPct}% Admin / Overhead
                </div>
              </div>
            </div>
          </SectionWrapper>
        )}

        {/* 7. Program Evidence — links funding to outcomes */}
        {programEvidence && (
          <SectionWrapper theme="charius-beige">
            <div className="max-w-4xl mx-auto text-center mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#006b61]/10 text-[#006b61] text-sm font-semibold mb-4">
                <TrendingUp className="w-4 h-4" /> Program Evidence
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-[#111] mb-4">
                What the Funds Deliver
              </h2>
              <p className="text-xl text-gray-500 leading-relaxed">
                Financial stewardship is only meaningful when linked to real outcomes.
                These numbers come directly from our program database.
              </p>
            </div>

            <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6 mb-8">
              {/* Reading improvement */}
              {programEvidence.endlineCount > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7 text-center">
                  <div className="w-12 h-12 rounded-full bg-[#006b61]/10 flex items-center justify-center mx-auto mb-4">
                    <BarChart3 className="w-6 h-6 text-[#006b61]" />
                  </div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                    Comprehension Gain
                  </p>
                  <p className="text-4xl font-extrabold text-[#006b61]">
                    {programEvidence.compDelta !== null && programEvidence.compDelta > 0
                      ? `+${programEvidence.compDelta}%`
                      : `${programEvidence.endlineComp}%`}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    {programEvidence.compDelta !== null && programEvidence.compDelta > 0
                      ? `relative improvement — ${programEvidence.endlineCount.toLocaleString()} endline assessments`
                      : `average endline score across ${programEvidence.endlineCount.toLocaleString()} learners`}
                  </p>
                </div>
              )}

              {/* Teaching quality */}
              {programEvidence.fidelity.totalSubmitted > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7 text-center">
                  <div className="w-12 h-12 rounded-full bg-[#FA7D15]/10 flex items-center justify-center mx-auto mb-4">
                    <Award className="w-6 h-6 text-[#FA7D15]" />
                  </div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                    Teaching Fidelity
                  </p>
                  <p className="text-4xl font-extrabold text-[#FA7D15]">
                    {programEvidence.fidelity.fidelityPct}%
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    of {programEvidence.fidelity.totalSubmitted} lesson observations at full program fidelity
                  </p>
                  <div className="mt-4 h-2 rounded-full bg-gray-100 overflow-hidden flex">
                    <div
                      className="h-full bg-blue-500"
                      style={{ width: `${(programEvidence.fidelity.fidelityCount / programEvidence.fidelity.totalSubmitted) * 100}%` }}
                    />
                    <div
                      className="h-full bg-amber-400"
                      style={{ width: `${(programEvidence.fidelity.partialCount / programEvidence.fidelity.totalSubmitted) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Training delivery */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7 text-center">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
                  <LineChart className="w-6 h-6 text-blue-600" />
                </div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                  Training Sessions
                </p>
                <p className="text-4xl font-extrabold text-blue-700">
                  {programEvidence.trainingCount.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  teacher training sessions delivered across schools
                </p>
              </div>
            </div>

            <div className="max-w-3xl mx-auto text-center">
              <Link
                href="/impact/overview"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#006b61] text-white font-semibold text-sm hover:bg-[#006b61]/90 transition-colors"
              >
                <TrendingUp className="w-4 h-4" /> Explore Full Impact Data
              </Link>
            </div>
          </SectionWrapper>
        )}

        {/* 8. Reports and Documents (LIVE DATA) */}
        <SectionWrapper theme="charius-beige" id="reports">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[#111] mb-6">Reports and Financial Documents</h2>
            <p className="text-xl text-gray-500 leading-relaxed">
              This section provides access to selected financial and accountability materials intended to improve visibility into how resources are managed and applied. 
            </p>
            <p className="text-sm text-gray-500 mt-4 italic">
              Available documents may be updated periodically as part of our reporting cycle.
            </p>
          </div>

          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12">
            {/* Live Financial Summaries */}
            <div>
              <h3 className="text-2xl font-bold text-[#111] mb-6 flex items-center border-b pb-4">
                <FileCheck className="w-6 h-6 mr-3 text-[#FA7D15]" />
                Financial Summary Reports
              </h3>
              
              {fnSnapshots.length === 0 ? (
                <PublicReportDownloader 
                  type="summary"
                  options={[
                    { label: "FY 2028 Financial Summary", value: "2028" },
                    { label: "FY 2027 Financial Summary", value: "2027" },
                    { label: "FY 2026 Financial Summary", value: "2026" }
                  ]}
                />
              ) : (
                <div className="space-y-4">
                  {fnSnapshots.map(s => (
                    <div key={s.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                      <div>
                        <h4 className="font-bold text-[#006b61] text-lg">FY {s.fy} Financial Ledger Snapshot</h4>
                        <div className="text-sm text-gray-500 mt-1 flex gap-4">
                          <span>Income: <strong className="text-gray-700">{formatMoney(s.currency, s.totalIncome)}</strong></span>
                          <span>Expr: <strong className="text-gray-700">{formatMoney(s.currency, s.totalExpenditure)}</strong></span>
                        </div>
                      </div>
                      <a href={`/api/transparency/financials/${s.id}/download?type=snapshot`} download className="shrink-0 p-3 bg-gray-50 hover:bg-gray-100 text-[#006b61] rounded-xl transition-colors">
                        <Download className="w-5 h-5" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Live Audited Documents */}
            <div>
              <h3 className="text-2xl font-bold text-[#111] mb-6 flex items-center border-b pb-4">
                <Shield className="w-6 h-6 mr-3 text-[#006b61]" />
                Audited Statements &amp; Accountability
              </h3>
              
              {audited.length === 0 ? (
                <PublicReportDownloader 
                  type="audit"
                  buttonColor="bg-[#FA7D15]"
                  buttonHoverColor="hover:bg-[#FA7D15]/90"
                  options={[
                    { label: "2028 Audited Financials", value: "2028" },
                    { label: "2027 Audited Financials", value: "2027" },
                    { label: "2026 Audited Financials", value: "2026" }
                  ]}
                />
              ) : (
                <div className="space-y-4">
                  {audited.map(a => (
                    <div key={a.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-brand-primary text-lg">FY {a.fy} Audited Financials</h4>
                          <p className="text-sm text-gray-500 mt-1">{a.auditorName ? `External Auditor: ${a.auditorName}` : "Official Audited Report"}</p>
                        </div>
                        <a href={`/api/transparency/financials/${a.id}/download?type=audited`} download className="shrink-0 p-3 bg-[#006b61]/10 hover:bg-[#006b61]/20 text-[#006b61] rounded-xl transition-colors">
                          <Download className="w-5 h-5" />
                        </a>
                      </div>
                      {a.notes && <p className="text-sm text-gray-500 mt-3 pt-3 border-t border-gray-50 italic">{a.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </SectionWrapper>

        {/* 9. Accountability Approach */}
        <SectionWrapper theme="charius-beige">
          <div className="max-w-4xl mx-auto text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-[#111] mb-6">Our Accountability Approach</h2>
            <p className="text-xl text-gray-500 leading-relaxed">
              Ozeki continues to strengthen its internal processes for financial planning, expenditure control, reporting, and review. We aim to ensure that our systems are robust enough to support responsible management today and credible growth in the future.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <PremiumCard variant="charius" className="p-8 md:p-10 bg-white" withHover>
              <h3 className="text-2xl font-bold text-[#006b61] mb-6 flex items-center gap-3">
                <FileText className="w-6 h-6" /> Financial Management
              </h3>
              <ul className="space-y-4">
                {["Budgeting and planning", "Expenditure monitoring", "Transaction documentation", "Income and expense tracking"].map((pt, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <ArrowRight className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                    <span className="font-medium text-gray-700">{pt}</span>
                  </li>
                ))}
              </ul>
            </PremiumCard>
            
            <PremiumCard variant="charius" className="p-8 md:p-10 bg-white" withHover>
              <h3 className="text-2xl font-bold text-[#FA7D15] mb-6 flex items-center gap-3">
                <ShieldCheck className="w-6 h-6" /> Governance and Oversight
              </h3>
              <ul className="space-y-4">
                {["Reporting discipline", "Financial review processes", "Responsible use of restricted and unrestricted funds", "Transparency to partners and stakeholders"].map((pt, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <ArrowRight className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                    <span className="font-medium text-gray-700">{pt}</span>
                  </li>
                ))}
              </ul>
            </PremiumCard>
          </div>
        </SectionWrapper>

        {/* 10. Continuous Improvement */}
        <SectionWrapper theme="charius-beige">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-[#111] mb-6">A Continuing Commitment</h2>
            <p className="text-xl text-gray-500 leading-relaxed border-l-4 border-[#006b61] pl-6 text-left italic bg-gray-50 p-6 rounded-r-xl shadow-sm">
              Financial transparency is an ongoing commitment. As Ozeki grows, we are committed to improving the clarity, quality, and accessibility of the information we share. We view transparency as essential to trust, effective partnership, and long-term impact.
            </p>
          </div>
        </SectionWrapper>

        {/* 11. CTA */}
        <CTAStrip 
          heading="Have questions about our financial reporting?"
          subheading="We welcome responsible inquiry and are committed to strengthening trust through openness and accountability."
          primaryButtonText="Contact Ozeki"
          primaryButtonHref="/contact"
          primaryButtonColor="bg-[#FA7D15]"
          primaryButtonHoverColor="hover:bg-[#FA7D15]/90"
          secondaryButtonText="Explore Reports"
          secondaryButtonHref="#reports"
        />

      <div className="bg-gray-100 py-6 text-center border-t border-gray-200">
        <p className="text-sm text-gray-500 max-w-4xl mx-auto px-4">
          Ozeki is committed to the responsible stewardship of resources in support of literacy, education, and community impact. Information shared on this page may be updated as reporting cycles and system improvements continue.
        </p>
      </div>
    </div>
  );
}
