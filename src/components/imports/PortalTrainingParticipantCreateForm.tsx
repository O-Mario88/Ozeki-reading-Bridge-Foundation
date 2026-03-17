"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type TrainingLookupRow = {
  id: number;
  trainingCode: string;
  trainingTitle: string;
  startDate: string | null;
  endDate: string | null;
};

type SchoolLookupRow = {
  id: number;
  schoolCode: string;
  schoolExternalId: string | null;
  name: string;
  country: string;
  region: string;
  subRegion: string;
  district: string;
  parish: string;
};

interface PortalTrainingParticipantCreateFormProps {
  trainings: TrainingLookupRow[];
  schools: SchoolLookupRow[];
  initialTrainingId?: number | null;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}

export function PortalTrainingParticipantCreateForm({
  trainings,
  schools,
  initialTrainingId,
}: PortalTrainingParticipantCreateFormProps) {
  const router = useRouter();
  const [trainingId, setTrainingId] = useState(initialTrainingId ? String(initialTrainingId) : String(trainings[0]?.id ?? ""));
  const [schoolId, setSchoolId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [participantExternalId, setParticipantExternalId] = useState("");
  const [role, setRole] = useState("Classroom Teacher");
  const [jobTitle, setJobTitle] = useState("");
  const [sex, setSex] = useState("Female");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [attendanceStatus, setAttendanceStatus] = useState("Registered");
  const [attendedFrom, setAttendedFrom] = useState("");
  const [attendedTo, setAttendedTo] = useState("");
  const [certificateStatus, setCertificateStatus] = useState("Pending");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "idle" | "success" | "error"; message: string }>({
    kind: "idle",
    message: "",
  });

  const selectedTraining = useMemo(
    () => trainings.find((training) => String(training.id) === trainingId) ?? null,
    [trainingId, trainings],
  );
  const selectedSchool = useMemo(
    () => schools.find((school) => String(school.id) === schoolId) ?? null,
    [schoolId, schools],
  );

  function resetParticipantFields() {
    setSchoolId("");
    setFirstName("");
    setLastName("");
    setParticipantExternalId("");
    setRole("Classroom Teacher");
    setJobTitle("");
    setSex("Female");
    setPhone("");
    setEmail("");
    setAttendanceStatus("Registered");
    setAttendedFrom("");
    setAttendedTo("");
    setCertificateStatus("Pending");
    setNotes("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>, mode: "save" | "save_another") {
    event.preventDefault();
    setSaving(true);
    setFeedback({ kind: "idle", message: "" });
    try {
      const response = await fetch("/api/portal/trainings/participants", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          trainingRecordId: trainingId ? Number(trainingId) : undefined,
          participantExternalId: participantExternalId || undefined,
          firstName,
          lastName,
          role,
          jobTitle: jobTitle || undefined,
          sex,
          phone: phone || undefined,
          email: email || undefined,
          schoolId: schoolId ? Number(schoolId) : undefined,
          attendanceStatus,
          attendedFrom: attendedFrom || undefined,
          attendedTo: attendedTo || undefined,
          certificateStatus,
          notes: notes || undefined,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error?.message ?? "Failed to save participant.");
      }
      setFeedback({ kind: "success", message: "Training participant saved." });
      if (mode === "save_another") {
        resetParticipantFields();
        return;
      }
      router.push(trainingId ? `/portal/trainings/${trainingId}` : "/portal/trainings");
      router.refresh();
    } catch (error) {
      setFeedback({ kind: "error", message: getErrorMessage(error, "Failed to save participant.") });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="portal-participant-form" onSubmit={(event) => void handleSubmit(event, "save")}>
      <section className="portal-participant-form__hero">
        <div>
          <p className="portal-participant-form__eyebrow">Manual Entry</p>
          <h2>Add Training Participant</h2>
          <p>
            This form writes directly to PostgreSQL through the same participant service used by the bulk import flow.
          </p>
        </div>
        {selectedTraining ? (
          <div className="portal-participant-form__context">
            <span>Selected training</span>
            <strong>{selectedTraining.trainingCode}</strong>
            <small>{selectedTraining.trainingTitle}</small>
          </div>
        ) : null}
      </section>

      {feedback.message ? (
        <div className={`portal-participant-form__feedback portal-participant-form__feedback--${feedback.kind}`} role="status">
          {feedback.message}
        </div>
      ) : null}

      <section className="portal-participant-form__grid">
        <label>
          <span>Training</span>
          <select value={trainingId} onChange={(event) => setTrainingId(event.target.value)} required>
            <option value="">Select a training</option>
            {trainings.map((training) => (
              <option key={training.id} value={training.id}>
                {training.trainingCode} - {training.trainingTitle}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>School</span>
          <select value={schoolId} onChange={(event) => setSchoolId(event.target.value)} required>
            <option value="">Select a school</option>
            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.schoolExternalId ? `${school.schoolExternalId} - ` : ""}
                {school.name} ({school.district})
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Participant external ID</span>
          <input value={participantExternalId} onChange={(event) => setParticipantExternalId(event.target.value)} />
        </label>

        <label>
          <span>Role</span>
          <select value={role} onChange={(event) => setRole(event.target.value)} required>
            <option>Classroom Teacher</option>
            <option>Teacher</option>
            <option>School Leader</option>
            <option>Head Teacher</option>
            <option>Deputy Head Teacher</option>
            <option>Administrator</option>
            <option>Coach</option>
          </select>
        </label>

        <label>
          <span>First name</span>
          <input value={firstName} onChange={(event) => setFirstName(event.target.value)} required />
        </label>

        <label>
          <span>Last name</span>
          <input value={lastName} onChange={(event) => setLastName(event.target.value)} required />
        </label>

        <label>
          <span>Sex</span>
          <select value={sex} onChange={(event) => setSex(event.target.value)}>
            <option>Female</option>
            <option>Male</option>
            <option>Other</option>
          </select>
        </label>

        <label>
          <span>Job title</span>
          <input value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} />
        </label>

        <label>
          <span>Phone</span>
          <input value={phone} onChange={(event) => setPhone(event.target.value)} />
        </label>

        <label>
          <span>Email</span>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>

        <label>
          <span>Attendance status</span>
          <select value={attendanceStatus} onChange={(event) => setAttendanceStatus(event.target.value)}>
            <option>Registered</option>
            <option>Invited</option>
            <option>Confirmed</option>
            <option>Attended</option>
            <option>Absent</option>
            <option>Excused</option>
          </select>
        </label>

        <label>
          <span>Certificate status</span>
          <select value={certificateStatus} onChange={(event) => setCertificateStatus(event.target.value)}>
            <option>Pending</option>
            <option>Issued</option>
            <option>Not Required</option>
            <option>Rejected</option>
          </select>
        </label>

        <label>
          <span>Attended from</span>
          <input type="date" value={attendedFrom} onChange={(event) => setAttendedFrom(event.target.value)} />
        </label>

        <label>
          <span>Attended to</span>
          <input type="date" value={attendedTo} onChange={(event) => setAttendedTo(event.target.value)} />
        </label>

        <label className="portal-participant-form__notes">
          <span>Notes</span>
          <textarea rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} />
        </label>
      </section>

      {selectedSchool ? (
        <section className="portal-participant-form__school-card">
          <span>Linked school</span>
          <strong>{selectedSchool.name}</strong>
          <small>
            {[selectedSchool.country, selectedSchool.region, selectedSchool.district, selectedSchool.parish]
              .filter(Boolean)
              .join(" • ")}
          </small>
        </section>
      ) : null}

      <div className="action-row">
        <button type="submit" className="button" disabled={saving}>
          {saving ? "Saving..." : "Save Participant"}
        </button>
        <button
          type="button"
          className="button button-ghost"
          disabled={saving}
          onClick={(event) => void handleSubmit(event as unknown as FormEvent<HTMLFormElement>, "save_another")}
        >
          Save and Add Another
        </button>
      </div>

      <style jsx>{`
        .portal-participant-form {
          display: grid;
          gap: 1rem;
        }
        .portal-participant-form__hero,
        .portal-participant-form__grid,
        .portal-participant-form__school-card {
          border: 1px solid rgba(78, 108, 136, 0.22);
          border-radius: 22px;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(244, 247, 250, 0.95));
          box-shadow: 0 20px 48px rgba(23, 39, 65, 0.08);
          padding: 1.2rem;
        }
        .portal-participant-form__hero {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          align-items: flex-start;
        }
        .portal-participant-form__eyebrow {
          margin: 0 0 0.2rem;
          font-size: 0.82rem;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          color: #5c6b7d;
        }
        .portal-participant-form__hero h2 {
          margin: 0;
          font-size: 1.85rem;
        }
        .portal-participant-form__hero p,
        .portal-participant-form__context small,
        .portal-participant-form__school-card small {
          margin: 0.45rem 0 0;
          color: #5c6b7d;
        }
        .portal-participant-form__context,
        .portal-participant-form__school-card {
          display: grid;
          gap: 0.2rem;
        }
        .portal-participant-form__context span,
        .portal-participant-form__school-card span {
          color: #607080;
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .portal-participant-form__context strong,
        .portal-participant-form__school-card strong {
          font-size: 1.08rem;
          color: #0f172a;
        }
        .portal-participant-form__feedback {
          padding: 0.9rem 1rem;
          border-radius: 16px;
          font-weight: 600;
        }
        .portal-participant-form__feedback--error {
          background: rgba(255, 244, 230, 0.96);
          color: #8a5c00;
        }
        .portal-participant-form__feedback--success {
          background: rgba(234, 247, 238, 0.96);
          color: #166534;
        }
        .portal-participant-form__grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 0.9rem;
        }
        .portal-participant-form__grid label {
          display: grid;
          gap: 0.4rem;
        }
        .portal-participant-form__grid span {
          color: #425466;
          font-size: 0.9rem;
          font-weight: 700;
        }
        .portal-participant-form__grid :is(input, select, textarea) {
          width: 100%;
          border-radius: 14px;
          border: 1px solid rgba(148, 163, 184, 0.5);
          background: rgba(255, 255, 255, 0.95);
          padding: 0.8rem 0.95rem;
          font: inherit;
          color: #0f172a;
        }
        .portal-participant-form__notes {
          grid-column: 1 / -1;
        }
        @media (max-width: 900px) {
          .portal-participant-form__hero {
            flex-direction: column;
          }
        }
      `}</style>
    </form>
  );
}
