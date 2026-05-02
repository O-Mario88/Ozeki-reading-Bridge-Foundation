import Link from "next/link";
import {
  School as SchoolIcon, Users, Building2, Target, MessageSquare, CalendarCheck,
  ShieldCheck, Download, Plus, UserPlus, ChevronRight, ChevronDown,
  Mail, MapPin, HandCoins, UserPlus2, FileText,
  Info, Clock, BarChart3, Send, Upload,
  PhoneCall, type LucideIcon,
} from "lucide-react";
import { OzekiPortalShell } from "@/components/portal/OzekiPortalShell";
import {
  DashboardListCard, DashboardListHeader, DashboardListRow,
  StatusPill, ProgressCell, MediaListRow, pillToneFor,
} from "@/components/portal/DashboardList";
import { requirePortalStaffUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "CRM Overview | Ozeki Portal",
  description:
    "Manage all schools, contacts, partner organizations, communications, and follow-up activity from one place.",
};

/* ────────────────────────────────────────────────────────────────────
   Reference data — frozen verbatim from the supplied screenshot.
   ──────────────────────────────────────────────────────────────────── */
const DATA = {
  kpis: {
    totalSchools:        { value: "172",   sub: "↑ 12 this month",            icon: SchoolIcon,    accent: "emerald" as const },
    activeContacts:      { value: "1,486", sub: "↑ 8.4% vs last month",       icon: Users,         accent: "blue"    as const },
    partnerOrgs:         { value: "38",    sub: "Across districts & NGOs",    icon: Building2,     accent: "violet"  as const },
    openOpportunities:   { value: "64",    sub: "Funding / partnership pipeline", icon: Target,    accent: "orange"  as const },
    activityLogs:        { value: "3,248", sub: "Calls, visits, emails, notes",   icon: MessageSquare, accent: "teal" as const },
    followUpsDue:        { value: "82",    sub: "23 overdue",                 icon: CalendarCheck, accent: "red"     as const, subTone: "rose" as const },
    dataCompleteness:    { value: "94%",   sub: "CRM hygiene score",          icon: ShieldCheck,   accent: "emerald" as const },
  },
  trend: {
    months: ["Dec '24", "Jan '25", "Feb '25", "Mar '25", "Apr '25", "May '25", "Jun '25"],
    values: [160, 200, 190, 280, 210, 300, 380],
    miniStats: [
      { label: "New Contacts",  value: "276", delta: "↑ 18%" },
      { label: "School Visits", value: "142", delta: "↑ 12%" },
      { label: "Logged Calls",  value: "389", delta: "↑ 15%" },
      { label: "Meetings",       value: "86",  delta: "↑ 9%"  },
    ],
  },
  segments: {
    total: 1486,
    rows: [
      { label: "Headteachers",       value: 412, pct: 27.7, color: "#0d6f5b" },
      { label: "Teachers",            value: 386, pct: 26.0, color: "#22c55e" },
      { label: "District Officials", value: 218, pct: 14.7, color: "#2563eb" },
      { label: "Donors / Partners",   value: 176, pct: 11.8, color: "#f59e0b" },
      { label: "School Leaders",      value: 154, pct: 10.4, color: "#8b5cf6" },
      { label: "Community Contacts",  value: 140, pct: 9.4,  color: "#ef4444" },
    ],
  },
  pipeline: {
    rows: [
      { label: "New Leads",      value: 18, pct: 28, color: "#10b981" },
      { label: "Engaged",        value: 22, pct: 34, color: "#10b981" },
      { label: "Proposal Sent",  value: 12, pct: 19, color: "#f59e0b" },
      { label: "Active Partner", value: 8,  pct: 13, color: "#0f766e" },
      { label: "Dormant",        value: 4,  pct: 6,  color: "#94a3b8" },
    ],
    overdue: 23,
    dueIn7: 59,
  },
  schools: [
    { school: "St. Mary Primary School",   district: "Gulu",    contact: "Sr. Agnes Okello",   role: "Headteacher", status: "Active",          last: "Jun 1, 2025",  next: "Follow-up Call",     nextDate: "Jun 5, 2025" },
    { school: "Gulu Central PS",            district: "Gulu",    contact: "John Bosco Owori",   role: "Headteacher", status: "Active",          last: "May 30, 2025", next: "Site Visit",         nextDate: "Jun 6, 2025" },
    { school: "Bright Future School",       district: "Wakiso",  contact: "Sarah Namatovu",     role: "Director",    status: "Warm",            last: "May 28, 2025", next: "Proposal Share",     nextDate: "Jun 8, 2025" },
    { school: "Kawanda Hills Academy",      district: "Wakiso",  contact: "Charles Kato",       role: "Headteacher", status: "Warm",            last: "May 27, 2025", next: "Follow-up Email",    nextDate: "Jun 7, 2025" },
    { school: "Arua Hill P/S",              district: "Arua",    contact: "Elizabeth Auma",     role: "Headteacher", status: "Needs Follow-up", last: "May 20, 2025", next: "Call to Reconnect",  nextDate: "Jun 3, 2025" },
    { school: "Moroto Model School",        district: "Moroto",  contact: "Peter Lokwong",      role: "Headteacher", status: "At Risk",         last: "May 15, 2025", next: "Urgent Follow-up",   nextDate: "May 28, 2025" },
  ],
  activity: [
    { icon: Mail,         tone: "blue",    title: "Email sent: Program updates & resources", source: "Sarah Namatovu",          when: "Jun 2, 2025  ·  10:15 AM" },
    { icon: PhoneCall,    tone: "emerald", title: "Call logged with Headteacher",            source: "John Bosco Owori",        when: "Jun 2, 2025  ·  09:42 AM" },
    { icon: MapPin,       tone: "orange",  title: "School visit note added",                  source: "Kawanda Hills Academy",   when: "Jun 1, 2025  ·  03:20 PM" },
    { icon: Users,        tone: "violet",  title: "Meeting held",                             source: "District Education Officer", when: "May 31, 2025  ·  11:05 AM" },
    { icon: HandCoins,    tone: "emerald", title: "Donor follow-up completed",                source: "Save the Children",       when: "May 30, 2025  ·  04:18 PM" },
    { icon: UserPlus2,    tone: "blue",    title: "New contact added",                        source: "Community Leader",        when: "May 29, 2025  ·  02:33 PM" },
  ],
  followUps: [
    { contact: "Sr. Agnes Okello",    org: "St. Mary PS",           task: "Follow-up Call",    owner: "Ozeki Team", due: "Jun 5, 2025",  status: "Due Soon"  },
    { contact: "John Bosco Owori",    org: "Gulu Central PS",       task: "Site Visit",        owner: "Daniel O.",  due: "Jun 6, 2025",  status: "Scheduled" },
    { contact: "Sarah Namatovu",      org: "Bright Future School",  task: "Proposal Share",    owner: "Winnie A.",  due: "Jun 8, 2025",  status: "Scheduled" },
    { contact: "Charles Kato",        org: "Kawanda Hills Academy", task: "Follow-up Email",   owner: "Daniel O.",  due: "Jun 7, 2025",  status: "Scheduled" },
    { contact: "Elizabeth Auma",      org: "Arua Hill P/S",         task: "Call to Reconnect", owner: "Winnie A.",  due: "Jun 3, 2025",  status: "Overdue"   },
    { contact: "Peter Lokwong",       org: "Moroto Model School",   task: "Urgent Follow-up",  owner: "Daniel O.",  due: "May 28, 2025", status: "Overdue"   },
  ],
  partners: [
    { org: "UNICEF Uganda",            contact: "Jane Atim",         schools: 46, status: "Highly Engaged" },
    { org: "Save the Children",         contact: "Patrick Okello",    schools: 38, status: "Highly Engaged" },
    { org: "USAID Uganda",              contact: "Monica Achan",      schools: 31, status: "Engaged"        },
    { org: "Wordworks",                 contact: "Martin Lukyamuzu",  schools: 28, status: "Engaged"        },
    { org: "District Education Office", contact: "Christine Adong",   schools: 64, status: "Active"         },
  ],
  geographic: [
    { region: "Central",   schools: 62, contacts: 612, coverage: 84 },
    { region: "Western",   schools: 34, contacts: 324, coverage: 72 },
    { region: "Northern",  schools: 28, contacts: 236, coverage: 65 },
    { region: "Eastern",   schools: 16, contacts: 134, coverage: 50 },
    { region: "West Nile", schools: 12, contacts: 96,  coverage: 48 },
    { region: "Acholi",    schools: 10, contacts: 74,  coverage: 46 },
    { region: "Lango",     schools: 6,  contacts: 38,  coverage: 36 },
    { region: "Karamoja",  schools: 4,  contacts: 22,  coverage: 28 },
  ],
  quickActions: [
    { icon: UserPlus,    label: "Add Contact",        href: "/portal/contacts?new=1" },
    { icon: PhoneCall,   label: "Log Call",           href: "/portal/contacts?action=log-call" },
    { icon: MapPin,      label: "Log Visit",          href: "/portal/visits/new" },
    { icon: SchoolIcon,  label: "Add School",         href: "/portal/schools/directory?action=new" },
    { icon: Target,      label: "Create Opportunity", href: "/portal/contacts?action=opportunity" },
    { icon: Send,        label: "Send Follow-up",     href: "/portal/contacts?action=follow-up" },
    { icon: Upload,      label: "Import Contacts",    href: "/portal/contacts?action=import" },
    { icon: FileText,    label: "View Full CRM",      href: "/portal/contacts?view=full" },
  ],
  insight: {
    text: "Most active relationship growth this period came from Central and Acholi regions, while 23 contacts and 9 schools require urgent follow-up.",
    updated: "Jun 2025  •  10:45 AM",
  },
};

const CALIBRI = 'Calibri, "Segoe UI", Arial, sans-serif';

export default async function PortalCrmOverviewPage() {
  const user = await requirePortalStaffUser();

  return (
    <OzekiPortalShell
      user={user}
      activeHref="/portal/contacts"
      greeting={`Welcome back, ${user.fullName ?? "Ozeki Team"} 👋`}
      subtitle="Here's what's happening across your contacts, schools, and partner relationships."
      hideFrame
    >
      <div
        style={{ fontFamily: CALIBRI, backgroundColor: "#f8fafc" }}
        className="px-4 sm:px-6 lg:px-7 py-5 space-y-4 max-w-[1700px] mx-auto"
      >
        {/* ─── Title row ──────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[24px] md:text-[27px] font-extrabold tracking-tight text-[#111827] leading-tight">
              CRM Overview
            </h1>
            <p className="text-[13px] text-[#667085] leading-snug mt-1.5">
              Manage all schools, contacts, partner organizations, communications, and follow-up activity from one place.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/portal/contacts?action=export"
              className="inline-flex items-center gap-2 h-10 px-4 rounded-[10px] bg-white border border-[#e5eaf0] text-[13px] font-bold text-[#1f2937] shadow-sm hover:bg-gray-50 whitespace-nowrap"
            >
              <Download className="h-4 w-4" strokeWidth={1.75} />
              Export CRM Report
            </Link>
            <Link
              href="/portal/schools/directory?action=new"
              className="inline-flex items-center gap-2 h-10 px-4 rounded-[10px] bg-white border border-[#e5eaf0] text-[13px] font-bold text-[#1f2937] shadow-sm hover:bg-gray-50 whitespace-nowrap"
            >
              <Plus className="h-4 w-4" strokeWidth={1.75} />
              Add School
            </Link>
            <Link
              href="/portal/contacts?new=1"
              className="inline-flex items-center gap-2 h-10 px-4 rounded-[10px] text-white text-[13px] font-bold shadow-sm whitespace-nowrap"
              style={{ background: "linear-gradient(180deg,#0d6f5b 0%,#003f37 100%)" }}
            >
              <UserPlus className="h-4 w-4" strokeWidth={1.75} />
              New Contact
            </Link>
          </div>
        </div>

        {/* ─── KPI strip — 7 cards ────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-7 gap-3">
          {(Object.keys(DATA.kpis) as (keyof typeof DATA.kpis)[]).map((key) => {
            const k = DATA.kpis[key];
            return (
              <Kpi
                key={key}
                label={kpiLabel(key)}
                value={k.value}
                sub={k.sub}
                icon={k.icon}
                accent={k.accent}
                subTone={"subTone" in k ? k.subTone : undefined}
              />
            );
          })}
        </div>

        {/* ─── First analytics row — 3 cards ──────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Relationship & Activity Trend (wide) */}
          <Card className="lg:col-span-5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <h3 className="text-[15px] font-bold text-[#111827]">Relationship &amp; Activity Trend</h3>
                <Info className="h-3.5 w-3.5 text-[#cbd5e1]" strokeWidth={1.75} />
              </div>
              <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-[#475467] bg-white border border-[#e5eaf0] rounded-md px-2 py-1 whitespace-nowrap">
                Last 6 Months <ChevronDown className="h-3 w-3" strokeWidth={2.25} />
              </span>
            </div>
            <div className="mt-2 grid grid-cols-4 gap-3">
              {DATA.trend.miniStats.map((m) => (
                <div key={m.label}>
                  <p className="text-[10.5px] text-[#7a8ca3] font-semibold truncate">{m.label}</p>
                  <p className="text-[16px] font-extrabold text-[#111827] leading-none mt-1">
                    {m.value} <span className="text-[10.5px] font-bold text-emerald-600 align-middle ml-1">{m.delta}</span>
                  </p>
                </div>
              ))}
            </div>
            <RelationshipTrendChart months={DATA.trend.months} values={DATA.trend.values} />
          </Card>

          {/* Contact Segments */}
          <Card className="lg:col-span-4">
            <div className="flex items-center gap-1.5">
              <h3 className="text-[15px] font-bold text-[#111827]">Contact Segments</h3>
              <Info className="h-3.5 w-3.5 text-[#cbd5e1]" strokeWidth={1.75} />
            </div>
            <div className="mt-2 flex items-center gap-3">
              <SegmentsDonut total={DATA.segments.total} segments={DATA.segments.rows} />
              <ul className="min-w-0 flex-1 space-y-1.5">
                {DATA.segments.rows.map((s) => (
                  <li key={s.label} className="flex items-center justify-between gap-2 text-[11.5px]">
                    <span className="inline-flex items-center gap-1.5 text-[#374151] min-w-0">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="truncate">{s.label}</span>
                    </span>
                    <span className="text-[#374151] whitespace-nowrap">
                      <strong className="text-[#111827]">{s.value}</strong>{" "}
                      <span className="text-[#94a3b8]">({s.pct}%)</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <FooterLink href="/portal/contacts?view=segments" label="View all segments" />
          </Card>

          {/* Pipeline & Follow-up Status */}
          <Card className="lg:col-span-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <h3 className="text-[15px] font-bold text-[#111827]">Pipeline &amp; Follow-up Status</h3>
                <Info className="h-3.5 w-3.5 text-[#cbd5e1]" strokeWidth={1.75} />
              </div>
              <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-[#475467] bg-white border border-[#e5eaf0] rounded-md px-2 py-1 whitespace-nowrap">
                All Statuses <ChevronDown className="h-3 w-3" strokeWidth={2.25} />
              </span>
            </div>
            <ul className="mt-3 space-y-2">
              {DATA.pipeline.rows.map((row) => (
                <li key={row.label} className="grid grid-cols-[80px_1fr_56px] items-center gap-2 text-[11px]">
                  <span className="text-[#374151] truncate">{row.label}</span>
                  <div className="h-1.5 rounded-full bg-[#eef0f4] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${row.pct * 2.4}%`, backgroundColor: row.color }} />
                  </div>
                  <span className="text-[#374151] whitespace-nowrap text-right">
                    <strong className="text-[#111827]">{row.value}</strong>{" "}
                    <span className="text-[#94a3b8]">({row.pct}%)</span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <PipelineMini icon={Clock} label="Overdue Follow-ups" value={DATA.pipeline.overdue} valueClass="text-rose-600" />
              <PipelineMini icon={CalendarCheck} label="Due in Next 7 Days" value={DATA.pipeline.dueIn7} valueClass="text-emerald-700" />
            </div>
            <FooterLink href="/portal/contacts?view=pipeline" label="View full pipeline" />
          </Card>
        </div>

        {/* ─── Second row — 3 cards (Schools / Activity / Follow-ups) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {(() => {
            const tpl = "minmax(0,1.4fr) 80px minmax(0,1fr) 100px 110px 100px minmax(0,1fr)";
            return (
              <DashboardListCard
                title="All Schools & Key Contacts"
                padded={false}
                className="lg:col-span-5"
                viewAll={{ href: "/portal/schools/directory", label: "View all schools" }}
              >
                <div className="px-3 pb-2 overflow-x-auto">
                  <DashboardListHeader template={tpl}>
                    <span>School</span><span>District</span><span>Contact</span><span>Role</span>
                    <span>Status</span><span>Last Activity</span><span>Next Action</span>
                  </DashboardListHeader>
                  {DATA.schools.map((row) => (
                    <DashboardListRow key={row.school} template={tpl}>
                      <span className="text-[#111827] font-bold truncate">{row.school}</span>
                      <span className="text-[#374151]">{row.district}</span>
                      <span className="text-[#374151] truncate">{row.contact}</span>
                      <span className="text-[#374151] truncate">{row.role}</span>
                      <span><StatusPill tone={pillToneFor(row.status)}>{row.status}</StatusPill></span>
                      <span className="text-[#7a8ca3]">{row.last}</span>
                      <span className="min-w-0">
                        <span className="block text-[#111827] font-bold leading-tight truncate">{row.next}</span>
                        <span className="block text-[10px] text-[#7a8ca3] leading-tight">{row.nextDate}</span>
                      </span>
                    </DashboardListRow>
                  ))}
                </div>
              </DashboardListCard>
            );
          })()}

          <DashboardListCard
            title="Recent Activity Logs"
            padded={false}
            className="lg:col-span-3"
            viewAll={{ href: "/portal/contacts?view=logs", label: "View all logs" }}
          >
            <div className="px-3 pb-2">
              {DATA.activity.map((a) => (
                <MediaListRow
                  key={a.title}
                  icon={<ActivityIcon icon={a.icon} tone={a.tone} />}
                  title={a.title}
                  subtitle={a.source}
                  meta={a.when}
                />
              ))}
            </div>
          </DashboardListCard>

          {(() => {
            const tpl = "minmax(0,1.2fr) minmax(0,1.2fr) minmax(0,1fr) 90px 100px 90px";
            return (
              <DashboardListCard
                title="Upcoming Follow-ups"
                padded={false}
                className="lg:col-span-4"
                viewAll={{ href: "/portal/contacts?view=calendar", label: "View calendar" }}
              >
                <div className="px-3 pb-2 overflow-x-auto">
                  <DashboardListHeader template={tpl}>
                    <span>Contact</span><span>Org / School</span><span>Task</span>
                    <span>Owner</span><span>Due Date</span><span>Status</span>
                  </DashboardListHeader>
                  {DATA.followUps.map((f) => (
                    <DashboardListRow key={`${f.contact}-${f.task}`} template={tpl}>
                      <span className="text-[#111827] font-bold truncate">{f.contact}</span>
                      <span className="text-[#374151] truncate">{f.org}</span>
                      <span className="text-[#374151] truncate">{f.task}</span>
                      <span className="text-[#374151]">{f.owner}</span>
                      <span className="text-[#7a8ca3]">{f.due}</span>
                      <span><StatusPill tone={pillToneFor(f.status)}>{f.status}</StatusPill></span>
                    </DashboardListRow>
                  ))}
                </div>
              </DashboardListCard>
            );
          })()}
        </div>

        {/* ─── Third row — Partners / Geographic / Quick Actions ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {(() => {
            const tpl = "minmax(0,1.4fr) minmax(0,1fr) 100px 130px";
            return (
              <DashboardListCard
                title="Partner Organizations"
                padded={false}
                className="lg:col-span-4"
                viewAll={{ href: "/portal/contacts?view=partners", label: "View all partners" }}
              >
                <div className="px-3 pb-2 overflow-x-auto">
                  <DashboardListHeader template={tpl}>
                    <span>Organization</span><span>Primary Contact</span>
                    <span>Schools</span><span>Engagement</span>
                  </DashboardListHeader>
                  {DATA.partners.map((p) => (
                    <DashboardListRow key={p.org} template={tpl}>
                      <span className="text-[#111827] font-bold truncate">{p.org}</span>
                      <span className="text-[#374151] truncate">{p.contact}</span>
                      <span className="text-[#111827] font-bold">{p.schools}</span>
                      <span><StatusPill tone={pillToneFor(p.status)}>{p.status}</StatusPill></span>
                    </DashboardListRow>
                  ))}
                </div>
              </DashboardListCard>
            );
          })()}

          <DashboardListCard
            title="Geographic Coverage"
            padded={false}
            className="lg:col-span-5"
            viewAll={{ href: "/portal/insights?view=geo", label: "View region insights" }}
          >
            <div className="px-4 py-3 grid grid-cols-[140px_1fr] gap-4 items-start">
              <UgandaSilhouetteMap />
              {(() => {
                const tpl = "80px 70px 70px minmax(0,1fr)";
                return (
                  <div className="min-w-0">
                    <DashboardListHeader template={tpl}>
                      <span>Region</span><span>Schools</span><span>Contacts</span><span>Coverage</span>
                    </DashboardListHeader>
                    {DATA.geographic.map((r) => (
                      <DashboardListRow key={r.region} template={tpl}>
                        <span className="text-[#111827] font-bold">{r.region}</span>
                        <span className="text-[#374151]">{r.schools}</span>
                        <span className="text-[#374151]">{r.contacts}</span>
                        <ProgressCell pct={r.coverage} />
                      </DashboardListRow>
                    ))}
                  </div>
                );
              })()}
            </div>
          </DashboardListCard>

          {/* Quick Actions */}
          <Card className="lg:col-span-3">
            <div className="flex items-center gap-1.5">
              <h3 className="text-[15px] font-bold text-[#111827]">Quick Actions</h3>
              <Info className="h-3.5 w-3.5 text-[#cbd5e1]" strokeWidth={1.75} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {DATA.quickActions.map((a) => (
                <QuickActionTile key={a.label} icon={a.icon} label={a.label} href={a.href} />
              ))}
            </div>
          </Card>
        </div>

        {/* ─── Bottom Insight Bar ─────────────────────────────────── */}
        <section
          className="rounded-2xl border border-[#dcefe8] px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
          style={{ backgroundColor: "#f3faf6" }}
        >
          <div className="flex items-start gap-3 min-w-0">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-100 text-emerald-700 shrink-0">
              <BarChart3 className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <p className="text-[13.5px] font-extrabold text-[#0f5c4a] leading-tight">CRM Insight</p>
              <p className="text-[12px] text-[#374151] leading-snug mt-0.5">
                Most active relationship growth this period came from{" "}
                <strong className="text-emerald-700">Central</strong> and{" "}
                <strong className="text-emerald-700">Acholi</strong> regions, while{" "}
                <strong className="text-rose-600">23 contacts</strong> and{" "}
                <strong className="text-rose-600">9 schools</strong> require urgent follow-up.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11.5px] text-[#7a8ca3] self-start md:self-center shrink-0">
            <span className="whitespace-nowrap">Updated: {DATA.insight.updated}</span>
            <button type="button" aria-label="Insight info" className="grid h-6 w-6 place-items-center rounded-full text-[#94a3b8] hover:bg-white">
              <Info className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
          </div>
        </section>
      </div>
    </OzekiPortalShell>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Subcomponents
   ──────────────────────────────────────────────────────────────────── */

function kpiLabel(key: string): string {
  return ({
    totalSchools:      "TOTAL SCHOOLS",
    activeContacts:    "ACTIVE CONTACTS",
    partnerOrgs:       "PARTNER ORGANIZATIONS",
    openOpportunities: "OPEN OPPORTUNITIES",
    activityLogs:      "ACTIVITY LOGS",
    followUpsDue:      "FOLLOW-UPS DUE",
    dataCompleteness:  "DATA COMPLETENESS",
  } as Record<string, string>)[key] ?? key.toUpperCase();
}

function Card({
  children, padded = true, className = "",
}: {
  children: React.ReactNode; padded?: boolean; className?: string;
}) {
  return (
    <section
      className={`rounded-2xl bg-white border border-[#e5eaf0] ${padded ? "p-5" : ""} ${className}`}
      style={{ boxShadow: "0 8px 24px rgba(16, 24, 40, 0.035)" }}
    >
      {children}
    </section>
  );
}

function FooterLink({ href, label, inline = false }: { href: string; label: string; inline?: boolean }) {
  return (
    <Link
      href={href}
      className={`text-[12px] font-bold text-emerald-700 hover:text-emerald-800 inline-flex items-center ${inline ? "" : "mt-3"}`}
    >
      {label} <ChevronRight className="h-3 w-3 ml-0.5" strokeWidth={2.25} />
    </Link>
  );
}

/* ── KPI ──────────────────────────────────────────────────────────── */

type Accent = "emerald" | "blue" | "violet" | "orange" | "teal" | "red";
const accentMap: Record<Accent, { bg: string; fg: string }> = {
  emerald: { bg: "#eaf7f1", fg: "#047857" },
  blue:    { bg: "#ecf4ff", fg: "#1d4ed8" },
  violet:  { bg: "#f4eeff", fg: "#7c3aed" },
  orange:  { bg: "#fff4e8", fg: "#c2410c" },
  teal:    { bg: "#ccfbf1", fg: "#0f766e" },
  red:     { bg: "#fdecec", fg: "#b91c1c" },
};

function Kpi({
  label, value, sub, icon: Icon, accent, subTone,
}: {
  label: string; value: string; sub: string; icon: LucideIcon;
  accent: Accent; subTone?: "rose";
}) {
  const a = accentMap[accent];
  const subClass = subTone === "rose"
    ? "text-rose-600 font-bold"
    : sub.startsWith("↑")
      ? "text-emerald-600 font-bold"
      : sub.startsWith("↓")
        ? "text-rose-600 font-bold"
        : "text-[#7a8ca3] font-medium";
  return (
    <div
      className="rounded-2xl border border-[#e5eaf0] bg-white p-3.5 flex flex-col gap-1.5 min-h-[100px]"
      style={{ boxShadow: "0 8px 24px rgba(16, 24, 40, 0.035)" }}
    >
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-full shrink-0" style={{ backgroundColor: a.bg }}>
          <Icon className="h-4 w-4" strokeWidth={1.75} style={{ color: a.fg }} />
        </span>
        <p className="text-[10px] font-bold text-[#7a8ca3] uppercase tracking-[0.06em] leading-tight">{label}</p>
      </div>
      <p className="text-[26px] font-extrabold text-[#111827] leading-none tracking-tight truncate">{value}</p>
      <p className={`text-[11px] mt-auto truncate ${subClass}`}>{sub}</p>
    </div>
  );
}

/* ── Relationship trend (line + soft fill) ────────────────────────── */

function RelationshipTrendChart({ months, values }: { months: string[]; values: number[] }) {
  const w = 460, h = 175, pl = 30, pr = 8, pt = 16, pb = 24;
  const innerW = w - pl - pr, innerH = h - pt - pb;
  const yMax = 400;
  const sx = (i: number) => pl + (i / (months.length - 1)) * innerW;
  const sy = (v: number) => pt + innerH - (v / yMax) * innerH;
  const ticks = [0, 100, 200, 300, 400];
  const linePath = values.map((v, i) => `${i === 0 ? "M" : "L"} ${sx(i).toFixed(1)} ${sy(v).toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L ${sx(values.length - 1).toFixed(1)} ${sy(0).toFixed(1)} L ${sx(0).toFixed(1)} ${sy(0).toFixed(1)} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" role="img" aria-label="Relationship trend">
      <defs>
        <linearGradient id="crmTrendFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.20" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {ticks.map((v) => (
        <g key={v}>
          <line x1={pl} x2={pl + innerW} y1={sy(v)} y2={sy(v)} stroke="#eef0f4" strokeWidth={1} strokeDasharray={v === 0 ? "" : "2 4"} />
          <text x={pl - 4} y={sy(v) + 3} fontSize="9" fill="#94a3b8" textAnchor="end">{v}</text>
        </g>
      ))}
      <path d={areaPath} fill="url(#crmTrendFill)" />
      <path d={linePath} fill="none" stroke="#10b981" strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
      {values.map((v, i) => (
        <circle key={i} cx={sx(i)} cy={sy(v)} r={3} fill="#10b981" stroke="#fff" strokeWidth={1.5} />
      ))}
      {months.map((m, i) => (
        <text key={m} x={sx(i)} y={h - 6} fontSize="9.5" fill="#94a3b8" textAnchor="middle">{m}</text>
      ))}
    </svg>
  );
}

/* ── Segments donut ────────────────────────────────────────────────── */

function SegmentsDonut({
  total, segments,
}: {
  total: number; segments: { label: string; pct: number; color: string }[];
}) {
  const size = 150, stroke = 24;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
      {segments.map((s) => {
        const dash = (s.pct / 100) * c;
        const offset = c * (1 - acc / 100);
        acc += s.pct;
        return (
          <circle
            key={s.label}
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke={s.color} strokeWidth={stroke}
            strokeDasharray={`${dash} ${c - dash}`}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        );
      })}
      <text x={size / 2} y={size / 2 - 2} textAnchor="middle" fontSize="18" fontWeight="800" fill="#111827">
        {total.toLocaleString()}
      </text>
      <text x={size / 2} y={size / 2 + 14} textAnchor="middle" fontSize="9.5" fill="#7a8ca3">Total Contacts</text>
    </svg>
  );
}

/* ── Pipeline mini ─────────────────────────────────────────────────── */

function PipelineMini({
  icon: Icon, label, value, valueClass,
}: {
  icon: LucideIcon; label: string; value: number; valueClass: string;
}) {
  return (
    <div className="rounded-xl border border-[#e8edf3] p-2.5">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-[#94a3b8]" strokeWidth={1.75} />
        <p className="text-[10px] font-bold uppercase tracking-[0.04em] text-[#7a8ca3] truncate">{label}</p>
      </div>
      <p className={`text-[18px] font-extrabold leading-none mt-1 ${valueClass}`}>{value}</p>
    </div>
  );
}

/* ── Activity icon ─────────────────────────────────────────────────── */

function ActivityIcon({ icon: Icon, tone }: { icon: LucideIcon; tone: string }) {
  const map: Record<string, { bg: string; fg: string }> = {
    blue:    { bg: "#dbeafe", fg: "#1d4ed8" },
    emerald: { bg: "#d1fae5", fg: "#047857" },
    orange:  { bg: "#fef3c7", fg: "#b45309" },
    violet:  { bg: "#ede9fe", fg: "#7c3aed" },
    rose:    { bg: "#fee2e2", fg: "#b91c1c" },
  };
  const t = map[tone] ?? map.emerald;
  return (
    <span className="grid h-7 w-7 place-items-center rounded-full shrink-0 mt-0.5" style={{ backgroundColor: t.bg }}>
      <Icon className="h-3.5 w-3.5" strokeWidth={1.75} style={{ color: t.fg }} />
    </span>
  );
}

/* ── Quick action tile ─────────────────────────────────────────────── */

function QuickActionTile({ icon: Icon, label, href }: { icon: LucideIcon; label: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-[10px] border border-[#e5eaf0] bg-white px-2.5 py-2 hover:bg-gray-50/60 group"
    >
      <span className="grid h-7 w-7 place-items-center rounded-md bg-[#eaf7f1] text-emerald-700 shrink-0">
        <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
      </span>
      <span className="flex-1 text-[11.5px] font-bold text-[#111827] truncate">{label}</span>
      <ChevronRight className="h-3.5 w-3.5 text-[#94a3b8] group-hover:text-[#475467]" strokeWidth={1.75} />
    </Link>
  );
}

/* ── Uganda silhouette map (inline SVG, regional choropleth) ─────── */

function UgandaSilhouetteMap() {
  /* Simplified Uganda outline split into rough regional polygons. The
     polygons are not geographically exact — they're approximate shapes
     that read as "Uganda by region" with a green choropleth, matching
     the screenshot's compact reference card. */
  return (
    <svg viewBox="0 0 140 150" width={140} height={150} role="img" aria-label="Uganda regional coverage" className="shrink-0">
      {/* West Nile (top-left) */}
      <path d="M 14 18 L 38 12 L 46 30 L 30 42 L 18 36 Z" fill="#86efac" stroke="#fff" strokeWidth={1} />
      {/* Acholi (top-mid) */}
      <path d="M 46 30 L 38 12 L 70 14 L 78 26 L 64 36 L 46 38 Z" fill="#34d399" stroke="#fff" strokeWidth={1} />
      {/* Karamoja (top-right) */}
      <path d="M 78 26 L 70 14 L 110 18 L 116 36 L 100 42 L 88 36 Z" fill="#bbf7d0" stroke="#fff" strokeWidth={1} />
      {/* Lango (mid-left) */}
      <path d="M 18 36 L 30 42 L 46 38 L 50 56 L 30 60 L 14 50 Z" fill="#34d399" stroke="#fff" strokeWidth={1} />
      {/* Teso / Eastern (mid-right) */}
      <path d="M 64 36 L 78 26 L 88 36 L 100 42 L 96 60 L 78 62 L 60 56 L 50 56 L 46 38 Z" fill="#10b981" stroke="#fff" strokeWidth={1} />
      {/* Western */}
      <path d="M 14 50 L 30 60 L 50 56 L 50 78 L 30 84 L 16 76 Z" fill="#10b981" stroke="#fff" strokeWidth={1} />
      {/* Central */}
      <path d="M 50 56 L 60 56 L 78 62 L 80 86 L 60 94 L 50 78 Z" fill="#065f46" stroke="#fff" strokeWidth={1} />
      {/* Eastern (lake-side) */}
      <path d="M 78 62 L 96 60 L 102 78 L 96 94 L 80 86 Z" fill="#34d399" stroke="#fff" strokeWidth={1} />
      {/* South-west tip */}
      <path d="M 16 76 L 30 84 L 50 78 L 48 100 L 30 104 L 18 92 Z" fill="#10b981" stroke="#fff" strokeWidth={1} />
      {/* South-central toward Lake Victoria */}
      <path d="M 50 78 L 60 94 L 80 86 L 78 110 L 56 116 L 48 100 Z" fill="#065f46" stroke="#fff" strokeWidth={1} />
      {/* Lake Victoria (bottom-right) */}
      <path d="M 78 110 L 96 94 L 102 78 L 116 88 L 120 120 L 90 130 L 60 122 L 56 116 Z" fill="#bfdbfe" opacity={0.85} />
    </svg>
  );
}
