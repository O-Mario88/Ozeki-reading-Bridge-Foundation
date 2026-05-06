import { NextRequest } from "next/server";
import { withApiV1 } from "@/lib/server/api-v1";
import { queryPostgres } from "@/lib/server/postgres/client";

export const runtime = "nodejs";
export const revalidate = 0;

type Row = {
  id: number; sequence_number: number; event_type: string; target_table: string;
  target_id: string; actor_user_id: number | null; payload_json: string;
  prev_hash: string; chain_hash: string; occurred_at: string;
};

/**
 * External-auditor endpoint. Streams events from the hash-chained audit log
 * with paging. Each row includes prev_hash + chain_hash so auditors can
 * independently verify integrity. Read-only, requires `read:audit` scope.
 */
export const GET = withApiV1.table(async (req: NextRequest) => {
  const p = req.nextUrl.searchParams;
  const limit = Math.max(1, Math.min(1000, Number(p.get("limit") ?? "200")));
  const afterSeq = Number(p.get("afterSequence") ?? "0");
  const eventType = p.get("eventType") ?? undefined;

  const params: unknown[] = [afterSeq];
  let where = `WHERE sequence_number > $1`;
  if (eventType) {
    params.push(eventType);
    where += ` AND event_type = $${params.length}`;
  }

  const res = await queryPostgres<Row>(
    `SELECT id, sequence_number, event_type, target_table, target_id, actor_user_id,
            payload_json, prev_hash, chain_hash, occurred_at::text AS occurred_at
     FROM finance_audit_chain ${where}
     ORDER BY sequence_number ASC
     LIMIT ${limit}`,
    params,
  );

  return {
    rows: res.rows.map((r) => ({
      id: Number(r.id),
      sequenceNumber: Number(r.sequence_number),
      eventType: String(r.event_type),
      targetTable: String(r.target_table),
      targetId: String(r.target_id),
      actorUserId: r.actor_user_id != null ? Number(r.actor_user_id) : null,
      payloadJson: r.payload_json,
      prevHash: String(r.prev_hash),
      chainHash: String(r.chain_hash),
      occurredAt: String(r.occurred_at),
    })) as unknown as Array<Record<string, unknown>>,
    meta: {
      nextAfterSequence: res.rows.length > 0 ? Number(res.rows[res.rows.length - 1].sequence_number) : afterSeq,
      limit,
    },
    filename: "ozeki-audit-events",
  };
}, { requiredScopes: ["read:audit"] });
