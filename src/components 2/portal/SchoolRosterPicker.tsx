"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

/* ── Types ── */

export interface RosterTeacher {
    teacherUid: string;
    fullName: string;
    gender: "Male" | "Female";
    isReadingTeacher: boolean;
    phone: string | null;
    status: string;
}

export interface RosterLearner {
    learnerUid: string;
    fullName: string;
    gender: "Boy" | "Girl" | "Other";
    age: number;
    classGrade: string;
}

export type RosterEntry = RosterTeacher | RosterLearner;

interface SchoolRosterPickerProps {
    schoolId: number | null;
    schoolName?: string;
    participantType: "teacher" | "learner";
    selectedUid: string;
    onSelect: (entry: RosterEntry | null) => void;
    /** Optional label override */
    label?: string;
}

/* ── Add-to-roster modal form state ── */

interface AddTeacherForm {
    fullName: string;
    gender: "Male" | "Female" | "";
    isReadingTeacher: boolean;
    phone: string;
}

interface AddLearnerForm {
    fullName: string;
    gender: "Boy" | "Girl" | "Other" | "";
    age: string;
    classGrade: string;
}

/* ── Component ── */

export function SchoolRosterPicker({
    schoolId,
    schoolName,
    participantType,
    selectedUid,
    onSelect,
    label,
}: SchoolRosterPickerProps) {
    const [roster, setRoster] = useState<RosterEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [showAddModal, setShowAddModal] = useState(false);
    const [addError, setAddError] = useState("");
    const [adding, setAdding] = useState(false);

    // Teacher add form
    const [teacherForm, setTeacherForm] = useState<AddTeacherForm>({
        fullName: "",
        gender: "",
        isReadingTeacher: true,
        phone: "",
    });

    // Learner add form
    const [learnerForm, setLearnerForm] = useState<AddLearnerForm>({
        fullName: "",
        gender: "",
        age: "",
        classGrade: "",
    });

    /* ── Fetch roster when schoolId changes ── */
    const fetchRoster = useCallback(async () => {
        if (!schoolId) {
            setRoster([]);
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(
                `/api/portal/schools/roster?schoolId=${schoolId}&type=${participantType}`,
            );
            if (res.ok) {
                const data = await res.json();
                setRoster(data.roster ?? []);
            }
        } catch {
            /* ignore */
        } finally {
            setLoading(false);
        }
    }, [schoolId, participantType]);

    useEffect(() => {
        fetchRoster();
    }, [fetchRoster]);

    /* ── Filtered roster ── */
    const filtered = useMemo(() => {
        if (!searchQuery.trim()) return roster;
        const q = searchQuery.toLowerCase();
        return roster.filter((entry) => {
            if ("fullName" in entry && entry.fullName.toLowerCase().includes(q)) return true;
            if ("classGrade" in entry && (entry as RosterLearner).classGrade.toLowerCase().includes(q))
                return true;
            return false;
        });
    }, [roster, searchQuery]);

    /* ── Get UID helper ── */
    const getUid = (entry: RosterEntry) =>
        "teacherUid" in entry ? entry.teacherUid : (entry as RosterLearner).learnerUid;

    /* ── Currently selected entry ── */
    const selectedEntry = roster.find((e) => getUid(e) === selectedUid) ?? null;

    /* ── Add to roster ── */
    const handleAdd = async () => {
        setAddError("");
        setAdding(true);
        try {
            let body: Record<string, unknown>;
            if (participantType === "learner") {
                if (!learnerForm.fullName.trim() || !learnerForm.gender || !learnerForm.age || !learnerForm.classGrade) {
                    setAddError("Fill in all fields.");
                    setAdding(false);
                    return;
                }
                body = {
                    schoolId,
                    type: "learner",
                    fullName: learnerForm.fullName,
                    gender: learnerForm.gender,
                    age: Number(learnerForm.age),
                    classGrade: learnerForm.classGrade,
                };
            } else {
                if (!teacherForm.fullName.trim() || !teacherForm.gender) {
                    setAddError("Name and gender are required.");
                    setAdding(false);
                    return;
                }
                body = {
                    schoolId,
                    type: "teacher",
                    fullName: teacherForm.fullName,
                    gender: teacherForm.gender,
                    isReadingTeacher: teacherForm.isReadingTeacher,
                    phone: teacherForm.phone || undefined,
                };
            }

            const res = await fetch("/api/portal/schools/roster", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: "Failed to add participant" }));
                setAddError(err.error || "Failed to add participant.");
                setAdding(false);
                return;
            }

            const { entry } = await res.json();
            // Refresh roster and auto-select the new entry
            await fetchRoster();
            if (entry) {
                onSelect(entry);
            }
            setShowAddModal(false);
            // Reset forms
            setTeacherForm({ fullName: "", gender: "", isReadingTeacher: true, phone: "" });
            setLearnerForm({ fullName: "", gender: "", age: "", classGrade: "" });
        } catch {
            setAddError("Network error. Try again.");
        } finally {
            setAdding(false);
        }
    };

    /* ── No school selected ── */
    if (!schoolId) {
        return (
            <div className="roster-picker roster-picker--empty">
                <label className="portal-field-label">
                    {label || (participantType === "learner" ? "Select Learner" : "Select Participant")}
                </label>
                <p className="roster-picker__hint">Select a school first to load participants.</p>
            </div>
        );
    }

    return (
        <div className="roster-picker">
            <label className="portal-field-label">
                {label || (participantType === "learner" ? "Select Learner" : "Select Participant")}
            </label>

            {/* Search + select combo */}
            <div className="roster-picker__search-row">
                <input
                    type="text"
                    className="roster-picker__search"
                    placeholder={`Search ${participantType}s by name${participantType === "learner" ? " or class" : ""}…`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {loading ? (
                <p className="roster-picker__hint">Loading roster…</p>
            ) : filtered.length > 0 ? (
                <div className="roster-picker__list">
                    {filtered.map((entry) => {
                        const uid = getUid(entry);
                        const isSelected = uid === selectedUid;
                        return (
                            <button
                                key={uid}
                                type="button"
                                className={`roster-picker__item${isSelected ? " roster-picker__item--selected" : ""}`}
                                onClick={() => onSelect(isSelected ? null : entry)}
                            >
                                <span className="roster-picker__name">{entry.fullName}</span>
                                {"classGrade" in entry ? (
                                    <span className="roster-picker__meta">
                                        {(entry as RosterLearner).classGrade} · {entry.gender} · Age {(entry as RosterLearner).age}
                                    </span>
                                ) : (
                                    <span className="roster-picker__meta">
                                        {(entry as RosterTeacher).isReadingTeacher ? "Reading Teacher" : "Teacher"} · {entry.gender}
                                    </span>
                                )}
                                {isSelected && <span className="roster-picker__check">✓</span>}
                            </button>
                        );
                    })}
                </div>
            ) : (
                <div className="roster-picker__empty">
                    <p>No matching {participantType} found in{schoolName ? ` ${schoolName}` : " this school"}.</p>
                    <button
                        type="button"
                        className="button roster-picker__add-btn"
                        onClick={() => setShowAddModal(true)}
                    >
                        + Add {participantType === "learner" ? "Learner" : "Teacher"} to School Account
                    </button>
                </div>
            )}

            {/* Always show the add button even if there are results */}
            {filtered.length > 0 && (
                <button
                    type="button"
                    className="roster-picker__add-link"
                    onClick={() => setShowAddModal(true)}
                >
                    + Add new {participantType} to school
                </button>
            )}

            {/* Selected display */}
            {selectedEntry && (
                <div className="roster-picker__selected">
                    <span>Selected: <strong>{selectedEntry.fullName}</strong></span>
                    <button type="button" className="roster-picker__clear" onClick={() => onSelect(null)}>
                        Clear
                    </button>
                </div>
            )}

            {/* ── Add-to-School-Account Modal ── */}
            {showAddModal && (
                <div className="roster-modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="roster-modal" onClick={(e) => e.stopPropagation()}>
                        <h3>
                            Add {participantType === "learner" ? "Learner" : "Teacher"} to{" "}
                            {schoolName || "School"}
                        </h3>

                        {participantType === "teacher" ? (
                            <div className="roster-modal__fields">
                                <label>
                                    Full Name *
                                    <input
                                        type="text"
                                        value={teacherForm.fullName}
                                        onChange={(e) =>
                                            setTeacherForm((p) => ({ ...p, fullName: e.target.value }))
                                        }
                                        placeholder="e.g. Sarah Akello"
                                    />
                                </label>
                                <label>
                                    Gender *
                                    <select
                                        value={teacherForm.gender}
                                        onChange={(e) =>
                                            setTeacherForm((p) => ({
                                                ...p,
                                                gender: e.target.value as "Male" | "Female" | "",
                                            }))
                                        }
                                    >
                                        <option value="">Select</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                    </select>
                                </label>
                                <label className="roster-modal__checkbox">
                                    <input
                                        type="checkbox"
                                        checked={teacherForm.isReadingTeacher}
                                        onChange={(e) =>
                                            setTeacherForm((p) => ({
                                                ...p,
                                                isReadingTeacher: e.target.checked,
                                            }))
                                        }
                                    />
                                    Reading Teacher
                                </label>
                                <label>
                                    Phone (optional)
                                    <input
                                        type="tel"
                                        value={teacherForm.phone}
                                        onChange={(e) =>
                                            setTeacherForm((p) => ({ ...p, phone: e.target.value }))
                                        }
                                        placeholder="+2567xxxxxxxx"
                                    />
                                </label>
                            </div>
                        ) : (
                            <div className="roster-modal__fields">
                                <label>
                                    Full Name *
                                    <input
                                        type="text"
                                        value={learnerForm.fullName}
                                        onChange={(e) =>
                                            setLearnerForm((p) => ({ ...p, fullName: e.target.value }))
                                        }
                                        placeholder="e.g. Acen Grace"
                                    />
                                </label>
                                <label>
                                    Gender *
                                    <select
                                        value={learnerForm.gender}
                                        onChange={(e) =>
                                            setLearnerForm((p) => ({
                                                ...p,
                                                gender: e.target.value as "Boy" | "Girl" | "Other" | "",
                                            }))
                                        }
                                    >
                                        <option value="">Select</option>
                                        <option value="Boy">Boy</option>
                                        <option value="Girl">Girl</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </label>
                                <label>
                                    Age *
                                    <input
                                        type="number"
                                        value={learnerForm.age}
                                        onChange={(e) =>
                                            setLearnerForm((p) => ({ ...p, age: e.target.value }))
                                        }
                                        min={3}
                                        max={25}
                                        placeholder="e.g. 8"
                                    />
                                </label>
                                <label>
                                    Class/Grade *
                                    <select
                                        value={learnerForm.classGrade}
                                        onChange={(e) =>
                                            setLearnerForm((p) => ({
                                                ...p,
                                                classGrade: e.target.value,
                                            }))
                                        }
                                    >
                                        <option value="">Select</option>
                                        <option value="Baby">Baby</option>
                                        <option value="Middle">Middle</option>
                                        <option value="Top">Top</option>
                                        <option value="P1">P1</option>
                                        <option value="P2">P2</option>
                                        <option value="P3">P3</option>
                                        <option value="P4">P4</option>
                                        <option value="P5">P5</option>
                                        <option value="P6">P6</option>
                                        <option value="P7">P7</option>
                                    </select>
                                </label>
                            </div>
                        )}

                        {addError && <p className="roster-modal__error">{addError}</p>}

                        <div className="roster-modal__actions">
                            <button
                                type="button"
                                className="button"
                                onClick={handleAdd}
                                disabled={adding}
                            >
                                {adding ? "Saving…" : "Save & Select"}
                            </button>
                            <button
                                type="button"
                                className="button button-ghost"
                                onClick={() => setShowAddModal(false)}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
