import {
  createNotificationPostgres,
  listSubscribersForEventPostgres,
} from "@/lib/server/postgres/repositories/notifications";
import type { EventHandler, PlatformEventRow, PlatformEventType } from "../types";

function buildNotification(event: PlatformEventRow): { title: string; body: string; actionHref: string } {
  const p = event.payload;
  switch (event.eventType) {
    case "observation.submitted":
      return {
        title: `New observation: ${String(p.teacherName ?? "teacher")}`,
        body: `Rating: ${String(p.rating ?? "—")} at school #${String(p.schoolId ?? "?")}`,
        actionHref: event.entityId ? `/portal/observations/${event.entityId}` : "/portal/observations",
      };
    case "assessment.submitted":
      return {
        title: `Assessment submitted (${String(p.assessmentType ?? "unknown")})`,
        body: `School #${String(p.schoolId ?? "?")}`,
        actionHref: p.schoolId ? `/portal/schools/${String(p.schoolId)}` : "/portal/assessments",
      };
    case "quiz.passed":
      return {
        title: `Teacher passed a lesson quiz`,
        body: `Score: ${String(p.scorePct ?? "?")}%`,
        actionHref: `/portal/my-learning?userId=${String(p.userId ?? "")}`,
      };
    case "school.flagged.at_risk":
      return {
        title: `School flagged at-risk`,
        body: `School #${String(p.schoolId ?? "?")} needs priority support`,
        actionHref: p.schoolId ? `/portal/schools/${String(p.schoolId)}` : "/portal/command-center",
      };
    case "coaching.visit.logged":
      return {
        title: `Coaching visit recorded`,
        body: `at school #${String(p.schoolId ?? "?")}`,
        actionHref: p.schoolId ? `/portal/schools/${String(p.schoolId)}` : "/portal/visits",
      };
    case "donation.completed":
      return {
        title: `Donation received`,
        body: `${String(p.currency ?? "UGX")} ${Number(p.amount ?? 0).toLocaleString()}`,
        actionHref: "/portal/finance",
      };
    case "sponsorship.completed":
      return {
        title: `Sponsorship received`,
        body: `${String(p.donorName ?? "Donor")} — ${String(p.currency ?? "UGX")} ${Number(p.amount ?? 0).toLocaleString()}`,
        actionHref: "/portal/finance",
      };
    case "support.request.created":
      return {
        title: `New support request`,
        body: String(p.subject ?? "Incoming inquiry"),
        actionHref: "/portal/support-requests",
      };
    default:
      return {
        title: `Event: ${event.eventType}`,
        body: JSON.stringify(event.payload).slice(0, 200),
        actionHref: "/portal/command-center",
      };
  }
}

function makeNotificationHandler(eventType: PlatformEventType): EventHandler {
  return {
    name: `notification-dispatcher.${eventType}`,
    eventType,
    async handle(event) {
      try {
        const subscribers = await listSubscribersForEventPostgres(event.eventType, "in_app");
        if (subscribers.length === 0) return { status: "skipped", reason: "no subscribers" };
        const notif = buildNotification(event);
        for (const userId of subscribers) {
          await createNotificationPostgres({
            userId,
            eventId: event.id,
            category: event.eventType,
            title: notif.title,
            body: notif.body,
            actionHref: notif.actionHref,
          });
        }
        return { status: "ok", detail: { delivered: subscribers.length } };
      } catch (err) {
        return { status: "error", error: err instanceof Error ? err.message : String(err) };
      }
    },
  };
}

export const notificationHandlers: EventHandler[] = [
  makeNotificationHandler("observation.submitted"),
  makeNotificationHandler("assessment.submitted"),
  makeNotificationHandler("quiz.passed"),
  makeNotificationHandler("school.flagged.at_risk"),
  makeNotificationHandler("coaching.visit.logged"),
  makeNotificationHandler("donation.completed"),
  makeNotificationHandler("sponsorship.completed"),
  makeNotificationHandler("support.request.created"),
];
