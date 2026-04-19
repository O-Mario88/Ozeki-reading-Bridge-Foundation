"use client";

import { useState } from "react";
import { Maximize, Minimize, Video, BookOpen, Calendar } from "lucide-react";
import type { OnlineTrainingSessionRecord } from "@/lib/types";
import { SessionLiveControls } from "./SessionLiveControls";
import { SessionJoinPanel } from "./SessionJoinPanel";

interface SessionVideoPanelProps {
  session: OnlineTrainingSessionRecord;
  trainerName?: string;
  isHost?: boolean;
  userId?: number;
}

function formatScheduledTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-GB", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });
  } catch {
    return iso;
  }
}

export function SessionVideoPanel({
  session,
  trainerName = "Ozeki Trainer",
  isHost = false,
  userId,
}: SessionVideoPanelProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleFullscreenToggle = () => {
    const el = document.getElementById("session-video-container");
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  };

  if (typeof document !== "undefined") {
    document.onfullscreenchange = () => setIsFullscreen(!!document.fullscreenElement);
  }

  const isLive = session.status === "live";
  const isCompleted = session.status === "completed";

  return (
    <div
      id="session-video-container"
      className={`relative bg-gray-950 rounded-2xl overflow-hidden shadow-lg flex flex-col ${
        isFullscreen ? "h-screen w-screen rounded-none" : "w-full aspect-video"
      }`}
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-950 to-[#0a1628] pointer-events-none" />

      {/* Content layer */}
      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 md:p-10 text-white">

        {/* Session title + trainer */}
        <div className="text-center mb-6 max-w-lg">
          {isLive && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-widest mb-4">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Live
            </div>
          )}
          <h2 className="text-xl md:text-2xl font-bold text-white mb-1.5">{session.title}</h2>
          <p className="text-gray-400 text-sm">
            Trainer: <span className="text-gray-200 font-medium">{trainerName}</span>
          </p>
          {!isLive && !isCompleted && session.startTime && (
            <p className="text-gray-500 text-xs mt-2 flex items-center justify-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {formatScheduledTime(session.startTime)}
            </p>
          )}
        </div>

        {/* Controls — diverge by role */}
        <div className="w-full max-w-md">
          {isHost ? (
            // Host/admin: start & end controls
            <SessionLiveControls
              sessionId={session.id}
              initialStatus={session.status}
              meetJoinUrl={session.meetJoinUrl ?? null}
              liveStartedAt={null}
            />
          ) : userId ? (
            // Participant: join panel with live polling
            <SessionJoinPanel
              sessionId={session.id}
              initialStatus={session.status}
              meetJoinUrl={session.meetJoinUrl ?? null}
              userId={userId}
              scheduledStart={session.startTime}
            />
          ) : (
            // Unauthenticated / no userId — show passive state
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gray-800/60 flex items-center justify-center mx-auto mb-4">
                <Video className="w-8 h-8 text-gray-500" />
              </div>
              <p className="text-gray-400 text-sm">
                {isLive ? "Session is live. Sign in to join." : isCompleted ? "This session has ended." : "Session not yet started."}
              </p>
            </div>
          )}
        </div>

        {/* Agenda teaser */}
        {session.agenda && (
          <div className="mt-6 max-w-md w-full">
            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" /> Agenda
              </p>
              <p className="text-gray-300 text-sm leading-relaxed line-clamp-3">{session.agenda}</p>
            </div>
          </div>
        )}
      </div>

      {/* Top overlay bar */}
      <div className="absolute top-0 inset-x-0 p-4 bg-gradient-to-b from-black/50 to-transparent flex justify-between items-start z-10">
        <div className="flex items-center gap-2">
          {isLive && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-red-500 text-white uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              Live
            </span>
          )}
        </div>
        <button
          onClick={handleFullscreenToggle}
          className="p-2 rounded-lg bg-black/40 hover:bg-black/60 text-white/70 hover:text-white backdrop-blur-sm transition"
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
