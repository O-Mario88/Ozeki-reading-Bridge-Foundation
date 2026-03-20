"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import type { OnlineTrainingEventRecord } from "@/lib/types";
import { FormModal } from "@/components/forms";
import { submitJsonWithOfflineQueue } from "@/lib/offline-form-queue";
import { EventSignUpForm } from "@/components/portal/EventSignUpForm";

interface PortalEventsManagerProps {
  initialEvents: OnlineTrainingEventRecord[];
}

function formatDateTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(parsed);
}

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

export function PortalEventsManager({ initialEvents }: PortalEventsManagerProps) {
  const [events, setEvents] = useState(initialEvents);
  const [saving, setSaving] = useState(false);
  const [attendanceSaving, setAttendanceSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
  const [isSignUpOpen, setIsSignUpOpen] = useState(false);
  const [signUpEventId, setSignUpEventId] = useState<number | null>(null);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatus("Scheduling event and generating invite...");

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
      const result = await submitJsonWithOfflineQueue<{
        error?: string;
        event?: OnlineTrainingEventRecord;
        calendarWarning?: string;
      }>("/api/portal/online-trainings", {
        payload,
        label: "Portal event scheduling",
      });

      if (result.queued) {
        event.currentTarget.reset();
        setIsScheduleOpen(false);
        setStatus("No internet connection. Event saved offline and queued for sync.");
        return;
      }

      const data = result.data ?? {};

      if (!result.response.ok || !data.event) {
        throw new Error(data.error ?? "Could not schedule event.");
      }

      setEvents((prev) => [data.event as OnlineTrainingEventRecord, ...prev]);
      event.currentTarget.reset();
      setIsScheduleOpen(false);
      setStatus(
        data.calendarWarning
          ? `Event saved. ${data.calendarWarning}`
          : "Event scheduled. Google Calendar invite and Meet link generated.",
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not schedule event.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAttendanceSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttendanceSaving(true);
    setStatus("Saving online attendance and session outcomes...");

    const formData = new FormData(event.currentTarget);
    const eventId = Number(formData.get("eventId"));
    const payload = {
      onlineTeachersTrained: Number(formData.get("onlineTeachersTrained") ?? 0),
      onlineSchoolLeadersTrained: Number(formData.get("onlineSchoolLeadersTrained") ?? 0),
      attendeeCount: Number(formData.get("attendeeCount") ?? 0),
      recordingUrl: String(formData.get("recordingUrl") ?? "").trim(),
      chatSummary: String(formData.get("chatSummary") ?? "").trim(),
    };

    try {
      const result = await submitJsonWithOfflineQueue<{
        error?: string;
        event?: OnlineTrainingEventRecord;
      }>(`/api/portal/online-trainings/${eventId}`, {
        method: "PATCH",
        payload,
        label: "Portal online attendance update",
      });

      if (result.queued) {
        setIsAttendanceOpen(false);
        setStatus("No internet connection. Attendance update saved offline and queued for sync.");
        return;
      }

      const data = result.data ?? {};

      if (!result.response.ok || !data.event) {
        throw new Error(data.error ?? "Could not save attendance.");
      }

      setEvents((prev) =>
        prev.map((item) => (item.id === data.event?.id ? (data.event as OnlineTrainingEventRecord) : item)),
      );
      setIsAttendanceOpen(false);
      setStatus("Online attendance, recording link, and session chat summary saved.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save attendance.");
    } finally {
      setAttendanceSaving(false);
    }
  }

  return (
    <div className="portal-grid">
      <section className="card">
        <h2>Schedule Event / Webinar</h2>
        <p>
          This form schedules live events from the dashboard and creates Google
          Calendar invites with Google Meet links for online delivery.
        </p>
        <div className="action-row portal-form-actions">
          <button className="button" type="button" onClick={() => setIsScheduleOpen(true)}>
            + Schedule Event
          </button>
        </div>
        {status ? <p className="form-message success">{status}</p> : null}
      </section>

      <section className="card">
        <h2>Recent Scheduled Events</h2>
        {events.length === 0 ? (
          <p>No events scheduled yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Start</th>
                  <th>Audience</th>
                  <th>Attendees</th>
                  <th>Teachers</th>
                  <th>Leaders</th>
                  <th>Links</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map((item) => (
                  <tr key={item.id}>
                    <td>{item.title}</td>
                    <td>{formatDateTime(item.startDateTime)}</td>
                    <td>{item.audience}</td>
                    <td>{item.attendeeCount}</td>
                    <td>{item.onlineTeachersTrained}</td>
                    <td>{item.onlineSchoolLeadersTrained}</td>
                    <td>
                      <div className="action-row">
                        {item.calendarLink ? (
                          <a href={item.calendarLink} target="_blank" rel="noreferrer">
                            Calendar
                          </a>
                        ) : (
                          <span>-</span>
                        )}
                        {item.meetLink ? (
                          <a href={item.meetLink} target="_blank" rel="noreferrer">
                            Meet
                          </a>
                        ) : (
                          <span className="badge badge-warning" title="Google Meet link not available">No Meet</span>
                        )}
                        <Link href={`/portal/events/${item.id}/live`}>In-app room</Link>
                      </div>
                    </td>
                    <td>
                      <button
                        className="button button-ghost"
                        type="button"
                        style={{ fontSize: "0.8rem", padding: "0.2rem 0.5rem" }}
                        onClick={() => {
                          setSignUpEventId(item.id);
                          setIsSignUpOpen(true);
                        }}
                      >
                        Sign Up School
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <h2>Capture Webinar Outcomes</h2>
        <p>
          Update attended teachers/leaders, attach recording URL, and store meeting chat notes for
          dashboard KPIs.
        </p>
        {events.length === 0 ? (
          <p>Schedule an event first to capture outcomes.</p>
        ) : (
          <div className="action-row portal-form-actions">
            <button className="button" type="button" onClick={() => setIsAttendanceOpen(true)}>
              + Capture Outcomes
            </button>
          </div>
        )}
      </section>

      <FormModal
        open={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
        title="Schedule Event / Webinar"
        description="Create a live event and generate calendar + Google Meet links."
        closeLabel="Close"
        maxWidth="920px"
      >
        <form className="form-grid portal-form-grid" onSubmit={handleSubmit}>
          <label>
            <span className="portal-field-label">Event Title</span>
            <input name="title" required minLength={3} placeholder="e.g. Monthly Fluency Webinar" />
          </label>
          <label>
            <span className="portal-field-label">Audience</span>
            <input
              name="audience"
              required
              minLength={2}
              placeholder="Teachers, school leaders, district teams..."
            />
          </label>
          <label>
            <span className="portal-field-label">Date</span>
            <input name="startDate" type="date" defaultValue={today} required />
          </label>
          <label>
            <span className="portal-field-label">Start Time</span>
            <input name="startTime" type="time" defaultValue="10:00" required />
          </label>
          <label>
            <span className="portal-field-label">Duration (minutes)</span>
            <input name="durationMinutes" type="number" min={15} max={720} defaultValue={90} required />
          </label>
          <label className="full-width">
            <span className="portal-field-label">Description</span>
            <textarea
              name="description"
              rows={4}
              placeholder="Objectives, agenda, and any joining notes."
            />
          </label>
          <label className="full-width">
            <span className="portal-field-label">Attendee Emails (optional)</span>
            <textarea
              name="attendeeEmails"
              rows={4}
              placeholder="one@email.com, two@email.com or one per line"
            />
            <small className="portal-field-help">
              Staff workspace recipients are added automatically for accountability.
            </small>
          </label>
          <div className="full-width action-row portal-form-actions">
            <button className="button" type="submit" disabled={saving}>
              {saving ? "Scheduling..." : "Schedule event"}
            </button>
            <button
              className="button button-ghost"
              type="button"
              disabled={saving}
              onClick={() => setIsScheduleOpen(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      </FormModal>

      <FormModal
        open={isAttendanceOpen}
        onClose={() => setIsAttendanceOpen(false)}
        title="Capture Webinar Outcomes"
        description="Record attendance, online training totals, and session artifacts."
        closeLabel="Close"
        maxWidth="920px"
      >
        <form className="form-grid portal-form-grid" onSubmit={handleAttendanceSubmit}>
          <label>
            <span className="portal-field-label">Event</span>
            <select name="eventId" required defaultValue={events[0]?.id}>
              {events.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title} ({formatDate(item.startDateTime)})
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="portal-field-label">Teachers Trained (Online)</span>
            <input name="onlineTeachersTrained" type="number" min={0} defaultValue={0} required />
          </label>
          <label>
            <span className="portal-field-label">School Leaders Trained (Online)</span>
            <input
              name="onlineSchoolLeadersTrained"
              type="number"
              min={0}
              defaultValue={0}
              required
            />
          </label>
          <label>
            <span className="portal-field-label">Total Attendance</span>
            <input name="attendeeCount" type="number" min={0} defaultValue={0} required />
          </label>
          <label className="full-width">
            <span className="portal-field-label">Recording URL (Google Meet recording link)</span>
            <input name="recordingUrl" type="url" placeholder="https://..." />
          </label>
          <label className="full-width">
            <span className="portal-field-label">Chat Summary / Key Discussion Notes</span>
            <textarea name="chatSummary" rows={4} placeholder="Key chat Q&A and action points." />
          </label>
          <div className="full-width action-row portal-form-actions">
            <button className="button" type="submit" disabled={attendanceSaving}>
              {attendanceSaving ? "Saving..." : "Save outcomes"}
            </button>
            <button
              className="button button-ghost"
              type="button"
              disabled={attendanceSaving}
              onClick={() => setIsAttendanceOpen(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      </FormModal>

      <EventSignUpForm
        events={events}
        open={isSignUpOpen}
        onClose={() => setIsSignUpOpen(false)}
        preselectedEventId={signUpEventId}
        onRegistered={() => {
          setStatus("School registered for event successfully.");
        }}
      />
    </div>
  );
}
