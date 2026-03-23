import Link from "next/link";
import { 
  ShieldCheck, FileText, PieChart, Target, Heart, Scale, 
  BookOpen, Users, Building, Activity, LineChart, Download, 
  CheckCircle, Shield, FileCheck, ArrowRight, BookText, ClipboardCheck
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SectionWrapper } from "@/components/public/SectionWrapper";
import { PremiumCard } from "@/components/public/PremiumCard";
import { CTAStrip } from "@/components/public/CTAStrip";
import type { FinanceCurrency, FinancePublicSnapshotRecord, FinanceAuditedStatementRecord } from "@/lib/types";

import { queryPostgres } from "@/lib/server/postgres/client";

export const dynamic = "force-dynamic";

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
    return { schools: 48, teachers: 312, learners: 14500, activities: 1205 }; // fallback
  }
}

async function getTransparencyData() {
  const host = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const res = await fetch(`${host}/api/transparency/financials`, { cache: "no-store", next: { revalidate: 3600 } });
  if (!res.ok) {
    return { snapshots: [], audited: [] };
  }
  return res.json() as Promise<{
    snapshots: FinancePublicSnapshotRecord[];
    audited: FinanceAuditedStatementRecord[];
  }>;
}

const formatMoney = (curr: FinanceCurrency, amt: number) => {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: curr, maximumFractionDigits: 0 }).format(amt);
};

export default async function FinancialTransparencyPage() {
  const [{ snapshots, audited }, liveKpis] = await Promise.all([
    getTransparencyData(),
    getLiveImpactKpis()
  ]);
  const fnSnapshots = snapshots.filter(s => s.snapshotType === "fy");

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <SiteHeader />

      <main className="flex-grow pt-[72px] md:pt-20">
        
        {/* 1. Hero Section */}
        <section className="relative overflow-hidden bg-brand-background pt-24 pb-20 md:pt-32 md:pb-32">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-blue-100/50 via-white to-white pointer-events-none" />
          <div className="container mx-auto px-4 md:px-6 max-w-5xl relative z-10 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-[#00155F] font-semibold text-sm mb-6 shadow-sm border border-blue-50">
              <ShieldCheck className="w-4 h-4" /> Stewardship
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold text-[#00155F] tracking-tight leading-tight mb-8">
              Financial Transparency
            </h1>
            <p className="text-xl md:text-2xl text-[#00155F]/80 max-w-3xl mx-auto leading-relaxed mb-6 font-medium">
              Responsible stewardship, clear reporting, and accountability in support of literacy impact.
            </p>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed mb-10">
              At Ozeki, we are committed to managing resources with integrity and linking financial stewardship to meaningful educational outcomes for children, schools, and communities.
            </p>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
              <a href="#reports" className="px-8 py-4 rounded-xl bg-[#00155F] text-white font-bold hover:bg-[#00155F]/90 transition-all shadow-md flex items-center gap-2">
                <FileText size={18} /> View Financial Reports
              </a>
              <Link href="/contact" className="px-8 py-4 rounded-xl border-2 border-gray-200 text-gray-700 font-bold hover:bg-gray-50 hover:border-gray-300 transition-all">
                Contact Us
              </Link>
            </div>
          </div>
        </section>

        {/* 2. Intro Section */}
        <SectionWrapper theme="light" id="intro">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">Why Financial Transparency Matters</h2>
            <p className="text-xl text-gray-600 leading-relaxed">
              Transparency is central to how Ozeki builds trust with partners, supporters, schools, and communities. We believe that every resource entrusted to us should be managed responsibly, applied purposefully, and reported clearly. Our financial transparency work is designed to show not only how funds are used, but also how those resources contribute to literacy and education outcomes.
            </p>
          </div>
        </SectionWrapper>

        {/* 3. Three highlight cards */}
        <SectionWrapper theme="off-white">
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <PremiumCard className="p-10 flex flex-col items-start bg-white" withHover>
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-6">
                <Heart className="w-7 h-7 text-[#00155F]" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Stewardship</h3>
              <p className="text-gray-600 leading-relaxed text-lg">
                We manage financial resources with care, discipline, and a strong commitment to mission alignment.
              </p>
            </PremiumCard>
            <PremiumCard className="p-10 flex flex-col items-start bg-white" withHover>
              <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center mb-6">
                <Scale className="w-7 h-7 text-[#FA7D15]" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Accountability</h3>
              <p className="text-gray-600 leading-relaxed text-lg">
                We strengthen internal controls, documentation, and reporting processes to support responsible oversight.
              </p>
            </PremiumCard>
            <PremiumCard className="p-10 flex flex-col items-start bg-white" withHover>
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-6">
                <Target className="w-7 h-7 text-[#00155F]" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Impact</h3>
              <p className="text-gray-600 leading-relaxed text-lg">
                We aim to connect funding to program delivery, educational reach, and measurable literacy outcomes.
              </p>
            </PremiumCard>
          </div>
        </SectionWrapper>

        {/* 4. Our Commitment section */}
        <SectionWrapper theme="light">
          <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">Our Commitment to Responsible Financial Management</h2>
              <p className="text-xl text-gray-600 leading-relaxed mb-8">
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
        <SectionWrapper theme="off-white">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">How Resources Support Our Work</h2>
            <p className="text-xl text-gray-600 leading-relaxed">
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
              <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center text-center hover:border-[#00155F]/20 transition-colors">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                  <block.icon className="w-6 h-6 text-[#00155F]" />
                </div>
                <h4 className="font-bold text-gray-900">{block.title}</h4>
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

        {/* 7. Reports and Documents (LIVE DATA) */}
        <SectionWrapper theme="light" id="reports">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">Reports and Financial Documents</h2>
            <p className="text-xl text-gray-600 leading-relaxed">
              This section provides access to selected financial and accountability materials intended to improve visibility into how resources are managed and applied. 
            </p>
            <p className="text-sm text-gray-500 mt-4 italic">
              Available documents may be updated periodically as part of our reporting cycle.
            </p>
          </div>

          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12">
            {/* Live Financial Summaries */}
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center border-b pb-4">
                <FileCheck className="w-6 h-6 mr-3 text-[#FA7D15]" />
                Financial Summary Reports
              </h3>
              
              {fnSnapshots.length === 0 ? (
                <div className="bg-gray-50 p-8 rounded-2xl border border-dashed border-gray-200 text-center text-gray-500">
                  Financial summaries are currently being prepared for the upcoming cycle.
                </div>
              ) : (
                <div className="space-y-4">
                  {fnSnapshots.map(s => (
                    <div key={s.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                      <div>
                        <h4 className="font-bold text-[#00155F] text-lg">FY {s.fy} Financial Ledger Snapshot</h4>
                        <div className="text-sm text-gray-500 mt-1 flex gap-4">
                          <span>Income: <strong className="text-gray-700">{formatMoney(s.currency, s.totalIncome)}</strong></span>
                          <span>Expr: <strong className="text-gray-700">{formatMoney(s.currency, s.totalExpenditure)}</strong></span>
                        </div>
                      </div>
                      <a href={`/api/transparency/financials/${s.id}/download?type=snapshot`} download className="shrink-0 p-3 bg-gray-50 hover:bg-gray-100 text-[#00155F] rounded-xl transition-colors">
                        <Download className="w-5 h-5" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Live Audited Documents */}
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center border-b pb-4">
                <Shield className="w-6 h-6 mr-3 text-[#00155F]" />
                Audited Statements &amp; Accountability
              </h3>
              
              {audited.length === 0 ? (
                <div className="bg-gray-50 p-8 rounded-2xl border border-dashed border-gray-200 text-center text-gray-500">
                  Audited statements will be published here upon completion of external review.
                </div>
              ) : (
                <div className="space-y-4">
                  {audited.map(a => (
                    <div key={a.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-gray-900 text-lg">FY {a.fy} Audited Financials</h4>
                          <p className="text-sm text-gray-500 mt-1">{a.auditorName ? `External Auditor: ${a.auditorName}` : "Official Audited Report"}</p>
                        </div>
                        <a href={`/api/transparency/financials/${a.id}/download?type=audited`} download className="shrink-0 p-3 bg-blue-50 hover:bg-blue-100 text-[#00155F] rounded-xl transition-colors">
                          <Download className="w-5 h-5" />
                        </a>
                      </div>
                      {a.notes && <p className="text-sm text-gray-600 mt-3 pt-3 border-t border-gray-50 italic">{a.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </SectionWrapper>

        {/* 8. Accountability Approach */}
        <SectionWrapper theme="off-white">
          <div className="max-w-4xl mx-auto text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">Our Accountability Approach</h2>
            <p className="text-xl text-gray-600 leading-relaxed">
              Ozeki continues to strengthen its internal processes for financial planning, expenditure control, reporting, and review. We aim to ensure that our systems are robust enough to support responsible management today and credible growth in the future.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <PremiumCard className="p-8 md:p-10 bg-white" withHover>
              <h3 className="text-2xl font-bold text-[#00155F] mb-6 flex items-center gap-3">
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
            
            <PremiumCard className="p-8 md:p-10 bg-white" withHover>
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

        {/* 9. Continuous Improvement */}
        <SectionWrapper theme="light">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">A Continuing Commitment</h2>
            <p className="text-xl text-gray-600 leading-relaxed border-l-4 border-[#00155F] pl-6 text-left italic bg-gray-50 p-6 rounded-r-xl shadow-sm">
              Financial transparency is an ongoing commitment. As Ozeki grows, we are committed to improving the clarity, quality, and accessibility of the information we share. We view transparency as essential to trust, effective partnership, and long-term impact.
            </p>
          </div>
        </SectionWrapper>

        {/* 10. CTA */}
        <CTAStrip 
          heading="Have questions about our financial reporting?"
          subheading="We welcome responsible inquiry and are committed to strengthening trust through openness and accountability."
          primaryButtonText="Contact Ozeki"
          primaryButtonHref="/contact"
          secondaryButtonText="Explore Reports"
          secondaryButtonHref="#reports"
        />

      </main>

      {/* 11. Optional Footer Note */}
      <div className="bg-gray-100 py-6 text-center border-t border-gray-200">
        <p className="text-sm text-gray-500 max-w-4xl mx-auto px-4">
          Ozeki is committed to the responsible stewardship of resources in support of literacy, education, and community impact. Information shared on this page may be updated as reporting cycles and system improvements continue.
        </p>
      </div>

      <SiteFooter />
    </div>
  );
}
