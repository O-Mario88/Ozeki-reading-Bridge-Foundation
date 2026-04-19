import type { EventHandler } from "../types";
import { observationSubmittedHandler } from "./observation-submitted";
import { assessmentSubmittedHandler } from "./assessment-submitted";
import { quizPassedHandler } from "./quiz-passed";
import { workflowHandlers } from "./workflow-runner";
import { notificationHandlers } from "./notification-dispatcher";

/**
 * Central handler registry. Add new handlers here; the dispatcher picks them up
 * by event type match. Order matters only within the same event type.
 *
 * Dedicated handlers run first (they encapsulate hard-coded business logic like
 * auto-certificates); the workflow runner fires after, allowing admin-defined
 * rules to extend behaviour without code changes.
 */
export const registeredHandlers: EventHandler[] = [
  observationSubmittedHandler,
  assessmentSubmittedHandler,
  quizPassedHandler,
  ...workflowHandlers,
  ...notificationHandlers,
];
