import Link from "next/link";
import { notFound } from "next/navigation";
import { PortalShell } from "@/components/portal/PortalShell";
import { getOnlineTrainingEventById } from "@/lib/db";
import { requirePortalStaffUser } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parseId(value: string) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }
  return id;
}

export default async function PortalEventLivePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePortalStaffUser();
  const { id } = await params;
  const eventId = parseId(id);
  if (!eventId) {
    notFound();
  }

  const event = getOnlineTrainingEventById(eventId);
  if (!event) {
    notFound();
  }

  return (
    <PortalShell
      user={user}
      activeHref="/portal/events"
      title={`Live Session: ${event.title}`}
      description="Run the webinar in-app, launch Google Meet, and keep attendance/reporting in one workflow."
    >
      <div className="portal-grid">
        <section className="card">
          <h2>Session Details</h2>
          <p>
            <strong>Start:</strong> {formatDateTime(event.startDateTime)}
          </p>
          <p>
            <strong>Audience:</strong> {event.audience}
          </p>
          <p>
            <strong>Description:</strong> {event.description || "No description provided."}
          </p>
          <div className="action-row">
            {event.meetLink ? (
              <a className="button" href={event.meetLink} target="_blank" rel="noreferrer">
                Open Google Meet
              </a>
            ) : null}
            {event.calendarLink ? (
              <a className="button button-ghost" href={event.calendarLink} target="_blank" rel="noreferrer">
                Open Calendar Event
              </a>
            ) : null}
            <Link className="button button-ghost" href="/portal/events">
              Back to Events
            </Link>
          </div>
        </section>

        <section className="card">
          <h2>In-App Meeting Window</h2>
          {event.meetLink ? (
            <>
              <p>
                If Meet embedding is blocked by browser policy, use the <strong>Open Google
                Meet</strong> button above. Attendance and outcomes remain tracked in the dashboard.
              </p>
              <iframe
                src={event.meetLink}
                title={`Google Meet: ${event.title}`}
                style={{ width: "100%", minHeight: "560px", border: "1px solid #d6d6d6" }}
                allow="camera; microphone; fullscreen; display-capture"
              />
            </>
          ) : (
            <p>
              No Google Meet link found for this session. Recreate the event from the scheduler to
              generate a Meet room.
            </p>
          )}
        </section>

        <section className="card">
          <h2>Session Evidence Tracking</h2>
          <p>
            Online teachers trained: <strong>{event.onlineTeachersTrained}</strong>
          </p>
          <p>
            Online leaders trained: <strong>{event.onlineSchoolLeadersTrained}</strong>
          </p>
          <p>
            Attendance captured:{" "}
            <strong>
              {event.attendanceCapturedAt ? formatDateTime(event.attendanceCapturedAt) : "Not yet"}
            </strong>
          </p>
          <p>
            Recording:{" "}
            {event.recordingUrl ? (
              <a href={event.recordingUrl} target="_blank" rel="noreferrer">
                Open recording
              </a>
            ) : (
              "Not yet added"
            )}
          </p>
          <p>
            Chat summary: {event.chatSummary || "No chat summary captured yet."}
          </p>
        </section>
      </div>
    </PortalShell>
  );
}
