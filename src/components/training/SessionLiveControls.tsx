"use client";

import { useState, useEffect, useCallback } from "react";
import { Radio, Square, Users, Clock, Loader2, ExternalLink, AlertCircle } from "lucide-react";

interface LiveStatus {
  status: string;
  meetJoinUrl: string | null;
  liveStartedAt: string | null;
  durationSeconds: number | null;
  participantTotal: number;
  joinedCount: number;
  attendedCount: number;
}

interface SessionLiveControlsProps {
  sessionId: number;
  initialStatus: string;
  meetJoinUrl: string | null;
  liveStartedAt?: string | null;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function SessionLiveControls({
  sessionId,
  initialStatus,
  meetJoinUrl,
  liveStartedAt,
}: SessionLiveControlsProps) {
  const [status, setStatus] = useState(initialStatus);
  const [liveStatus, setLiveStatus] = useState<LiveStatus | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // Tick the elapsed timer every second when live
  useEffect(() => {
    if (status !== "live") return;
    const base = liveStatus?.liveStartedAt ?? liveStartedAt ?? null;
    const startMs = base ? new Date(base).getTime() : Date.now();
    const update = () => setElapsed(Math.floor((Date.now() - startMs) / 1000));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [status, liveStatus?.liveStartedAt, liveStartedAt]);

  // Poll live status every 12 seconds when live
  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/portal/training/sessions/${sessionId}/live-status`);
      if (!res.ok) return;
      const data: LiveStatus = await res.json();
      setLiveStatus(data);
      setStatus(data.status);
    } catch {
      // ignore poll failures silently
    }
  }, [sessionId]);

  useEffect(() => {
    if (status !== "live") return;
    pollStatus();
    const id = setInterval(pollStatus, 12000);
    return () => clearInterval(id);
  }, [status, pollStatus]);

  const handleStart = async () => {
    setIsStarting(true);
    setError(null);
    try {
      const res = await fetch(`/api/portal/training/sessions/${sessionId}/start`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to start session.");
        return;
      }
      setStatus("live");
      await pollStatus();
      // Open Meet in new tab after session is marked live
      const url = data.meetJoinUrl ?? meetJoinUrl;
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsStarting(false);
    }
  };

  const handleEnd = async () => {
    if (!window.confirm("End the training session? This will mark attendance as captured and close the live window for participants.")) return;
    setIsEnding(true);
    setError(null);
    try {
      const res = await fetch(`/api/portal/training/sessions/${sessionId}/end`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to end session.");
        return;
      }
      setStatus("completed");
      setLiveStatus(null);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsEnding(false);
    }
  };

  const activeParticipants = liveStatus?.joinedCount ?? 0;
  const totalParticipants = liveStatus?.participantTotal ?? 0;

  if (status === "completed" || status === "canceled") {
    return (
      <div className="rounded-xl bg-gray-800/50 border border-gray-700 px-5 py-4 text-center">
        <p className="text-sm text-gray-400 font-medium">
          {status === "completed" ? "Session has ended. Post-session processing may be in progress." : "Session was cancelled."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Status bar */}
      {status === "live" && (
        <div className="flex items-center justify-between rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-red-400 font-bold text-sm uppercase tracking-wider">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              Live
            </span>
            <span className="text-gray-400 text-sm flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {formatDuration(elapsed)}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-300">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-gray-400" />
              <strong className="text-white">{activeParticipants}</strong>
              {totalParticipants > 0 && <span className="text-gray-500">/ {totalParticipants}</span>}
              <span className="text-gray-500 hidden sm:inline">joined</span>
            </span>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        {status !== "live" ? (
          <button
            onClick={handleStart}
            disabled={isStarting}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-[#044f4d] text-white font-bold text-sm transition-all shadow-lg shadow-emerald-900/30 disabled:cursor-not-allowed"
          >
            {isStarting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Radio className="w-5 h-5" />
            )}
            {isStarting ? "Starting…" : "Start Training"}
          </button>
        ) : (
          <>
            {/* Re-open Meet while live */}
            {(liveStatus?.meetJoinUrl ?? meetJoinUrl) && (
              <a
                href={liveStatus?.meetJoinUrl ?? meetJoinUrl ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                Rejoin in Google Meet
              </a>
            )}
            <button
              onClick={handleEnd}
              disabled={isEnding}
              className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white font-semibold text-sm transition-all disabled:cursor-not-allowed"
            >
              {isEnding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
              {isEnding ? "Ending…" : "End Session"}
            </button>
          </>
        )}
      </div>

      {status !== "live" && meetJoinUrl && (
        <p className="text-xs text-gray-500 text-center">
          Clicking &ldquo;Start Training&rdquo; marks the session as live and opens Google Meet in a new tab.
        </p>
      )}
    </div>
  );
}
