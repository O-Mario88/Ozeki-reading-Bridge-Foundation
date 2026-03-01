import { useState, useEffect } from "react";
import { SchoolRosterPicker, RosterEntry, RosterLearner } from "./SchoolRosterPicker";

export interface EgraLearner {
    no: number;
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
    const [learner, setLearner] = useState<EgraLearner>({
        no: nextNo,
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
        fluencyLevel: "Non-Reader",
    });

    const [selectedLearnerUid, setSelectedLearnerUid] = useState("");

    // Reset form when modal opens or nextLearnerId changes
    useEffect(() => {
        if (isOpen) {
            setLearner({
                no: nextNo,
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
                fluencyLevel: "Non-Reader",
            });
            setSelectedLearnerUid("");
        }
    }, [isOpen, nextLearnerId, nextNo]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(learner);
    };

    const updateField = (field: keyof EgraLearner, value: EgraLearner[keyof EgraLearner]) => {
        setLearner((prev) => ({ ...prev, [field]: value }));
    };

    const handleLearnerSelect = (entry: RosterEntry | null) => {
        if (!entry) {
            setSelectedLearnerUid("");
            setLearner((prev) => ({ ...prev, learnerName: "", sex: "M", age: "" }));
            return;
        }
        const l = entry as RosterLearner;
        setSelectedLearnerUid(l.learnerUid);
        setLearner((prev) => ({
            ...prev,
            learnerId: l.learnerUid,
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
                                Select a school first to load learners from the school roster.
                            </p>
                            <div className="full-width grid grid-cols-2 gap-4">
                                <label>
                                    <span className="label-text">Learner ID</span>
                                    <input value={learner.learnerId} readOnly className="bg-slate-100" />
                                </label>
                                <label>
                                    <span className="label-text">Learner Name</span>
                                    <input
                                        value={learner.learnerName}
                                        onChange={(e) => updateField("learnerName", e.target.value)}
                                        required
                                        placeholder="Enter learner name"
                                    />
                                </label>
                            </div>
                            <div className="full-width grid grid-cols-2 gap-4" style={{ marginTop: "0.5rem" }}>
                                <label>
                                    <span className="label-text">Sex</span>
                                    <select
                                        value={learner.sex}
                                        onChange={(e) => updateField("sex", e.target.value)}
                                        required
                                    >
                                        <option value="M">Male</option>
                                        <option value="F">Female</option>
                                    </select>
                                </label>
                                <label>
                                    <span className="label-text">Age</span>
                                    <input
                                        type="number"
                                        min="3"
                                        max="25"
                                        value={learner.age}
                                        onChange={(e) => updateField("age", e.target.value)}
                                        required
                                    />
                                </label>
                            </div>
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
                        <span className="label-text">Letter Identification</span>
                        <input
                            type="number" min="0"
                            value={learner.letterIdentification}
                            onChange={(e) => updateField("letterIdentification", e.target.value)}
                        />
                    </label>

                    <label>
                        <span className="label-text">Sound Identification</span>
                        <input
                            type="number" min="0"
                            value={learner.soundIdentification}
                            onChange={(e) => updateField("soundIdentification", e.target.value)}
                        />
                    </label>

                    <label>
                        <span className="label-text">Decodable Words</span>
                        <input
                            type="number" min="0"
                            value={learner.decodableWords}
                            onChange={(e) => updateField("decodableWords", e.target.value)}
                        />
                    </label>

                    <label>
                        <span className="label-text">Undecodable Words</span>
                        <input
                            type="number" min="0"
                            value={learner.undecodableWords}
                            onChange={(e) => updateField("undecodableWords", e.target.value)}
                        />
                    </label>

                    <label>
                        <span className="label-text">Made-up Words</span>
                        <input
                            type="number" min="0"
                            value={learner.madeUpWords}
                            onChange={(e) => updateField("madeUpWords", e.target.value)}
                        />
                    </label>

                    <label>
                        <span className="label-text">Story Reading</span>
                        <input
                            type="number" min="0"
                            value={learner.storyReading}
                            onChange={(e) => updateField("storyReading", e.target.value)}
                        />
                    </label>

                    <label>
                        <span className="label-text">Reading Comprehension</span>
                        <input
                            type="number" min="0"
                            value={learner.readingComprehension}
                            onChange={(e) => updateField("readingComprehension", e.target.value)}
                        />
                    </label>

                    <label className="full-width">
                        <span className="label-text">Fluency Level</span>
                        <select
                            value={learner.fluencyLevel}
                            onChange={(e) => updateField("fluencyLevel", e.target.value)}
                        >
                            <option value="Non-Reader">Non-Reader</option>
                            <option value="Letter Reader">Letter Reader</option>
                            <option value="Syllable Reader">Syllable Reader</option>
                            <option value="Word Reader">Word Reader</option>
                            <option value="Story Reader">Story Reader</option>
                        </select>
                    </label>

                    <div className="full-width action-row mt-4">
                        <button type="button" className="button button-ghost" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="button">
                            Save & Add Next
                        </button>
                    </div>
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
