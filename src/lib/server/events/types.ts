/**
 * Platform event type registry.
 * Every write endpoint publishes one of these; handlers react.
 */

export type PlatformEventType =
  | "observation.submitted"
  | "observation.archived"
  | "assessment.submitted"
  | "assessment.batch.submitted"
  | "quiz.passed"
  | "quiz.attempted"
  | "lesson.completed"
  | "certificate.issued"
  | "training.session.recorded"
  | "training.attendance.added"
  | "coaching.visit.logged"
  | "donation.completed"
  | "sponsorship.completed"
  | "service.payment.completed"
  | "school.graduated"
  | "support.request.created"
  | "school.flagged.at_risk"
  | "aggregate.refresh.requested";

export type PlatformEventInput = {
  eventType: PlatformEventType;
  actorUserId?: number | null;
  entityType?: string;
  entityId?: string | number;
  payload?: Record<string, unknown>;
};

export type PlatformEventRow = {
  id: number;
  eventType: PlatformEventType;
  occurredAt: string;
  actorUserId: number | null;
  entityType: string | null;
  entityId: string | null;
  payload: Record<string, unknown>;
  status: "pending" | "processing" | "completed" | "failed" | "skipped";
  processedAt: string | null;
  errorMessage: string | null;
  retryCount: number;
  handlerResults: Array<{ handler: string; status: string; ms: number; result?: unknown; error?: string }>;
};

export type HandlerResult =
  | { status: "ok"; detail?: Record<string, unknown> }
  | { status: "skipped"; reason: string }
  | { status: "error"; error: string };

export type EventHandler = {
  name: string;
  eventType: PlatformEventType;
  handle: (event: PlatformEventRow) => Promise<HandlerResult>;
};
