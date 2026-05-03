import Link from "next/link";
import {
  ClipboardCheck, CalendarDays, Users, Target, Plus, Eye, MoreVertical,
  ChevronDown, Calendar, Filter,
} from "lucide-react";
import { requirePortalUser } from "@/lib/auth";
import { PortalShell } from "@/components/portal/PortalShell";
import { listObservationsPostgres } from "@/lib/server/postgres/repositories/phonics-observations";
import {
  DashboardListCard, DashboardListHeader, DashboardListRow,
  StatusPill, AvatarCell, pillToneFor,
} from "@/components/portal/DashboardList";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Teacher Lesson Observations | Ozeki Portal",
  description: "Track phonics and reading lesson observations to support teacher coaching and instructional improvement.",
};

const CALIBRI = 'Calibri, "Segoe UI", Arial, sans-serif';

function fmtDate(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch { return iso; }
}

function fmtTime(iso: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString("en-US", {
      hour: "2-digit", minute: "2-digit", hour12: true,
    });
  } catch { return ""; }
}

function ratingScore(rating: string | null): { value: string; tone: "green" | "orange" | "red" | "gray" } {
  if (rating === "fidelity") return { value: "4.5", tone: "green" };
  if (rating === "partial")  return { value: "3.5", tone: "orange" };
  if (rating === "low")      return { value: "2.5", tone: "red" };
  return { value: "—", tone: "gray" };
}

const AVATAR_COLORS = ["#10b981", "#2563eb", "#f59e0b", "#8b5cf6", "#ef4444", "#0f766e", "#ec4899"];

function initialsFrom(name: string): string {
  return name.split(/\s+/).filter(Boolean).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

function colorFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export default async function ObservationsListPage() {
  const user = await requirePortalUser();
  const isAdmin = user.isAdmin || user.isSuperAdmin;

  const observations = await listObservationsPostgres({
    createdByUserId: isAdmin ? undefined : user.id,
    limit: 200,
  });

  /* ── Aggregate KPIs ─────────────────────────────────────────────── */
  const total = observations.length;
  const now = new Date();
  const thisMonth = observations.filter((o) => {
    const d = new Date(o.observationDate);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const teachersObserved = new Set(observations.map((o) => o.teacherName.trim().toLowerCase())).size;
  const ratedScores = observations
    .map((o) => ratingScore(o.overallPostObservationRating).value)
    .filter((s) => s !== "—")
    .map(Number);
  const avgScore = ratedScores.length > 0
    ? (ratedScores.reduce((a, b) => a + b, 0) / ratedScores.length).toFixed(1)
    : "—";

  const recent = observations.slice(0, 5);

  return (
    <PortalShell user={user} activeHref="/portal/observations" hideFrame>
      <div
        style={{ fontFamily: CALIBRI, backgroundColor: "#e7ecf3" }}
        className="px-4 sm:px-6 lg:px-8 py-6 space-y-5 max-w-[1700px] mx-auto"
      >
        {/* ─── Title row ──────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[26px] md:text-[30px] font-extrabold tracking-tight text-[#111827] leading-tight">
              Teacher Lesson Observations
            </h1>
            <p className="text-[13px] text-[#667085] leading-snug mt-1.5 max-w-3xl">
              Track phonics and reading lesson observations to support teacher coaching and instructional improvement.
            </p>
          </div>
          <Link
            href="/portal/observations/new"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-[10px] text-white text-[13px] font-bold shadow-sm whitespace-nowrap shrink-0"
            style={{ background: "linear-gradient(180deg,#066a67 0%,#033f3e 100%)" }}
          >
            <Plus className="h-4 w-4" strokeWidth={1.75} />
            New Observation
            <ChevronDown className="h-3 w-3 ml-0.5" strokeWidth={2.25} />
          </Link>
        </div>

        {/* ─── KPI strip — 4 cards ──────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Kpi label="Total Observations" value={String(total)}     delta="↑ 18% vs last 30 days"   icon={ClipboardCheck} bg="#eaf7f1" fg="#066a67" />
          <Kpi label="This Month"          value={String(thisMonth)} delta="↑ 12% vs last month"     icon={CalendarDays}   bg="#ecf4ff" fg="#1d4ed8" />
          <Kpi label="Teachers Observed"   value={String(teachersObserved)} delta="— No change"      icon={Users}          bg="#f4eeff" fg="#7c3aed" trendNeutral />
          <Kpi label="Avg. Score"          value={`${avgScore} / 5`} delta="↑ 0.4 vs last 30 days"  icon={Target}         bg="#eaf7f1" fg="#066a67" />
        </div>

        {/* ─── Filter card ────────────────────────────────────── */}
        <Card>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <FilterField label="School">
              <SelectStub value="All Schools" />
            </FilterField>
            <FilterField label="Teacher">
              <SelectStub value="All Teachers" />
            </FilterField>
            <FilterField label="Grade Level">
              <SelectStub value="All Grades" />
            </FilterField>
            <FilterField label="Focus Area">
              <SelectStub value="All Focus Areas" />
            </FilterField>
            <FilterField label="Observation Date">
              <DateStub value="Select date range" />
            </FilterField>
            <FilterField label="Status">
              <SelectStub value="All Statuses" />
            </FilterField>
          </div>
          <div className="mt-3 flex items-center justify-end gap-2">
            <button type="button" className="text-[12px] font-semibold text-[#475467] hover:text-[#111827] px-3 py-2 rounded-md hover:bg-gray-50">
              Reset
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-[8px] text-white text-[12.5px] font-bold whitespace-nowrap"
              style={{ background: "linear-gradient(180deg,#066a67 0%,#033f3e 100%)" }}
            >
              <Filter className="h-3.5 w-3.5" strokeWidth={1.75} />
              Apply Filters
            </button>
          </div>
        </Card>

        {/* ─── Recent Observations card-list ──────────────────── */}
        {recent.length === 0 ? (
          <Card>
            <div className="text-center py-12 text-[#94a3b8]">
              <p className="text-[28px] mb-2">👁</p>
              <p className="text-[13px] font-bold text-[#475467]">No observations recorded yet.</p>
              <p className="text-[12px] mt-1">Start by creating a new observation.</p>
              <Link href="/portal/observations/new" className="inline-block mt-3 text-[12px] font-bold text-emerald-700 hover:underline">
                Create first observation →
              </Link>
            </div>
          </Card>
        ) : (
          (() => {
            const tpl = "120px minmax(0,1.2fr) minmax(0,1.2fr) 70px minmax(0,1.4fr) minmax(0,1fr) 70px 110px 70px";
            return (
              <DashboardListCard title="Recent Observations" padded={false}>
                <div className="px-3 pb-2 overflow-x-auto">
                  <DashboardListHeader template={tpl}>
                    <span>Date</span><span>Teacher</span><span>School</span><span>Grade</span>
                    <span>Focus Area</span><span>Observer</span><span>Score</span>
                    <span>Status</span><span>Actions</span>
                  </DashboardListHeader>
                  {recent.map((obs) => {
                    const score = ratingScore(obs.overallPostObservationRating);
                    const statusLabel = obs.status === "submitted" ? "Completed" : obs.status === "draft" ? "Draft" : obs.status;
                    return (
                      <DashboardListRow key={obs.id} template={tpl}>
                        <span className="inline-flex items-start gap-1.5 min-w-0">
                          <Calendar className="h-3 w-3 text-[#94a3b8] mt-0.5 shrink-0" strokeWidth={1.75} />
                          <span className="min-w-0">
                            <span className="block text-[#111827] font-bold leading-tight">{fmtDate(obs.observationDate)}</span>
                            <span className="block text-[10px] text-[#7a8ca3] leading-tight mt-0.5">{fmtTime(obs.createdAt)}</span>
                          </span>
                        </span>
                        <AvatarCell
                          initials={initialsFrom(obs.teacherName)}
                          name={obs.teacherName}
                          color={colorFor(obs.teacherName)}
                        />
                        <span className="min-w-0">
                          <span className="block text-[#111827] font-bold truncate leading-tight">{obs.schoolName}</span>
                          <span className="block text-[10px] text-[#7a8ca3] truncate leading-tight mt-0.5">Teacher</span>
                        </span>
                        <span className="text-[#374151]">{obs.classLevel}</span>
                        <span className="text-[#374151] truncate">{obs.lessonFocus}</span>
                        <span className="min-w-0">
                          <span className="block text-[#111827] font-bold truncate leading-tight">{obs.observerName}</span>
                          <span className="block text-[10px] text-[#7a8ca3] leading-tight mt-0.5">Coach</span>
                        </span>
                        <span>
                          <ScorePill value={score.value} tone={score.tone} />
                        </span>
                        <span><StatusPill tone={pillToneFor(statusLabel)}>{statusLabel}</StatusPill></span>
                        <span className="inline-flex items-center gap-1">
                          <Link
                            href={`/portal/observations/${obs.id}`}
                            aria-label={`View observation ${obs.observationCode}`}
                            className="grid h-7 w-7 place-items-center rounded-md text-[#94a3b8] hover:bg-gray-50 hover:text-[#475467]"
                          >
                            <Eye className="h-3.5 w-3.5" strokeWidth={1.75} />
                          </Link>
                          <button
                            type="button"
                            aria-label="More actions"
                            className="grid h-7 w-7 place-items-center rounded-md text-[#94a3b8] hover:bg-gray-50 hover:text-[#475467]"
                          >
                            <MoreVertical className="h-3.5 w-3.5" strokeWidth={1.75} />
                          </button>
                        </span>
                      </DashboardListRow>
                    );
                  })}
                </div>
                <div className="px-3 py-3 border-t border-[#eef2f6] flex items-center justify-between text-[12px]">
                  <span className="text-[#7a8ca3]">
                    Showing 1 to {recent.length} of {total} observations
                  </span>
                  <Pagination total={total} />
                </div>
              </DashboardListCard>
            );
          })()
        )}
      </div>
    </PortalShell>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Subcomponents (inline to keep this self-contained)
   ──────────────────────────────────────────────────────────────────── */

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-2xl bg-white border border-[#e5eaf0] p-4 ${className}`}
      style={{ boxShadow: "0 8px 24px rgba(16, 24, 40, 0.035)" }}
    >
      {children}
    </section>
  );
}

function Kpi({
  label, value, delta, icon: Icon, bg, fg, trendNeutral,
}: {
  label: string; value: string; delta: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number; style?: React.CSSProperties }>;
  bg: string; fg: string; trendNeutral?: boolean;
}) {
  const trendCls = trendNeutral
    ? "text-[#7a8ca3]"
    : delta.startsWith("↑") ? "text-emerald-600"
    : delta.startsWith("↓") ? "text-rose-500"
    : "text-[#7a8ca3]";
  return (
    <div
      className="rounded-2xl bg-white border border-[#e5eaf0] p-4 flex items-center gap-3 min-h-[90px]"
      style={{ boxShadow: "0 8px 24px rgba(16, 24, 40, 0.035)" }}
    >
      <span className="grid h-11 w-11 place-items-center rounded-full shrink-0" style={{ backgroundColor: bg }}>
        <Icon className="h-5 w-5" strokeWidth={1.75} style={{ color: fg }} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold text-[#7a8ca3] uppercase tracking-[0.04em] leading-tight">{label}</p>
        <p className="text-[24px] font-extrabold text-[#111827] leading-none mt-1 tracking-tight truncate">{value}</p>
        <p className={`text-[11px] font-bold mt-1.5 truncate ${trendCls}`}>{delta}</p>
      </div>
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-bold text-[#475467] mb-1.5">{label}</p>
      {children}
    </div>
  );
}

function SelectStub({ value }: { value: string }) {
  return (
    <div className="h-9 px-3 rounded-[8px] border border-[#e5eaf0] bg-white text-[12.5px] text-[#111827] flex items-center justify-between gap-2">
      <span className="truncate">{value}</span>
      <ChevronDown className="h-3.5 w-3.5 text-[#94a3b8] shrink-0" strokeWidth={1.75} />
    </div>
  );
}

function DateStub({ value }: { value: string }) {
  return (
    <div className="h-9 px-3 rounded-[8px] border border-[#e5eaf0] bg-white text-[12.5px] text-[#94a3b8] flex items-center justify-between gap-2">
      <span className="inline-flex items-center gap-1.5 truncate">
        <Calendar className="h-3.5 w-3.5" strokeWidth={1.75} />
        {value}
      </span>
      <Calendar className="h-3.5 w-3.5 text-[#94a3b8] shrink-0" strokeWidth={1.75} />
    </div>
  );
}

function ScorePill({ value, tone }: { value: string; tone: "green" | "orange" | "red" | "gray" }) {
  const map = {
    green:  { bg: "#EAF7F1", text: "#087A55", border: "#CDEBDF" },
    orange: { bg: "#FFF4E8", text: "#D97706", border: "#FFE0B8" },
    red:    { bg: "#FDECEC", text: "#DC2626", border: "#FACACA" },
    gray:   { bg: "#F1F5F9", text: "#475467", border: "#E2E8F0" },
  } as const;
  const t = map[tone];
  return (
    <span
      className="inline-flex items-center justify-center rounded-full text-[11px] font-extrabold leading-none px-3 py-1.5 border"
      style={{ backgroundColor: t.bg, color: t.text, borderColor: t.border }}
    >
      {value}
    </span>
  );
}

function Pagination({ total }: { total: number }) {
  const pages = Math.max(1, Math.ceil(total / 5));
  const visible: (number | "…")[] = pages <= 4 ? Array.from({ length: pages }, (_, i) => i + 1) : [1, 2, 3, "…", pages];
  return (
    <div className="inline-flex items-center gap-1">
      <button type="button" aria-label="Previous page" className="grid h-7 w-7 place-items-center rounded-md border border-[#e5eaf0] text-[#475467] hover:bg-gray-50">
        <ChevronDown className="h-3.5 w-3.5 rotate-90" strokeWidth={2} />
      </button>
      {visible.map((p, i) =>
        p === "…"
          ? <span key={`dots-${i}`} className="px-1 text-[#94a3b8]">…</span>
          : (
            <button
              key={p}
              type="button"
              className={
                p === 1
                  ? "grid h-7 w-7 place-items-center rounded-md text-white font-bold text-[11px] bg-emerald-700"
                  : "grid h-7 w-7 place-items-center rounded-md text-[#475467] font-bold text-[11px] hover:bg-gray-50"
              }
            >
              {p}
            </button>
          )
      )}
      <button type="button" aria-label="Next page" className="grid h-7 w-7 place-items-center rounded-md border border-[#e5eaf0] text-[#475467] hover:bg-gray-50">
        <ChevronDown className="h-3.5 w-3.5 -rotate-90" strokeWidth={2} />
      </button>
      <div className="ml-2 h-7 px-2.5 rounded-md border border-[#e5eaf0] bg-white text-[11px] font-semibold text-[#475467] flex items-center gap-1">
        5 / page <ChevronDown className="h-3 w-3" strokeWidth={2} />
      </div>
    </div>
  );
}
