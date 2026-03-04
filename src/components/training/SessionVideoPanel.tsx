"use client";

import { useState } from "react";
import { Maximize, Minimize, Video, Radio, ExternalLink } from "lucide-react";
import type { OnlineTrainingSessionRecord } from "@/lib/types";

interface SessionVideoPanelProps {
  session: OnlineTrainingSessionRecord;
  trainerName?: string;
  isStaff?: boolean;
}

export function SessionVideoPanel({ session, trainerName = "Ozeki Trainer", isStaff = false }: SessionVideoPanelProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleFullscreenToggle = () => {
    const videoContainer = document.getElementById("session-video-container");
    if (!videoContainer) return;

    if (!document.fullscreenElement) {
      videoContainer.requestFullscreen().catch((err) => {
        console.error("Error attempting to enable fullscreen:", err.message);
      });
    } else {
      document.exitFullscreen();
    }
  };

  // Listen to fullscreenchange to sync button state
  if (typeof document !== "undefined") {
    document.onfullscreenchange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
  }

  const isLive = session.status === "live";

  return (
    <div
      id="session-video-container"
      className={`relative bg-black rounded-2xl overflow-hidden shadow-sm flex flex-col \${
        isFullscreen ? "h-screen w-screen rounded-none" : "w-full aspect-video"
      }`}
    >
      {/* Fallback View (If Meet embed isn't supported / preferred new tab) */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-white p-8 text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center animate-pulse">
          <Video className="w-10 h-10 text-blue-400" />
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-2">{session.title}</h2>
          <p className="text-gray-400 max-w-md mx-auto">
            {isLive
              ? "This session is currently live in Google Meet. Join below to participate, and keep this page open for resources and notes."
              : "This session is scheduled. The Meet room will open shortly before start time."}
          </p>
        </div>

        {session.meetJoinUrl ? (
          <a
            href={session.meetJoinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-8 py-3.5 border border-transparent text-lg font-bold rounded-xl shadow-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/50 transition-all transform hover:scale-105"
          >
            {isLive ? <Radio className="w-5 h-5 mr-3 animate-pulse" /> : <Video className="w-5 h-5 mr-3" />}
            {isLive ? "Join Live Meet" : "Join Google Meet"}
            <ExternalLink className="w-5 h-5 ml-3 opacity-50" />
          </a>
        ) : (
          <button disabled className="px-8 py-3.5 bg-gray-800 text-gray-500 rounded-xl font-bold cursor-not-allowed">
            Meet Link Not Available
          </button>
        )}
      </div>

      {/* Overlay controls */}
      <div className="absolute top-0 inset-x-0 p-4 bg-gradient-to-b from-black/60 to-transparent flex justify-between items-start pointer-events-none">

        <div className="flex items-center space-x-3 pointer-events-auto">
          {isLive && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-red-500 text-white uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse mr-2" />
              LIVE
            </span>
          )}
          <span className="text-white/90 font-medium text-sm drop-shadow-md">
            Trainer: {trainerName}
          </span>
        </div>

        <button
          onClick={handleFullscreenToggle}
          className="p-2.5 rounded-lg bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm pointer-events-auto transition-all focus:outline-none focus:ring-2 focus:ring-white/50"
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
        </button>
      </div>

      {/* Embedded iframe could go here replacing the fallback if desired */}
      {/* <iframe src={session.meetJoinUrl} className="w-full h-full border-0 absolute inset-0 z-0" allow="camera; microphone; fullscreen; display-capture" /> */}

    </div>
  );
}
