"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  AssessmentRecord,
  OnlineTrainingEventRecord,
  ParticipantRole,
  TrainingSessionRecord,
} from "@/lib/types";

type ParticipantDraft = {
  id: number;
  name: string;
  role: ParticipantRole;
  phone: string;
  email: string;
};

type Metric = {
  label: string;
  value: number;
};

function createParticipant(id: number): ParticipantDraft {
  return {
    id,
    name: "",
    role: "Classroom teacher",
    phone: "",
    email: "",
  };
}

interface TrainingPortalManagerProps {
  initialSessions: TrainingSessionRecord[];
  initialAssessments: AssessmentRecord[];
  initialOnlineEvents: OnlineTrainingEventRecord[];
  initialMetrics: Metric[];
}

export function TrainingPortalManager({
  initialSessions,
  initialAssessments,
  initialOnlineEvents,
  initialMetrics,
}: TrainingPortalManagerProps) {
  const [participants, setParticipants] = useState<ParticipantDraft[]>([
    createParticipant(1),
  ]);
  const [nextParticipantId, setNextParticipantId] = useState(2);

  const [sessions, setSessions] = useState(initialSessions);
  const [assessments, setAssessments] = useState(initialAssessments);
  const [onlineEvents, setOnlineEvents] = useState(initialOnlineEvents);
  const [metrics, setMetrics] = useState(initialMetrics);

  const [trainingStatus, setTrainingStatus] = useState("");
  const [assessmentStatus, setAssessmentStatus] = useState("");
  const [onlineStatus, setOnlineStatus] = useState("");
  const [savingTraining, setSavingTraining] = useState(false);
  const [savingAssessment, setSavingAssessment] = useState(false);
  const [savingOnline, setSavingOnline] = useState(false);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  function addParticipant() {
    setParticipants((prev) => [...prev, createParticipant(nextParticipantId)]);
    setNextParticipantId((id) => id + 1);
  }

  function removeParticipant(id: number) {
    setParticipants((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : prev));
  }

  function updateParticipant(
    id: number,
    key: keyof Omit<ParticipantDraft, "id">,
    value: string,
  ) {
    setParticipants((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [key]: value } : item)),
    );
  }

  async function refreshMetrics() {
    const response = await fetch("/api/impact");
    if (!response.ok) {
      return;
    }

    const data = (await response.json()) as { metrics?: Metric[] };

    if (data.metrics) {
      setMetrics(data.metrics);
    }
  }

  async function submitTraining(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingTraining(true);
    setTrainingStatus("Saving training session...");

    const formData = new FormData(event.currentTarget);

    if (participants.some((item) => !item.name || !item.phone || !item.email)) {
      setSavingTraining(false);
      setTrainingStatus("Every participant needs name, phone, and email.");
      return;
    }

    const payload = {
      schoolName: String(formData.get("schoolName") ?? ""),
      district: String(formData.get("district") ?? ""),
      subCounty: String(formData.get("subCounty") ?? ""),
      parish: String(formData.get("parish") ?? ""),
      village: String(formData.get("village") ?? ""),
      sessionDate: String(formData.get("sessionDate") ?? ""),
      participants: participants.map((item) => ({
        name: item.name,
        role: item.role,
        phone: item.phone,
        email: item.email,
      })),
    };

    try {
      const response = await fetch("/api/portal/training-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Could not save training session.");
      }

      const data = (await response.json()) as {
        session: TrainingSessionRecord;
      };

      setSessions((prev) => [data.session, ...prev].slice(0, 20));
      setParticipants([createParticipant(1)]);
      setNextParticipantId(2);
      event.currentTarget.reset();
      setTrainingStatus("Training session saved successfully.");
      await refreshMetrics();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not save training session.";
      setTrainingStatus(message);
    } finally {
      setSavingTraining(false);
    }
  }

  async function submitAssessment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingAssessment(true);
    setAssessmentStatus("Saving assessment data...");

    const formData = new FormData(event.currentTarget);
    const payload = {
      schoolName: String(formData.get("schoolName") ?? ""),
      district: String(formData.get("district") ?? ""),
      subCounty: String(formData.get("subCounty") ?? ""),
      parish: String(formData.get("parish") ?? ""),
      village: String(formData.get("village") ?? ""),
      learnersAssessed: Number(formData.get("learnersAssessed") ?? 0),
      storiesPublished: Number(formData.get("storiesPublished") ?? 0),
      assessmentDate: String(formData.get("assessmentDate") ?? ""),
    };

    try {
      const response = await fetch("/api/portal/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Could not save assessment record.");
      }

      const data = (await response.json()) as {
        assessment: AssessmentRecord;
      };

      setAssessments((prev) => [data.assessment, ...prev].slice(0, 20));
      event.currentTarget.reset();
      setAssessmentStatus("Assessment record saved successfully.");
      await refreshMetrics();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not save assessment record.";
      setAssessmentStatus(message);
    } finally {
      setSavingAssessment(false);
    }
  }

  async function submitOnlineTraining(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingOnline(true);
    setOnlineStatus("Scheduling online training...");

    const formData = new FormData(event.currentTarget);
    const attendeeLines = String(formData.get("attendeeEmails") ?? "")
      .split(/[\n,;]/)
      .map((item) => item.trim())
      .filter(Boolean);

    const payload = {
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? ""),
      audience: String(formData.get("audience") ?? ""),
      startDate: String(formData.get("startDate") ?? ""),
      startTime: String(formData.get("startTime") ?? ""),
      durationMinutes: Number(formData.get("durationMinutes") ?? 60),
      attendeeEmails: attendeeLines,
    };

    try {
      const response = await fetch("/api/portal/online-trainings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as {
        error?: string;
        event?: OnlineTrainingEventRecord;
        calendarWarning?: string;
      };

      if (!response.ok || !data.event) {
        throw new Error(data.error ?? "Could not schedule online training.");
      }

      const eventRecord = data.event;
      setOnlineEvents((prev) => [eventRecord, ...prev].slice(0, 20));
      event.currentTarget.reset();
      setOnlineStatus(
        data.calendarWarning
          ? `Online training saved. ${data.calendarWarning}`
          : "Online training scheduled successfully with calendar invite.",
      );
      await refreshMetrics();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not schedule online training.";
      setOnlineStatus(message);
    } finally {
      setSavingOnline(false);
    }
  }

  return (
    <>
      <section className="section">
        <div className="container metric-grid">
          {metrics.map((metric) => (
            <article key={metric.label}>
              <strong>{metric.value.toLocaleString()}</strong>
              <span>{metric.label}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="container split">
          <article className="card">
            <h2>Training Session Data</h2>
            <p>
              Record completed training sessions. This updates teachers trained,
              schools trained, and training session metrics.
            </p>

            <form className="form-grid" onSubmit={submitTraining}>
              <label>
                School Name
                <input name="schoolName" required />
              </label>
              <label>
                Session Date
                <input type="date" name="sessionDate" defaultValue={today} required />
              </label>

              <label>
                District
                <input name="district" required />
              </label>
              <label>
                Sub-county
                <input name="subCounty" required />
              </label>

              <label>
                Parish
                <input name="parish" required />
              </label>
              <label>
                Village (Optional)
                <input name="village" />
              </label>

              <div className="full-width participant-section">
                <h3>Participants</h3>
                {participants.map((participant) => (
                  <div className="participant-row" key={participant.id}>
                    <input
                      placeholder="Participant name"
                      value={participant.name}
                      onChange={(event) =>
                        updateParticipant(participant.id, "name", event.target.value)
                      }
                      required
                    />
                    <select
                      value={participant.role}
                      onChange={(event) =>
                        updateParticipant(participant.id, "role", event.target.value)
                      }
                      required
                    >
                      <option value="Classroom teacher">Classroom teacher</option>
                      <option value="School Leader">School Leader</option>
                    </select>
                    <input
                      placeholder="Phone number"
                      value={participant.phone}
                      onChange={(event) =>
                        updateParticipant(participant.id, "phone", event.target.value)
                      }
                      required
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      value={participant.email}
                      onChange={(event) =>
                        updateParticipant(participant.id, "email", event.target.value)
                      }
                      required
                    />
                    <button
                      className="button button-ghost"
                      type="button"
                      onClick={() => removeParticipant(participant.id)}
                      disabled={participants.length === 1}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button className="button button-ghost" type="button" onClick={addParticipant}>
                  Add participant
                </button>
              </div>

              <button className="button" type="submit" disabled={savingTraining}>
                {savingTraining ? "Saving..." : "Save training session"}
              </button>
            </form>

            {trainingStatus ? <p className="form-message success">{trainingStatus}</p> : null}
          </article>

          <article className="card">
            <h2>Assessment Data</h2>
            <p>
              Record learner assessments and stories published to update impact metrics.
            </p>

            <form className="form-grid" onSubmit={submitAssessment}>
              <label>
                School Name
                <input name="schoolName" required />
              </label>
              <label>
                Assessment Date
                <input type="date" name="assessmentDate" defaultValue={today} required />
              </label>

              <label>
                District
                <input name="district" required />
              </label>
              <label>
                Sub-county
                <input name="subCounty" required />
              </label>

              <label>
                Parish
                <input name="parish" required />
              </label>
              <label>
                Village (Optional)
                <input name="village" />
              </label>

              <label>
                Learners Assessed
                <input name="learnersAssessed" type="number" min={0} required />
              </label>
              <label>
                Stories Published
                <input name="storiesPublished" type="number" min={0} required />
              </label>

              <button className="button" type="submit" disabled={savingAssessment}>
                {savingAssessment ? "Saving..." : "Save assessment data"}
              </button>
            </form>

            {assessmentStatus ? (
              <p className="form-message success">{assessmentStatus}</p>
            ) : null}
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container card">
          <h2>Online Training Scheduler (Google Calendar + Google Meet)</h2>
          <p>
            Schedule live online sessions, send calendar invites, and generate Google Meet
            links for actual training delivery.
          </p>

          <form className="form-grid" onSubmit={submitOnlineTraining}>
            <label>
              Session Title
              <input name="title" required placeholder="Phonics Coaching Masterclass" />
            </label>
            <label>
              Audience
              <input name="audience" required placeholder="Teachers and School Leaders" />
            </label>

            <label>
              Start Date
              <input type="date" name="startDate" defaultValue={today} required />
            </label>
            <label>
              Start Time
              <input type="time" name="startTime" required />
            </label>

            <label>
              Duration (minutes)
              <input
                name="durationMinutes"
                type="number"
                min={15}
                max={720}
                defaultValue={90}
                required
              />
            </label>

            <label className="full-width">
              Description
              <textarea
                name="description"
                rows={3}
                placeholder="Agenda, preparation notes, and expected outcomes."
              />
            </label>

            <label className="full-width">
              Attendee Emails (comma, semicolon, or new line separated)
              <textarea
                name="attendeeEmails"
                rows={4}
                placeholder="teacher1@school.org, headteacher@school.org"
              />
            </label>

            <button className="button" type="submit" disabled={savingOnline}>
              {savingOnline ? "Scheduling..." : "Schedule online training"}
            </button>
          </form>

          {onlineStatus ? <p className="form-message success">{onlineStatus}</p> : null}
        </div>
      </section>

      <section className="section">
        <div className="container split">
          <article className="card">
            <h2>Recent Training Sessions</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>School</th>
                    <th>Location</th>
                    <th>Participants</th>
                    <th>Teachers</th>
                    <th>School Leaders</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.length === 0 ? (
                    <tr>
                      <td colSpan={6}>No training sessions recorded yet.</td>
                    </tr>
                  ) : (
                    sessions.map((session) => (
                      <tr key={session.id}>
                        <td>{new Date(session.sessionDate).toLocaleDateString()}</td>
                        <td>{session.schoolName}</td>
                        <td>
                          {session.district}, {session.subCounty}, {session.parish}
                        </td>
                        <td>{session.participantCount}</td>
                        <td>{session.classroomTeachers}</td>
                        <td>{session.schoolLeaders}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </article>

          <article className="card">
            <h2>Recent Assessment Records</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>School</th>
                    <th>Learners Assessed</th>
                    <th>Stories Published</th>
                  </tr>
                </thead>
                <tbody>
                  {assessments.length === 0 ? (
                    <tr>
                      <td colSpan={4}>No assessment records recorded yet.</td>
                    </tr>
                  ) : (
                    assessments.map((assessment) => (
                      <tr key={assessment.id}>
                        <td>{new Date(assessment.assessmentDate).toLocaleDateString()}</td>
                        <td>{assessment.schoolName}</td>
                        <td>{assessment.learnersAssessed.toLocaleString()}</td>
                        <td>{assessment.storiesPublished.toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container card">
          <h2>Recent Online Training Sessions</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Start</th>
                  <th>Title</th>
                  <th>Audience</th>
                  <th>Invites</th>
                  <th>Calendar</th>
                  <th>Meet</th>
                </tr>
              </thead>
              <tbody>
                {onlineEvents.length === 0 ? (
                  <tr>
                    <td colSpan={6}>No online training sessions scheduled yet.</td>
                  </tr>
                ) : (
                  onlineEvents.map((event) => (
                    <tr key={event.id}>
                      <td>{new Date(event.startDateTime).toLocaleString()}</td>
                      <td>{event.title}</td>
                      <td>{event.audience}</td>
                      <td>{event.attendeeCount}</td>
                      <td>
                        {event.calendarLink ? (
                          <a href={event.calendarLink} target="_blank" rel="noreferrer">
                            Open event
                          </a>
                        ) : (
                          "Not linked"
                        )}
                      </td>
                      <td>
                        {event.meetLink ? (
                          <a href={event.meetLink} target="_blank" rel="noreferrer">
                            Join Meet
                          </a>
                        ) : (
                          "Not available"
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}
