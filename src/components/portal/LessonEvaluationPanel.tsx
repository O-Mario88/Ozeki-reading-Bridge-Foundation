"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FloatingSurface } from "@/components/FloatingSurface";
import {
  LESSON_EVALUATION_DOMAIN_LABELS,
  LESSON_EVALUATION_ITEMS,
  LESSON_EVALUATION_ITEM_KEYS,
  LESSON_EVALUATION_SCORE_LABELS,
  LESSON_FOCUS_OPTIONS,
  LessonEvaluationItemKey,
} from "@/lib/lesson-evaluation";
import {
  LessonEvaluationRecord,
  SchoolTeachingQualityImprovementSummary,
  TeacherImprovementProfile,
} from "@/lib/types";

type TeacherRosterOption = {
  id: number;
  teacherUid: string;
  fullName: string;
  gender: "Male" | "Female";
  isReadingTeacher: boolean;
  status: string;
};

type Feedback = {
  kind: "idle" | "success" | "error";
  message: string;
};

type LessonEvaluationPanelProps = {
  schoolId: number | null;
  schoolName?: string;
  defaultVisitId?: number | null;
  title?: string;
  description?: string;
  newButtonLabel?: string;
  allowVoid?: boolean;
};

type ItemDraft = {
  score: "1" | "2" | "3" | "4";
  note: string;
};

type FormDraft = {
  id: number | null;
  teacherUid: string;
  grade: "P1" | "P2" | "P3" | "P4" | "P5" | "P6" | "P7";
  stream: string;
  classSize: string;
  lessonDate: string;
  lessonFocus: string[];
  visitId: string;
  strengthsText: string;
  priorityGapText: string;
  nextCoachingAction: string;
  teacherCommitment: string;
  catchupEstimateCount: string;
  catchupEstimatePercent: string;
  nextVisitDate: string;
  items: Record<LessonEvaluationItemKey, ItemDraft>;
};

const GRADE_OPTIONS: Array<FormDraft["grade"]> = ["P1", "P2", "P3", "P4", "P5", "P6", "P7"];
const DOMAIN_DELTA_LABELS: Record<string, string> = {
  setup: "Setup & Review",
  newSound: "New Sound/Skill",
  decoding: "Decoding",
  readingPractice: "Reading Practice",
  trickyWords: "Tricky Words",
  checkNext: "Check & Next Steps",
};

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function createItemDraft(): Record<LessonEvaluationItemKey, ItemDraft> {
  const draft = {} as Record<LessonEvaluationItemKey, ItemDraft>;
  LESSON_EVALUATION_ITEM_KEYS.forEach((itemKey) => {
    draft[itemKey] = {
      score: "1",
      note: "",
    };
  });
  return draft;
}

function createDefaultDraft(defaultVisitId?: number | null): FormDraft {
  return {
    id: null,
    teacherUid: "",
    grade: "P1",
    stream: "",
    classSize: "",
    lessonDate: todayIsoDate(),
    lessonFocus: ["Sounds"],
    visitId: defaultVisitId && defaultVisitId > 0 ? String(defaultVisitId) : "",
    strengthsText: "",
    priorityGapText: "",
    nextCoachingAction: "",
    teacherCommitment: "",
    catchupEstimateCount: "",
    catchupEstimatePercent: "",
    nextVisitDate: "",
    items: createItemDraft(),
  };
}

function fromEvaluationRecord(
  record: LessonEvaluationRecord,
  defaultVisitId?: number | null,
): FormDraft {
  const draft = createDefaultDraft(defaultVisitId);
  draft.id = record.id;
  draft.teacherUid = record.teacherUid;
  draft.grade = record.grade;
  draft.stream = record.stream ?? "";
  draft.classSize = record.classSize === null ? "" : String(record.classSize);
  draft.lessonDate = record.lessonDate;
  draft.lessonFocus = record.lessonFocus.length > 0 ? record.lessonFocus : ["Sounds"];
  draft.visitId = record.visitId ? String(record.visitId) : draft.visitId;
  draft.strengthsText = record.strengthsText;
  draft.priorityGapText = record.priorityGapText;
  draft.nextCoachingAction = record.nextCoachingAction;
  draft.teacherCommitment = record.teacherCommitment;
  draft.catchupEstimateCount =
    record.catchupEstimateCount === null ? "" : String(record.catchupEstimateCount);
  draft.catchupEstimatePercent =
    record.catchupEstimatePercent === null ? "" : String(record.catchupEstimatePercent);
  draft.nextVisitDate = record.nextVisitDate ?? "";
  record.items.forEach((item) => {
    draft.items[item.itemKey] = {
      score: String(item.score) as ItemDraft["score"],
      note: item.note ?? "",
    };
  });
  return draft;
}

function parseOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function teacherImprovementStatusLabel(status: "improved" | "flat" | "declined") {
  if (status === "improved") return "Improved";
  if (status === "declined") return "Declined";
  return "Flat";
}

export function LessonEvaluationPanel({
  schoolId,
  schoolName,
  defaultVisitId = null,
  title = "Lesson Evaluations",
  description = "Ozeki Phonics Lesson Evaluation Tool (Coaching Standard)",
  newButtonLabel = "New Lesson Evaluation",
  allowVoid = false,
}: LessonEvaluationPanelProps) {
  const [evaluations, setEvaluations] = useState<LessonEvaluationRecord[]>([]);
  const [teachers, setTeachers] = useState<TeacherRosterOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [draft, setDraft] = useState<FormDraft>(() => createDefaultDraft(defaultVisitId));
  const [feedback, setFeedback] = useState<Feedback>({ kind: "idle", message: "" });
  const [improvementLoading, setImprovementLoading] = useState(false);
  const [schoolImprovement, setSchoolImprovement] =
    useState<SchoolTeachingQualityImprovementSummary | null>(null);
  const [teacherProfile, setTeacherProfile] = useState<TeacherImprovementProfile | null>(null);
  const [selectedTeacherUid, setSelectedTeacherUid] = useState("");
  const [selectedComparisonEvaluationId, setSelectedComparisonEvaluationId] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");

  const groupedItems = useMemo(() => {
    const grouped = new Map<string, typeof LESSON_EVALUATION_ITEMS>();
    LESSON_EVALUATION_ITEMS.forEach((item) => {
      const bucket = grouped.get(item.domainKey) ?? [];
      bucket.push(item);
      grouped.set(item.domainKey, bucket);
    });
    return grouped;
  }, []);

  const hasTeachers = teachers.length > 0;
  const selectedTeacherComparison = teacherProfile?.teacherComparison ?? null;

  async function loadPanelData(activeSchoolId: number, activeVisitId: number | null) {
    setLoading(true);
    try {
      const [evaluationResponse, rosterResponse] = await Promise.all([
        fetch(
          `/api/portal/lesson-evaluations?schoolId=${activeSchoolId}${activeVisitId ? `&visitId=${activeVisitId}` : ""}&limit=120`,
          { cache: "no-store" },
        ),
        fetch(`/api/portal/schools/roster?schoolId=${activeSchoolId}&type=teacher`, {
          cache: "no-store",
        }),
      ]);

      const evaluationsJson = (await evaluationResponse.json()) as {
        evaluations?: LessonEvaluationRecord[];
        error?: string;
      };
      if (!evaluationResponse.ok || !evaluationsJson.evaluations) {
        throw new Error(evaluationsJson.error ?? "Could not load lesson evaluations.");
      }

      const rosterJson = (await rosterResponse.json()) as {
        roster?: TeacherRosterOption[];
        error?: string;
      };
      if (!rosterResponse.ok || !rosterJson.roster) {
        throw new Error(rosterJson.error ?? "Could not load teacher roster.");
      }

      setEvaluations(evaluationsJson.evaluations);
      setTeachers(rosterJson.roster.filter((teacher) => teacher.status !== "inactive"));
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Could not load lesson evaluation data.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadSchoolImprovement(activeSchoolId: number, activeGradeFilter: string) {
    setImprovementLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("schoolId", String(activeSchoolId));
      if (activeGradeFilter) {
        params.set("grade", activeGradeFilter);
      }
      const response = await fetch(`/api/portal/lesson-evaluations/improvement?${params.toString()}`, {
        cache: "no-store",
      });
      const json = (await response.json()) as {
        schoolSummary?: SchoolTeachingQualityImprovementSummary;
        error?: string;
      };
      if (!response.ok || !json.schoolSummary) {
        throw new Error(json.error ?? "Could not load teacher improvement summary.");
      }
      setSchoolImprovement(json.schoolSummary);
      setSelectedTeacherUid((current) => {
        if (
          current &&
          json.schoolSummary?.teacherComparisons.some((entry) => entry.teacherUid === current)
        ) {
          return current;
        }
        return json.schoolSummary?.teacherComparisons[0]?.teacherUid ?? "";
      });
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Could not load teacher improvement summary.",
      });
      setSchoolImprovement(null);
    } finally {
      setImprovementLoading(false);
    }
  }

  async function loadTeacherProfile(
    activeSchoolId: number,
    teacherUid: string,
    activeGradeFilter: string,
    comparisonEvaluationId: string,
  ) {
    if (!teacherUid) {
      setTeacherProfile(null);
      return;
    }

    setImprovementLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("schoolId", String(activeSchoolId));
      params.set("teacherUid", teacherUid);
      if (activeGradeFilter) {
        params.set("grade", activeGradeFilter);
      }
      const parsedComparisonId = Number(comparisonEvaluationId);
      if (Number.isInteger(parsedComparisonId) && parsedComparisonId > 0) {
        params.set("comparisonEvaluationId", String(parsedComparisonId));
      }
      const response = await fetch(`/api/portal/lesson-evaluations/improvement?${params.toString()}`, {
        cache: "no-store",
      });
      const json = (await response.json()) as {
        profile?: TeacherImprovementProfile;
        error?: string;
      };
      if (!response.ok || !json.profile) {
        throw new Error(json.error ?? "Could not load teacher improvement profile.");
      }
      setTeacherProfile(json.profile);
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Could not load teacher improvement profile.",
      });
      setTeacherProfile(null);
    } finally {
      setImprovementLoading(false);
    }
  }

  useEffect(() => {
    if (!schoolId) {
      setEvaluations([]);
      setTeachers([]);
      setSchoolImprovement(null);
      setTeacherProfile(null);
      setSelectedTeacherUid("");
      setSelectedComparisonEvaluationId("");
      return;
    }
    void loadPanelData(schoolId, defaultVisitId ?? null);
  }, [schoolId, defaultVisitId]);

  useEffect(() => {
    if (!schoolId) {
      return;
    }
    void loadSchoolImprovement(schoolId, gradeFilter);
  }, [schoolId, gradeFilter]);

  useEffect(() => {
    if (!schoolId || !selectedTeacherUid) {
      setTeacherProfile(null);
      return;
    }
    void loadTeacherProfile(
      schoolId,
      selectedTeacherUid,
      gradeFilter,
      selectedComparisonEvaluationId,
    );
  }, [schoolId, selectedTeacherUid, gradeFilter, selectedComparisonEvaluationId]);

  useEffect(() => {
    setSelectedComparisonEvaluationId("");
  }, [selectedTeacherUid]);

  useEffect(() => {
    setDraft(createDefaultDraft(defaultVisitId));
  }, [defaultVisitId]);

  function openNewForm() {
    setDraft(createDefaultDraft(defaultVisitId));
    setFeedback({ kind: "idle", message: "" });
    setFormOpen(true);
  }

  function openEditForm(record: LessonEvaluationRecord) {
    setDraft(fromEvaluationRecord(record, defaultVisitId));
    setFeedback({ kind: "idle", message: "" });
    setFormOpen(true);
  }

  async function handleSave() {
    if (!schoolId) {
      return;
    }
    if (!draft.teacherUid.trim()) {
      setFeedback({ kind: "error", message: "Select a teacher from this school roster." });
      return;
    }

    const classSize = parseOptionalNumber(draft.classSize);
    const catchupCount = parseOptionalNumber(draft.catchupEstimateCount);
    const catchupPercent = parseOptionalNumber(draft.catchupEstimatePercent);

    if ([classSize, catchupCount, catchupPercent].some((value) => Number.isNaN(value))) {
      setFeedback({
        kind: "error",
        message: "Class size and catch-up estimates must be valid numbers.",
      });
      return;
    }

    const payload = {
      schoolId,
      teacherUid: draft.teacherUid.trim(),
      grade: draft.grade,
      stream: draft.stream.trim() || null,
      classSize,
      lessonDate: draft.lessonDate,
      lessonFocus: draft.lessonFocus,
      visitId: parseOptionalNumber(draft.visitId),
      strengthsText: draft.strengthsText.trim(),
      priorityGapText: draft.priorityGapText.trim(),
      nextCoachingAction: draft.nextCoachingAction.trim(),
      teacherCommitment: draft.teacherCommitment.trim(),
      catchupEstimateCount: catchupCount,
      catchupEstimatePercent: catchupPercent,
      nextVisitDate: draft.nextVisitDate || null,
      items: LESSON_EVALUATION_ITEMS.map((item) => ({
        domainKey: item.domainKey,
        itemKey: item.itemKey,
        score: Number(draft.items[item.itemKey].score),
        note: draft.items[item.itemKey].note.trim() || null,
      })),
    };

    setSaving(true);
    setFeedback({ kind: "idle", message: "" });
    try {
      const method = draft.id ? "PATCH" : "POST";
      const endpoint = draft.id
        ? `/api/portal/lesson-evaluations/${draft.id}`
        : "/api/portal/lesson-evaluations";
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(json.error ?? "Could not save lesson evaluation.");
      }

      await loadPanelData(schoolId, defaultVisitId ?? null);
      await loadSchoolImprovement(schoolId, gradeFilter);
      if (selectedTeacherUid) {
        await loadTeacherProfile(
          schoolId,
          selectedTeacherUid,
          gradeFilter,
          selectedComparisonEvaluationId,
        );
      }
      setFeedback({
        kind: "success",
        message: draft.id
          ? "Lesson evaluation updated."
          : "Lesson evaluation saved.",
      });
      setFormOpen(false);
      setDraft(createDefaultDraft(defaultVisitId));
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Could not save lesson evaluation.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleVoid(record: LessonEvaluationRecord) {
    if (!allowVoid) {
      return;
    }
    const reason = window.prompt("Enter reason for voiding this evaluation:");
    if (!reason || !reason.trim()) {
      return;
    }

    setSaving(true);
    setFeedback({ kind: "idle", message: "" });
    try {
      const response = await fetch(`/api/portal/lesson-evaluations/${record.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(json.error ?? "Could not void lesson evaluation.");
      }
      if (schoolId) {
        await loadPanelData(schoolId, defaultVisitId ?? null);
        await loadSchoolImprovement(schoolId, gradeFilter);
        if (selectedTeacherUid) {
          await loadTeacherProfile(
            schoolId,
            selectedTeacherUid,
            gradeFilter,
            selectedComparisonEvaluationId,
          );
        }
      }
      setFeedback({ kind: "success", message: "Lesson evaluation voided." });
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Could not void lesson evaluation.",
      });
    } finally {
      setSaving(false);
    }
  }

  if (!schoolId) {
    return null;
  }

  return (
    <section id="lesson-evaluations" className="card lesson-evaluation-panel">
      <div className="lesson-evaluation-panel-header">
        <div>
          <h3>{title}</h3>
          <p className="portal-muted">{description}</p>
        </div>
        <button
          className="button button-compact"
          type="button"
          onClick={openNewForm}
          disabled={!hasTeachers}
        >
          {newButtonLabel}
        </button>
      </div>

      {!hasTeachers ? (
        <p className="portal-warning-note" role="status">
          Add Teacher to School first before logging lesson evaluations.{" "}
          <Link href="/portal/schools" className="inline-download-link">
            Open Schools Directory
          </Link>
        </p>
      ) : null}

      {feedback.message ? (
        <p className={`form-message ${feedback.kind === "error" ? "error" : "success"}`} role="status">
          {feedback.message}
        </p>
      ) : null}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Teacher</th>
              <th>Class</th>
              <th>Overall</th>
              <th>Level</th>
              <th>Top Gap</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7}>Loading lesson evaluations...</td>
              </tr>
            ) : evaluations.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  No lesson evaluations found for this scope
                  {defaultVisitId ? " and visit" : ""}.
                </td>
              </tr>
            ) : (
              evaluations.map((evaluation) => (
                <tr key={evaluation.id}>
                  <td>{new Date(evaluation.lessonDate).toLocaleDateString()}</td>
                  <td>{evaluation.teacherName}</td>
                  <td>{evaluation.grade}{evaluation.stream ? ` ${evaluation.stream}` : ""}</td>
                  <td>{evaluation.overallScore.toFixed(2)}/4</td>
                  <td>{evaluation.overallLevel}</td>
                  <td>
                    {evaluation.topGapDomain
                      ? LESSON_EVALUATION_DOMAIN_LABELS[evaluation.topGapDomain]
                      : "Data not available"}
                  </td>
                  <td>
                    <div className="action-row">
                      <Link
                        className="button button-ghost button-compact"
                        href={`/portal/schools/${evaluation.schoolId}/teachers/${encodeURIComponent(evaluation.teacherUid)}/improvement`}
                      >
                        Improvement
                      </Link>
                      <button
                        className="button button-ghost button-compact"
                        type="button"
                        onClick={() => openEditForm(evaluation)}
                      >
                        Edit
                      </button>
                      {allowVoid && evaluation.status === "active" ? (
                        <button
                          className="button button-ghost button-compact"
                          type="button"
                          onClick={() => void handleVoid(evaluation)}
                          disabled={saving}
                        >
                          Void
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <section className="lesson-improvement-section">
        <div className="lesson-improvement-header">
          <h4>Teacher Improvement Since First Visit</h4>
          <div className="lesson-improvement-controls">
            <label>
              <span className="portal-field-label">Grade filter</span>
              <select
                value={gradeFilter}
                onChange={(event) => setGradeFilter(event.target.value)}
              >
                <option value="">All grades</option>
                {GRADE_OPTIONS.map((grade) => (
                  <option key={grade} value={grade}>
                    {grade}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="portal-field-label">Teacher</span>
              <select
                value={selectedTeacherUid}
                onChange={(event) => setSelectedTeacherUid(event.target.value)}
                disabled={!schoolImprovement || schoolImprovement.teacherComparisons.length === 0}
              >
                <option value="">Select teacher</option>
                {schoolImprovement?.teacherComparisons.map((comparison) => (
                  <option key={comparison.teacherUid} value={comparison.teacherUid}>
                    {comparison.teacherName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="portal-field-label">Compare against visit</span>
              <select
                value={selectedComparisonEvaluationId}
                onChange={(event) => setSelectedComparisonEvaluationId(event.target.value)}
                disabled={!selectedTeacherComparison}
              >
                <option value="">Latest</option>
                {selectedTeacherComparison?.timeline
                  .filter((point) => point.evaluationId !== selectedTeacherComparison.firstEvaluationId)
                  .map((point) => (
                    <option key={point.evaluationId} value={String(point.evaluationId)}>
                      {new Date(point.lessonDate).toLocaleDateString()} • {point.grade}
                      {point.stream ? ` ${point.stream}` : ""}
                    </option>
                  ))}
              </select>
            </label>
          </div>
        </div>

        {improvementLoading ? (
          <p className="portal-muted">Loading improvement trends...</p>
        ) : null}

        {schoolImprovement ? (
          <div className="lesson-improvement-summary-grid">
            <article>
              <span>Teachers compared</span>
              <strong>{schoolImprovement.teachersCompared.toLocaleString()}</strong>
            </article>
            <article>
              <span>% improved</span>
              <strong>{schoolImprovement.improvedTeachersPercent.toFixed(1)}%</strong>
            </article>
            <article>
              <span>Average overall delta</span>
              <strong>
                {schoolImprovement.averageOverallDelta !== null
                  ? `${schoolImprovement.averageOverallDelta > 0 ? "+" : ""}${schoolImprovement.averageOverallDelta.toFixed(2)}`
                  : "Data not available"}
              </strong>
            </article>
            <article>
              <span>School status</span>
              <strong>{schoolImprovement.schoolImproved ? "Improving" : "Needs support"}</strong>
            </article>
          </div>
        ) : null}

        {schoolImprovement && schoolImprovement.topImprovingDomains.length > 0 ? (
          <p className="portal-muted">
            Top improving domains:{" "}
            {schoolImprovement.topImprovingDomains
              .map((entry) => `${entry.domain} (+${entry.avgDelta.toFixed(2)})`)
              .join(" • ")}
          </p>
        ) : null}

        {schoolImprovement && schoolImprovement.teachersNeedingSupport.length > 0 ? (
          <div className="lesson-improvement-needs-support">
            <p className="portal-field-label">Teachers needing support</p>
            <ul>
              {schoolImprovement.teachersNeedingSupport.map((entry) => (
                <li key={entry.teacherUid}>
                  {entry.teacherName} • {entry.deltaOverall > 0 ? "+" : ""}
                  {entry.deltaOverall.toFixed(2)} ({teacherImprovementStatusLabel(entry.improvementStatus)})
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {selectedTeacherComparison ? (
          <div className="lesson-improvement-comparison-card">
            <div className="lesson-improvement-comparison-head">
              <h5>
                {selectedTeacherComparison.teacherName}: baseline vs comparison
              </h5>
              <span
                className={`badge ${
                  selectedTeacherComparison.improvementStatus === "improved"
                    ? "badge-success"
                    : selectedTeacherComparison.improvementStatus === "declined"
                      ? "badge-warning"
                      : "badge-info"
                }`}
              >
                {teacherImprovementStatusLabel(selectedTeacherComparison.improvementStatus)}
              </span>
            </div>
            <p className="portal-muted">
              Baseline: {new Date(selectedTeacherComparison.firstEvaluationDate).toLocaleDateString()} •
              Comparison: {new Date(selectedTeacherComparison.comparisonEvaluationDate).toLocaleDateString()} •
              Latest: {new Date(selectedTeacherComparison.latestEvaluationDate).toLocaleDateString()}
            </p>
            <div className="lesson-improvement-score-grid">
              <article>
                <span>Baseline overall</span>
                <strong>{selectedTeacherComparison.overallScoreBaseline.toFixed(2)}/4</strong>
              </article>
              <article>
                <span>Comparison overall</span>
                <strong>{selectedTeacherComparison.overallScoreComparison.toFixed(2)}/4</strong>
              </article>
              <article>
                <span>Delta overall</span>
                <strong>
                  {selectedTeacherComparison.deltaOverall > 0 ? "+" : ""}
                  {selectedTeacherComparison.deltaOverall.toFixed(2)}
                </strong>
              </article>
            </div>

            <div className="lesson-improvement-domain-deltas">
              {(Object.entries(selectedTeacherComparison.domainDeltas) as Array<[string, number | null]>).map(
                ([key, value]) => (
                  <p key={key}>
                    <span>{DOMAIN_DELTA_LABELS[key] ?? key}</span>
                    <strong>
                      {typeof value === "number"
                        ? `${value > 0 ? "+" : ""}${value.toFixed(2)}`
                        : "Data not available"}
                    </strong>
                  </p>
                ),
              )}
            </div>

            <div className="lesson-improvement-lists">
              <article>
                <h6>Top improved items</h6>
                {selectedTeacherComparison.topImprovedItems.length > 0 ? (
                  <ul>
                    {selectedTeacherComparison.topImprovedItems.map((item) => (
                      <li key={item.itemKey}>
                        {item.itemKey}: +{item.delta.toFixed(2)} ({item.baselineScore} → {item.comparisonScore})
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="portal-muted">Data not available.</p>
                )}
              </article>
              <article>
                <h6>Stubborn gaps</h6>
                {selectedTeacherComparison.stubbornGapItems.length > 0 ? (
                  <ul>
                    {selectedTeacherComparison.stubbornGapItems.map((item) => (
                      <li key={item.itemKey}>
                        {item.itemKey}: {item.comparisonScore}/4 ({item.delta > 0 ? "+" : ""}
                        {item.delta.toFixed(2)})
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="portal-muted">Data not available.</p>
                )}
              </article>
            </div>

            <div className="lesson-improvement-timeline">
              <h6>Visit timeline</h6>
              <ul>
                {selectedTeacherComparison.timeline.map((point) => (
                  <li key={point.evaluationId}>
                    {new Date(point.lessonDate).toLocaleDateString()} • {point.grade}
                    {point.stream ? ` ${point.stream}` : ""} • {point.overallScore.toFixed(2)}/4
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <p className="portal-muted">
            Select a teacher with at least two lesson evaluations to compare baseline against follow-up visits.
          </p>
        )}

        {teacherProfile?.alignment ? (
          <div className="lesson-alignment-card">
            <h5>Teaching → Learning Alignment</h5>
            <p className="portal-muted">
              {teacherProfile.alignment.summary.teachingDelta !== null
                ? `Teaching quality changed by ${teacherProfile.alignment.summary.teachingDelta > 0 ? "+" : ""}${teacherProfile.alignment.summary.teachingDelta.toFixed(2)}. `
                : "Teaching trend unavailable. "}
              {teacherProfile.alignment.summary.nonReaderReductionPp !== null
                ? `Non-readers changed by ${teacherProfile.alignment.summary.nonReaderReductionPp.toFixed(2)} pp. `
                : "Non-reader trend unavailable. "}
              {teacherProfile.alignment.summary.cwpm20PlusDeltaPp !== null
                ? `20+ CWPM share changed by ${teacherProfile.alignment.summary.cwpm20PlusDeltaPp > 0 ? "+" : ""}${teacherProfile.alignment.summary.cwpm20PlusDeltaPp.toFixed(2)} pp. `
                : "20+ CWPM trend unavailable. "}
              {teacherProfile.alignment.summary.storySessionsLatest > 0
                ? `1001 Story sessions (latest period): ${teacherProfile.alignment.summary.storySessionsLatest}.`
                : "1001 Story sessions not logged for latest period."}
            </p>
            <p className="portal-muted">{teacherProfile.alignment.caveat}</p>
          </div>
        ) : null}
      </section>

      <FloatingSurface
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={draft.id ? "Edit Lesson Evaluation" : "New Lesson Evaluation"}
        description={`${schoolName ?? "School"}${draft.visitId ? ` • Visit #${draft.visitId}` : ""}`}
        variant="modal"
        maxWidth="760px"
        closeLabel="Close"
      >
        <form
          className="form-grid portal-form-grid lesson-evaluation-form"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSave();
          }}
        >
          <fieldset className="portal-fieldset full-width">
            <legend>Context</legend>
            <div className="form-grid-3">
              <label>
                <span className="portal-field-label">School</span>
                <input value={schoolName ?? `School #${schoolId}`} readOnly />
              </label>
              <label>
                <span className="portal-field-label">Teacher</span>
                <select
                  value={draft.teacherUid}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, teacherUid: event.target.value }))
                  }
                  required
                >
                  <option value="">Select teacher</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.teacherUid} value={teacher.teacherUid}>
                      {teacher.fullName}
                      {teacher.isReadingTeacher ? " (Reading Teacher)" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="portal-field-label">Class/Grade Observed</span>
                <select
                  value={draft.grade}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, grade: event.target.value as FormDraft["grade"] }))
                  }
                  required
                >
                  {GRADE_OPTIONS.map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="portal-field-label">Stream (optional)</span>
                <input
                  value={draft.stream}
                  onChange={(event) => setDraft((prev) => ({ ...prev, stream: event.target.value }))}
                />
              </label>
              <label>
                <span className="portal-field-label">Class size (optional)</span>
                <input
                  inputMode="numeric"
                  value={draft.classSize}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, classSize: event.target.value }))
                  }
                />
              </label>
              <label>
                <span className="portal-field-label">Lesson date</span>
                <input
                  type="date"
                  value={draft.lessonDate}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, lessonDate: event.target.value }))
                  }
                  required
                />
              </label>
              <label>
                <span className="portal-field-label">Linked Visit ID (optional)</span>
                <input
                  inputMode="numeric"
                  value={draft.visitId}
                  onChange={(event) => setDraft((prev) => ({ ...prev, visitId: event.target.value }))}
                />
              </label>
            </div>

            <div className="lesson-focus-grid">
              <span className="portal-field-label">Lesson focus</span>
              <div className="lesson-focus-options">
                {LESSON_FOCUS_OPTIONS.map((focus) => {
                  const checked = draft.lessonFocus.includes(focus);
                  return (
                    <label key={focus} className="lesson-focus-option">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) =>
                          setDraft((prev) => {
                            const next = event.target.checked
                              ? [...prev.lessonFocus, focus]
                              : prev.lessonFocus.filter((entry) => entry !== focus);
                            return {
                              ...prev,
                              lessonFocus: next.length > 0 ? next : prev.lessonFocus,
                            };
                          })
                        }
                      />
                      <span>{focus}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </fieldset>

          <fieldset className="portal-fieldset full-width">
            <legend>Observation Items (1-4 scale)</legend>
            <p className="portal-muted">
              1 = Needs Support • 2 = Developing • 3 = Good • 4 = Strong
            </p>
            {[...groupedItems.entries()].map(([domainKey, items]) => (
              <div key={domainKey} className="lesson-evaluation-domain-block">
                <h4>{LESSON_EVALUATION_DOMAIN_LABELS[domainKey as keyof typeof LESSON_EVALUATION_DOMAIN_LABELS]}</h4>
                <div className="lesson-evaluation-items-grid">
                  {items.map((item) => (
                    <article key={item.itemKey} className="lesson-evaluation-item-card">
                      <p className="lesson-evaluation-item-prompt">
                        <strong>{item.itemKey}.</strong> {item.prompt}
                      </p>
                      <label>
                        <span className="portal-field-label">Score</span>
                        <select
                          value={draft.items[item.itemKey].score}
                          onChange={(event) =>
                            setDraft((prev) => ({
                              ...prev,
                              items: {
                                ...prev.items,
                                [item.itemKey]: {
                                  ...prev.items[item.itemKey],
                                  score: event.target.value as ItemDraft["score"],
                                },
                              },
                            }))
                          }
                          required
                        >
                          {(Object.entries(LESSON_EVALUATION_SCORE_LABELS) as Array<[string, string]>).map(
                            ([score, label]) => (
                              <option key={score} value={score}>
                                {score} - {label}
                              </option>
                            ),
                          )}
                        </select>
                      </label>
                      <label>
                        <span className="portal-field-label">Note (optional)</span>
                        <textarea
                          rows={2}
                          value={draft.items[item.itemKey].note}
                          onChange={(event) =>
                            setDraft((prev) => ({
                              ...prev,
                              items: {
                                ...prev.items,
                                [item.itemKey]: {
                                  ...prev.items[item.itemKey],
                                  note: event.target.value,
                                },
                              },
                            }))
                          }
                          placeholder="Optional evidence note"
                        />
                      </label>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </fieldset>

          <fieldset className="portal-fieldset full-width">
            <legend>Coaching Notes</legend>
            <div className="form-grid-2">
              <label>
                <span className="portal-field-label">Strengths observed</span>
                <textarea
                  rows={2}
                  value={draft.strengthsText}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, strengthsText: event.target.value }))
                  }
                  required
                />
              </label>
              <label>
                <span className="portal-field-label">Priority gap</span>
                <textarea
                  rows={2}
                  value={draft.priorityGapText}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, priorityGapText: event.target.value }))
                  }
                  required
                />
              </label>
              <label>
                <span className="portal-field-label">Next coaching action</span>
                <textarea
                  rows={2}
                  value={draft.nextCoachingAction}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, nextCoachingAction: event.target.value }))
                  }
                  required
                />
              </label>
              <label>
                <span className="portal-field-label">Teacher commitment</span>
                <textarea
                  rows={2}
                  value={draft.teacherCommitment}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, teacherCommitment: event.target.value }))
                  }
                  required
                />
              </label>
              <label>
                <span className="portal-field-label">Catch-up estimate count (optional)</span>
                <input
                  inputMode="numeric"
                  value={draft.catchupEstimateCount}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, catchupEstimateCount: event.target.value }))
                  }
                />
              </label>
              <label>
                <span className="portal-field-label">Catch-up estimate % (optional)</span>
                <input
                  inputMode="decimal"
                  value={draft.catchupEstimatePercent}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, catchupEstimatePercent: event.target.value }))
                  }
                />
              </label>
              <label>
                <span className="portal-field-label">Next visit date (optional)</span>
                <input
                  type="date"
                  value={draft.nextVisitDate}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, nextVisitDate: event.target.value }))
                  }
                />
              </label>
            </div>
          </fieldset>

          <div className="action-row portal-form-actions full-width">
            <button className="button" type="submit" disabled={saving || !hasTeachers}>
              {saving ? "Saving..." : draft.id ? "Update Lesson Evaluation" : "Save Lesson Evaluation"}
            </button>
            <button
              className="button button-ghost"
              type="button"
              onClick={() => setFormOpen(false)}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </form>
      </FloatingSurface>
    </section>
  );
}
