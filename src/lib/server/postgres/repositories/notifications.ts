import { queryPostgres } from "@/lib/server/postgres/client";
import type { PlatformEventType } from "@/lib/server/events/types";

export type NotificationRow = {
  id: number;
  userId: number;
  eventId: number | null;
  category: string;
  title: string;
  body: string | null;
  actionHref: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
};

export type SubscriptionRow = {
  id: number;
  userId: number;
  eventType: string;
  channel: "in_app" | "email" | "sms";
  isEnabled: boolean;
};

export async function listNotificationsForUserPostgres(
  userId: number,
  options: { unreadOnly?: boolean; limit?: number } = {},
): Promise<NotificationRow[]> {
  const limit = options.limit ?? 30;
  const filters = [`user_id = $1`];
  if (options.unreadOnly) filters.push(`is_read IS FALSE`);
  try {
    const res = await queryPostgres(
      `SELECT id, user_id, event_id, category, title, body, action_href,
              is_read, read_at::text AS read_at, created_at::text AS created_at
       FROM in_app_notifications
       WHERE ${filters.join(" AND ")}
       ORDER BY created_at DESC LIMIT $2`,
      [userId, limit],
    );
    return res.rows.map((r) => ({
      id: Number(r.id),
      userId: Number(r.user_id),
      eventId: r.event_id ? Number(r.event_id) : null,
      category: String(r.category),
      title: String(r.title),
      body: r.body ? String(r.body) : null,
      actionHref: r.action_href ? String(r.action_href) : null,
      isRead: Boolean(r.is_read),
      readAt: r.read_at ? String(r.read_at) : null,
      createdAt: String(r.created_at),
    }));
  } catch { return []; }
}

export async function countUnreadNotificationsPostgres(userId: number): Promise<number> {
  try {
    const res = await queryPostgres(
      `SELECT COUNT(*)::int AS n FROM in_app_notifications WHERE user_id = $1 AND is_read IS FALSE`,
      [userId],
    );
    return Number(res.rows[0]?.n ?? 0);
  } catch { return 0; }
}

export async function markNotificationReadPostgres(id: number, userId: number): Promise<void> {
  await queryPostgres(
    `UPDATE in_app_notifications SET is_read = TRUE, read_at = NOW()
     WHERE id = $1 AND user_id = $2`,
    [id, userId],
  );
}

export async function markAllNotificationsReadPostgres(userId: number): Promise<number> {
  const res = await queryPostgres(
    `UPDATE in_app_notifications SET is_read = TRUE, read_at = NOW()
     WHERE user_id = $1 AND is_read IS FALSE
     RETURNING id`,
    [userId],
  );
  return res.rows.length;
}

export async function createNotificationPostgres(input: {
  userId: number;
  eventId?: number;
  category: string;
  title: string;
  body?: string;
  actionHref?: string;
}): Promise<void> {
  try {
    await queryPostgres(
      `INSERT INTO in_app_notifications (user_id, event_id, category, title, body, action_href)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        input.userId,
        input.eventId ?? null,
        input.category,
        input.title,
        input.body ?? null,
        input.actionHref ?? null,
      ],
    );
  } catch { /* ignore */ }
}

export async function listSubscribersForEventPostgres(
  eventType: PlatformEventType,
  channel: "in_app" | "email" | "sms" = "in_app",
): Promise<number[]> {
  try {
    const res = await queryPostgres(
      `SELECT user_id FROM notification_subscriptions
       WHERE event_type = $1 AND channel = $2 AND is_enabled IS TRUE`,
      [eventType, channel],
    );
    return res.rows.map((r) => Number(r.user_id));
  } catch { return []; }
}

export async function listSubscriptionsForUserPostgres(userId: number): Promise<SubscriptionRow[]> {
  try {
    const res = await queryPostgres(
      `SELECT id, user_id, event_type, channel, is_enabled
       FROM notification_subscriptions WHERE user_id = $1
       ORDER BY event_type, channel`,
      [userId],
    );
    return res.rows.map((r) => ({
      id: Number(r.id),
      userId: Number(r.user_id),
      eventType: String(r.event_type),
      channel: String(r.channel) as "in_app" | "email" | "sms",
      isEnabled: Boolean(r.is_enabled),
    }));
  } catch { return []; }
}

export async function upsertSubscriptionPostgres(input: {
  userId: number;
  eventType: string;
  channel: "in_app" | "email" | "sms";
  isEnabled: boolean;
}): Promise<void> {
  await queryPostgres(
    `INSERT INTO notification_subscriptions (user_id, event_type, channel, is_enabled)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, event_type, channel) DO UPDATE SET is_enabled = EXCLUDED.is_enabled`,
    [input.userId, input.eventType, input.channel, input.isEnabled],
  );
}
