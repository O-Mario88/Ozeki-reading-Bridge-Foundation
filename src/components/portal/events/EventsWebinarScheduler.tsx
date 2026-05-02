"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CalendarPlus, RefreshCw, Download, Calendar, Clock, ChevronDown,
  ChevronLeft, ChevronRight, Video, MapPin, Eye, Pencil, MoreVertical,
  TrendingUp, Star, Award, BarChart3, Link as LinkIcon,
  Save, Users,
} from "lucide-react";
import {
  DashboardListCard, DashboardListHeader, DashboardListRow,
  StatusPill, pillToneFor,
} from "@/components/portal/DashboardList";

const CALIBRI = 'Calibri, "Segoe UI", Arial, sans-serif';

/* ────────────────────────────────────────────────────────────────────
   Reference data — frozen verbatim from the screenshot.
   ──────────────────────────────────────────────────────────────────── */

const UPCOMING_WEEK = [
  { dow: "Mon", day: "12", title: "Reading Mastery Webinar",   when: "10:00 AM – 11:30 AM" },
  { dow: "Tue", day: "13", title: "School Leaders Roundtable",  when: "02:00 PM – 03:30 PM" },
  { dow: "Wed", day: "14", title: "Teacher Training Series",    when: "10:00 AM – 12:00 PM" },
  { dow: "Thu", day: "15", title: "Literacy Best Practices",    when: "01:00 PM – 02:30 PM" },
  { dow: "Fri", day: "16", title: "Community Literacy Forum",   when: "03:00 PM – 04:30 PM" },
];

type Mode = "Webinar" | "In-person";
type RecentRow = {
  title: string; mode: Mode; date: string; time: string;
  facilitator: string; audience: string; status: string;
  registered: number; capacity: number;
};

const RECENT_EVENTS: RecentRow[] = [
  { title: "Reading Mastery Webinar",    mode: "Webinar",   date: "May 12, 2025", time: "10:00 AM – 11:30 AM", facilitator: "Dr. Amina Okeke", audience: "Teachers",       status: "Upcoming",  registered: 42, capacity: 100 },
  { title: "School Leaders Roundtable",   mode: "Webinar",   date: "May 13, 2025", time: "02:00 PM – 03:30 PM", facilitator: "Tunde Adeyemi",   audience: "School Leaders", status: "Upcoming",  registered: 18, capacity: 50  },
  { title: "Teacher Training Series",     mode: "Webinar",   date: "May 14, 2025", time: "10:00 AM – 12:00 PM", facilitator: "Grace Johnson",   audience: "Teachers",       status: "Live",      registered: 63, capacity: 120 },
  { title: "Literacy Best Practices",     mode: "In-person", date: "May 15, 2025", time: "01:00 PM – 02:30 PM", facilitator: "Michael Brown",   audience: "Teachers",       status: "Upcoming",  registered: 28, capacity: 75  },
  { title: "Community Literacy Forum",    mode: "Webinar",   date: "May 16, 2025", time: "03:00 PM – 04:30 PM", facilitator: "Dr. Amina Okeke", audience: "Community",      status: "Completed", registered: 55, capacity: 80  },
];

const KPIS = [
  { label: "Attendance Rate",     value: "78%",   trend: "↑ 12% vs last month", icon: Users,  bg: "#eaf7f1", fg: "#047857" },
  { label: "Sessions This Month", value: "12",    trend: "↑ 3 vs last month",   icon: Calendar, bg: "#fff4e8", fg: "#c2410c" },
  { label: "Certificates Issued", value: "86",    trend: "↑ 15 vs last month",  icon: Award,  bg: "#f4eeff", fg: "#7c3aed" },
  { label: "Avg Satisfaction",    value: "4.6 / 5", trend: "↑ 0.4 vs last month", icon: Star, bg: "#ecf4ff", fg: "#1d4ed8" },
];

/* ────────────────────────────────────────────────────────────────────
   Main client component
   ──────────────────────────────────────────────────────────────────── */

export default function EventsWebinarScheduler() {
  // Schedule form state
  const [draft, setDraft] = useState({
    title: "", eventType: "", host: "",
    date: "", startTime: "", endTime: "", deliveryMode: "",
    audience: "", venueMode: "google" as "google" | "physical",
    capacity: "", description: "",
  });

  // Outcomes form state
  const [outcomes, setOutcomes] = useState({
    attendedTeachers: "63",
    attendedSchoolLeaders: "12",
    recordingUrl: "",
    engagementScore: 4.6,
    meetingNotes: "",
    keyOutcomes: "",
    followUpAction: "",
  });

  return (
    <div style={{ fontFamily: CALIBRI }} className="space-y-5">
      {/* ─── Title row ──────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[28px] md:text-[32px] font-extrabold tracking-tight text-[#111827] leading-tight">
            Events &amp; Webinar Scheduler
          </h1>
          <p className="text-[13px] text-[#667085] leading-snug mt-1.5">
            Create live sessions directly from dashboard, send Google Calendar invites, and launch from Meet links.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-[10px] text-white text-[13px] font-bold shadow-sm whitespace-nowrap"
            style={{ background: "linear-gradient(180deg,#0d6f5b 0%,#003f37 100%)" }}
          >
            <CalendarPlus className="h-4 w-4" strokeWidth={1.75} />
            New Event
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-[10px] bg-white border border-[#e5eaf0] text-[13px] font-bold text-[#1f2937] shadow-sm hover:bg-gray-50 whitespace-nowrap"
          >
            <RefreshCw className="h-4 w-4" strokeWidth={1.75} />
            Sync Calendar
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-[10px] bg-white border border-[#e5eaf0] text-[13px] font-bold text-[#1f2937] shadow-sm hover:bg-gray-50 whitespace-nowrap"
          >
            <Download className="h-4 w-4" strokeWidth={1.75} />
            Export Schedule
          </button>
        </div>
      </div>

      {/* ─── Tab switcher ───────────────────────────────────────── */}
      <div className="border-b border-[#e5eaf0]">
        <nav aria-label="Event mode" className="flex items-center gap-1">
          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-[13px] font-bold text-emerald-700 border-b-2 border-emerald-600 -mb-px"
          >
            <Video className="h-4 w-4" strokeWidth={1.75} />
            Live Online Sessions
          </button>
          <Link
            href="/portal/events/physical"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-[13px] font-semibold text-[#475467] hover:text-[#111827] border-b-2 border-transparent -mb-px"
          >
            <MapPin className="h-4 w-4" strokeWidth={1.75} />
            In-person / Physical Events
          </Link>
        </nav>
      </div>

      {/* ─── Two-column: Schedule form + Upcoming This Week ───── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Schedule Event / Webinar */}
        <Card className="lg:col-span-9">
          <header className="flex items-center gap-2 mb-4">
            <Calendar className="h-4 w-4 text-emerald-700" strokeWidth={1.75} />
            <h2 className="text-[15px] font-bold text-[#111827]">Schedule Event / Webinar</h2>
          </header>

          {/* Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-4">
            <Field label="Title">
              <TextInput
                value={draft.title}
                onChange={(v) => setDraft({ ...draft, title: v })}
                placeholder="e.g. Reading Fluency Webinar"
              />
            </Field>
            <Field label="Event Type">
              <SelectInput
                value={draft.eventType}
                onChange={(v) => setDraft({ ...draft, eventType: v })}
                placeholder="Select type"
                options={["Webinar", "Workshop", "Roundtable", "Training Series", "Forum"]}
              />
            </Field>
            <Field label="Host / Facilitator">
              <SelectInput
                value={draft.host}
                onChange={(v) => setDraft({ ...draft, host: v })}
                placeholder="Select facilitator"
                options={["Dr. Amina Okeke", "Tunde Adeyemi", "Grace Johnson", "Michael Brown"]}
              />
            </Field>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-x-4 gap-y-4 mt-4">
            <Field label="Date">
              <IconInput
                icon={<Calendar className="h-3.5 w-3.5" strokeWidth={1.75} />}
                value={draft.date}
                onChange={(v) => setDraft({ ...draft, date: v })}
                placeholder="Select date"
                ariaLabel="Event date"
              />
            </Field>
            <Field label="Start Time">
              <IconInput
                icon={<Clock className="h-3.5 w-3.5" strokeWidth={1.75} />}
                value={draft.startTime}
                onChange={(v) => setDraft({ ...draft, startTime: v })}
                placeholder="Select start time"
                ariaLabel="Start time"
              />
            </Field>
            <Field label="End Time">
              <IconInput
                icon={<Clock className="h-3.5 w-3.5" strokeWidth={1.75} />}
                value={draft.endTime}
                onChange={(v) => setDraft({ ...draft, endTime: v })}
                placeholder="Select end time"
                ariaLabel="End time"
              />
            </Field>
            <Field label="Delivery Mode">
              <SelectInput
                value={draft.deliveryMode}
                onChange={(v) => setDraft({ ...draft, deliveryMode: v })}
                placeholder="Select mode"
                options={["Live Webinar", "Recorded", "Hybrid"]}
              />
            </Field>
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-4 mt-4">
            <Field label="Audience">
              <SelectInput
                value={draft.audience}
                onChange={(v) => setDraft({ ...draft, audience: v })}
                placeholder="Select audience"
                options={["Teachers", "School Leaders", "Coaches", "Community", "All"]}
              />
            </Field>
            <Field label="Meet / Venue">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDraft({ ...draft, venueMode: "google" })}
                  className={
                    draft.venueMode === "google"
                      ? "inline-flex items-center justify-center gap-1.5 h-11 px-3 text-[12.5px] font-bold rounded-[10px] border bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "inline-flex items-center justify-center gap-1.5 h-11 px-3 text-[12.5px] font-bold rounded-[10px] border bg-white text-[#475467] border-[#e5eaf0] hover:bg-gray-50"
                  }
                >
                  <Video className="h-3.5 w-3.5" strokeWidth={1.75} />
                  Google Meet
                </button>
                <button
                  type="button"
                  onClick={() => setDraft({ ...draft, venueMode: "physical" })}
                  className={
                    draft.venueMode === "physical"
                      ? "inline-flex items-center justify-center gap-1.5 h-11 px-3 text-[12.5px] font-bold rounded-[10px] border bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "inline-flex items-center justify-center gap-1.5 h-11 px-3 text-[12.5px] font-bold rounded-[10px] border bg-white text-[#475467] border-[#e5eaf0] hover:bg-gray-50"
                  }
                >
                  <MapPin className="h-3.5 w-3.5" strokeWidth={1.75} />
                  Physical Venue
                </button>
              </div>
            </Field>
            <Field label="Capacity">
              <TextInput
                value={draft.capacity}
                onChange={(v) => setDraft({ ...draft, capacity: v })}
                placeholder="Enter capacity"
                type="number"
              />
            </Field>
          </div>

          {/* Row 4 — description + schedule button */}
          <div className="mt-4">
            <Field label="Description">
              <textarea
                rows={3}
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="Add a brief description, objectives, and key topics to be covered..."
                className="w-full px-3.5 py-2.5 text-[12.5px] rounded-[10px] border border-[#e5eaf0] bg-white text-[#111827] placeholder:text-[#94a3b8] resize-y focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
              />
            </Field>
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                className="inline-flex items-center gap-2 h-11 px-5 rounded-[10px] text-white text-[13px] font-bold shadow-sm whitespace-nowrap"
                style={{ background: "linear-gradient(180deg,#0d6f5b 0%,#003f37 100%)" }}
              >
                <Calendar className="h-4 w-4" strokeWidth={1.75} />
                Schedule Event
              </button>
            </div>
          </div>
        </Card>

        {/* Upcoming This Week */}
        <Card className="lg:col-span-3">
          <header className="flex items-start justify-between gap-2 mb-3">
            <h2 className="text-[14px] font-bold text-[#111827] inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-emerald-700" strokeWidth={1.75} />
              Upcoming This Week
            </h2>
            <Link href="/portal/events?view=calendar" className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-0.5">
              View Calendar <ChevronRight className="h-3 w-3" strokeWidth={2.25} />
            </Link>
          </header>

          <div className="flex items-center justify-between mb-2 text-[11.5px] text-[#475467]">
            <span className="font-semibold">May 12 – 18, 2025</span>
            <div className="inline-flex items-center gap-0.5">
              <button type="button" aria-label="Previous week" className="grid h-6 w-6 place-items-center rounded-md text-[#94a3b8] hover:bg-gray-50">
                <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
              </button>
              <button type="button" aria-label="Next week" className="grid h-6 w-6 place-items-center rounded-md text-[#94a3b8] hover:bg-gray-50">
                <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.75} />
              </button>
            </div>
          </div>

          <ul className="divide-y divide-[#eef2f6]">
            {UPCOMING_WEEK.map((u) => (
              <li key={u.day} className="grid grid-cols-[34px_8px_1fr] items-start gap-2 py-2.5 text-[11.5px]">
                <div className="leading-tight">
                  <p className="text-[9.5px] font-bold uppercase text-[#7a8ca3]">{u.dow}</p>
                  <p className="text-[14px] font-extrabold text-[#111827]">{u.day}</p>
                </div>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-2" />
                <div className="min-w-0">
                  <p className="text-[#111827] font-bold truncate">{u.title}</p>
                  <p className="text-[10.5px] text-[#7a8ca3] mt-0.5">{u.when}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[10px] text-[#94a3b8] italic">All times are in your local timezone</p>
        </Card>
      </div>

      {/* ─── Recent Scheduled Events (card-list) ──────────────── */}
      {(() => {
        const tpl = "minmax(0,1.3fr) 90px 110px 160px 130px 110px 100px 110px 80px";
        return (
          <DashboardListCard title="Recent Scheduled Events" padded={false}>
            <div className="px-3 pb-2 overflow-x-auto">
              <DashboardListHeader template={tpl}>
                <span>Event Title</span><span>Type</span><span>Date</span><span>Time</span>
                <span>Facilitator</span><span>Audience</span><span>Status</span>
                <span>Registrations</span><span>Actions</span>
              </DashboardListHeader>
              {RECENT_EVENTS.map((r) => (
                <DashboardListRow key={r.title} template={tpl}>
                  <span className="inline-flex items-center gap-1.5 min-w-0">
                    {r.mode === "Webinar"
                      ? <Video className="h-3.5 w-3.5 text-emerald-600 shrink-0" strokeWidth={1.75} />
                      : <MapPin className="h-3.5 w-3.5 text-amber-600 shrink-0" strokeWidth={1.75} />}
                    <span className="text-[#111827] font-bold truncate">{r.title}</span>
                  </span>
                  <span>
                    <ModePill mode={r.mode} />
                  </span>
                  <span className="text-[#374151]">{r.date}</span>
                  <span className="text-[#374151]">{r.time}</span>
                  <span className="text-[#374151] truncate">{r.facilitator}</span>
                  <span className="text-[#374151] truncate">{r.audience}</span>
                  <span><StatusPill tone={pillToneFor(r.status)}>{r.status}</StatusPill></span>
                  <span className="text-[#111827] font-bold">{r.registered} / {r.capacity}</span>
                  <span className="inline-flex items-center gap-1">
                    <ActionIcon ariaLabel="View"><Eye className="h-3.5 w-3.5" strokeWidth={1.75} /></ActionIcon>
                    <ActionIcon ariaLabel="Edit"><Pencil className="h-3.5 w-3.5" strokeWidth={1.75} /></ActionIcon>
                    <ActionIcon ariaLabel="More"><MoreVertical className="h-3.5 w-3.5" strokeWidth={1.75} /></ActionIcon>
                  </span>
                </DashboardListRow>
              ))}
            </div>
          </DashboardListCard>
        );
      })()}

      {/* ─── Bottom: Capture Outcomes (left) + KPI grid (right) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Capture Webinar Outcomes */}
        <Card className="lg:col-span-8">
          <header className="flex items-baseline gap-2 mb-1">
            <BarChart3 className="h-4 w-4 text-emerald-700" strokeWidth={1.75} />
            <h2 className="text-[15px] font-bold text-[#111827]">Capture Webinar Outcomes</h2>
          </header>
          <p className="text-[12px] text-[#667085] mb-4">
            Update attendees, recording, notes and track outcomes for continuous improvement.
          </p>

          {/* Top stats row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <Field label="Attended Teachers">
              <TextInput
                value={outcomes.attendedTeachers}
                onChange={(v) => setOutcomes({ ...outcomes, attendedTeachers: v })}
                placeholder="0"
                type="number"
              />
            </Field>
            <Field label="Attended School Leaders">
              <TextInput
                value={outcomes.attendedSchoolLeaders}
                onChange={(v) => setOutcomes({ ...outcomes, attendedSchoolLeaders: v })}
                placeholder="0"
                type="number"
              />
            </Field>
            <Field label="Recording URL">
              <IconInput
                icon={<LinkIcon className="h-3.5 w-3.5" strokeWidth={1.75} />}
                value={outcomes.recordingUrl}
                onChange={(v) => setOutcomes({ ...outcomes, recordingUrl: v })}
                placeholder="https://drive.google.com/..."
                ariaLabel="Recording URL"
              />
            </Field>
            <Field label="Engagement Score">
              <div className="h-11 px-3 rounded-[10px] border border-[#e5eaf0] bg-white flex items-center justify-between text-[12.5px]">
                <span className="inline-flex items-center gap-0.5">
                  {[1,2,3,4,5].map((i) => (
                    <Star
                      key={i}
                      className={i <= Math.round(outcomes.engagementScore) ? "h-3.5 w-3.5 text-amber-500 fill-amber-500" : "h-3.5 w-3.5 text-[#e5e7eb]"}
                      strokeWidth={1.5}
                    />
                  ))}
                </span>
                <span className="text-[#111827] font-bold">{outcomes.engagementScore.toFixed(1)}</span>
              </div>
            </Field>
          </div>

          {/* Notes textareas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <Field label="Meeting Notes">
              <textarea
                rows={3}
                value={outcomes.meetingNotes}
                onChange={(e) => setOutcomes({ ...outcomes, meetingNotes: e.target.value })}
                placeholder="Summarize key discussions, highlights, and important takeaways..."
                className="w-full px-3.5 py-2.5 text-[12.5px] rounded-[10px] border border-[#e5eaf0] bg-white text-[#111827] placeholder:text-[#94a3b8] resize-y focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
              />
            </Field>
            <Field label="Key Outcomes">
              <textarea
                rows={3}
                value={outcomes.keyOutcomes}
                onChange={(e) => setOutcomes({ ...outcomes, keyOutcomes: e.target.value })}
                placeholder="List the main outcomes or learnings from this session..."
                className="w-full px-3.5 py-2.5 text-[12.5px] rounded-[10px] border border-[#e5eaf0] bg-white text-[#111827] placeholder:text-[#94a3b8] resize-y focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
              />
            </Field>
          </div>

          <Field label="Follow-up Action">
            <textarea
              rows={2}
              value={outcomes.followUpAction}
              onChange={(e) => setOutcomes({ ...outcomes, followUpAction: e.target.value })}
              placeholder="What are the next steps or follow-up actions?"
              className="w-full px-3.5 py-2.5 text-[12.5px] rounded-[10px] border border-[#e5eaf0] bg-white text-[#111827] placeholder:text-[#94a3b8] resize-y focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
            />
          </Field>

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              className="inline-flex items-center gap-2 h-11 px-5 rounded-[10px] text-white text-[13px] font-bold shadow-sm whitespace-nowrap"
              style={{ background: "linear-gradient(180deg,#0d6f5b 0%,#003f37 100%)" }}
            >
              <Save className="h-4 w-4" strokeWidth={1.75} />
              Save Outcomes
            </button>
          </div>
        </Card>

        {/* KPI grid */}
        <div className="lg:col-span-4 grid grid-cols-2 gap-3">
          {KPIS.map((k) => (
            <KpiCard key={k.label} {...k} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Subcomponents
   ──────────────────────────────────────────────────────────────────── */

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-2xl bg-white border border-[#e5eaf0] p-5 ${className}`}
      style={{ boxShadow: "0 8px 24px rgba(16, 24, 40, 0.035)" }}
    >
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11.5px] font-bold text-[#475467] mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function TextInput({
  value, onChange, placeholder, type = "text",
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full h-11 px-3.5 text-[12.5px] rounded-[10px] border border-[#e5eaf0] bg-white text-[#111827] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
    />
  );
}

function IconInput({
  icon, value, onChange, placeholder, ariaLabel,
}: {
  icon: React.ReactNode; value: string; onChange: (v: string) => void;
  placeholder?: string; ariaLabel: string;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]">
        {icon}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="w-full h-11 pl-9 pr-3 text-[12.5px] rounded-[10px] border border-[#e5eaf0] bg-white text-[#111827] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
      />
    </div>
  );
}

function SelectInput({
  value, onChange, placeholder, options,
}: {
  value: string; onChange: (v: string) => void;
  placeholder: string; options: string[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={placeholder}
        className="w-full h-11 pl-3.5 pr-8 text-[12.5px] rounded-[10px] border border-[#e5eaf0] bg-white text-[#111827] appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#94a3b8]" strokeWidth={1.75} />
    </div>
  );
}

function ActionIcon({ children, ariaLabel }: { children: React.ReactNode; ariaLabel: string }) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className="grid h-7 w-7 place-items-center rounded-md text-[#94a3b8] hover:bg-gray-50 hover:text-[#475467]"
    >
      {children}
    </button>
  );
}

function ModePill({ mode }: { mode: Mode }) {
  const cls = mode === "Webinar"
    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
    : "bg-amber-50 text-amber-700 border-amber-100";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${cls}`}>
      {mode}
    </span>
  );
}

function KpiCard({
  label, value, trend, icon: Icon, bg, fg,
}: {
  label: string; value: string; trend: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number; style?: React.CSSProperties }>;
  bg: string; fg: string;
}) {
  return (
    <div
      className="rounded-2xl bg-white border border-[#e5eaf0] p-3.5 flex flex-col gap-1.5 min-h-[100px]"
      style={{ boxShadow: "0 8px 24px rgba(16, 24, 40, 0.035)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10.5px] font-bold text-[#7a8ca3] uppercase tracking-[0.04em] leading-tight truncate">{label}</p>
          <p className="text-[22px] font-extrabold text-[#111827] leading-none mt-1.5 tracking-tight">{value}</p>
        </div>
        <span className="grid h-9 w-9 place-items-center rounded-full shrink-0" style={{ backgroundColor: bg }}>
          <Icon className="h-4 w-4" strokeWidth={1.75} style={{ color: fg }} />
        </span>
      </div>
      <p className="text-[11px] font-bold text-emerald-600 mt-auto inline-flex items-center gap-0.5">
        <TrendingUp className="h-3 w-3" strokeWidth={2.5} />
        {trend.replace("↑ ", "")}
      </p>
    </div>
  );
}

