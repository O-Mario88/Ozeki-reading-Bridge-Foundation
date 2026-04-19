"use client";

import { useState, useEffect, useCallback } from "react";
import { Video, Users, Clock, Loader2, ExternalLink, CheckCircle2, Radio } from "lucide-react";

interface LiveStatus {
  status: string;
  meetJoinUrl: string | null;
  durationSeconds: number | null;
  joinedCount: number;
  participantTotal: number;
}

interface SessionJoinPanelProps {
  sessionId: number;
  initialStatus: string;
  meetJoinUrl: string | null;
  userId: number;
  /** scheduled start time (ISO) — shown as countdown when not yet live */
  scheduledStart?: string;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m in progress`;
  if (m > 0) return `${m}m in progress`;
  return "Just started";
}

function formatCountdown(targetIso: string): string {
  const diff = new Date(targetIso).getTime() - Date.now();
  if (diff <= 0) return "Starting soon";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 0) return `Starts in ${h}h ${m}m`;
  return `Starts in ${m}m`;
}

export function SessionJoinPanel({
  sessionId,
  initialStatus,
  meetJoinUrl,
  userId,
  scheduledStart,
}: SessionJoinPanelProps) {
  const [status, setStatus] = useState(initialStatus);
  const [liveStatus, setLiveStatus] = useState<LiveStatus | null>(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [countdown, setCountdown] = useState("");

  // Countdown tick
  useEffect(() => {
    if (status === "live" || !scheduledStart) return;
    const update = () => setCountdown(formatCountdown(scheduledStart));
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, [status, scheduledStart]);

  // Poll live status every 15s while session is live or scheduled
  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/portal/training/sessions/${sessionId}/live-status`);
      if (!res.ok) return;
      const data: LiveStatus = await res.json();
      setLiveStatus(data);
      setStatus(data.status);
    } catch {
      // silent
    }
  }, [sessionId]);

  useEffect(() => {
    if (status === "completed" || status === "canceled") return;
    pollStatus();
    const interval = status === "live" ? 15000 : 30000;
    const id = setInterval(pollStatus, interval);
    return () => clearInterval(id);
  }, [status, pollStatus]);

  const handleJoin = async () => {
    const url = liveStatus?.meetJoinUrl ?? meetJoinUrl;
    if (!url) return;

    setIsJoining(true);
    try {
      // Record attendance in platform
      await fetch(`/api/portal/training/sessions/${sessionId}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "join", teacherUserId: userId }),
      });
      setHasJoined(true);
    } catch {
      // Don't block the join even if attendance recording fails
    } finally {
      setIsJoining(false);
      // Open Meet in new tab
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const isLive = status === "live";
  const isCompleted = status === "completed" || status === "canceled";
  const activeMeetUrl = liveStatus?.meetJoinUrl ?? meetJoinUrl;

  return (
    <div className="flex flex-col items-center gap-5 p-2">
      {/* Status indicator */}
      {isLive && (
        <div className="flex items-center gap-3 w-full">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            LIVE NOW
          </div>
          {liveStatus?.durationSeconds != null && (
            <span className="text-sm text-gray-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatDuration(liveStatus.durationSeconds)}
            </span>
          )}
          {liveStatus?.joinedCount != null && liveStatus.joinedCount > 0 && (
            <span className="ml-auto text-sm text-gray-400 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              {liveStatus.joinedCount} in session
            </span>
          )}
        </div>
      )}

      {/* Main CTA */}
      {isLive && !isCompleted ? (
        hasJoined ? (
          <div className="w-full flex flex-col gap-3">
            <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl px-5 py-3.5 font-semibold text-sm">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              You&apos;re marked as joined. Google Meet opened in a new tab.
            </div>
            {activeMeetUrl && (
              <a
                href={activeMeetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 transition text-sm font-semibold"
              >
                <ExternalLink className="w-4 h-4" />
                Reopen Google Meet
              </a>
            )}
          </div>
        ) : (
          <button
            onClick={handleJoin}
            disabled={isJoining || !activeMeetUrl}
            className="w-full flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 text-white font-bold text-lg transition-all shadow-xl shadow-blue-900/30 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.99]"
          >
            {isJoining ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <Radio className="w-6 h-6 animate-pulse" />
            )}
            {isJoining ? "Opening Meet…" : "Join Training Now"}
            <ExternalLink className="w-4 h-4 opacity-60" />
          </button>
        )
      ) : isCompleted ? (
        <div className="w-full text-center py-4">
          <p className="text-gray-400 text-sm font-medium">This session has ended.</p>
        </div>
      ) : (
        <div className="w-full flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center">
            <Video className="w-8 h-8 text-gray-500" />
          </div>
          <p className="text-gray-300 font-semibold">Session Not Yet Live</p>
          {countdown && (
            <span className="text-sm text-gray-400 flex items-center gap-1.5 bg-gray-800 px-3 py-1.5 rounded-full">
              <Clock className="w-3.5 h-3.5" />
              {countdown}
            </span>
          )}
          <p className="text-xs text-gray-500 text-center max-w-xs">
            This page will automatically update when the host starts the session.
            Keep it open — your &ldquo;Join&rdquo; button will appear here.
          </p>
        </div>
      )}
    </div>
  );
}
