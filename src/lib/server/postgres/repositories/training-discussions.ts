import { queryPostgres } from "@/lib/server/postgres/client";

export type SessionDiscussionPost = {
  id: number;
  sessionId: number;
  parentId: number | null;
  authorUserId: number;
  authorName: string;
  body: string;
  pinned: boolean;
  editedAt: string | null;
  createdAt: string;
  replyCount: number;
};

function mapRow(row: Record<string, unknown>): SessionDiscussionPost {
  return {
    id: Number(row.id),
    sessionId: Number(row.session_id),
    parentId: row.parent_id != null ? Number(row.parent_id) : null,
    authorUserId: Number(row.author_user_id),
    authorName: String(row.author_name),
    body: String(row.body),
    pinned: Boolean(row.pinned),
    editedAt: row.edited_at ? String(row.edited_at) : null,
    createdAt: String(row.created_at),
    replyCount: Number(row.reply_count ?? 0),
  };
}

export async function listDiscussionsPostgres(sessionId: number): Promise<SessionDiscussionPost[]> {
  const res = await queryPostgres<Record<string, unknown>>(
    `SELECT d.*,
       (SELECT COUNT(*)::int FROM online_training_session_discussions c
          WHERE c.parent_id = d.id AND c.deleted_at IS NULL) AS reply_count
     FROM online_training_session_discussions d
     WHERE d.session_id = $1 AND d.deleted_at IS NULL
     ORDER BY d.pinned DESC, d.created_at DESC`,
    [sessionId],
  );
  return res.rows.map(mapRow);
}

export async function createDiscussionPostPostgres(input: {
  sessionId: number;
  parentId?: number | null;
  authorUserId: number;
  authorName: string;
  body: string;
}): Promise<SessionDiscussionPost> {
  const res = await queryPostgres<Record<string, unknown>>(
    `INSERT INTO online_training_session_discussions
       (session_id, parent_id, author_user_id, author_name, body)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *, 0 AS reply_count`,
    [
      input.sessionId,
      input.parentId ?? null,
      input.authorUserId,
      input.authorName.trim() || "Anonymous",
      input.body.trim(),
    ],
  );
  return mapRow(res.rows[0]);
}

export async function updateDiscussionPostPostgres(id: number, authorUserId: number, body: string): Promise<void> {
  await queryPostgres(
    `UPDATE online_training_session_discussions
     SET body = $1, edited_at = NOW()
     WHERE id = $2 AND author_user_id = $3 AND deleted_at IS NULL`,
    [body.trim(), id, authorUserId],
  );
}

export async function deleteDiscussionPostPostgres(id: number, authorUserId: number, isAdmin: boolean): Promise<void> {
  if (isAdmin) {
    await queryPostgres(
      `UPDATE online_training_session_discussions SET deleted_at = NOW() WHERE id = $1`,
      [id],
    );
  } else {
    await queryPostgres(
      `UPDATE online_training_session_discussions SET deleted_at = NOW()
       WHERE id = $1 AND author_user_id = $2`,
      [id, authorUserId],
    );
  }
}

export async function pinDiscussionPostPostgres(id: number, pinned: boolean): Promise<void> {
  await queryPostgres(
    `UPDATE online_training_session_discussions SET pinned = $1 WHERE id = $2`,
    [pinned, id],
  );
}
