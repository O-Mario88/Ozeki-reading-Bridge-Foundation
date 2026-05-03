"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  User, MapPin, Calendar, Users, Clock, Target,
  ChevronDown, MessageSquare, ShieldCheck, Bookmark, Send, X, Check, Search,
} from "lucide-react";
import {
  LESSON_STRUCTURE_ITEMS,
  LESSON_STRUCTURE_KEYS,
  GPC_CRITERIA,
  BLENDING_CRITERIA,
  ENGAGEMENT_CRITERIA,
  POST_OBSERVATION_RATINGS,
  SCORING_KEY,
  type LessonStructureKey,
  type ScoredCriteriaKey,
  type PostObservationRating,
} from "@/lib/phonics-observation";
import type { TeacherLessonObservation } from "@/lib/server/postgres/repositories/phonics-observations";

/* ─── Types — unchanged from previous version (data contract preserved) */

type StructureDraft = { observedYesNo: "yes" | "no" | ""; notes: string };
type ScoredDraft = { score: "" | "1" | "2" | "3" | "4"; notes: string };
type ActionPlanDraft = { actionToTake: string; resourcesNeeded: string; reviewDate: string };

type FormDraft = {
  teacherName: string;
  observationDate: string;
  schoolName: string;
  /** Linked school id when picked from the directory; null when free-typed. */
  schoolId: number | null;
  observerName: string;
  classLevel: string;
  lessonDuration: string;
  learnersPresent: string;
  lessonFocus: string;
  lessonStructure: Record<LessonStructureKey, StructureDraft>;
  scoredItems: Record<ScoredCriteriaKey, ScoredDraft>;
  strengths: [string, string, string, string];
  developmentAreas: [string, string, string, string];
  actionPlan: ActionPlanDraft;
  overallRating: PostObservationRating | "";
  coachSignatureName: string;
  coachSignatureDate: string;
  headteacherSignatureName: string;
  headteacherSignatureDate: string;
  teacherSignatureName: string;
  teacherSignatureDate: string;
};

/* ─── Default + load helpers (unchanged) */

function todayIso() { return new Date().toISOString().slice(0, 10); }

function createDefaultDraft(): FormDraft {
  const structure = {} as Record<LessonStructureKey, StructureDraft>;
  LESSON_STRUCTURE_KEYS.forEach((k) => { structure[k] = { observedYesNo: "", notes: "" }; });

  const allKeys = [
    ...GPC_CRITERIA.map((c) => c.key),
    ...BLENDING_CRITERIA.map((c) => c.key),
    ...ENGAGEMENT_CRITERIA.map((c) => c.key),
  ] as ScoredCriteriaKey[];
  const scored = {} as Record<ScoredCriteriaKey, ScoredDraft>;
  allKeys.forEach((k) => { scored[k] = { score: "", notes: "" }; });

  return {
    teacherName: "", observationDate: todayIso(), schoolName: "", schoolId: null, observerName: "",
    classLevel: "", lessonDuration: "", learnersPresent: "", lessonFocus: "",
    lessonStructure: structure, scoredItems: scored,
    strengths: ["", "", "", ""], developmentAreas: ["", "", "", ""],
    actionPlan: { actionToTake: "", resourcesNeeded: "", reviewDate: "" },
    overallRating: "",
    coachSignatureName: "", coachSignatureDate: "",
    headteacherSignatureName: "", headteacherSignatureDate: "",
    teacherSignatureName: "", teacherSignatureDate: "",
  };
}

function fromRecord(obs: TeacherLessonObservation): FormDraft {
  const draft = createDefaultDraft();
  draft.teacherName = obs.teacherName;
  draft.observationDate = obs.observationDate;
  draft.schoolName = obs.schoolName;
  draft.schoolId = obs.schoolId ?? null;
  draft.observerName = obs.observerName;
  draft.classLevel = obs.classLevel;
  draft.lessonDuration = obs.lessonDuration;
  draft.learnersPresent = obs.learnersPresent != null ? String(obs.learnersPresent) : "";
  draft.lessonFocus = obs.lessonFocus;
  draft.overallRating = obs.overallPostObservationRating ?? "";
  draft.coachSignatureName = obs.coachSignatureName ?? "";
  draft.coachSignatureDate = obs.coachSignatureDate ?? "";
  draft.headteacherSignatureName = obs.headteacherDosSignatureName ?? "";
  draft.headteacherSignatureDate = obs.headteacherDosSignatureDate ?? "";
  draft.teacherSignatureName = obs.teacherSignatureName ?? "";
  draft.teacherSignatureDate = obs.teacherSignatureDate ?? "";

  (obs.lessonStructure ?? []).forEach((item) => {
    const k = item.itemKey as LessonStructureKey;
    if (draft.lessonStructure[k]) {
      draft.lessonStructure[k] = {
        observedYesNo: (item.observedYesNo as "yes" | "no" | "") ?? "",
        notes: item.notes ?? "",
      };
    }
  });

  (obs.scoredItems ?? []).forEach((item) => {
    const k = item.criteriaKey as ScoredCriteriaKey;
    if (draft.scoredItems[k]) {
      draft.scoredItems[k] = {
        score: item.score != null ? (String(item.score) as ScoredDraft["score"]) : "",
        notes: item.notes ?? "",
      };
    }
  });

  const str = obs.strengths ?? ["", "", "", ""];
  draft.strengths = [str[0] ?? "", str[1] ?? "", str[2] ?? "", str[3] ?? ""];
  const dev = obs.developmentAreas ?? ["", "", "", ""];
  draft.developmentAreas = [dev[0] ?? "", dev[1] ?? "", dev[2] ?? "", dev[3] ?? ""];

  if (obs.actionPlan) {
    draft.actionPlan = {
      actionToTake: obs.actionPlan.actionToTake,
      resourcesNeeded: obs.actionPlan.resourcesNeeded,
      reviewDate: obs.actionPlan.reviewDate ?? "",
    };
  }

  return draft;
}

function toApiPayload(draft: FormDraft, submitAs: "draft" | "submitted") {
  return {
    teacherName: draft.teacherName,
    observationDate: draft.observationDate,
    schoolName: draft.schoolName,
    schoolId: draft.schoolId ?? null,
    observerName: draft.observerName,
    classLevel: draft.classLevel,
    lessonDuration: draft.lessonDuration,
    learnersPresent: draft.learnersPresent ? Number(draft.learnersPresent) : null,
    lessonFocus: draft.lessonFocus,
    overallPostObservationRating: draft.overallRating || null,
    coachSignatureName: draft.coachSignatureName || null,
    coachSignatureDate: draft.coachSignatureDate || null,
    headteacherDosSignatureName: draft.headteacherSignatureName || null,
    headteacherDosSignatureDate: draft.headteacherSignatureDate || null,
    teacherSignatureName: draft.teacherSignatureName || null,
    teacherSignatureDate: draft.teacherSignatureDate || null,
    status: submitAs,
    lessonStructure: LESSON_STRUCTURE_KEYS.map((k) => ({
      itemKey: k,
      observedYesNo: draft.lessonStructure[k].observedYesNo || null,
      notes: draft.lessonStructure[k].notes || null,
    })),
    scoredItems: (Object.keys(draft.scoredItems) as ScoredCriteriaKey[]).map((k) => ({
      criteriaKey: k,
      score: draft.scoredItems[k].score ? Number(draft.scoredItems[k].score) : null,
      notes: draft.scoredItems[k].notes || null,
    })),
    strengths: draft.strengths as [string, string, string, string],
    developmentAreas: draft.developmentAreas as [string, string, string, string],
    actionPlan: {
      actionToTake: draft.actionPlan.actionToTake,
      resourcesNeeded: draft.actionPlan.resourcesNeeded,
      reviewDate: draft.actionPlan.reviewDate || null,
    },
  };
}

export type PhonicsObservationFormProps = {
  mode: "create" | "edit";
  existingObservation?: TeacherLessonObservation;
};

const CALIBRI = 'Calibri, "Segoe UI", Arial, sans-serif';

/* ──────────────────────────────────────────────────────────────────────
   Card-based subcomponents — replace previous TableInput / TableHeader.
   No <table>, <thead>, <tr>, <td> anywhere from this point onward.
   ────────────────────────────────────────────────────────────────────── */

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-[12px] font-semibold text-[#344054] mb-1.5">
      {children}{required && <span className="text-rose-500 ml-0.5">*</span>}
    </label>
  );
}

function FormField({
  label, required, icon, value, onChange, placeholder, type = "text", suffix,
}: {
  label: string; required?: boolean; icon?: React.ReactNode;
  value: string; onChange: (v: string) => void; placeholder?: string;
  type?: string; suffix?: React.ReactNode;
}) {
  return (
    <div>
      <FieldLabel required={required}>{label}</FieldLabel>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]">
            {icon}
          </span>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className={`w-full h-11 ${icon ? "pl-9" : "pl-3.5"} ${suffix ? "pr-9" : "pr-3.5"} text-[13px] rounded-[10px] border border-[#e5eaf0] bg-white text-[#111827] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400`}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8]">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Filterable dropdown — type to search, click to pick, free-type to keep
 * the value when no option matches. Not headless; styled to match FormField.
 */
function Combobox({
  label,
  required,
  icon,
  value,
  onPick,
  placeholder,
  options,
  loading = false,
  disabled = false,
  emptyHint,
}: {
  label: string;
  required?: boolean;
  icon?: React.ReactNode;
  value: string;
  /** Called for both option-pick and free-type. `option` is null when free-typed. */
  onPick: (text: string, option: { id: number | string; sub?: string } | null) => void;
  placeholder?: string;
  options: Array<{ id: number | string; label: string; sub?: string }>;
  loading?: boolean;
  disabled?: boolean;
  emptyHint?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listboxId = useMemo(() => `combobox-list-${Math.random().toString(36).slice(2, 8)}`, []);
  // Extract ARIA boolean strings so jsx-a11y/aria-proptypes sees a string literal type.
  const expanded: "true" | "false" = open ? "true" : "false";

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return options.slice(0, 50);
    return options.filter((o) => o.label.toLowerCase().includes(q) || (o.sub ?? "").toLowerCase().includes(q)).slice(0, 50);
  }, [value, options]);

  return (
    <div ref={wrapperRef}>
      <FieldLabel required={required}>{label}</FieldLabel>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]">
            {icon}
          </span>
        )}
        <input
          type="text"
          value={value}
          onChange={(e) => { onPick(e.target.value, null); if (!open) setOpen(true); }}
          onFocus={() => !disabled && setOpen(true)}
          placeholder={loading ? "Loading…" : placeholder}
          required={required}
          disabled={disabled}
          role="combobox"
          aria-label={label}
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-controls={listboxId}
          aria-expanded={expanded}
          className={`w-full h-11 ${icon ? "pl-9" : "pl-3.5"} pr-9 text-[13px] rounded-[10px] border border-[#e5eaf0] bg-white text-[#111827] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 disabled:bg-gray-50 disabled:cursor-not-allowed`}
        />
        <button
          type="button"
          onClick={() => !disabled && setOpen((v) => !v)}
          aria-label="Toggle suggestions"
          disabled={disabled}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-[#94a3b8] hover:text-[#475467] disabled:opacity-40"
        >
          <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.75} />
        </button>

        {open && !disabled && (
          <div className="absolute z-30 mt-1 left-0 right-0 max-h-72 overflow-auto rounded-[10px] border border-[#e5eaf0] bg-white shadow-lg">
            {loading && (
              <div className="px-3 py-3 text-[12px] text-[#7a8ca3] italic">Loading…</div>
            )}
            {!loading && filtered.length === 0 && (
              <div className="px-3 py-3 text-[12px] text-[#7a8ca3] italic">
                {options.length === 0 ? (emptyHint ?? "No options available.") : "No matches. Keep typing to enter a custom value."}
              </div>
            )}
            {!loading && filtered.length > 0 && (
              <div id={listboxId} role="listbox" aria-label={label} className="py-1">
                {filtered.map((o) => {
                  const selected: "true" | "false" = o.label === value ? "true" : "false";
                  return (
                  <div
                    key={String(o.id)}
                    role="option"
                    aria-selected={selected}
                    tabIndex={0}
                    onClick={() => { onPick(o.label, o); setOpen(false); }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onPick(o.label, o);
                        setOpen(false);
                      }
                    }}
                    className="cursor-pointer w-full text-left px-3 py-2 hover:bg-emerald-50 focus:bg-emerald-50 focus:outline-none flex items-start gap-2"
                  >
                    <Search className="h-3.5 w-3.5 mt-0.5 text-[#94a3b8] shrink-0" strokeWidth={1.75} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] text-[#111827]">{o.label}</span>
                      {o.sub && <span className="block text-[11px] text-[#7a8ca3] mt-0.5 truncate">{o.sub}</span>}
                    </span>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SectionCard({
  badge, title, subtitle, children,
}: {
  badge: string; title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-2xl bg-white border border-[#e5eaf0] p-6"
      style={{ boxShadow: "0 12px 35px rgba(16, 24, 40, 0.055)" }}
    >
      <header className="flex items-baseline gap-3 mb-5">
        <span
          className="grid h-7 w-7 place-items-center rounded-full text-white text-[12px] font-bold shrink-0"
          style={{ background: "linear-gradient(180deg,#066a67 0%,#033f3e 100%)" }}
        >
          {badge}
        </span>
        <div className="min-w-0">
          <h2 className="text-[16px] font-bold text-[#111827]">{title}</h2>
          {subtitle && <p className="text-[12px] text-[#667085] italic mt-0.5">{subtitle}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}

function SegmentedYesNo({
  value, onChange,
}: {
  value: "yes" | "no" | ""; onChange: (v: "yes" | "no") => void;
}) {
  return (
    <div className="inline-flex rounded-[10px] border border-[#e5eaf0] bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => onChange("yes")}
        className={
          value === "yes"
            ? "h-9 px-5 text-[12px] font-bold text-[#066a67] bg-emerald-50 border-r border-emerald-100 ring-1 ring-inset ring-emerald-200"
            : "h-9 px-5 text-[12px] font-bold text-[#475467] hover:bg-gray-50 border-r border-[#e5eaf0]"
        }
      >
        Yes
      </button>
      <button
        type="button"
        onClick={() => onChange("no")}
        className={
          value === "no"
            ? "h-9 px-5 text-[12px] font-bold text-rose-700 bg-rose-50 ring-1 ring-inset ring-rose-200"
            : "h-9 px-5 text-[12px] font-bold text-[#475467] hover:bg-gray-50"
        }
      >
        No
      </button>
    </div>
  );
}

function NotesInput({
  value, onChange, placeholder = "Notes & evidence…",
}: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]">
        <MessageSquare className="h-3.5 w-3.5" strokeWidth={1.75} />
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 pl-9 pr-3 text-[12px] rounded-[10px] border border-[#e5eaf0] bg-white text-[#111827] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
      />
    </div>
  );
}

/* Card row for an observation item — replaces the old <tr>. Uses CSS
   grid so columns visually align across rows but the markup is divs. */
function ObservationItemCard({
  number, text, observed, onObserved, notes, onNotes,
}: {
  number: number; text: string;
  observed: "yes" | "no" | ""; onObserved: (v: "yes" | "no") => void;
  notes: string; onNotes: (v: string) => void;
}) {
  return (
    <div
      className="rounded-[12px] border border-[#e5eaf0] bg-white p-3.5 grid items-center gap-3"
      style={{ gridTemplateColumns: "minmax(0, 1.4fr) minmax(160px, auto) minmax(0, 1.5fr)" }}
    >
      <p className="text-[13px] text-[#111827] leading-snug">
        <span className="font-bold text-[#475467] mr-1">{number}.</span>
        {text}
      </p>
      <SegmentedYesNo value={observed} onChange={onObserved} />
      <NotesInput value={notes} onChange={onNotes} />
    </div>
  );
}

/* Card row for a scored item (1-4) — section C and D. */
function ScoredItemCard({
  number, label, description, score, onScore, notes, onNotes,
}: {
  number: number; label: string; description: string;
  score: ScoredDraft["score"]; onScore: (v: ScoredDraft["score"]) => void;
  notes: string; onNotes: (v: string) => void;
}) {
  return (
    <div
      className="rounded-[12px] border border-[#e5eaf0] bg-white p-3.5 grid items-start gap-3"
      style={{ gridTemplateColumns: "minmax(0, 1.4fr) 130px minmax(0, 1.5fr)" }}
    >
      <div className="text-[13px] leading-snug">
        <p>
          <span className="font-bold text-[#475467] mr-1">{number}.</span>
          <span className="font-bold text-[#111827]">{label}</span>
          {description && <span className="text-[#475467]">: {description}</span>}
        </p>
      </div>
      <div className="relative">
        <select
          value={score}
          onChange={(e) => onScore(e.target.value as ScoredDraft["score"])}
          aria-label={`Score for ${label}`}
          className="w-full h-9 pl-3 pr-8 text-[12px] rounded-[10px] border border-[#e5eaf0] bg-white text-[#111827] appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
        >
          <option value="">— Score —</option>
          {SCORING_KEY.slice().reverse().map((s) => (
            <option key={s.score} value={String(s.score)}>{s.score} – {s.label}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#94a3b8]" strokeWidth={1.75} />
      </div>
      <NotesInput value={notes} onChange={onNotes} />
    </div>
  );
}

function Stepper({ current }: { current: 1 | 2 | 3 | 4 }) {
  const steps = [
    { n: 1, title: "Administrative Details", sub: "Basic observation info" },
    { n: 2, title: "Lesson Structure",       sub: "Evaluate lesson flow" },
    { n: 3, title: "Evidence & Notes",       sub: "Collect evidence" },
    { n: 4, title: "Review",                  sub: "Confirm & submit" },
  ];
  return (
    <nav aria-label="Form progress" className="flex items-center justify-center gap-3 flex-wrap">
      {steps.map((s) => {
        const active = s.n === current;
        return (
          <div
            key={s.n}
            className={
              active
                ? "flex items-center gap-3 px-4 py-2.5 rounded-[12px] bg-white border border-emerald-200 shadow-sm"
                : "flex items-center gap-3 px-4 py-2.5 rounded-[12px] bg-white border border-[#e5eaf0] shadow-sm"
            }
          >
            <span
              className={
                active
                  ? "grid h-7 w-7 place-items-center rounded-full text-white text-[12px] font-bold shrink-0"
                  : "grid h-7 w-7 place-items-center rounded-full bg-[#f1f5f9] text-[#7a8ca3] text-[12px] font-bold shrink-0"
              }
              style={active ? { background: "linear-gradient(180deg,#066a67 0%,#033f3e 100%)" } : undefined}
            >
              {s.n}
            </span>
            <div className="min-w-0">
              <p className={active ? "text-[12.5px] font-bold text-[#111827] leading-tight" : "text-[12.5px] font-bold text-[#475467] leading-tight"}>
                {s.title}
              </p>
              <p className="text-[10.5px] text-[#7a8ca3] leading-tight mt-0.5">{s.sub}</p>
            </div>
          </div>
        );
      })}
    </nav>
  );
}

/* ──────────────────────────────────────────────────────────────────────
   Main component
   ────────────────────────────────────────────────────────────────────── */

type SchoolDirOption = { id: number; name: string; district: string };
type TeacherRosterOption = {
  contactUid: string;
  fullName: string;
  category?: string | null;
  classTaught?: string | null;
};

const TEACHING_CATEGORIES = new Set([
  "Teacher",
  "Head Teacher",
  "Deputy Head Teacher",
  "DOS",
  "Head Teacher Lower",
]);

export default function PhonicsObservationForm({ mode, existingObservation }: PhonicsObservationFormProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<FormDraft>(() =>
    existingObservation ? fromRecord(existingObservation) : createDefaultDraft(),
  );
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  // School + teacher directory — fetched live from /api/portal/schools and roster.
  const [schools, setSchools] = useState<SchoolDirOption[]>([]);
  const [schoolsLoading, setSchoolsLoading] = useState(true);
  const [teachers, setTeachers] = useState<TeacherRosterOption[]>([]);
  const [teachersLoading, setTeachersLoading] = useState(false);

  const existingId = existingObservation?.id;

  // Load the school directory once.
  useEffect(() => {
    let cancelled = false;
    setSchoolsLoading(true);
    fetch("/api/portal/schools", { cache: "no-store" })
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((data) => {
        if (cancelled) return;
        const list: SchoolDirOption[] = Array.isArray(data?.schools)
          ? data.schools.map((s: { id: number; name: string; district?: string }) => ({
              id: s.id,
              name: s.name,
              district: s.district ?? "",
            }))
          : [];
        list.sort((a, b) => a.name.localeCompare(b.name));
        setSchools(list);
      })
      .catch(() => { if (!cancelled) setSchools([]); })
      .finally(() => { if (!cancelled) setSchoolsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // When a school is picked from the directory, load its teaching staff.
  useEffect(() => {
    if (!draft.schoolId) {
      setTeachers([]);
      return;
    }
    let cancelled = false;
    setTeachersLoading(true);
    fetch(`/api/portal/schools/roster?schoolId=${draft.schoolId}&type=teacher`, { cache: "no-store" })
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((data) => {
        if (cancelled) return;
        const list: TeacherRosterOption[] = Array.isArray(data?.roster)
          ? data.roster
              .filter((c: { category?: string | null }) => !c.category || TEACHING_CATEGORIES.has(c.category))
              .map((c: { contactUid: string; fullName: string; category?: string | null; classTaught?: string | null }) => ({
                contactUid: c.contactUid,
                fullName: c.fullName,
                category: c.category ?? null,
                classTaught: c.classTaught ?? null,
              }))
          : [];
        list.sort((a, b) => a.fullName.localeCompare(b.fullName));
        setTeachers(list);
      })
      .catch(() => { if (!cancelled) setTeachers([]); })
      .finally(() => { if (!cancelled) setTeachersLoading(false); });
    return () => { cancelled = true; };
  }, [draft.schoolId]);

  async function save(submitAs: "draft" | "submitted") {
    if (!draft.teacherName || !draft.observationDate || !draft.schoolName || !draft.observerName || !draft.classLevel || !draft.lessonDuration || !draft.lessonFocus) {
      setFeedback({ kind: "error", message: "Please complete all required fields in Section A before saving." });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const payload = toApiPayload(draft, submitAs);
      const url = existingId ? `/api/portal/observations/${existingId}` : "/api/portal/observations";
      const method = existingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setFeedback({ kind: "error", message: data.error ?? "Failed to save observation." });
        return;
      }

      const savedId: number = existingId ?? data.id;
      setFeedback({
        kind: "success",
        message: submitAs === "submitted" ? "Observation submitted successfully." : "Draft saved.",
      });
      if (mode === "create") router.push(`/portal/observations/${savedId}`);
      else router.refresh();
    } catch {
      setFeedback({ kind: "error", message: "Network error. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  const setField = <K extends keyof FormDraft>(key: K, value: FormDraft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const setStructure = (key: LessonStructureKey, field: keyof StructureDraft, value: string) =>
    setDraft((prev) => ({
      ...prev,
      lessonStructure: { ...prev.lessonStructure, [key]: { ...prev.lessonStructure[key], [field]: value } },
    }));

  const setScored = (key: ScoredCriteriaKey, field: keyof ScoredDraft, value: string) =>
    setDraft((prev) => ({
      ...prev,
      scoredItems: { ...prev.scoredItems, [key]: { ...prev.scoredItems[key], [field]: value } },
    }));

  const setStrength = (idx: number, value: string) => {
    const updated = [...draft.strengths] as [string, string, string, string];
    updated[idx] = value;
    setField("strengths", updated);
  };

  const setDevArea = (idx: number, value: string) => {
    const updated = [...draft.developmentAreas] as [string, string, string, string];
    updated[idx] = value;
    setField("developmentAreas", updated);
  };

  return (
    <div style={{ fontFamily: CALIBRI }} className="pb-32">
      {/* ─── Stepper ─────────────────────────────────────────────── */}
      <div className="mb-8">
        <Stepper current={1} />
      </div>

      {/* ─── Form intro ──────────────────────────────────────────── */}
      <div className="text-center mb-8 max-w-[760px] mx-auto">
        <p className="text-[11px] font-bold tracking-[0.18em] mb-2" style={{ color: "#C98A2E" }}>
          OZEKI READING BRIDGE FOUNDATION
        </p>
        <h1 className="text-[28px] font-extrabold text-[#111827] tracking-tight leading-tight">
          Teacher Phonics &amp; Reading Lesson Observation Form
        </h1>
        <p className="text-[13px] text-[#667085] mt-3 leading-relaxed">
          This form is to be used by Ozeki Foundation coaches during follow-up visits to evaluate the
          implementation of the trained phonics methodology. It focuses on effective classroom practice,
          accuracy of content delivery, and learner engagement.
        </p>
      </div>

      {/* ─── Feedback banner ─────────────────────────────────────── */}
      {feedback && (
        <div
          className={`mb-6 max-w-[1100px] mx-auto rounded-xl px-4 py-3 text-[13px] font-semibold ${
            feedback.kind === "success"
              ? "bg-emerald-50 text-[#044f4d] border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="space-y-6 max-w-[1100px] mx-auto">

        {/* ══════════════════════════════════════════════════════════
            SECTION A — Administrative Details (card-based 2-col grid)
        ══════════════════════════════════════════════════════════ */}
        <SectionCard badge="A" title="Administrative Details">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            {/* SCHOOL FIRST — searchable directory dropdown.
                Picking a school links its id, which then unlocks the teacher
                roster below. Free-typing is still allowed for schools that
                aren't in the directory yet. */}
            <Combobox
              label="School"
              required
              icon={<MapPin className="h-4 w-4" strokeWidth={1.75} />}
              value={draft.schoolName}
              loading={schoolsLoading}
              options={schools.map((s) => ({
                id: s.id,
                label: s.name,
                sub: s.district || undefined,
              }))}
              placeholder={schools.length === 0 ? "No schools registered yet — type to enter manually" : "Search schools…"}
              onPick={(text, option) => {
                setDraft((prev) => ({
                  ...prev,
                  schoolName: text,
                  // When the user picks a known school, link the id; when they
                  // free-type, clear the id so we never store a stale linkage.
                  schoolId: option ? Number(option.id) : null,
                  // Reset teacher selection when school context changes.
                  teacherName: option && option.id !== prev.schoolId ? "" : prev.teacherName,
                }));
              }}
              emptyHint="No schools in the directory yet."
            />
            <FormField
              label="Date" required
              icon={<Calendar className="h-4 w-4" strokeWidth={1.75} />}
              value={draft.observationDate}
              onChange={(v) => setField("observationDate", v)}
              type="date"
            />
            {/* TEACHER SECOND — populated from the picked school's roster.
                Disabled until a school is linked; free-typing remains a
                fallback when the teacher isn't on the roster yet. */}
            <Combobox
              label="Teacher Name"
              required
              icon={<User className="h-4 w-4" strokeWidth={1.75} />}
              value={draft.teacherName}
              loading={teachersLoading}
              disabled={!draft.schoolId}
              options={teachers.map((t) => ({
                id: t.contactUid,
                label: t.fullName,
                sub: [t.category, t.classTaught].filter(Boolean).join(" · ") || undefined,
              }))}
              placeholder={
                !draft.schoolId
                  ? "Pick a school first"
                  : teachers.length === 0
                  ? "No teachers on file — type to enter manually"
                  : "Search teachers…"
              }
              onPick={(text) => setField("teacherName", text)}
              emptyHint="No teachers registered for this school. Type a name to record one."
            />
            <FormField
              label="Observer Name" required
              icon={<User className="h-4 w-4" strokeWidth={1.75} />}
              value={draft.observerName}
              onChange={(v) => setField("observerName", v)}
              placeholder="Enter observer name"
            />
            <FormField
              label="Class Level" required
              icon={<Users className="h-4 w-4" strokeWidth={1.75} />}
              value={draft.classLevel}
              onChange={(v) => setField("classLevel", v)}
              placeholder="e.g. P2"
              suffix={<ChevronDown className="h-3.5 w-3.5" strokeWidth={1.75} />}
            />
            <FormField
              label="Lesson Duration" required
              icon={<Clock className="h-4 w-4" strokeWidth={1.75} />}
              value={draft.lessonDuration}
              onChange={(v) => setField("lessonDuration", v)}
              placeholder="e.g. 45 minutes"
              suffix={<ChevronDown className="h-3.5 w-3.5" strokeWidth={1.75} />}
            />
            <FormField
              label="Number of Learners Present"
              icon={<Users className="h-4 w-4" strokeWidth={1.75} />}
              value={draft.learnersPresent}
              onChange={(v) => setField("learnersPresent", v)}
              type="number"
              placeholder="e.g. 35"
            />
            <FormField
              label="Lesson Focus" required
              icon={<Target className="h-4 w-4" strokeWidth={1.75} />}
              value={draft.lessonFocus}
              onChange={(v) => setField("lessonFocus", v)}
              placeholder="e.g. Blending CVC words"
              suffix={<ChevronDown className="h-3.5 w-3.5" strokeWidth={1.75} />}
            />
          </div>
        </SectionCard>

        {/* ══════════════════════════════════════════════════════════
            SECTION B — Overall Lesson Structure (card rows, NO TABLE)
        ══════════════════════════════════════════════════════════ */}
        <SectionCard
          badge="B"
          title="Overall Lesson Structure"
          subtitle="Referencing the Phonics Lesson Planning Framework"
        >
          {/* Tiny CSS-grid header row (NOT a <thead>) */}
          <div
            className="hidden md:grid items-center gap-3 px-3.5 pb-2 mb-2 border-b border-[#eef2f6]"
            style={{ gridTemplateColumns: "minmax(0, 1.4fr) minmax(160px, auto) minmax(0, 1.5fr)" }}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.04em] text-[#7a8ca3]">
              Did the lesson follow the trained structure?
            </p>
            <p className="text-[10px] font-bold uppercase tracking-[0.04em] text-[#7a8ca3]">
              Observed (Yes/No)
            </p>
            <p className="text-[10px] font-bold uppercase tracking-[0.04em] text-[#7a8ca3]">
              Observer Notes &amp; Evidence
            </p>
          </div>
          <div className="space-y-2.5">
            {LESSON_STRUCTURE_ITEMS.map((item, i) => {
              const key = item.key as LessonStructureKey;
              const val = draft.lessonStructure[key];
              return (
                <ObservationItemCard
                  key={key}
                  number={i + 1}
                  text={`${item.label}: ${item.description}`}
                  observed={val.observedYesNo}
                  onObserved={(v) => setStructure(key, "observedYesNo", v)}
                  notes={val.notes}
                  onNotes={(v) => setStructure(key, "notes", v)}
                />
              );
            })}
          </div>
        </SectionCard>

        {/* ══════════════════════════════════════════════════════════
            SECTION C — Teaching Methodology & Accuracy (cards)
        ══════════════════════════════════════════════════════════ */}
        <SectionCard badge="C" title="Teaching Methodology & Accuracy">
          {/* Scoring key card */}
          <div className="rounded-[12px] border border-amber-200 bg-amber-50 p-4 mb-5">
            <p className="text-[12px] font-bold text-[#1f2937] mb-2">Scoring Key</p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
              {SCORING_KEY.map((s) => (
                <li key={s.score} className="text-[12px] text-[#374151]">
                  <span className="font-bold">{s.score} – {s.label}:</span> {s.description}
                </li>
              ))}
            </ul>
          </div>

          {/* C1 — GPC */}
          <div className="mb-6">
            <h3 className="text-[14px] font-bold text-[#111827] mb-3">
              1. Phoneme–Grapheme Correspondence (GPC)
            </h3>
            <div className="space-y-2.5">
              {GPC_CRITERIA.map((c, i) => {
                const item = draft.scoredItems[c.key as ScoredCriteriaKey];
                return (
                  <ScoredItemCard
                    key={c.key}
                    number={i + 1}
                    label={c.label}
                    description={c.description}
                    score={item.score}
                    onScore={(v) => setScored(c.key as ScoredCriteriaKey, "score", v)}
                    notes={item.notes}
                    onNotes={(v) => setScored(c.key as ScoredCriteriaKey, "notes", v)}
                  />
                );
              })}
            </div>
          </div>

          {/* C2 — Blending */}
          <div>
            <h3 className="text-[14px] font-bold text-[#111827] mb-3">
              2. Blending (Reading) and Teaching Practices
            </h3>
            <div className="space-y-2.5">
              {BLENDING_CRITERIA.map((c, i) => {
                const item = draft.scoredItems[c.key as ScoredCriteriaKey];
                return (
                  <ScoredItemCard
                    key={c.key}
                    number={i + 1}
                    label={c.label}
                    description={c.description}
                    score={item.score}
                    onScore={(v) => setScored(c.key as ScoredCriteriaKey, "score", v)}
                    notes={item.notes}
                    onNotes={(v) => setScored(c.key as ScoredCriteriaKey, "notes", v)}
                  />
                );
              })}
            </div>
          </div>
        </SectionCard>

        {/* ══════════════════════════════════════════════════════════
            SECTION D — Learner Engagement & Assessment (cards)
        ══════════════════════════════════════════════════════════ */}
        <SectionCard badge="D" title="Learner Engagement & Assessment">
          <div className="space-y-2.5">
            {ENGAGEMENT_CRITERIA.map((c, i) => {
              const item = draft.scoredItems[c.key as ScoredCriteriaKey];
              return (
                <ScoredItemCard
                  key={c.key}
                  number={i + 1}
                  label={c.label}
                  description={c.description}
                  score={item.score}
                  onScore={(v) => setScored(c.key as ScoredCriteriaKey, "score", v)}
                  notes={item.notes}
                  onNotes={(v) => setScored(c.key as ScoredCriteriaKey, "notes", v)}
                />
              );
            })}
          </div>
        </SectionCard>

        {/* ══════════════════════════════════════════════════════════
            SECTION E — Coaching Summary & Action Plan (cards)
        ══════════════════════════════════════════════════════════ */}
        <SectionCard badge="E" title="Coaching Summary & Action Plan">
          {/* E1 — Strengths */}
          <div className="mb-6">
            <h3 className="text-[14px] font-bold text-[#111827] mb-1">
              1. Strengths Observed
            </h3>
            <p className="text-[12px] text-[#667085] italic mb-3">
              (Identify 1–4 specific practices from the training that the teacher implemented well)
            </p>
            <div className="space-y-2">
              {draft.strengths.map((val, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-[12px] font-bold text-[#7a8ca3] w-5 shrink-0">{i + 1}.</span>
                  <input
                    type="text"
                    value={val}
                    onChange={(e) => setStrength(i, e.target.value)}
                    placeholder={`Strength ${i + 1}…`}
                    className="flex-1 h-10 px-3.5 text-[12.5px] rounded-[10px] border border-[#e5eaf0] bg-white text-[#111827] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* E2 — Areas for Development */}
          <div className="mb-6">
            <h3 className="text-[14px] font-bold text-[#111827] mb-1">
              2. Areas for Development
            </h3>
            <p className="text-[12px] text-[#667085] italic mb-3">
              (Identify 1–4 specific methodological issues to address)
            </p>
            <div className="space-y-2">
              {draft.developmentAreas.map((val, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-[12px] font-bold text-[#7a8ca3] w-5 shrink-0">{i + 1}.</span>
                  <input
                    type="text"
                    value={val}
                    onChange={(e) => setDevArea(i, e.target.value)}
                    placeholder={`Area for development ${i + 1}…`}
                    className="flex-1 h-10 px-3.5 text-[12.5px] rounded-[10px] border border-[#e5eaf0] bg-white text-[#111827] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* E3 — Action Plan as a 3-card row (NO table) */}
          <div className="mb-6">
            <h3 className="text-[14px] font-bold text-[#111827] mb-3">
              3. Agreed Action Plan for Next Visit
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr_180px] gap-3">
              <div className="rounded-[12px] border border-[#e5eaf0] bg-white p-3.5">
                <FieldLabel>Urgent Action to Take</FieldLabel>
                <textarea
                  rows={3}
                  value={draft.actionPlan.actionToTake}
                  onChange={(e) => setField("actionPlan", { ...draft.actionPlan, actionToTake: e.target.value })}
                  placeholder="Describe the urgent action…"
                  className="w-full px-3 py-2 text-[12.5px] rounded-[8px] border border-[#e5eaf0] bg-white text-[#111827] placeholder:text-[#94a3b8] resize-y focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
                />
              </div>
              <div className="rounded-[12px] border border-[#e5eaf0] bg-white p-3.5">
                <FieldLabel>Resources Needed</FieldLabel>
                <textarea
                  rows={3}
                  value={draft.actionPlan.resourcesNeeded}
                  onChange={(e) => setField("actionPlan", { ...draft.actionPlan, resourcesNeeded: e.target.value })}
                  placeholder="Materials, support, etc…"
                  className="w-full px-3 py-2 text-[12.5px] rounded-[8px] border border-[#e5eaf0] bg-white text-[#111827] placeholder:text-[#94a3b8] resize-y focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
                />
              </div>
              <div className="rounded-[12px] border border-[#e5eaf0] bg-white p-3.5">
                <FieldLabel>Review Date</FieldLabel>
                <input
                  type="date"
                  value={draft.actionPlan.reviewDate}
                  onChange={(e) => setField("actionPlan", { ...draft.actionPlan, reviewDate: e.target.value })}
                  aria-label="Action plan review date"
                  className="w-full h-10 px-3 text-[12.5px] rounded-[8px] border border-[#e5eaf0] bg-white text-[#111827] focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
                />
              </div>
            </div>
          </div>

          {/* E4 — Overall Post-Observation Rating (radio cards, NO table) */}
          <div>
            <h3 className="text-[14px] font-bold text-[#111827] mb-3">
              4. Overall Post-Observation Rating
            </h3>
            <div className="space-y-2">
              {POST_OBSERVATION_RATINGS.map((r) => {
                const selected = draft.overallRating === r.key;
                return (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setField("overallRating", r.key)}
                    className={
                      selected
                        ? "w-full text-left rounded-[12px] border border-emerald-300 bg-emerald-50 p-3.5 ring-1 ring-emerald-200"
                        : "w-full text-left rounded-[12px] border border-[#e5eaf0] bg-white p-3.5 hover:border-emerald-200 hover:bg-emerald-50/30 transition"
                    }
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={
                          selected
                            ? "grid h-5 w-5 place-items-center rounded-full bg-emerald-600 text-white shrink-0 mt-0.5"
                            : "grid h-5 w-5 place-items-center rounded-full border border-[#cbd5e1] bg-white shrink-0 mt-0.5"
                        }
                      >
                        {selected && <Check className="h-3 w-3" strokeWidth={3} />}
                      </span>
                      <div>
                        <span className="text-[13px] font-bold text-[#111827]">{r.label}:</span>{" "}
                        <span className="text-[12.5px] text-[#475467]">{r.description}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </SectionCard>

        {/* ══════════════════════════════════════════════════════════
            SIGNATURES (3-column card grid, NO table)
        ══════════════════════════════════════════════════════════ */}
        <SectionCard badge="F" title="Signatures">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { role: "Ozeki RB Coach", nameKey: "coachSignatureName" as const, dateKey: "coachSignatureDate" as const, namePh: "Coach name" },
              { role: "HeadTeacher or DOS", nameKey: "headteacherSignatureName" as const, dateKey: "headteacherSignatureDate" as const, namePh: "HeadTeacher / DOS name" },
              { role: "Observed Teacher", nameKey: "teacherSignatureName" as const, dateKey: "teacherSignatureDate" as const, namePh: "Teacher name" },
            ].map((sig) => (
              <div key={sig.role} className="rounded-[12px] border border-[#e5eaf0] bg-white p-4">
                <p className="text-[10px] font-bold text-[#7a8ca3] uppercase tracking-[0.06em] mb-2">Signature</p>
                <div className="border-b-2 border-[#cbd5e1] h-10 mb-2" />
                <p className="text-[11px] text-[#7a8ca3] italic mb-3">{sig.role}</p>
                <FieldLabel>Name</FieldLabel>
                <input
                  type="text"
                  value={draft[sig.nameKey]}
                  onChange={(e) => setField(sig.nameKey, e.target.value)}
                  placeholder={sig.namePh}
                  className="w-full h-10 px-3 text-[12.5px] rounded-[10px] border border-[#e5eaf0] bg-white text-[#111827] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
                />
                <div className="mt-3">
                  <FieldLabel>Date</FieldLabel>
                  <input
                    type="date"
                    value={draft[sig.dateKey]}
                    onChange={(e) => setField(sig.dateKey, e.target.value)}
                    aria-label={`${sig.role} signature date`}
                    className="w-full h-10 px-3 text-[12.5px] rounded-[10px] border border-[#e5eaf0] bg-white text-[#111827] focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
                  />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* ══════════════════════════════════════════════════════════
          FIXED BOTTOM ACTION BAR
      ══════════════════════════════════════════════════════════ */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#e5eaf0]"
        style={{ boxShadow: "0 -10px 30px rgba(15, 23, 42, 0.05)" }}
      >
        <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 h-[72px] flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 text-[12px] text-[#667085]">
            <ShieldCheck className="h-4 w-4 text-emerald-600" strokeWidth={1.75} />
            Your data is secure and encrypted
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/portal/observations")}
              className="inline-flex items-center gap-2 h-11 px-4 rounded-[10px] bg-white border border-[#e5eaf0] text-[13px] font-bold text-[#1f2937] shadow-sm hover:bg-gray-50"
            >
              <X className="h-4 w-4" strokeWidth={1.75} /> Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => save("draft")}
              className="inline-flex items-center gap-2 h-11 px-4 rounded-[10px] bg-white border border-[#e5eaf0] text-[13px] font-bold text-[#1f2937] shadow-sm hover:bg-gray-50 disabled:opacity-50"
            >
              <Bookmark className="h-4 w-4" strokeWidth={1.75} />
              {saving ? "Saving…" : "Save Draft"}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => save("submitted")}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-[10px] text-white text-[13px] font-bold shadow-sm whitespace-nowrap disabled:opacity-50"
              style={{ background: "linear-gradient(180deg,#066a67 0%,#033f3e 100%)" }}
            >
              <Send className="h-4 w-4" strokeWidth={1.75} />
              {saving ? "Submitting…" : "Submit Observation"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Confirms there is no <table> / <thead> / <tbody> / <tr> / <td>
   anywhere in this component. CSS-grid + flex card rows replace
   every previous table-based observation row. */
