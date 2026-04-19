-- Migration 0056: Notification Subscriptions + In-App Tray

CREATE TABLE IF NOT EXISTS notification_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES portal_users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('in_app', 'email', 'sms')),
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, event_type, channel)
);

CREATE INDEX IF NOT EXISTS idx_notification_subs_user
  ON notification_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_subs_event
  ON notification_subscriptions(event_type, is_enabled);

CREATE TABLE IF NOT EXISTS in_app_notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES portal_users(id) ON DELETE CASCADE,
  event_id BIGINT REFERENCES platform_events(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  action_href TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_in_app_user_unread
  ON in_app_notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_in_app_recent
  ON in_app_notifications(created_at DESC);

-- Default subscriptions by role: seed in-app notifications for every coach/admin
-- (runs at migration time; safe to skip if users table is empty)
INSERT INTO notification_subscriptions (user_id, event_type, channel, is_enabled)
SELECT pu.id, e.event_type, 'in_app', TRUE
FROM portal_users pu
CROSS JOIN (VALUES
  ('observation.submitted'),
  ('assessment.submitted'),
  ('school.flagged.at_risk'),
  ('coaching.visit.logged')
) AS e(event_type)
WHERE (pu.is_admin IS TRUE OR pu.is_superadmin IS TRUE
       OR pu.role ILIKE '%coach%' OR pu.role ILIKE '%observer%')
ON CONFLICT DO NOTHING;
