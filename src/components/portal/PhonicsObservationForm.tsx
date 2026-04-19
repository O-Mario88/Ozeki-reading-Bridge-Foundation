"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StructureDraft = { observedYesNo: "yes" | "no" | ""; notes: string };
type ScoredDraft = { score: "" | "1" | "2" | "3" | "4"; notes: string };
type ActionPlanDraft = { actionToTake: string; resourcesNeeded: string; reviewDate: string };

type FormDraft = {
  // Section A
  teacherName: string;
  observationDate: string;
  schoolName: string;
  observerName: string;
  classLevel: string;
  lessonDuration: string;
  learnersPresent: string;
  lessonFocus: string;
  // Section B
  lessonStructure: Record<LessonStructureKey, StructureDraft>;
  // Sections C & D
  scoredItems: Record<ScoredCriteriaKey, ScoredDraft>;
  // Section E1
  strengths: [string, string, string, string];
  // Section E2
  developmentAreas: [string, string, string, string];
  // Section E3
  actionPlan: ActionPlanDraft;
  // Section E4
  overallRating: PostObservationRating | "";
  // Signatures
  coachSignatureName: string;
  coachSignatureDate: string;
  headteacherSignatureName: string;
  headteacherSignatureDate: string;
  teacherSignatureName: string;
  teacherSignatureDate: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
    teacherName: "", observationDate: todayIso(), schoolName: "", observerName: "",
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

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type PhonicsObservationFormProps = {
  mode: "create" | "edit";
  existingObservation?: TeacherLessonObservation;
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FormLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold text-gray-700 mb-1">
      {children}{required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
}

function TextInput({
  value, onChange, placeholder, required, type = "text",
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean; type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  );
}

function SectionHeader({ letter, title, subtitle }: { letter: string; title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-bold text-gray-900">
        <span className="text-orange-600 mr-1">{letter}.</span> {title}
      </h2>
      {subtitle && <p className="text-sm text-gray-500 italic mt-0.5">{subtitle}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function PhonicsObservationForm({ mode, existingObservation }: PhonicsObservationFormProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<FormDraft>(() =>
    existingObservation ? fromRecord(existingObservation) : createDefaultDraft(),
  );
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  const existingId = existingObservation?.id;

  // -------------------------------------------------------------------------
  // Save handler
  // -------------------------------------------------------------------------

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
      if (mode === "create") {
        router.push(`/portal/observations/${savedId}`);
      } else {
        router.refresh();
      }
    } catch {
      setFeedback({ kind: "error", message: "Network error. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  // -------------------------------------------------------------------------
  // Update helpers
  // -------------------------------------------------------------------------

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

  // -------------------------------------------------------------------------
  // Scored row renderer (used for C1, C2, D)
  // -------------------------------------------------------------------------

  function ScoredRow({ criteriaKey, label, description }: { criteriaKey: ScoredCriteriaKey; label: string; description: string }) {
    const item = draft.scoredItems[criteriaKey];
    return (
      <tr className="border-t border-gray-200">
        <td className="py-2.5 pr-4 text-sm text-gray-800 align-top" style={{ width: "55%" }}>
          <span className="font-semibold">{label}</span>
          {description && <span className="text-gray-600">: {description}</span>}
        </td>
        <td className="py-2.5 pr-3 align-top" style={{ width: "10%" }}>
          <select
            value={item.score}
            onChange={(e) => setScored(criteriaKey, "score", e.target.value)}
            className="w-full border border-gray-300 rounded px-1 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">—</option>
            {SCORING_KEY.slice().reverse().map((s) => (
              <option key={s.score} value={String(s.score)}>{s.score} – {s.label}</option>
            ))}
          </select>
        </td>
        <td className="py-2.5 align-top" style={{ width: "35%" }}>
          <textarea
            rows={2}
            value={item.notes}
            onChange={(e) => setScored(criteriaKey, "notes", e.target.value)}
            placeholder="Observer notes & evidence…"
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </td>
      </tr>
    );
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="max-w-5xl mx-auto">

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="text-center mb-8 pb-4 border-b border-gray-200">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">
          Ozeki Reading Bridge Foundation
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          Teacher Phonics &amp; Reading Lesson Observation Form
        </h1>
        <p className="text-sm text-gray-600 max-w-3xl mx-auto leading-relaxed">
          This form is to be used by Ozeki Foundation coaches during follow-up visits to evaluate the
          implementation of the trained phonics methodology. It focuses on effective classroom practice,
          accuracy of content delivery, and learner engagement.
        </p>
      </div>

      {/* ── Feedback ──────────────────────────────────────────────── */}
      {feedback && (
        <div className={`mb-6 rounded-md px-4 py-3 text-sm font-medium ${
          feedback.kind === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"
        }`}>
          {feedback.message}
        </div>
      )}

      <div className="space-y-10">

        {/* ══════════════════════════════════════════════════════════
            SECTION A — Administrative Details
        ══════════════════════════════════════════════════════════ */}
        <section>
          <SectionHeader letter="A" title="Administrative Details" />
          <div className="border border-gray-300 rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="px-4 py-3 bg-gray-50 font-semibold w-1/4 border-r border-gray-200">
                    Teacher Name <span className="text-red-500">*</span>
                  </td>
                  <td className="px-4 py-3 w-1/4 border-r border-gray-200">
                    <TextInput value={draft.teacherName} onChange={(v) => setField("teacherName", v)} required />
                  </td>
                  <td className="px-4 py-3 bg-gray-50 font-semibold w-1/4 border-r border-gray-200">
                    Date <span className="text-red-500">*</span>
                  </td>
                  <td className="px-4 py-3 w-1/4">
                    <TextInput type="date" value={draft.observationDate} onChange={(v) => setField("observationDate", v)} required />
                  </td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="px-4 py-3 bg-gray-50 font-semibold border-r border-gray-200">School <span className="text-red-500">*</span></td>
                  <td className="px-4 py-3 border-r border-gray-200">
                    <TextInput value={draft.schoolName} onChange={(v) => setField("schoolName", v)} required />
                  </td>
                  <td className="px-4 py-3 bg-gray-50 font-semibold border-r border-gray-200">Observer Name <span className="text-red-500">*</span></td>
                  <td className="px-4 py-3">
                    <TextInput value={draft.observerName} onChange={(v) => setField("observerName", v)} required />
                  </td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="px-4 py-3 bg-gray-50 font-semibold border-r border-gray-200">Class Level <span className="text-red-500">*</span></td>
                  <td className="px-4 py-3 border-r border-gray-200">
                    <TextInput value={draft.classLevel} onChange={(v) => setField("classLevel", v)} placeholder="e.g. P2" required />
                  </td>
                  <td className="px-4 py-3 bg-gray-50 font-semibold border-r border-gray-200">Lesson Duration <span className="text-red-500">*</span></td>
                  <td className="px-4 py-3">
                    <TextInput value={draft.lessonDuration} onChange={(v) => setField("lessonDuration", v)} placeholder="e.g. 45 minutes" required />
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 bg-gray-50 font-semibold border-r border-gray-200">Number of Learners Present</td>
                  <td className="px-4 py-3 border-r border-gray-200">
                    <TextInput type="number" value={draft.learnersPresent} onChange={(v) => setField("learnersPresent", v)} placeholder="e.g. 35" />
                  </td>
                  <td className="px-4 py-3 bg-gray-50 font-semibold border-r border-gray-200">Lesson Focus <span className="text-red-500">*</span></td>
                  <td className="px-4 py-3">
                    <TextInput value={draft.lessonFocus} onChange={(v) => setField("lessonFocus", v)} placeholder="e.g. Blending CVC words" required />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            SECTION B — Overall Lesson Structure
        ══════════════════════════════════════════════════════════ */}
        <section>
          <SectionHeader letter="B" title="Overall Lesson Structure" subtitle="Referencing the Phonics Lesson Planning Framework" />
          <div className="border border-gray-300 rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-300">
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-700 border-r border-gray-200" style={{ width: "50%" }}>
                    Did the lesson follow the trained structure?
                  </th>
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-700 border-r border-gray-200" style={{ width: "15%" }}>
                    Observed (Yes/No)
                  </th>
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-700" style={{ width: "35%" }}>
                    Observer Notes &amp; Evidence
                  </th>
                </tr>
              </thead>
              <tbody>
                {LESSON_STRUCTURE_ITEMS.map((item) => {
                  const key = item.key as LessonStructureKey;
                  const val = draft.lessonStructure[key];
                  return (
                    <tr key={key} className="border-t border-gray-200">
                      <td className="px-4 py-3 text-gray-800 border-r border-gray-200 align-top">
                        <span className="font-semibold">{item.label}:</span>{" "}
                        <span className="text-gray-600">{item.description}</span>
                      </td>
                      <td className="px-4 py-3 border-r border-gray-200 align-top">
                        <select
                          value={val.observedYesNo}
                          onChange={(e) => setStructure(key, "observedYesNo", e.target.value)}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">—</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <textarea
                          rows={2}
                          value={val.notes}
                          onChange={(e) => setStructure(key, "notes", e.target.value)}
                          placeholder="Notes & evidence…"
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            SECTION C — Teaching Methodology & Accuracy
        ══════════════════════════════════════════════════════════ */}
        <section>
          <SectionHeader letter="C" title="Teaching Methodology & Accuracy" />

          {/* Scoring Key */}
          <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-md">
            <p className="text-sm font-bold text-gray-800 mb-2">Scoring Key:</p>
            <ul className="space-y-1">
              {SCORING_KEY.map((s) => (
                <li key={s.score} className="text-sm text-gray-700">
                  <span className="font-semibold">{s.score} – {s.label}:</span> {s.description}
                </li>
              ))}
            </ul>
          </div>

          {/* C1 — GPC */}
          <div className="mb-6">
            <h3 className="text-base font-bold text-gray-800 mb-3">
              1. Phoneme–Grapheme Correspondence (GPC)
            </h3>
            <div className="border border-gray-300 rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-300">
                    <th className="px-4 py-2.5 text-left font-semibold text-gray-700 border-r border-gray-200" style={{ width: "55%" }}>Criteria</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-gray-700 border-r border-gray-200" style={{ width: "10%" }}>Score (1–4)</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-gray-700" style={{ width: "35%" }}>Observer Notes &amp; Evidence</th>
                  </tr>
                </thead>
                <tbody>
                  {GPC_CRITERIA.map((c) => (
                    <ScoredRow key={c.key} criteriaKey={c.key as ScoredCriteriaKey} label={c.label} description={c.description} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* C2 — Blending */}
          <div>
            <h3 className="text-base font-bold text-gray-800 mb-3">
              2. Blending (Reading) and Teaching Practices
            </h3>
            <div className="border border-gray-300 rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-300">
                    <th className="px-4 py-2.5 text-left font-semibold text-gray-700 border-r border-gray-200" style={{ width: "55%" }}>Criteria</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-gray-700 border-r border-gray-200" style={{ width: "10%" }}>Score (1–4)</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-gray-700" style={{ width: "35%" }}>Observer Notes &amp; Evidence</th>
                  </tr>
                </thead>
                <tbody>
                  {BLENDING_CRITERIA.map((c) => (
                    <ScoredRow key={c.key} criteriaKey={c.key as ScoredCriteriaKey} label={c.label} description={c.description} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            SECTION D — Learner Engagement & Assessment
        ══════════════════════════════════════════════════════════ */}
        <section>
          <SectionHeader letter="D" title="Learner Engagement & Assessment" />
          <div className="border border-gray-300 rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-300">
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-700 border-r border-gray-200" style={{ width: "55%" }}>Criteria</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-700 border-r border-gray-200" style={{ width: "10%" }}>Score (1–4)</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-gray-700" style={{ width: "35%" }}>Observer Notes &amp; Evidence</th>
                </tr>
              </thead>
              <tbody>
                {ENGAGEMENT_CRITERIA.map((c) => (
                  <ScoredRow key={c.key} criteriaKey={c.key as ScoredCriteriaKey} label={c.label} description={c.description} />
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            SECTION E — Coaching Summary & Action Plan
        ══════════════════════════════════════════════════════════ */}
        <section>
          <SectionHeader letter="E" title="Coaching Summary & Action Plan" />

          {/* E1 — Strengths */}
          <div className="mb-6">
            <h3 className="text-base font-bold text-gray-800 mb-1">1. Strengths Observed</h3>
            <p className="text-sm text-gray-500 italic mb-3">
              (Identify 1-4 specific practices from the training that the teacher implemented well)
            </p>
            <div className="space-y-2">
              {draft.strengths.map((val, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-600 w-5 shrink-0">{i + 1}.</span>
                  <TextInput
                    value={val}
                    onChange={(v) => setStrength(i, v)}
                    placeholder={`Strength ${i + 1}…`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* E2 — Areas for Development */}
          <div className="mb-6">
            <h3 className="text-base font-bold text-gray-800 mb-1">2. Areas for Development</h3>
            <p className="text-sm text-gray-500 italic mb-3">
              (Identify 1-4 specific methodological issues to address)
            </p>
            <div className="space-y-2">
              {draft.developmentAreas.map((val, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-600 w-5 shrink-0">{i + 1}.</span>
                  <TextInput
                    value={val}
                    onChange={(v) => setDevArea(i, v)}
                    placeholder={`Area for development ${i + 1}…`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* E3 — Action Plan */}
          <div className="mb-6">
            <h3 className="text-base font-bold text-gray-800 mb-3">3. Agreed Action Plan for Next Visit</h3>
            <div className="border border-gray-300 rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-300">
                    <th className="px-4 py-2.5 text-left font-semibold text-gray-700 border-r border-gray-200" style={{ width: "50%" }}>Urgent Action to Take</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-gray-700 border-r border-gray-200" style={{ width: "35%" }}>Resources Needed</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-gray-700" style={{ width: "15%" }}>Review Date</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-4 py-3 border-r border-gray-200">
                      <textarea
                        rows={3}
                        value={draft.actionPlan.actionToTake}
                        onChange={(e) => setField("actionPlan", { ...draft.actionPlan, actionToTake: e.target.value })}
                        placeholder="Describe the urgent action…"
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3 border-r border-gray-200">
                      <textarea
                        rows={3}
                        value={draft.actionPlan.resourcesNeeded}
                        onChange={(e) => setField("actionPlan", { ...draft.actionPlan, resourcesNeeded: e.target.value })}
                        placeholder="Materials, support, etc…"
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <TextInput
                        type="date"
                        value={draft.actionPlan.reviewDate}
                        onChange={(v) => setField("actionPlan", { ...draft.actionPlan, reviewDate: v })}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* E4 — Overall Post-Observation Rating */}
          <div>
            <h3 className="text-base font-bold text-gray-800 mb-3">4. Overall Post-Observation Rating</h3>
            <div className="space-y-3">
              {POST_OBSERVATION_RATINGS.map((r) => (
                <label key={r.key} className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="overallRating"
                    value={r.key}
                    checked={draft.overallRating === r.key}
                    onChange={() => setField("overallRating", r.key)}
                    className="mt-0.5 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-sm font-semibold text-gray-800">{r.label}:</span>{" "}
                    <span className="text-sm text-gray-600">{r.description}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            SIGNATURES
        ══════════════════════════════════════════════════════════ */}
        <section>
          <div className="border-t border-gray-300 pt-6">
            <div className="grid grid-cols-3 gap-8">
              {/* Ozeki RB Coach */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Signature:</p>
                <div className="border-b-2 border-gray-400 h-10 mb-1" />
                <p className="text-xs text-gray-500 italic mb-3">Ozeki RB Coach</p>
                <FormLabel>Name</FormLabel>
                <TextInput value={draft.coachSignatureName} onChange={(v) => setField("coachSignatureName", v)} placeholder="Coach name" />
                <div className="mt-2">
                  <FormLabel>Date</FormLabel>
                  <TextInput type="date" value={draft.coachSignatureDate} onChange={(v) => setField("coachSignatureDate", v)} />
                </div>
              </div>
              {/* HeadTeacher or DOS */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Signature:</p>
                <div className="border-b-2 border-gray-400 h-10 mb-1" />
                <p className="text-xs text-gray-500 italic mb-3">HeadTeacher or DOS</p>
                <FormLabel>Name</FormLabel>
                <TextInput value={draft.headteacherSignatureName} onChange={(v) => setField("headteacherSignatureName", v)} placeholder="HeadTeacher / DOS name" />
                <div className="mt-2">
                  <FormLabel>Date</FormLabel>
                  <TextInput type="date" value={draft.headteacherSignatureDate} onChange={(v) => setField("headteacherSignatureDate", v)} />
                </div>
              </div>
              {/* Observed Teacher */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Signature:</p>
                <div className="border-b-2 border-gray-400 h-10 mb-1" />
                <p className="text-xs text-gray-500 italic mb-3">Observed Teacher</p>
                <FormLabel>Name</FormLabel>
                <TextInput value={draft.teacherSignatureName} onChange={(v) => setField("teacherSignatureName", v)} placeholder="Teacher name" />
                <div className="mt-2">
                  <FormLabel>Date</FormLabel>
                  <TextInput type="date" value={draft.teacherSignatureDate} onChange={(v) => setField("teacherSignatureDate", v)} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            ACTION BUTTONS
        ══════════════════════════════════════════════════════════ */}
        <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            disabled={saving}
            onClick={() => save("draft")}
            className="px-5 py-2.5 rounded-md border border-gray-300 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
          >
            {saving ? "Saving…" : "Save Draft"}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => save("submitted")}
            className="px-5 py-2.5 rounded-md bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {saving ? "Submitting…" : "Submit Observation"}
          </button>
          {existingObservation?.status === "submitted" && (
            <span className="ml-auto text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-3 py-1 rounded-full">
              Submitted
            </span>
          )}
          {existingObservation?.status === "draft" && (
            <span className="ml-auto text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
              Draft
            </span>
          )}
        </div>

      </div>
    </div>
  );
}
