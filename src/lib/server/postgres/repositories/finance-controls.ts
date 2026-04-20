import { createHash } from "node:crypto";
import { queryPostgres, withPostgresClient } from "@/lib/server/postgres/client";
import type { PostgresClient } from "@/lib/server/postgres/client";

/* ────────────────────────────────────────────────────────────────────────── */
/* APPROVAL WORKFLOW                                                          */
/* ────────────────────────────────────────────────────────────────────────── */

export type ApprovalDecision = "pending" | "approved" | "rejected" | "skipped";

export type ApprovalRow = {
  id: number;
  expenseId: number;
  requiredRole: string;
  approverUserId: number | null;
  approverName: string | null;
  decision: ApprovalDecision;
  decisionAt: string | null;
  decisionNotes: string | null;
  signatureHash: string | null;
  sequenceNumber: number;
  createdAt: string;
};

export type ApprovalThreshold = {
  id: number;
  minAmountUgx: number;
  requiredRoles: string[];
  description: string | null;
  isActive: boolean;
};

async function listActiveThresholdsPostgres(): Promise<ApprovalThreshold[]> {
  const res = await queryPostgres(
    `SELECT id, min_amount_ugx, required_roles, description, is_active
     FROM finance_approval_thresholds
     WHERE is_active IS TRUE
     ORDER BY min_amount_ugx DESC`,
  );
  return res.rows.map((r) => ({
    id: Number(r.id),
    minAmountUgx: Number(r.min_amount_ugx),
    requiredRoles: (r.required_roles as string[]) ?? [],
    description: r.description ? String(r.description) : null,
    isActive: Boolean(r.is_active),
  }));
}

/**
 * Given an expense amount, returns the ordered list of roles that must
 * approve. Picks the highest threshold ≤ amount.
 */
export async function resolveRequiredRolesPostgres(amountUgx: number): Promise<string[]> {
  const thresholds = await listActiveThresholdsPostgres();
  for (const t of thresholds) {
    if (amountUgx >= t.minAmountUgx) return t.requiredRoles;
  }
  return [];
}

/**
 * Kick off the approval chain for a submitted expense. Writes one `pending`
 * row per required role. Idempotent: if the chain already exists, no-op.
 */
export async function initiateExpenseApprovalChainPostgres(expenseId: number): Promise<ApprovalRow[]> {
  const expense = await queryPostgres(
    `SELECT id, amount, created_by_user_id FROM finance_expenses WHERE id = $1`,
    [expenseId],
  );
  const exp = expense.rows[0];
  if (!exp) throw new Error(`Expense ${expenseId} not found.`);

  const amountUgx = Number(exp.amount);
  const roles = await resolveRequiredRolesPostgres(amountUgx);
  if (roles.length === 0) return [];

  await withPostgresClient(async (client) => {
    await client.query("BEGIN");
    try {
      for (let i = 0; i < roles.length; i++) {
        await client.query(
          `INSERT INTO finance_approvals (expense_id, required_role, sequence_number)
           VALUES ($1, $2, $3)
           ON CONFLICT (expense_id, required_role) DO NOTHING`,
          [expenseId, roles[i], i + 1],
        );
      }
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK").catch(() => {});
      throw e;
    }
  });

  // Audit-chain: expense.approval_chain_initiated
  await appendAuditChainPostgres({
    eventType: "expense.approval_chain_initiated",
    targetTable: "finance_expenses",
    targetId: String(expenseId),
    actorUserId: Number(exp.created_by_user_id ?? 0) || null,
    payload: { amountUgx, roles },
  });

  return listApprovalsForExpensePostgres(expenseId);
}

export async function listApprovalsForExpensePostgres(expenseId: number): Promise<ApprovalRow[]> {
  const res = await queryPostgres(
    `SELECT fa.id, fa.expense_id, fa.required_role, fa.approver_user_id,
            pu.full_name AS approver_name, fa.decision, fa.decision_at::text AS decision_at,
            fa.decision_notes, fa.signature_hash, fa.sequence_number, fa.created_at::text AS created_at
     FROM finance_approvals fa
     LEFT JOIN portal_users pu ON pu.id = fa.approver_user_id
     WHERE fa.expense_id = $1
     ORDER BY fa.sequence_number ASC`,
    [expenseId],
  );
  return res.rows.map((r) => ({
    id: Number(r.id),
    expenseId: Number(r.expense_id),
    requiredRole: String(r.required_role),
    approverUserId: r.approver_user_id != null ? Number(r.approver_user_id) : null,
    approverName: r.approver_name ? String(r.approver_name) : null,
    decision: String(r.decision) as ApprovalDecision,
    decisionAt: r.decision_at ? String(r.decision_at) : null,
    decisionNotes: r.decision_notes ? String(r.decision_notes) : null,
    signatureHash: r.signature_hash ? String(r.signature_hash) : null,
    sequenceNumber: Number(r.sequence_number),
    createdAt: String(r.created_at),
  }));
}

export type PendingApproval = {
  approvalId: number;
  expenseId: number;
  expenseNumber: string;
  amount: number;
  currency: string;
  vendorName: string | null;
  category: string | null;
  requiredRole: string;
  sequenceNumber: number;
  submittedAt: string;
};

/**
 * List approvals awaiting a given user's role. Enforces that the approver
 * is not the same person as the expense creator (DB-level SoD).
 */
export async function listPendingApprovalsForUserPostgres(userId: number, userRoles: string[]): Promise<PendingApproval[]> {
  if (userRoles.length === 0) return [];
  const res = await queryPostgres(
    `SELECT fa.id AS approval_id, fa.expense_id, fe.expense_number, fe.amount, fe.currency,
            fe.vendor_name, fe.category, fa.required_role, fa.sequence_number,
            fe.submitted_at::text AS submitted_at
     FROM finance_approvals fa
     JOIN finance_expenses fe ON fe.id = fa.expense_id
     WHERE fa.decision = 'pending'
       AND fa.required_role = ANY($1::text[])
       AND fe.created_by_user_id != $2                 -- segregation of duties
       AND NOT EXISTS (
         SELECT 1 FROM finance_approvals prior
         WHERE prior.expense_id = fa.expense_id
           AND prior.sequence_number < fa.sequence_number
           AND prior.decision != 'approved'
       )                                                -- only surface once prior steps approved
     ORDER BY fe.submitted_at ASC NULLS LAST, fa.created_at ASC
     LIMIT 200`,
    [userRoles, userId],
  );
  return res.rows.map((r) => ({
    approvalId: Number(r.approval_id),
    expenseId: Number(r.expense_id),
    expenseNumber: String(r.expense_number ?? ""),
    amount: Number(r.amount),
    currency: String(r.currency ?? "UGX"),
    vendorName: r.vendor_name ? String(r.vendor_name) : null,
    category: r.category ? String(r.category) : null,
    requiredRole: String(r.required_role),
    sequenceNumber: Number(r.sequence_number),
    submittedAt: r.submitted_at ? String(r.submitted_at) : "",
  }));
}

export class ApprovalSelfApprovalError extends Error {
  constructor() {
    super("Segregation of duties: the user who submitted this expense cannot approve it.");
    this.name = "ApprovalSelfApprovalError";
  }
}
export class ApprovalOutOfOrderError extends Error {
  constructor() {
    super("A prior approval step is still pending — cannot approve out of order.");
    this.name = "ApprovalOutOfOrderError";
  }
}
export class ApprovalNotAuthorizedError extends Error {
  constructor() {
    super("You do not hold the required role for this approval step.");
    this.name = "ApprovalNotAuthorizedError";
  }
}

function signApproval(input: {
  expenseId: number;
  requiredRole: string;
  approverUserId: number;
  decision: ApprovalDecision;
  timestamp: string;
}): string {
  const canonical = JSON.stringify(input);
  return createHash("sha256").update(canonical).digest("hex");
}

export async function decideApprovalPostgres(input: {
  approvalId: number;
  approverUserId: number;
  approverRoles: string[];
  decision: "approved" | "rejected";
  notes?: string | null;
}): Promise<ApprovalRow> {
  return withPostgresClient(async (client) => {
    await client.query("BEGIN");
    try {
      // Load the approval row with expense context for SoD + order checks.
      const load = await client.query(
        `SELECT fa.*, fe.created_by_user_id AS expense_creator
         FROM finance_approvals fa
         JOIN finance_expenses fe ON fe.id = fa.expense_id
         WHERE fa.id = $1 FOR UPDATE`,
        [input.approvalId],
      );
      const row = load.rows[0] as Record<string, unknown> | undefined;
      if (!row) throw new Error(`Approval ${input.approvalId} not found.`);

      if (Number(row.expense_creator) === input.approverUserId) {
        throw new ApprovalSelfApprovalError();
      }
      if (!input.approverRoles.includes(String(row.required_role))) {
        throw new ApprovalNotAuthorizedError();
      }
      if (String(row.decision) !== "pending") {
        throw new Error("This approval has already been decided.");
      }

      // Enforce in-order approval: all prior steps must be 'approved'.
      const prior = await client.query(
        `SELECT COUNT(*)::int AS pending_prior FROM finance_approvals
         WHERE expense_id = $1 AND sequence_number < $2 AND decision != 'approved'`,
        [row.expense_id, row.sequence_number],
      );
      if (Number((prior.rows[0] as { pending_prior: number }).pending_prior) > 0) {
        throw new ApprovalOutOfOrderError();
      }

      const now = new Date().toISOString();
      const signature = signApproval({
        expenseId: Number(row.expense_id),
        requiredRole: String(row.required_role),
        approverUserId: input.approverUserId,
        decision: input.decision,
        timestamp: now,
      });

      await client.query(
        `UPDATE finance_approvals
         SET approver_user_id = $1,
             decision = $2,
             decision_at = NOW(),
             decision_notes = $3,
             signature_hash = $4
         WHERE id = $5`,
        [input.approverUserId, input.decision, input.notes ?? null, signature, input.approvalId],
      );

      // If rejected: cascade 'skipped' to remaining pending steps.
      if (input.decision === "rejected") {
        await client.query(
          `UPDATE finance_approvals SET decision = 'skipped', decision_at = NOW()
           WHERE expense_id = $1 AND decision = 'pending'`,
          [row.expense_id],
        );
      }

      await client.query("COMMIT");

      await appendAuditChainPostgres({
        eventType: `expense.${input.decision}`,
        targetTable: "finance_approvals",
        targetId: String(input.approvalId),
        actorUserId: input.approverUserId,
        payload: {
          expenseId: Number(row.expense_id),
          requiredRole: String(row.required_role),
          signatureHash: signature,
          notes: input.notes ?? null,
        },
      }, client);

      return (await listApprovalsForExpensePostgres(Number(row.expense_id))).find((r) => r.id === input.approvalId)!;
    } catch (e) {
      await client.query("ROLLBACK").catch(() => {});
      throw e;
    }
  });
}

/**
 * Gate: all required approvals must be 'approved' before expense can be posted.
 */
export async function allApprovalsCompletePostgres(expenseId: number): Promise<boolean> {
  const res = await queryPostgres(
    `SELECT COUNT(*)::int AS required,
            COUNT(*) FILTER (WHERE decision = 'approved')::int AS approved,
            COUNT(*) FILTER (WHERE decision = 'rejected')::int AS rejected
     FROM finance_approvals WHERE expense_id = $1`,
    [expenseId],
  );
  const r = res.rows[0] as { required: number; approved: number; rejected: number };
  if (r.rejected > 0) return false;
  return r.required > 0 && r.required === r.approved;
}

/* ────────────────────────────────────────────────────────────────────────── */
/* PERIOD LOCKS                                                               */
/* ────────────────────────────────────────────────────────────────────────── */

export type PeriodLock = {
  id: number;
  periodStart: string;
  periodEnd: string;
  lockedAt: string;
  lockedByUserId: number | null;
  reason: string | null;
};

export async function listPeriodLocksPostgres(): Promise<PeriodLock[]> {
  const res = await queryPostgres(
    `SELECT id, period_start::text AS period_start, period_end::text AS period_end,
            locked_at::text AS locked_at, locked_by_user_id, reason
     FROM finance_period_locks ORDER BY period_start DESC`,
  );
  return res.rows.map((r) => ({
    id: Number(r.id),
    periodStart: String(r.period_start),
    periodEnd: String(r.period_end),
    lockedAt: String(r.locked_at),
    lockedByUserId: r.locked_by_user_id != null ? Number(r.locked_by_user_id) : null,
    reason: r.reason ? String(r.reason) : null,
  }));
}

export async function lockFinancePeriodPostgres(input: {
  periodStart: string;
  periodEnd: string;
  lockedByUserId: number;
  reason?: string | null;
}): Promise<PeriodLock> {
  const res = await queryPostgres(
    `INSERT INTO finance_period_locks (period_start, period_end, locked_by_user_id, reason)
     VALUES ($1::date, $2::date, $3, $4)
     ON CONFLICT (period_start, period_end) DO UPDATE
       SET locked_at = NOW(), locked_by_user_id = EXCLUDED.locked_by_user_id, reason = EXCLUDED.reason
     RETURNING id, period_start::text AS period_start, period_end::text AS period_end,
               locked_at::text AS locked_at, locked_by_user_id, reason`,
    [input.periodStart, input.periodEnd, input.lockedByUserId, input.reason ?? null],
  );
  const row = res.rows[0];

  await appendAuditChainPostgres({
    eventType: "period.locked",
    targetTable: "finance_period_locks",
    targetId: String(row.id),
    actorUserId: input.lockedByUserId,
    payload: { periodStart: input.periodStart, periodEnd: input.periodEnd, reason: input.reason ?? null },
  });

  return {
    id: Number(row.id),
    periodStart: String(row.period_start),
    periodEnd: String(row.period_end),
    lockedAt: String(row.locked_at),
    lockedByUserId: row.locked_by_user_id != null ? Number(row.locked_by_user_id) : null,
    reason: row.reason ? String(row.reason) : null,
  };
}

/* ────────────────────────────────────────────────────────────────────────── */
/* TAMPER-EVIDENT AUDIT CHAIN                                                 */
/* ────────────────────────────────────────────────────────────────────────── */

export type AuditChainEntry = {
  id: number;
  sequenceNumber: number;
  eventType: string;
  targetTable: string;
  targetId: string;
  actorUserId: number | null;
  payloadJson: string;
  prevHash: string;
  chainHash: string;
  occurredAt: string;
};

/**
 * Append one row to the hash-chained audit log. Each row's `chain_hash` =
 * SHA-256 of (previous chain_hash + canonical payload of this row).
 * Locks the table to ensure strict ordering across concurrent writers.
 */
export async function appendAuditChainPostgres(
  input: {
    eventType: string;
    targetTable: string;
    targetId: string;
    actorUserId: number | null;
    payload: unknown;
  },
  externalClient?: PostgresClient,
): Promise<void> {
  const canonicalPayload = JSON.stringify(input.payload ?? {});

  const doAppend = async (client: PostgresClient) => {
    // Serialise appenders via advisory lock (pg.lock_id 4242).
    await client.query("SELECT pg_advisory_xact_lock(4242)");

    const lastRes = await client.query(
      `SELECT sequence_number, chain_hash FROM finance_audit_chain
       ORDER BY sequence_number DESC LIMIT 1`,
    );
    const last = lastRes.rows[0] as { sequence_number: number; chain_hash: string } | undefined;
    const nextSeq = last ? Number(last.sequence_number) + 1 : 1;
    const prevHash = last ? String(last.chain_hash) : "";

    const canonicalRow = JSON.stringify({
      seq: nextSeq,
      event: input.eventType,
      table: input.targetTable,
      id: input.targetId,
      actor: input.actorUserId,
      payload: canonicalPayload,
    });
    const chainHash = createHash("sha256").update(prevHash + canonicalRow).digest("hex");

    await client.query(
      `INSERT INTO finance_audit_chain
        (sequence_number, event_type, target_table, target_id, actor_user_id, payload_json, prev_hash, chain_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [nextSeq, input.eventType, input.targetTable, input.targetId, input.actorUserId, canonicalPayload, prevHash, chainHash],
    );
  };

  if (externalClient) {
    await doAppend(externalClient);
    return;
  }
  await withPostgresClient(async (client) => {
    await client.query("BEGIN");
    try {
      await doAppend(client);
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK").catch(() => {});
      throw e;
    }
  });
}

export type ChainVerifyResult = {
  ok: boolean;
  rowsVerified: number;
  lastSequence: number;
  lastHash: string;
  brokenAt: number | null;
  brokenReason: string | null;
};

export async function verifyAuditChainPostgres(): Promise<ChainVerifyResult> {
  const res = await queryPostgres(
    `SELECT sequence_number, event_type, target_table, target_id, actor_user_id, payload_json,
            prev_hash, chain_hash
     FROM finance_audit_chain ORDER BY sequence_number ASC`,
  );

  let rowsVerified = 0;
  let lastSeq = 0;
  let lastHash = "";
  let expectedPrev = "";
  for (const row of res.rows as Array<Record<string, unknown>>) {
    const seq = Number(row.sequence_number);
    const prevHash = String(row.prev_hash);
    const chainHash = String(row.chain_hash);

    if (seq !== lastSeq + 1) {
      return {
        ok: false, rowsVerified, lastSequence: lastSeq, lastHash,
        brokenAt: seq, brokenReason: `sequence gap — expected ${lastSeq + 1}`,
      };
    }
    if (prevHash !== expectedPrev) {
      return {
        ok: false, rowsVerified, lastSequence: lastSeq, lastHash,
        brokenAt: seq, brokenReason: "prev_hash mismatch",
      };
    }
    const canonicalRow = JSON.stringify({
      seq,
      event: String(row.event_type),
      table: String(row.target_table),
      id: String(row.target_id),
      actor: row.actor_user_id != null ? Number(row.actor_user_id) : null,
      payload: String(row.payload_json),
    });
    const expectedHash = createHash("sha256").update(prevHash + canonicalRow).digest("hex");
    if (expectedHash !== chainHash) {
      return {
        ok: false, rowsVerified, lastSequence: lastSeq, lastHash,
        brokenAt: seq, brokenReason: "chain_hash mismatch (row was tampered with)",
      };
    }
    expectedPrev = chainHash;
    lastSeq = seq;
    lastHash = chainHash;
    rowsVerified++;
  }

  return { ok: true, rowsVerified, lastSequence: lastSeq, lastHash, brokenAt: null, brokenReason: null };
}

export async function writeAuditCheckpointPostgres(result: ChainVerifyResult): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  await queryPostgres(
    `INSERT INTO finance_audit_checkpoints
       (checkpoint_date, last_sequence, last_chain_hash, verified_ok, rows_verified, broken_at)
     VALUES ($1::date, $2, $3, $4, $5, $6)
     ON CONFLICT (checkpoint_date) DO UPDATE
       SET last_sequence = EXCLUDED.last_sequence,
           last_chain_hash = EXCLUDED.last_chain_hash,
           verified_ok = EXCLUDED.verified_ok,
           rows_verified = EXCLUDED.rows_verified,
           broken_at = EXCLUDED.broken_at`,
    [today, result.lastSequence, result.lastHash || "", result.ok, result.rowsVerified, result.brokenAt],
  );
}

export async function getLatestAuditCheckpointPostgres(): Promise<{
  checkpointDate: string | null;
  verifiedOk: boolean;
  lastSequence: number;
  rowsVerified: number;
  brokenAt: number | null;
}> {
  const res = await queryPostgres(
    `SELECT checkpoint_date::text AS checkpoint_date, verified_ok, last_sequence, rows_verified, broken_at
     FROM finance_audit_checkpoints ORDER BY checkpoint_date DESC LIMIT 1`,
  );
  const row = res.rows[0];
  if (!row) {
    return { checkpointDate: null, verifiedOk: false, lastSequence: 0, rowsVerified: 0, brokenAt: null };
  }
  return {
    checkpointDate: String(row.checkpoint_date),
    verifiedOk: Boolean(row.verified_ok),
    lastSequence: Number(row.last_sequence),
    rowsVerified: Number(row.rows_verified),
    brokenAt: row.broken_at != null ? Number(row.broken_at) : null,
  };
}
