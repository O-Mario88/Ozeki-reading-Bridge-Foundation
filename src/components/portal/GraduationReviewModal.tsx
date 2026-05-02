"use client";

import { useMemo, useState } from "react";
import { FloatingSurface } from "@/components/FloatingSurface";
import { GraduationEligibilityRecord, GraduationSettingsRecord } from "@/lib/types";

type SupervisorOption = {
  id: number;
  fullName: string;
};

type GraduationReviewModalProps = {
  open: boolean;
  eligibility: GraduationEligibilityRecord | null;
  supervisors: SupervisorOption[];
  settings?: GraduationSettingsRecord | null;
  onClose: () => void;
  onUpdated?: (next: GraduationEligibilityRecord) => void;
};

type ReviewAction = "confirm_graduation" | "keep_supporting" | "needs_review";

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "Data not available";
  }
  return `${Number(value).toFixed(1)}%`;
}

const SUSTAINABILITY_STATUS_LABELS: Record<string, string> = {
  not_required: "Not required",
  pending: "Pending — criteria not yet met",
  first_pass: "First pass ✓ — awaiting validation check",
  validated: "Validated ✓✓",
};

export function GraduationReviewModal({
  open,
  eligibility,
  supervisors,
  settings,
  onClose,
  onUpdated,
}: GraduationReviewModalProps) {
  const [action, setAction] = useState<ReviewAction>("confirm_graduation");
  const [reason, setReason] = useState("");
  const [snoozeDays, setSnoozeDays] = useState("30");
  const [assignedSupervisorUserId, setAssignedSupervisorUserId] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string>("");

  /* V2: Sustainability checklist state */
  const checklistItems = useMemo(
    () =>
      settings?.sustainabilityChecklistItems ?? [
        "School reading routines are embedded and observed consistently",
        "Head teacher actively leads literacy instruction monitoring",
        "Teachers demonstrate independent lesson planning for phonics",
        "Community/parent engagement supports reading at home",
        "Reading materials are available and actively used in classrooms",
        "School has a succession plan for sustaining reading outcomes",
      ],
    [settings],
  );
  const [checklistAnswers, setChecklistAnswers] = useState<Record<string, boolean>>({});
  const allChecklistCompleted = checklistItems.every((item) => checklistAnswers[item] === true);

  const scorecard = eligibility?.eligibilityScorecard;
  const scorecardChecklist = useMemo(() => {
    if (!scorecard) {
      return [];
    }
    return [
      {
        label: `Learner domains ≥${scorecard.domainsValues[0]?.targetPct ?? 90}%`,
        ok: scorecard.domainsOk,
      },
      {
        label: `Reading levels ${formatPercent(scorecard.requiredFluentPct)} at or above required level`,
        ok: scorecard.readingLevelsOk,
      },
      {
        label: `${scorecard.requiredStories} + published stories`,
        ok: scorecard.storiesOk,
      },
      {
        label: `Teaching quality ≥${formatPercent(scorecard.requiredTeachingQualityPct)}`,
        ok: scorecard.teachingOk,
      },
      {
        label: `Evidence gates (${scorecard.learnersAssessedCount}/${scorecard.requiredLearnersAssessedN} learners, ${scorecard.teacherEvaluationsTotalCount}/${scorecard.requiredTeacherEvaluationsTotal} evals, ${formatPercent(scorecard.dataCompletenessPct)} completeness)`,
        ok: scorecard.evidenceGatesOk,
      },
    ];
  }, [scorecard]);

  async function submitReview(nextAction: ReviewAction) {
    if (!eligibility) {
      return;
    }
    setAction(nextAction);
    setSaving(true);
    setFeedback("");
    try {
      const response = await fetch(`/api/portal/graduation/school/${eligibility.schoolId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: nextAction,
          reason: reason.trim() || null,
          snoozeDays:
            nextAction === "keep_supporting" && snoozeDays.trim()
              ? Number(snoozeDays.trim())
              : null,
          assignedSupervisorUserId: assignedSupervisorUserId
            ? Number(assignedSupervisorUserId)
            : null,
          checklistAnswers: nextAction === "confirm_graduation" ? checklistAnswers : null,
        }),
      });
      const json = (await response.json()) as {
        ok?: boolean;
        eligibility?: GraduationEligibilityRecord;
        error?: string;
      };
      if (!response.ok || !json.eligibility) {
        throw new Error(json.error ?? "Could not save graduation review action.");
      }
      setFeedback("Graduation workflow updated.");
      onUpdated?.(json.eligibility);
      onClose();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not save graduation review action.");
    } finally {
      setSaving(false);
    }
  }

  const confirmDisabled =
    !eligibility ||
    saving ||
    !eligibility.isEligible ||
    !allChecklistCompleted;

  return (
    <FloatingSurface
      open={open}
      onClose={onClose}
      title={`Graduation Review${eligibility ? ` • ${eligibility.schoolName}` : ""}`}
      description="Review evidence, then confirm graduation or route follow-up action."
      variant="modal"
      maxWidth="920px"
      footer={
        <div className="action-row">
          <button
            type="button"
            className="button"
            disabled={confirmDisabled}
            onClick={() => submitReview("confirm_graduation")}
            title={!allChecklistCompleted ? "Complete sustainability checklist to enable" : ""}
          >
            {saving && action === "confirm_graduation" ? "Saving..." : "Confirm Graduation"}
          </button>
          <button
            type="button"
            className="button button-ghost"
            disabled={!eligibility || saving}
            onClick={() => submitReview("keep_supporting")}
          >
            Keep Supporting
          </button>
          <button
            type="button"
            className="button button-ghost"
            disabled={!eligibility || saving}
            onClick={() => submitReview("needs_review")}
          >
            Needs Review
          </button>
        </div>
      }
    >
      {!eligibility || !scorecard ? (
        <p className="portal-muted">Loading graduation evidence…</p>
      ) : (
        <div className="portal-form-grid">
          <div className="card">
            <h3>Eligibility Scorecard</h3>
            <ul className="portal-list">
              {scorecardChecklist.map((item) => (
                <li key={item.label}>
                  <div>
                    <strong>{item.ok ? "✓" : "•"} {item.label}</strong>
                  </div>
                </li>
              ))}
            </ul>
            <p className="portal-muted" style={{ marginTop: "0.5rem" }}>
              <strong>Sustainability:</strong>{" "}
              {SUSTAINABILITY_STATUS_LABELS[scorecard.sustainabilityValidationStatus] ??
                scorecard.sustainabilityValidationStatus}
              {scorecard.validationPassCount > 0 &&
                ` (${scorecard.validationPassCount} pass${scorecard.validationPassCount > 1 ? "es" : ""})`}
            </p>
            <p className="portal-muted">
              Missing data flags:{" "}
              {eligibility.missingDataFlags.length > 0
                ? eligibility.missingDataFlags.join(", ")
                : "None"}
            </p>
          </div>

          <div className="card">
            <h3>Evidence Snapshot</h3>
            <dl className="grad-evidence-list">
              <div className="grad-evidence-row">
                <dt>Fluent / required level %</dt>
                <dd>{formatPercent(scorecard.fluentPct)}</dd>
              </div>
              <div className="grad-evidence-row">
                <dt>Published stories</dt>
                <dd>{scorecard.publishedStoryCount.toLocaleString()} / {scorecard.requiredStories}</dd>
              </div>
              <div className="grad-evidence-row">
                <dt>Teaching quality</dt>
                <dd>{formatPercent(scorecard.teachingQualityPct)}</dd>
              </div>
              <div className="grad-evidence-row">
                <dt>Evaluation sample</dt>
                <dd>{scorecard.teachingEvaluationsCount.toLocaleString()}</dd>
              </div>
              <div className="grad-evidence-row">
                <dt>Assessment sample</dt>
                <dd>{scorecard.readingSampleSize.toLocaleString()}</dd>
              </div>
              <div className="grad-evidence-row">
                <dt>Learners assessed</dt>
                <dd>{scorecard.learnersAssessedCount} / {scorecard.requiredLearnersAssessedN}</dd>
              </div>
              <div className="grad-evidence-row">
                <dt>Data completeness</dt>
                <dd>{formatPercent(scorecard.dataCompletenessPct)}</dd>
              </div>
            </dl>
            <div className="action-row">
              <a className="inline-download-link" href={`/portal/assessments?school=${eligibility.schoolId}`}>
                Latest assessments
              </a>
              <a className="inline-download-link" href={`/portal/stories?school=${eligibility.schoolId}`}>
                Published stories
              </a>
              <a className="inline-download-link" href={`/portal/visits?school=${eligibility.schoolId}`}>
                Lesson evaluations
              </a>
            </div>
          </div>

          {/* V2: Sustainability Checklist */}
          <div className="card full-width">
            <h3>Sustainability Checklist</h3>
            <p className="portal-muted" style={{ marginBottom: "0.75rem" }}>
              All items must be confirmed before graduation can proceed.
            </p>
            <ul className="portal-list" style={{ listStyle: "none", paddingLeft: 0 }}>
              {checklistItems.map((item) => (
                <li key={item} style={{ marginBottom: "0.5rem" }}>
                  <label style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: "0.5rem", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={checklistAnswers[item] === true}
                      onChange={(event) =>
                        setChecklistAnswers((previous) => ({
                          ...previous,
                          [item]: event.target.checked,
                        }))
                      }
                      style={{ marginTop: "0.2rem" }}
                    />
                    <span>{item}</span>
                  </label>
                </li>
              ))}
            </ul>
            {!allChecklistCompleted && (
              <p
                className="portal-muted"
                style={{ color: "var(--color-alert-amber, #b87a00)", fontStyle: "italic" }}
              >
                Complete all checklist items to enable &ldquo;Confirm Graduation&rdquo;.
              </p>
            )}
          </div>

          <label className="full-width">
            <span className="portal-field-label">Reason / notes</span>
            <textarea
              rows={3}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Add context for this decision."
            />
          </label>

          <label>
            <span className="portal-field-label">Keep Supporting (days)</span>
            <input
              value={snoozeDays}
              onChange={(event) => setSnoozeDays(event.target.value)}
              inputMode="numeric"
            />
          </label>

          <label>
            <span className="portal-field-label">Assign Supervisor</span>
            <select
              value={assignedSupervisorUserId}
              onChange={(event) => setAssignedSupervisorUserId(event.target.value)}
            >
              <option value="">Unassigned</option>
              {supervisors.map((supervisor) => (
                <option key={supervisor.id} value={supervisor.id}>
                  {supervisor.fullName}
                </option>
              ))}
            </select>
          </label>

          {feedback ? <p className="portal-muted full-width">{feedback}</p> : null}
        </div>
      )}
    </FloatingSurface>
  );
}
