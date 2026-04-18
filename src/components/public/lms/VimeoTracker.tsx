"use client";

import { useEffect, useRef, useState } from "react";

interface VimeoTrackerProps {
  vimeoId: string;
  lessonId: number;
  teacherId?: number; // Fetched from context/session if available
}

export function VimeoTracker({ vimeoId, lessonId, teacherId }: VimeoTrackerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);

  // Load the Vimeo SDK dynamically
  useEffect(() => {
    if (typeof window !== "undefined" && !window.Vimeo) {
      const script = document.createElement("script");
      script.src = "https://player.vimeo.com/api/player.js";
      script.async = true;
      document.body.appendChild(script);
      
      script.onload = initPlayer;
    } else {
      initPlayer();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vimeoId]);

  const initPlayer = () => {
    if (!containerRef.current || !window.Vimeo) return;
    
    // Initialize Player
    const player = new window.Vimeo.Player(containerRef.current, {
      id: vimeoId,
      width: 640,
      responsive: true,
      dnt: true, // Privacy compliant
    });
    
    playerRef.current = player;

    // Listeners as per Section 12 PRD Requirements:
    player.on("play", () => handleTelemetryEvent("play"));
    player.on("pause", () => handleTelemetryEvent("pause"));
    player.on("seeked", () => handleTelemetryEvent("seeked"));
    player.on("ended", () => handleTelemetryEvent("ended"));

    // Throttled timeupdate ping (every 10 seconds to not overwhelm DB)
    let lastPing = 0;
    player.on("timeupdate", (data: any) => {
      const current = Math.floor(data.seconds);
      if (current - lastPing >= 10) {
        lastPing = current;
        pingTelemetry(data.seconds, data.percent || 0);
      }
    });
  };

  const pingTelemetry = async (watchTime: number, percentCompleted: number) => {
    // Requires physical viewing threshold metric (ignoring 0 second scrubs)
    try {
      const res = await fetch("/api/telemetry/vimeo-ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId,
          teacherId: teacherId || 0, // 0 = anonymous/guest tracker
          sessionId,
          watchTimeSeconds: watchTime,
          completed: percentCompleted > 0.9, // 90% threshold for certificate
          eventType: "timeupdate"
        })
      });
      if (res.ok && !sessionId) {
        const payload = await res.json();
        setSessionId(payload.sessionId);
      }
    } catch (err) {
      console.warn("Vimeo Telemetry Pipeline Dropped:", err);
    }
  };

  const handleTelemetryEvent = (eventType: string) => {
    if (!playerRef.current) return;
    playerRef.current.getCurrentTime().then((time: number) => {
      fetch("/api/telemetry/vimeo-ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId, teacherId: teacherId || 0, sessionId,
          watchTimeSeconds: time,
          completed: eventType === "ended",
          eventType
        })
      }).catch(()=>null);
    });
  };

  return (
    <div className="vimeo-tracker-wrapper w-full bg-slate-900 rounded-xl overflow-hidden shadow-xl ring-1 ring-white/10 relative pb-[56.25%]">
      {/* 16:9 Aspect Ratio Wrapper */}
      <div 
        ref={containerRef} 
        className="absolute top-0 left-0 w-full h-full [&>iframe]:w-full [&>iframe]:h-full" 
      />
    </div>
  );
}
