"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Notification = {
  id: number;
  category: string;
  title: string;
  body: string | null;
  actionHref: string | null;
  isRead: boolean;
  createdAt: string;
};

function formatRelative(iso: string): string {
  const ts = new Date(iso).getTime();
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export function NotificationTray() {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/portal/notifications?limit=20");
      if (!res.ok) return;
      const json = await res.json();
      setList(json.data ?? []);
      setUnread(Number(json.unreadCount ?? 0));
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 60000);
    return () => clearInterval(t);
  }, [refresh]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const markRead = async (id: number) => {
    await fetch(`/api/portal/notifications/${id}`, { method: "PATCH" });
    refresh();
  };

  const markAllRead = async () => {
    await fetch(`/api/portal/notifications/mark-all-read`, { method: "POST" });
    refresh();
  };

  return (
    <div className="notif-tray" ref={ref}>
      <button
        type="button"
        className="notif-tray-button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Notifications (${unread} unread)`}
      >
        🔔
        {unread > 0 ? <span className="notif-tray-badge">{unread > 99 ? "99+" : unread}</span> : null}
      </button>
      {open ? (
        <div className="notif-tray-panel" role="menu">
          <header className="notif-tray-header">
            <strong>Notifications</strong>
            {unread > 0 ? (
              <button type="button" onClick={markAllRead} className="notif-tray-mark-all">
                Mark all read
              </button>
            ) : null}
          </header>
          {list.length === 0 ? (
            <p className="notif-tray-empty">You&apos;re all caught up.</p>
          ) : (
            <ul className="notif-tray-list">
              {list.map((n) => (
                <li key={n.id} className={n.isRead ? "is-read" : ""}>
                  <a
                    href={n.actionHref ?? "#"}
                    onClick={() => markRead(n.id)}
                    className="notif-tray-item"
                  >
                    <div className="notif-tray-item-body">
                      <strong>{n.title}</strong>
                      {n.body ? <small>{n.body}</small> : null}
                      <span className="notif-tray-item-meta">
                        <em>{n.category.replace(".", " ")}</em>
                        <span>· {formatRelative(n.createdAt)}</span>
                      </span>
                    </div>
                    {!n.isRead ? <span className="notif-tray-dot" /> : null}
                  </a>
                </li>
              ))}
            </ul>
          )}
          <footer className="notif-tray-footer">
            <a href="/portal/notifications">View all notifications →</a>
            <a href="/portal/notifications/preferences">Preferences</a>
          </footer>
        </div>
      ) : null}
    </div>
  );
}
