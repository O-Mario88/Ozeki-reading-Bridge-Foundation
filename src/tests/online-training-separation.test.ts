import assert from "node:assert/strict";
import test from "node:test";
import { mapTrainingSessionToEventRecord } from "../lib/training-db";
import type { OnlineTrainingSessionRecord } from "../lib/types";

function buildSession(overrides: Partial<OnlineTrainingSessionRecord> = {}): OnlineTrainingSessionRecord {
  return {
    id: 42,
    title: "Monthly Literacy Webinar",
    agenda: "Phonics routines and fluency checks",
    objectives: "Strengthen classroom routines",
    description: "Google Meet session for district literacy leads.",
    audience: "Teachers and school leaders",
    programTags: JSON.stringify(["online-training"]),
    attendeeEmails: JSON.stringify(["staff@ozekiread.org"]),
    scopeType: "country",
    scopeId: null,
    startTime: "2026-03-12T10:00:00Z",
    endTime: "2026-03-12T11:30:00Z",
    timezone: "Africa/Kampala",
    hostUserId: 3,
    attendeeCount: 18,
    onlineTeachersTrained: 15,
    onlineSchoolLeadersTrained: 3,
    calendarEventId: "calendar-123",
    calendarLink: "https://calendar.google.com/event?eid=123",
    meetJoinUrl: "https://meet.google.com/abc-defg-hij",
    conferenceRecordId: "conferenceRecords/123",
    recordingUrl: "https://drive.google.com/file/d/123/view",
    chatSummary: "Shared follow-up questions and coaching actions.",
    attendanceCapturedAt: "2026-03-12T12:00:00Z",
    status: "completed",
    visibility: "public",
    createdByUserId: 3,
    createdAt: "2026-03-12T09:00:00Z",
    updatedAt: "2026-03-12T12:00:00Z",
    schoolName: "",
    district: "",
    subCounty: "",
    parish: "",
    region: "",
    participants: [],
    resources: [],
    artifacts: [],
    ...overrides,
  };
}

test("online training event view maps from canonical session record", () => {
  const event = mapTrainingSessionToEventRecord(buildSession());

  assert.equal(event.id, 42);
  assert.equal(event.title, "Monthly Literacy Webinar");
  assert.equal(event.description, "Google Meet session for district literacy leads.");
  assert.equal(event.audience, "Teachers and school leaders");
  assert.equal(event.durationMinutes, 90);
  assert.equal(event.attendeeCount, 18);
  assert.equal(event.onlineTeachersTrained, 15);
  assert.equal(event.onlineSchoolLeadersTrained, 3);
  assert.equal(event.calendarLink, "https://calendar.google.com/event?eid=123");
  assert.equal(event.meetLink, "https://meet.google.com/abc-defg-hij");
  assert.equal(event.recordingUrl, "https://drive.google.com/file/d/123/view");
  assert.equal(event.attendanceCapturedAt, "2026-03-12T12:00:00Z");
});

test("online training event view falls back to a default audience label", () => {
  const event = mapTrainingSessionToEventRecord(
    buildSession({
      audience: null,
      description: null,
      objectives: null,
    }),
  );

  assert.equal(event.audience, "Teachers and school leaders");
  assert.equal(event.description, "Phonics routines and fluency checks");
});
