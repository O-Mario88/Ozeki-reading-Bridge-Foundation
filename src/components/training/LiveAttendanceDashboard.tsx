"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, CheckCircle2, Clock, Circle, RefreshCw, UserX } from "lucide-react";

interface Participant {
  id: number;
  session_id: number;
  school_id: number | null;
  teacher_user_id: number | null;
  role: string;
  attendance_status: "invited" | "joined" | "attended" | "left" | "missed";
  joined_at: string | null;
  left_at: string | null;
  created_at: string;
  full_name: string | null;
  school_name: string | null;
}

interface Props {
  sessionId: number;
  sessionStatus: string;
  pollIntervalMs?: number;
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "—";
  }
}

function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

function statusBadge(status: Participant["attendance_status"]) {
  switch (status) {
    case "joined":
      return { label: "In session", classes: "bg-emerald-50 text-emerald-700 border-emerald-200", Icon: CheckCircle2, dot: "bg-emerald-500" };
    case "attended":
      return { label: "Attended", classes: "bg-blue-50 text-blue-700 border-blue-200", Icon: CheckCircle2, dot: "bg-blue-500" };
    case "left":
      return { label: "Left", classes: "bg-gray-50 text-gray-600 border-gray-200", Icon: UserX, dot: "bg-gray-400" };
    case "missed":
      return { label: "Missed", classes: "bg-red-50 text-red-700 border-red-200", Icon: UserX, dot: "bg-red-400" };
    default:
      return { label: "Invited", classes: "bg-amber-50 text-amber-700 border-amber-200", Icon: Clock, dot: "bg-amber-400" };
  }
}

export function LiveAttendanceDashboard({ sessionId, sessionStatus, pollIntervalMs = 10000 }: Props) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchAttendance = useCallback(async () => {
    try {
      const res = await fetch(`/api/portal/training/sessions/${sessionId}/attendance`);
      if (!res.ok) return;
      const data = await res.json();
      setParticipants(data.participants ?? []);
      setLastUpdated(new Date());
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchAttendance();
    if (sessionStatus === "completed" || sessionStatus === "canceled") return;
    const id = setInterval(fetchAttendance, pollIntervalMs);
    return () => clearInterval(id);
  }, [fetchAttendance, sessionStatus, pollIntervalMs]);

  const counts = {
    joined: participants.filter((p) => p.attendance_status === "joined").length,
    attended: participants.filter((p) => p.attendance_status === "attended").length,
    invited: participants.filter((p) => p.attendance_status === "invited").length,
    missed: participants.filter((p) => p.attendance_status === "missed" || p.attendance_status === "left").length,
  };

  const grouped = participants.reduce<Record<string, Participant[]>>((acc, p) => {
    const key = p.attendance_status;
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  // Display order: joined → attended → invited → left → missed
  const order: Participant["attendance_status"][] = ["joined", "attended", "invited", "left", "missed"];

  const isLive = sessionStatus === "live";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="grid grid-cols-4 gap-2">
        <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-3 text-center">
          <p className="text-2xl font-extrabold text-emerald-700">{counts.joined}</p>
          <p className="text-xs text-emerald-700 font-semibold uppercase tracking-wider">
            {isLive ? "In Session" : "Joined"}
          </p>
        </div>
        <div className="rounded-xl bg-blue-50 border border-blue-100 px-3 py-3 text-center">
          <p className="text-2xl font-extrabold text-blue-700">{counts.attended}</p>
          <p className="text-xs text-blue-700 font-semibold uppercase tracking-wider">Attended</p>
        </div>
        <div className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-3 text-center">
          <p className="text-2xl font-extrabold text-amber-700">{counts.invited}</p>
          <p className="text-xs text-amber-700 font-semibold uppercase tracking-wider">Invited</p>
        </div>
        <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-3 text-center">
          <p className="text-2xl font-extrabold text-gray-700">{counts.missed}</p>
          <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider">Left / Missed</p>
        </div>
      </div>

      {/* Header row with refresh + live indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Users className="w-4 h-4 text-gray-400" />
          <span>{participants.length} total participants</span>
          {isLive && (
            <span className="ml-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-50 border border-red-100 text-red-600 text-xs font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              LIVE
            </span>
          )}
        </div>
        <button
          onClick={() => { setRefreshing(true); fetchAttendance(); }}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 font-medium"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          {lastUpdated && !refreshing ? `Updated ${relativeTime(lastUpdated.toISOString())}` : "Refresh"}
        </button>
      </div>

      {/* Empty state */}
      {participants.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 py-10 text-center">
          <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500 font-medium">No participants registered yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Attendance will appear here as participants click &ldquo;Join Training&rdquo;.
          </p>
        </div>
      )}

      {/* Participant groups */}
      <div className="space-y-4">
        {order.map((status) => {
          const group = grouped[status];
          if (!group || group.length === 0) return null;
          const badge = statusBadge(status);
          return (
            <div key={status}>
              <div className="flex items-center gap-2 mb-2">
                <Circle className={`w-2 h-2 rounded-full ${badge.dot} fill-current`} />
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                  {badge.label} · {group.length}
                </h4>
              </div>
              <div className="space-y-1.5">
                {group.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-white border border-gray-100 hover:border-gray-200 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0">
                        {(p.full_name ?? p.role ?? "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">
                          {p.full_name ?? "Guest"}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {p.school_name ?? p.role ?? "—"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {p.joined_at && (
                        <p className="text-xs text-gray-500 font-medium">
                          Joined {formatTime(p.joined_at)}
                        </p>
                      )}
                      {p.left_at && (
                        <p className="text-xs text-gray-400">Left {formatTime(p.left_at)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
