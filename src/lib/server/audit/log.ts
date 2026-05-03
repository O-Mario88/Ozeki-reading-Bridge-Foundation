/**
 * Ergonomic audit-log wrapper around `logAuditEventPostgres`.
 *
 * The underlying repo function takes 10 positional arguments which is why,
 * despite the audit_logs table existing for years, only ~10 of the dozens of
 * write routes ever called it. This wrapper takes a single options object,
 * pulls the actor's name out of a `PortalUser`, extracts the client IP from
 * a `Request`, JSON-stringifies before/after payloads, and never throws —
 * audit logging failure must NEVER break the underlying user action.
 *
 * Usage:
 *
 *   await auditLog({
 *     actor: user,
 *     action: "delete",
 *     targetTable: "portal_records",
 *     targetId: id,
 *     before: existingRecord,
 *     detail: reason,
 *     request,
 *   });
 *
 * Use `auditLog` for fire-and-forget audit writes alongside the user action.
 * Use `withAudit(fn, ...)` to wrap an entire repo write so before/after
 * snapshots are captured automatically.
 */

import type { PortalUser } from "@/lib/types";
import { logAuditEventPostgres } from "@/lib/server/postgres/repositories/audit";
import { logger } from "@/lib/logger";

/**
 * Canonical action verbs. Add to the union as new patterns appear; the
 * string itself is what's stored, so "create.assessment" is fine — keep
 * dot-segmented entity-typed verbs for filterability.
 */
export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "soft_delete"
  | "restore"
  | "approve"
  | "reject"
  | "void"
  | "post"
  | "issue"
  | "send"
  | "publish"
  | "unpublish"
  | "import"
  | "export"
  | "bulk_update"
  | "bulk_delete"
  | "role_change"
  | "permission_grant"
  | "permission_revoke"
  | "settings_update"
  | "wipe_data"
  | "login"
  | "logout"
  | "login_failed"
  | "mfa_verify"
  | "password_reset"
  | (string & { _brand?: "AuditAction" }); // escape hatch for one-off verbs

export interface AuditLogOptions {
  /** The acting user. May be a full `PortalUser` or a slim `{ id, name }` for system actors. */
  actor: PortalUser | { id: number; name: string };
  /** What happened. Prefer the canonical verbs in `AuditAction`. */
  action: AuditAction;
  /** The DB table the action targeted (e.g. "portal_records", "donations"). */
  targetTable: string;
  /** Primary-key of the target row, if applicable. */
  targetId?: number | string | null;
  /** Row state before the change. Auto-JSON-stringified. */
  before?: unknown;
  /** Row state after the change. Auto-JSON-stringified. */
  after?: unknown;
  /** Free-text context (e.g. delete reason, business justification). */
  detail?: string | null;
  /** The originating Request — if supplied, the client IP is extracted. */
  request?: Request | null;
  /** Override for the IP if you've already extracted it. */
  ipAddress?: string | null;
}

function actorName(actor: AuditLogOptions["actor"]): string {
  if ("name" in actor) return actor.name || "system";
  return actor.fullName || actor.email || `user#${actor.id}`;
}

function extractIp(request: Request | null | undefined): string | null {
  if (!request) return null;
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || null;
  return request.headers.get("x-real-ip") || null;
}

function safeStringify(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

/**
 * Write a single audit-log row. Safe to await OR fire-and-forget — failures
 * are logged but never thrown, so a broken audit pipeline cannot break the
 * user action that triggered it.
 */
export async function auditLog(opts: AuditLogOptions): Promise<void> {
  try {
    await logAuditEventPostgres(
      opts.actor.id,
      actorName(opts.actor),
      opts.action,
      opts.targetTable,
      opts.targetId ?? null,
      safeStringify(opts.before),
      safeStringify(opts.after),
      opts.detail ?? null,
      opts.ipAddress ?? extractIp(opts.request ?? null),
    );
  } catch (err) {
    // Audit failure must NEVER break the caller. Log and move on.
    logger.error("[audit] failed to write audit_log row", {
      action: opts.action,
      target: opts.targetTable,
      targetId: opts.targetId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Convenience wrapper for a common pattern: read the row, mutate it, log
 * before/after. Caller supplies the read function and the mutate function;
 * this wires the audit log around them.
 *
 *   const updated = await withAudit({
 *     actor: user, action: "update", targetTable: "portal_records",
 *     targetId: id, request,
 *   }, () => getPortalRecordById(id), () => updatePortalRecord(id, patch));
 */
export async function withAudit<T>(
  opts: Omit<AuditLogOptions, "before" | "after">,
  read: () => Promise<unknown>,
  mutate: () => Promise<T>,
): Promise<T> {
  let before: unknown = null;
  try {
    before = await read();
  } catch {
    // Read failure shouldn't block the mutate; before will simply be null.
  }
  const after = await mutate();
  await auditLog({ ...opts, before, after });
  return after;
}
