import { useState, useEffect, useMemo, useId } from "react";
import { SchoolRosterPicker, RosterEntry, RosterLearner } from "./SchoolRosterPicker";
import {
  ASSESSMENT_MODEL_VERSION_UG_MASTERY_ONETEST_STYLE_V1,
  computeOneTestStyleMasteryAssessment,
} from "@/lib/mastery-assessment";
import { FormActions, FormModal, ValidationMessage } from "@/components/forms";

export interface EgraLearner {
    no: number;
    learnerUid?: string;
    learnerId: string;
    learnerName: string;
    classGrade: string;
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
    onSaveAndClose?: (learner: EgraLearner) => void;
    nextLearnerId: string;
    nextNo: number;
    schoolId?: number | null;
    schoolName?: string;
}

export function EgraLearnerInputModal({
    isOpen,
    onClose,
    onSave,
    onSaveAndClose,
    nextLearnerId,
    nextNo,
    schoolId,
    schoolName,
}: EgraLearnerInputModalProps) {
    const formId = useId();
    const [validationError, setValidationError] = useState("");
    const [learner, setLearner] = useState<EgraLearner>({
        no: nextNo,
        learnerUid: "",
        learnerId: nextLearnerId,
        learnerName: "",
        classGrade: "",
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
    const canPersist = Boolean(schoolId && selectedLearnerUid.trim());

    // Reset form when modal opens or nextLearnerId changes
    useEffect(() => {
        if (isOpen) {
            setLearner({
                no: nextNo,
                learnerUid: "",
                learnerId: nextLearnerId,
                learnerName: "",
                classGrade: "",
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

    const persistLearner = (closeAfterSave: boolean) => {
        if (!schoolId) {
            setValidationError("Select a school first, then pick a learner from that school roster.");
            return;
        }
        if (!selectedLearnerUid.trim()) {
            setValidationError("Learner must be selected from the school roster.");
            return;
        }
        setValidationError("");
        const payload: EgraLearner = {
            ...learner,
            fluencyLevel: readingPreview.readingStageLabel,
        };
        if (closeAfterSave && onSaveAndClose) {
            onSaveAndClose(payload);
            return;
        }
        onSave(payload);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        persistLearner(false);
    };

    const updateField = (field: keyof EgraLearner, value: EgraLearner[keyof EgraLearner]) => {
        setLearner((prev) => ({ ...prev, [field]: value }));
    };

    const handleLearnerSelect = (entry: RosterEntry | null) => {
        if (!entry) {
            setSelectedLearnerUid("");
            setLearner((prev) => ({
                ...prev,
                learnerUid: "",
                learnerId: nextLearnerId,
                learnerName: "",
                classGrade: "",
                sex: "M",
                age: "",
            }));
            return;
        }
        const l = entry as RosterLearner & { learnerId?: number };
        setSelectedLearnerUid(l.learnerUid);
        setLearner((prev) => ({
            ...prev,
            learnerUid: l.learnerUid,
            learnerId: l.learnerUid || (l.learnerId ? String(l.learnerId) : nextLearnerId),
            learnerName: l.fullName,
            classGrade: l.classGrade ?? "",
            sex: l.gender === "Boy" ? "M" : l.gender === "Girl" ? "F" : "",
            age: l.age,
        }));
    };

    return (
        <FormModal
            open={isOpen}
            onClose={onClose}
            title="Add Learner Result"
            description={
                schoolName
                    ? `Capture mastery-aligned reading assessment for ${schoolName}.`
                    : "Capture mastery-aligned reading assessment."
            }
            maxWidth="980px"
            footer={
                <FormActions>
                    <button type="button" className="button button-ghost" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="button button-ghost"
                        disabled={!canPersist}
                        onClick={() => persistLearner(true)}
                    >
                        Save
                    </button>
                    <button type="submit" form={formId} className="button" disabled={!canPersist}>
                        Save & Add Next
                    </button>
                </FormActions>
            }
        >
            <form id={formId} onSubmit={handleSubmit} className="form-grid portal-form-grid form-grid--two">
                {schoolId ? (
                    <div className="full-width">
                        <SchoolRosterPicker
                            schoolId={schoolId}
                            schoolName={schoolName}
                            participantType="learner"
                            selectedUid={selectedLearnerUid}
                            onSelect={handleLearnerSelect}
                            label="Select Learner from School Roster"
                        />
                        {!selectedLearnerUid ? (
                            <p className="form-inline-note form-inline-note--warning">
                                Learner must be in the school roster. Use &quot;Add Learner to School Account&quot; if not listed.
                            </p>
                        ) : null}
                    </div>
                ) : (
                    <div className="full-width">
                        <p className="form-inline-note form-inline-note--warning">
                            Select a school first to load learners from the school roster. Free-text learners are not allowed.
                        </p>
                    </div>
                )}

                {schoolId && selectedLearnerUid ? (
                    <div className="full-width form-grid form-grid--two">
                        <label>
                            <span className="label-text">Learner ID</span>
                            <input value={learner.learnerId} readOnly className="form-readonly-input" />
                        </label>
                        <label>
                            <span className="label-text">Name</span>
                            <input value={learner.learnerName} readOnly className="form-readonly-input" />
                        </label>
                        <label>
                            <span className="label-text">Gender</span>
                            <input
                                value={learner.sex === "M" ? "Male" : learner.sex === "F" ? "Female" : "-"}
                                readOnly
                                className="form-readonly-input"
                            />
                        </label>
                        <label>
                            <span className="label-text">Class</span>
                            <input value={learner.classGrade || "-"} readOnly className="form-readonly-input" />
                        </label>
                        <label>
                            <span className="label-text">Age</span>
                            <input value={String(learner.age)} readOnly className="form-readonly-input" />
                        </label>
                    </div>
                ) : null}

                <label>
                    <span className="label-text">Phonemic Awareness</span>
                    <input
                        type="number"
                        min="0"
                        value={learner.letterIdentification}
                        onChange={(e) => updateField("letterIdentification", e.target.value)}
                    />
                </label>

                <label>
                    <span className="label-text">Grapheme-Phoneme Correspondence</span>
                    <input
                        type="number"
                        min="0"
                        value={learner.soundIdentification}
                        onChange={(e) => updateField("soundIdentification", e.target.value)}
                    />
                </label>

                <label>
                    <span className="label-text">Blending & Decoding</span>
                    <input
                        type="number"
                        min="0"
                        value={learner.decodableWords}
                        onChange={(e) => updateField("decodableWords", e.target.value)}
                    />
                </label>

                <label>
                    <span className="label-text">Word Recognition & Fluency</span>
                    <input
                        type="number"
                        min="0"
                        value={learner.madeUpWords}
                        onChange={(e) => updateField("madeUpWords", e.target.value)}
                    />
                </label>

                <label>
                    <span className="label-text">Sentence & Paragraph Construction</span>
                    <input
                        type="number"
                        min="0"
                        value={learner.storyReading}
                        onChange={(e) => updateField("storyReading", e.target.value)}
                    />
                </label>

                <label>
                    <span className="label-text">Comprehension</span>
                    <input
                        type="number"
                        min="0"
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
                        <span>Benchmark level: {readingPreview.benchmarkGradeLevel}</span>
                        <span className="portal-muted">{readingPreview.expectedVsActualStatus}</span>
                        <span className="computed-reading-level__profile">
                            Rubric profile: {formatMasteryProfile(readingPreview)}
                        </span>
                    </div>
                </label>

                <ValidationMessage message={validationError} className="full-width" />
            </form>
        </FormModal>
    );
}
