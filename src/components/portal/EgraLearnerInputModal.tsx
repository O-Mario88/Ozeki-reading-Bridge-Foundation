import { useState, useEffect, useMemo } from "react";
import { SchoolRosterPicker, RosterEntry, RosterLearner } from "./SchoolRosterPicker";
import {
  ASSESSMENT_MODEL_VERSION_UG_MASTERY_ONETEST_STYLE_V1,
  computeOneTestStyleMasteryAssessment,
} from "@/lib/mastery-assessment";

export interface EgraLearner {
    no: number;
    learnerUid?: string;
    learnerId: string;
    learnerName: string;
    sex: string;
    age: number | string; // Allow string for empty state
    letterIdentification: number | string;
    soundIdentification: number | string;
    decodableWords: number | string;
    undecodableWords: number | string;
    madeUpWords: number | string;
    storyReading: number | string;
    readingComprehension: number | string;
    fluencyLevel: string;
}

const READING_LEVEL_RULE_TOOLTIP =
  `${ASSESSMENT_MODEL_VERSION_UG_MASTERY_ONETEST_STYLE_V1}: deterministic mastery scoring uses domain progression plus benchmark alignment.`;

function toNumberOrNull(value: number | string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function computeReadingLevelPreview(input: EgraLearner) {
  const computed = computeOneTestStyleMasteryAssessment({
    grade: "P1",
    age: toNumberOrNull(input.age) ?? null,
    legacyScores: {
      letterIdentificationScore: toNumberOrNull(input.letterIdentification),
      soundIdentificationScore: toNumberOrNull(input.soundIdentification),
      decodableWordsScore: toNumberOrNull(input.decodableWords),
      undecodableWordsScore: toNumberOrNull(input.undecodableWords),
      madeUpWordsScore: toNumberOrNull(input.madeUpWords),
      storyReadingScore: toNumberOrNull(input.storyReading),
      readingComprehensionScore: toNumberOrNull(input.readingComprehension),
    },
  });
  return computed;
}

function statusShortLabel(status: "green" | "amber" | "red") {
  if (status === "green") return "G";
  if (status === "amber") return "A";
  return "R";
}

function formatMasteryProfile(
  computed: ReturnType<typeof computeOneTestStyleMasteryAssessment>,
) {
  return [
    `PA:${statusShortLabel(computed.domains.phonemic_awareness.domainMasteryStatus)}`,
    `GPC:${statusShortLabel(computed.domains.grapheme_phoneme_correspondence.domainMasteryStatus)}`,
    `BD:${statusShortLabel(computed.domains.blending_decoding.domainMasteryStatus)}`,
    `WRF:${statusShortLabel(computed.domains.word_recognition_fluency.domainMasteryStatus)}`,
    `SPC:${statusShortLabel(computed.domains.sentence_paragraph_construction.domainMasteryStatus)}`,
    `C:${statusShortLabel(computed.domains.comprehension.domainMasteryStatus)}`,
  ].join(" | ");
}

interface EgraLearnerInputModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (learner: EgraLearner) => void;
    nextLearnerId: string;
    nextNo: number;
    schoolId?: number | null;
    schoolName?: string;
}

export function EgraLearnerInputModal({
    isOpen,
    onClose,
    onSave,
    nextLearnerId,
    nextNo,
    schoolId,
    schoolName,
}: EgraLearnerInputModalProps) {
    const [validationError, setValidationError] = useState("");
    const [learner, setLearner] = useState<EgraLearner>({
        no: nextNo,
        learnerUid: "",
        learnerId: nextLearnerId,
        learnerName: "",
        sex: "M",
        age: "",
        letterIdentification: "",
        soundIdentification: "",
        decodableWords: "",
        undecodableWords: "",
        madeUpWords: "",
        storyReading: "",
        readingComprehension: "",
        fluencyLevel: "Pre-Reader",
    });

    const [selectedLearnerUid, setSelectedLearnerUid] = useState("");
    const readingPreview = useMemo(
        () => computeReadingLevelPreview(learner),
        [learner],
    );

    // Reset form when modal opens or nextLearnerId changes
    useEffect(() => {
        if (isOpen) {
            setLearner({
                no: nextNo,
                learnerUid: "",
                learnerId: nextLearnerId,
                learnerName: "",
                sex: "M",
                age: "",
                letterIdentification: "",
                soundIdentification: "",
                decodableWords: "",
                undecodableWords: "",
                madeUpWords: "",
                storyReading: "",
                readingComprehension: "",
                fluencyLevel: "Pre-Reader",
            });
            setSelectedLearnerUid("");
            setValidationError("");
        }
    }, [isOpen, nextLearnerId, nextNo]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!schoolId) {
            setValidationError("Select a school first, then pick a learner from that school roster.");
            return;
        }
        if (!selectedLearnerUid.trim()) {
            setValidationError("Learner must be selected from the school roster.");
            return;
        }
        setValidationError("");
        onSave({
            ...learner,
            fluencyLevel: readingPreview.readingStageLabel,
        });
    };

    const updateField = (field: keyof EgraLearner, value: EgraLearner[keyof EgraLearner]) => {
        setLearner((prev) => ({ ...prev, [field]: value }));
    };

    const handleLearnerSelect = (entry: RosterEntry | null) => {
        if (!entry) {
            setSelectedLearnerUid("");
            setLearner((prev) => ({ ...prev, learnerUid: "", learnerId: "", learnerName: "", sex: "M", age: "" }));
            return;
        }
        const l = entry as RosterLearner & { learnerId?: number };
        setSelectedLearnerUid(l.learnerUid);
        setLearner((prev) => ({
            ...prev,
            learnerUid: l.learnerUid,
            learnerId: l.learnerId ? String(l.learnerId) : l.learnerUid,
            learnerName: l.fullName,
            sex: l.gender === "Boy" ? "M" : l.gender === "Girl" ? "F" : "",
            age: l.age,
        }));
    };

    return (
        <div className="portal-modal-overlay">
            <div className="portal-modal-content card">
                <div className="portal-modal-header">
                    <h3>Add Learner Result</h3>
                    <button type="button" className="button button-ghost" onClick={onClose}>
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="form-grid">
                    {/* Roster Picker for learner selection */}
                    {schoolId ? (
                        <div className="full-width" style={{ marginBottom: "0.75rem" }}>
                            <SchoolRosterPicker
                                schoolId={schoolId}
                                schoolName={schoolName}
                                participantType="learner"
                                selectedUid={selectedLearnerUid}
                                onSelect={handleLearnerSelect}
                                label="Select Learner from School Roster"
                            />
                            {!selectedLearnerUid && (
                                <p style={{ color: "#b45309", fontSize: "0.78rem", fontStyle: "italic", margin: "0.3rem 0 0" }}>
                                    Learner must be in the school roster. Use &quot;Add Learner to School Account&quot; if not listed.
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="full-width" style={{ marginBottom: "0.75rem" }}>
                            <p style={{ color: "#b45309", fontSize: "0.82rem", fontStyle: "italic" }}>
                                Select a school first to load learners from the school roster. Free-text learners are not allowed.
                            </p>
                        </div>
                    )}

                    {/* Auto-filled learner info when from roster */}
                    {schoolId && selectedLearnerUid && (
                        <div className="full-width grid grid-cols-2 gap-4" style={{ marginBottom: "0.5rem" }}>
                            <label>
                                <span className="label-text">Learner ID</span>
                                <input value={learner.learnerId} readOnly className="bg-slate-100" />
                            </label>
                            <label>
                                <span className="label-text">Name</span>
                                <input value={learner.learnerName} readOnly className="bg-slate-100" />
                            </label>
                            <label>
                                <span className="label-text">Sex</span>
                                <input value={learner.sex === "M" ? "Male" : learner.sex === "F" ? "Female" : "-"} readOnly className="bg-slate-100" />
                            </label>
                            <label>
                                <span className="label-text">Age</span>
                                <input value={String(learner.age)} readOnly className="bg-slate-100" />
                            </label>
                        </div>
                    )}

                    <label>
                        <span className="label-text">Phonemic Awareness</span>
                        <input
                            type="number" min="0"
                            value={learner.letterIdentification}
                            onChange={(e) => updateField("letterIdentification", e.target.value)}
                        />
                    </label>

                    <label>
                        <span className="label-text">Grapheme-Phoneme Correspondence</span>
                        <input
                            type="number" min="0"
                            value={learner.soundIdentification}
                            onChange={(e) => updateField("soundIdentification", e.target.value)}
                        />
                    </label>

                    <label>
                        <span className="label-text">Blending & Decoding</span>
                        <input
                            type="number" min="0"
                            value={learner.decodableWords}
                            onChange={(e) => updateField("decodableWords", e.target.value)}
                        />
                    </label>

                    <label>
                        <span className="label-text">Word Recognition & Fluency</span>
                        <input
                            type="number" min="0"
                            value={learner.madeUpWords}
                            onChange={(e) => updateField("madeUpWords", e.target.value)}
                        />
                    </label>

                    <label>
                        <span className="label-text">Sentence & Paragraph Construction</span>
                        <input
                            type="number" min="0"
                            value={learner.storyReading}
                            onChange={(e) => updateField("storyReading", e.target.value)}
                        />
                    </label>

                    <label>
                        <span className="label-text">Comprehension</span>
                        <input
                            type="number" min="0"
                            value={learner.readingComprehension}
                            onChange={(e) => updateField("readingComprehension", e.target.value)}
                        />
                    </label>

                    <label className="full-width">
                        <span className="label-text">Computed Reading Stage</span>
                        <div
                            className="computed-reading-level"
                            title={READING_LEVEL_RULE_TOOLTIP}
                            aria-label={READING_LEVEL_RULE_TOOLTIP}
                        >
                            <strong>{readingPreview.readingStageLabel}</strong>
                            <span>
                                Benchmark level: {readingPreview.benchmarkGradeLevel}
                            </span>
                            <span className="portal-muted">
                                {readingPreview.expectedVsActualStatus}
                            </span>
                            <span className="portal-muted" style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace", fontSize: "0.74rem" }}>
                                Rubric profile: {formatMasteryProfile(readingPreview)}
                            </span>
                        </div>
                    </label>

                    <div className="full-width action-row mt-4">
                        <button type="button" className="button button-ghost" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="button" disabled={!schoolId || !selectedLearnerUid.trim()}>
                            Save & Add Next
                        </button>
                    </div>
                    {validationError ? (
                        <p className="full-width" style={{ color: "#b91c1c", marginTop: "0.5rem" }}>
                            {validationError}
                        </p>
                    ) : null}
                </form>
            </div>
            <style jsx>{`
        .portal-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(13, 51, 48, 0.4);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .portal-modal-content {
          width: 90%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
          background: white;
          padding: 2rem;
          border-radius: 24px;
          box-shadow: var(--elevation-3);
          border: 1px solid var(--md-sys-color-outline-variant);
        }
        .portal-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          border-bottom: 1px solid var(--md-sys-color-surface-container);
          padding-bottom: 1rem;
        }
        .portal-modal-header h2 {
          color: var(--md-sys-color-primary);
          font-weight: 700;
          font-size: 1.25rem;
          margin: 0;
        }
        .grid-cols-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
        }
        .computed-reading-level {
          display: grid;
          gap: 0.25rem;
          border: 1px solid var(--md-sys-color-outline-variant);
          border-radius: 12px;
          padding: 0.75rem 0.9rem;
          background: var(--md-sys-color-surface-container-low, #f8fafc);
        }
        .computed-reading-level strong {
          font-size: 0.95rem;
          color: var(--md-sys-color-primary);
        }
        .computed-reading-level span {
          font-size: 0.78rem;
          color: var(--md-sys-color-on-surface);
        }
        .gap-4 {
          gap: 1.25rem;
        }
        .bg-slate-100 {
          background-color: var(--md-sys-color-surface-container);
          border: 1px solid var(--md-sys-color-outline-variant);
        }
      `}</style>
        </div>
    );
}
