import Link from "next/link";
import { requirePortalUser, getPortalHomePath } from "@/lib/auth";
import { redirect } from "next/navigation";
import { OzekiPortalShell } from "@/components/portal/OzekiPortalShell";
import {
  Calendar, ChevronDown, ChevronRight, ChevronLeft, Download, Plus, Filter,
  ArrowUpRight, FileText, Sparkles, Info,
  BarChart3, GraduationCap, ClipboardCheck, MapPin, BookOpen,
  Layers, Wallet, Heart, ShieldCheck, FileBarChart,
  TrendingUp, Clock, FileCheck, FileSpreadsheet, MoreVertical,
  type LucideIcon,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Reports | Ozeki Portal",
  description:
    "Generate, analyze, and export reports across the Ozeki Reading Bridge Foundation literacy network.",
};

/* Screenshot fallback values — used so the page is fully populated even
   when DB metrics aren't wired up. */
const FALLBACK_KPIS = {
  totalReports: 128, totalDelta: 16,
  generated: 42, generatedDelta: 12,
  downloads: 1256, downloadsDelta: 8,
  scheduled: 18, scheduledDelta: 5,
  dataCoverage: 87, coverageDelta: 6,
};

const QUICK_REPORTS: {
  href: string; icon: LucideIcon; iconBg: string; iconColor: string;
  cardBg: string; title: string; body: string;
}[] = [
  { href: "/portal/reports?tab=school-reading-performance", icon: BarChart3, iconBg: "#dcfce7", iconColor: "#047857", cardBg: "#f0fdf4", title: "School Performance", body: "Overall school performance analysis" },
  { href: "/portal/reports?tab=impact-reports", icon: GraduationCap, iconBg: "#dbeafe", iconColor: "#1d4ed8", cardBg: "#eff6ff", title: "Learner Outcomes", body: "Assessment and learning outcomes report" },
  { href: "/portal/reports?tab=training-reports", icon: ClipboardCheck, iconBg: "#f3e8ff", iconColor: "#7c3aed", cardBg: "#faf5ff", title: "Training Summary", body: "Training activities and attendance" },
  { href: "/portal/reports?tab=operations", icon: MapPin, iconBg: "#ffedd5", iconColor: "#c2410c", cardBg: "#fff7ed", title: "Visit & Coaching", body: "School visits and coaching report" },
  { href: "/portal/reports?tab=impact-reports", icon: BookOpen, iconBg: "#e0f2fe", iconColor: "#0369a1", cardBg: "#f0f9ff", title: "Assessment Summary", body: "Assessment completion and results" },
  { href: "/portal/stories", icon: Sparkles, iconBg: "#fce7f3", iconColor: "#be185d", cardBg: "#fdf2f8", title: "Story Collection", body: "1001 Story collection and engagement" },
  { href: "/portal/insights", icon: Layers, iconBg: "#dcfce7", iconColor: "#047857", cardBg: "#f0fdf4", title: "Program Coverage", body: "Program implementation coverage report" },
  { href: "/portal/finance/reports", icon: Wallet, iconBg: "#ecfdf5", iconColor: "#047857", cardBg: "#f0fdf4", title: "Finance Overview", body: "Financial summary and overview" },
  { href: "/portal/finance/transparency", icon: Heart, iconBg: "#fee2e2", iconColor: "#b91c1c", cardBg: "#fef2f2", title: "Donor Report", body: "Donor impact and ROI report" },
  { href: "/portal/data-quality", icon: ShieldCheck, iconBg: "#dbeafe", iconColor: "#1d4ed8", cardBg: "#eff6ff", title: "Data Quality", body: "Data quality and completeness report" },
];

const RECENT_REPORTS: {
  name: string; category: string; generatedBy: string;
  date: string; format: "PDF" | "Excel"; status: string;
}[] = [
  { name: "Q2 School Performance Report", category: "School Performance", generatedBy: "Ozeki Team", date: "Jun 10, 2024 • 9:45 AM", format: "PDF", status: "Completed" },
  { name: "May Learner Outcomes Summary", category: "Learner Outcomes", generatedBy: "System", date: "Jun 10, 2024 • 8:30 AM", format: "Excel", status: "Completed" },
  { name: "Training Activities Report", category: "Training Summary", generatedBy: "Ozeki Team", date: "Jun 9, 2024 • 4:15 PM", format: "PDF", status: "Completed" },
  { name: "School Visit Summary", category: "Visit & Coaching", generatedBy: "Coach Admin", date: "Jun 9, 2024 • 2:20 PM", format: "Excel", status: "Completed" },
  { name: "Assessment Results Report", category: "Assessment Summary", generatedBy: "System", date: "Jun 8, 2024 • 11:10 AM", format: "PDF", status: "Completed" },
  { name: "Program Coverage Report", category: "Program Coverage", generatedBy: "Ozeki Team", date: "Jun 8, 2024 • 9:00 AM", format: "PDF", status: "Completed" },
  { name: "Q2 Finance Overview", category: "Finance Overview", generatedBy: "Finance Officer", date: "Jun 7, 2024 • 3:45 PM", format: "Excel", status: "Completed" },
  { name: "Donor Impact Report", category: "Donor Report", generatedBy: "Ozeki Team", date: "Jun 7, 2024 • 10:30 AM", format: "PDF", status: "Completed" },
];

export default async function ReportsPage() {
  const user = await requirePortalUser();

  // Allowed roles: Staff, Admin, Volunteer, Accountant + super admin (matches PortalShell rules).
  if (!user.isSuperAdmin && !["Staff", "Admin", "Volunteer", "Accountant"].includes(user.role)) {
    redirect(getPortalHomePath(user));
  }

  // Date range header pill — rolling 30-day window.
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 30);
  const fmtRange = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const dateRangeLabel = `${fmtRange(start)} – ${fmtRange(end)}`;

  return (
    <OzekiPortalShell
      user={user}
      activeHref="/portal/reports"
      greeting={`Welcome back, ${user.fullName ?? "Ozeki Team"} 👋`}
      subtitle="Generate, analyze, and export reports across your literacy network."
      hideFrame
    >
      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-5 max-w-[1600px] mx-auto">
        {/* Page header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-[24px] md:text-[28px] font-extrabold tracking-tight text-gray-900 leading-tight">Reports</h1>
              <ShieldCheck className="h-5 w-5 text-emerald-700 shrink-0" strokeWidth={1.75} />
            </div>
            <p className="text-[13px] md:text-[14px] text-gray-500 leading-snug">
              Create, analyze, and export reports to drive data-informed decisions.
            </p>
          </div>
          <div className="flex items-center justify-center md:justify-end gap-2 shrink-0 mt-3 md:mt-0">
            <Link
              href="/portal/reports?action=schedule"
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-white border border-gray-200 text-[13px] font-semibold text-gray-700 shadow-sm hover:bg-gray-50 whitespace-nowrap"
            >
              <Calendar className="h-4 w-4" strokeWidth={1.75} />
              <span className="hidden md:inline">Schedule Report</span>
              <span className="md:hidden">Schedule</span>
            </Link>
            <Link
              href="/portal/reports?action=new"
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-emerald-700 text-white text-[13px] font-semibold shadow-sm hover:bg-emerald-800 whitespace-nowrap"
            >
              <Plus className="h-4 w-4" strokeWidth={2} />
              New Report
            </Link>
          </div>
        </div>

        {/* KPI cards row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <ReportsKpi
            label="TOTAL REPORTS"
            value={FALLBACK_KPIS.totalReports.toLocaleString()}
            sub="All time"
            delta={FALLBACK_KPIS.totalDelta}
            icon={FileText}
            cardBg="#f0fdf4" borderColor="#bbf7d0"
            iconBg="#dcfce7" iconColor="#047857"
          />
          <ReportsKpi
            label="GENERATED"
            value={FALLBACK_KPIS.generated.toLocaleString()}
            sub="Last 30 days"
            delta={FALLBACK_KPIS.generatedDelta}
            icon={Clock}
            cardBg="#eff6ff" borderColor="#bfdbfe"
            iconBg="#dbeafe" iconColor="#1d4ed8"
          />
          <ReportsKpi
            label="DOWNLOADS"
            value={FALLBACK_KPIS.downloads.toLocaleString()}
            sub="Last 30 days"
            delta={FALLBACK_KPIS.downloadsDelta}
            icon={Download}
            cardBg="#faf5ff" borderColor="#e9d5ff"
            iconBg="#f3e8ff" iconColor="#7c3aed"
          />
          <ReportsKpi
            label="SCHEDULED"
            value={FALLBACK_KPIS.scheduled.toLocaleString()}
            sub="Upcoming"
            delta={FALLBACK_KPIS.scheduledDelta}
            icon={Calendar}
            cardBg="#fff7ed" borderColor="#fed7aa"
            iconBg="#ffedd5" iconColor="#c2410c"
          />
          <ReportsKpi
            label="DATA COVERAGE"
            value={`${FALLBACK_KPIS.dataCoverage}%`}
            sub="Network average"
            delta={FALLBACK_KPIS.coverageDelta}
            icon={TrendingUp}
            cardBg="#f0fdf4" borderColor="#bbf7d0"
            iconBg="#dcfce7" iconColor="#047857"
            className="col-span-2 md:col-span-3 lg:col-span-1"
          />
        </div>

        {/* Filter bar */}
        <section className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <FilterField label="Date Range" value={dateRangeLabel} icon={Calendar} />
            <FilterField label="Category" mdLabel="Report Category" value="All Categories" />
            <FilterField label="School" value="All Schools" />
            <FilterField label="Format" value="All Formats" />
            <button
              type="button"
              className="hidden lg:inline-flex items-center justify-center gap-2 h-[58px] px-4 rounded-xl border border-gray-200 bg-white text-[13px] font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
            >
              <Filter className="h-4 w-4" strokeWidth={1.75} />
              Filters
            </button>
          </div>
        </section>

        {/* Quick Reports grid */}
        <section>
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="text-[16px] font-bold text-gray-900">Quick Reports</h2>
            <Link
              href="/portal/reports?view=all"
              className="text-[12px] text-emerald-700 font-semibold inline-flex items-center hover:underline whitespace-nowrap"
            >
              View all reports <ArrowUpRight className="h-3.5 w-3.5 ml-0.5" strokeWidth={2} />
            </Link>
          </div>
          <div className="grid grid-cols-3 lg:grid-cols-5 gap-2.5 lg:gap-3">
            {QUICK_REPORTS.map((qr) => (
              <Link
                key={qr.title}
                href={qr.href}
                className="group rounded-2xl bg-white border border-gray-100 shadow-sm p-3 lg:p-4 flex flex-col items-center text-center gap-2 lg:gap-3 hover:shadow-md hover:border-gray-200 transition"
              >
                <span
                  className="grid h-10 w-10 lg:h-12 lg:w-12 place-items-center rounded-xl lg:rounded-2xl"
                  style={{ backgroundColor: qr.iconBg }}
                >
                  <qr.icon className="h-4 w-4 lg:h-5 lg:w-5" style={{ color: qr.iconColor }} strokeWidth={1.75} />
                </span>
                <div className="min-w-0 w-full">
                  <p className="text-[11px] lg:text-[13px] font-bold text-gray-900 leading-tight line-clamp-2">{qr.title}</p>
                  <p className="hidden lg:block text-[11px] text-gray-500 leading-snug mt-1 line-clamp-2">{qr.body}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Recent Reports table */}
        <section className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
            <h2 className="text-[16px] font-bold text-gray-900">Recent Reports</h2>
            <Link
              href="/portal/reports?view=all"
              className="text-[12px] text-emerald-700 font-semibold inline-flex items-center hover:underline whitespace-nowrap"
            >
              View all reports <ArrowUpRight className="h-3.5 w-3.5 ml-0.5" strokeWidth={2} />
            </Link>
          </div>

          {/* Mobile: stacked rows */}
          <div className="lg:hidden">
            {/* Compact mobile header row matching the screenshot */}
            <div className="px-4 py-2 grid grid-cols-[1.7fr_1fr_1fr_auto_auto] gap-2 text-[9.5px] font-bold uppercase tracking-widest text-gray-500 border-b border-gray-100">
              <span>Report Name</span>
              <span>Category</span>
              <span>Generated By</span>
              <span aria-hidden />
              <span aria-hidden />
            </div>
            <ul className="divide-y divide-gray-50">
              {RECENT_REPORTS.slice(0, 5).map((r, i) => {
                const time = r.date.split("•")[1]?.trim() ?? "";
                return (
                  <li
                    key={`m-${i}`}
                    className="px-4 py-3 grid grid-cols-[1.7fr_1fr_1fr_auto_auto] items-center gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-[12px] font-bold text-gray-900 leading-tight line-clamp-2">{r.name}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-gray-700 leading-tight line-clamp-2">{r.category}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-gray-700 leading-tight truncate">{r.generatedBy}</p>
                      <p className="text-[10px] text-gray-500 leading-tight mt-0.5 truncate">{time}</p>
                    </div>
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <FormatIcon format={r.format} />
                      <span className="inline-flex px-1.5 py-px rounded-full text-[8.5px] font-bold bg-emerald-50 text-emerald-700 whitespace-nowrap">
                        {r.status}
                      </span>
                    </div>
                    <div className="flex items-center shrink-0">
                      <button
                        type="button"
                        className="grid h-7 w-7 place-items-center rounded-full hover:bg-gray-100 text-gray-500"
                        aria-label="Download report"
                      >
                        <Download className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </button>
                      <button
                        type="button"
                        className="grid h-7 w-7 place-items-center rounded-full hover:bg-gray-100 text-gray-500"
                        aria-label="More options"
                      >
                        <MoreVertical className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Desktop: table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-[13px] min-w-[900px]">
              <thead className="bg-gray-50/40">
                <tr className="text-left text-[10px] uppercase tracking-widest text-gray-500 border-b border-gray-100">
                  <th className="px-5 py-3 font-bold">Report Name</th>
                  <th className="px-5 py-3 font-bold">Category</th>
                  <th className="px-5 py-3 font-bold">Generated By</th>
                  <th className="px-5 py-3 font-bold">Date Generated</th>
                  <th className="px-5 py-3 font-bold">Format</th>
                  <th className="px-5 py-3 font-bold">Status</th>
                  <th className="px-5 py-3 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {RECENT_REPORTS.map((r, i) => (
                  <tr key={`d-${i}`} className="border-b border-gray-50 hover:bg-gray-50/40">
                    <td className="px-5 py-3.5 text-gray-900 font-semibold">{r.name}</td>
                    <td className="px-5 py-3.5 text-gray-700">{r.category}</td>
                    <td className="px-5 py-3.5 text-gray-700">{r.generatedBy}</td>
                    <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">{r.date}</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-gray-700">
                        <FormatIcon format={r.format} />
                        {r.format}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                        {r.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button type="button" className="grid h-8 w-8 place-items-center rounded-full hover:bg-gray-100 text-gray-500" aria-label="Download report">
                          <Download className="h-4 w-4" strokeWidth={1.75} />
                        </button>
                        <button type="button" className="grid h-8 w-8 place-items-center rounded-full hover:bg-gray-100 text-gray-500" aria-label="More options">
                          <MoreVertical className="h-4 w-4" strokeWidth={1.75} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination row — mobile shows 5/page (26 pages), desktop 8/page (16 pages) */}
          <div className="px-4 lg:px-5 py-3 border-t border-gray-100 flex items-center justify-between flex-wrap gap-2">
            <p className="text-[11.5px] lg:text-[12px] text-gray-500">
              <span className="lg:hidden">Showing 1 to 5 of 128 reports</span>
              <span className="hidden lg:inline">Showing 1 to 8 of 128 reports</span>
            </p>
            {/* Mobile pagination */}
            <div className="lg:hidden flex items-center gap-1 text-[11.5px]">
              <PageBtn aria-label="Previous"><ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} /></PageBtn>
              <PageBtn active>1</PageBtn>
              <PageBtn>2</PageBtn>
              <PageBtn>3</PageBtn>
              <PageBtn>4</PageBtn>
              <span className="text-gray-400 px-1">…</span>
              <PageBtn>26</PageBtn>
              <PageBtn aria-label="Next"><ChevronRight className="h-3.5 w-3.5" strokeWidth={2} /></PageBtn>
            </div>
            {/* Desktop pagination */}
            <div className="hidden lg:flex items-center gap-1 text-[12px]">
              <PageBtn aria-label="Previous"><ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} /></PageBtn>
              <PageBtn active>1</PageBtn>
              <PageBtn>2</PageBtn>
              <PageBtn>3</PageBtn>
              <PageBtn>4</PageBtn>
              <PageBtn>5</PageBtn>
              <span className="text-gray-400 px-1">…</span>
              <PageBtn>16</PageBtn>
              <PageBtn aria-label="Next"><ChevronRight className="h-3.5 w-3.5" strokeWidth={2} /></PageBtn>
            </div>
          </div>
        </section>

        {/* Report Insights bar */}
        <section className="rounded-2xl bg-gradient-to-r from-emerald-50 to-white border border-emerald-100 p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-100 text-emerald-700 shrink-0">
              <FileBarChart className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <p className="text-[14px] font-bold text-gray-900">Report Insights</p>
              <p className="text-[12px] text-gray-700 leading-snug">
                Your reports are being generated <strong className="text-gray-900">16% more frequently</strong> this month.
              </p>
              <Link
                href="/portal/insights"
                className="text-[12px] text-emerald-700 font-semibold inline-flex items-center hover:underline mt-1"
              >
                View reporting analytics <ArrowUpRight className="h-3.5 w-3.5 ml-0.5" strokeWidth={2} />
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[12px] text-gray-500 self-start md:self-center shrink-0">
            <Info className="h-3.5 w-3.5" strokeWidth={1.75} />
            Data updated:{" "}
            {new Date().toLocaleString("en-US", {
              day: "numeric", month: "short", year: "numeric",
              hour: "numeric", minute: "2-digit",
            })}
          </div>
        </section>
      </div>
    </OzekiPortalShell>
  );
}

/* ── small subcomponents ───────────────────────────────────────────── */

function ReportsKpi({
  label, value, sub, delta, icon: Icon, cardBg, borderColor, iconBg, iconColor, className = "",
}: {
  label: string; value: string; sub: string; delta: number;
  icon: LucideIcon; cardBg: string; borderColor: string; iconBg: string; iconColor: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border shadow-sm p-4 flex flex-col gap-2 min-h-[140px] ${className}`}
      style={{ backgroundColor: cardBg, borderColor }}
    >
      <div className="flex items-start gap-2.5">
        <span
          className="grid h-10 w-10 place-items-center rounded-full shrink-0"
          style={{ backgroundColor: iconBg }}
        >
          <Icon className="h-5 w-5" style={{ color: iconColor }} strokeWidth={1.75} />
        </span>
        <p className="text-[10.5px] font-bold text-gray-500 uppercase tracking-widest mt-1.5 truncate">{label}</p>
      </div>
      <div>
        <p className="text-[26px] font-extrabold text-gray-900 leading-none tracking-tight truncate">{value}</p>
        <p className="text-[11px] text-gray-500 mt-1">{sub}</p>
      </div>
      <div className="flex items-center gap-1.5 text-[11px] mt-auto">
        <span className="inline-flex items-center gap-0.5 font-bold text-emerald-700">
          <ArrowUpRight className="h-2.5 w-2.5" strokeWidth={2} />
          {delta}%
        </span>
        <span className="text-gray-500">vs last 30 days</span>
      </div>
    </div>
  );
}

function FilterField({
  label, value, icon: Icon, mdLabel,
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
  /** Optional longer label shown on md+ widths (e.g. "Report Category"
   *  on desktop vs "Category" on mobile). */
  mdLabel?: string;
}) {
  return (
    <button
      type="button"
      className="flex flex-col items-start text-left gap-0.5 h-[58px] px-3.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition shadow-sm justify-center min-w-0 w-full"
    >
      <span className="text-[10.5px] font-semibold text-gray-500 uppercase tracking-wide truncate w-full">
        <span className="md:hidden">{label}</span>
        <span className="hidden md:inline">{mdLabel ?? label}</span>
      </span>
      <span className="flex items-center gap-2 w-full text-[12.5px] lg:text-[13px] font-semibold text-gray-900 truncate">
        {Icon && <Icon className="h-3.5 w-3.5 text-gray-400 shrink-0" strokeWidth={1.75} />}
        <span className="truncate flex-1">{value}</span>
        <ChevronDown className="h-3.5 w-3.5 text-gray-400 shrink-0" strokeWidth={2} />
      </span>
    </button>
  );
}

function FormatIcon({ format }: { format: "PDF" | "Excel" }) {
  if (format === "Excel") {
    return (
      <span className="grid h-5 w-5 place-items-center rounded text-emerald-700">
        <FileSpreadsheet className="h-4 w-4" strokeWidth={1.75} />
      </span>
    );
  }
  return (
    <span className="grid h-5 w-5 place-items-center rounded text-red-600">
      <FileCheck className="h-4 w-4" strokeWidth={1.75} />
    </span>
  );
}

function PageBtn({
  children, active = false, ...rest
}: {
  children: React.ReactNode;
  active?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-md text-[12px] font-bold transition ${
        active
          ? "bg-emerald-700 text-white"
          : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
      }`}
      {...rest}
    >
      {children}
    </button>
  );
}
