import { queryPostgres } from "@/lib/server/postgres/client";

export type SessionChapter = {
  id: number;
  sessionId: number;
  title: string;
  description: string | null;
  startSeconds: number;
  sortOrder: number;
  createdByUserId: number | null;
  createdAt: string;
  updatedAt: string;
};

function mapRow(row: Record<string, unknown>): SessionChapter {
  return {
    id: Number(row.id),
    sessionId: Number(row.session_id),
    title: String(row.title),
    description: row.description ? String(row.description) : null,
    startSeconds: Number(row.start_seconds),
    sortOrder: Number(row.sort_order),
    createdByUserId: row.created_by_user_id != null ? Number(row.created_by_user_id) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function listChaptersPostgres(sessionId: number): Promise<SessionChapter[]> {
  const res = await queryPostgres<Record<string, unknown>>(
    `SELECT * FROM online_training_session_chapters
     WHERE session_id = $1
     ORDER BY start_seconds ASC, sort_order ASC`,
    [sessionId],
  );
  return res.rows.map(mapRow);
}

export async function createChapterPostgres(input: {
  sessionId: number;
  title: string;
  description?: string | null;
  startSeconds: number;
  sortOrder?: number;
  createdByUserId: number;
}): Promise<SessionChapter> {
  const res = await queryPostgres<Record<string, unknown>>(
    `INSERT INTO online_training_session_chapters
       (session_id, title, description, start_seconds, sort_order, created_by_user_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      input.sessionId,
      input.title.trim(),
      input.description?.trim() ?? null,
      Math.max(0, Math.floor(input.startSeconds)),
      input.sortOrder ?? 0,
      input.createdByUserId,
    ],
  );
  return mapRow(res.rows[0]);
}

export async function updateChapterPostgres(id: number, input: {
  title?: string;
  description?: string | null;
  startSeconds?: number;
  sortOrder?: number;
}): Promise<void> {
  const sets: string[] = [];
  const vals: unknown[] = [];
  let idx = 1;
  if (input.title !== undefined) { sets.push(`title = $${idx++}`); vals.push(input.title.trim()); }
  if (input.description !== undefined) { sets.push(`description = $${idx++}`); vals.push(input.description?.trim() ?? null); }
  if (input.startSeconds !== undefined) { sets.push(`start_seconds = $${idx++}`); vals.push(Math.max(0, Math.floor(input.startSeconds))); }
  if (input.sortOrder !== undefined) { sets.push(`sort_order = $${idx++}`); vals.push(input.sortOrder); }
  if (sets.length === 0) return;
  sets.push(`updated_at = NOW()`);
  vals.push(id);
  await queryPostgres(
    `UPDATE online_training_session_chapters SET ${sets.join(", ")} WHERE id = $${idx}`,
    vals,
  );
}

export async function deleteChapterPostgres(id: number): Promise<void> {
  await queryPostgres(`DELETE FROM online_training_session_chapters WHERE id = $1`, [id]);
}
