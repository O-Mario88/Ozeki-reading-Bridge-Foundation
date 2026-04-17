"use client";

import { useEffect, useRef, useState } from "react";

interface VimeoEventData {
  seconds: number;
}

interface VimeoPlayerInstance {
  on: (event: string, callback: (data: VimeoEventData) => void) => void;
  off: (event: string) => void;
}

declare global {
  interface Window {
    Vimeo?: {
      Player: new (iframe: HTMLIFrameElement) => VimeoPlayerInstance;
    };
  }
}

interface Props {
  vimeoEmbedUrl: string;
  lessonId: number;
}

export function TelemetryPlayer({ vimeoEmbedUrl, lessonId }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [sessionId, setSessionId] = useState<string>("");

  useEffect(() => {
    // Generate an ephemeral session tracking token when the component mounts natively
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
       setSessionId(crypto.randomUUID());
    } else {
       setSessionId(Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15));
    }

    // Dynamically inject Vimeo Player SDK to circumvent missing global node packages
    const script = document.createElement("script");
    script.src = "https://player.vimeo.com/api/player.js";
    script.async = true;
    document.body.appendChild(script);

    let player: VimeoPlayerInstance | null = null;

    script.onload = () => {
      if (!iframeRef.current || !window.Vimeo) return;

      player = new window.Vimeo.Player(iframeRef.current);
      let lastReportedTime = 0;

      // Function to send silent POST logs
      const reportTelemetry = (eventType: string, seconds: number) => {
         if (!sessionId) return;
         // Send off a standard beacon (avoids waiting for promises)
         const payload = {
           lessonId,
           sessionId,
           videoPositionSeconds: Math.floor(seconds),
           eventType,
           deviceType: /Mobile|Android|iP(ad|hone)/.test(navigator.userAgent) ? 'Mobile' : 'Desktop'
         };

         if (navigator.sendBeacon) {
            navigator.sendBeacon("/api/telemetry/lesson-view", JSON.stringify(payload));
         } else {
            fetch("/api/telemetry/lesson-view", {
              method: "POST",
              headers: { "Content-Type": "application/json", 'keep-alive': 'true' },
              body: JSON.stringify(payload)
            }).catch(() => {});
         }
      };

      // Player Event Hooks
      player.on('play', (data: VimeoEventData) => {
         reportTelemetry('play', data.seconds);
         lastReportedTime = data.seconds;
      });

      player.on('pause', (data: VimeoEventData) => {
         reportTelemetry('pause', data.seconds);
      });

      player.on('seeked', (data: VimeoEventData) => {
         reportTelemetry('seeked', data.seconds);
         lastReportedTime = data.seconds;
      });

      // The 15 Second Heartbeat Throttle
      player.on('timeupdate', (data: VimeoEventData) => {
         const currentSecs = data.seconds;
         // Only log back to DB loosely every 15 absolute seconds to save server loads
         if (currentSecs - lastReportedTime >= 15 || lastReportedTime - currentSecs >= 15) {
            reportTelemetry('timeupdate', currentSecs);
            lastReportedTime = currentSecs;
         }
      });
      
      player.on('ended', (data: VimeoEventData) => {
         reportTelemetry('ended', data.seconds);
      });
    };

    return () => {
      // Cleanup
      if (player?.off) {
         player.off('play');
         player.off('pause');
         player.off('timeupdate');
         player.off('seeked');
         player.off('ended');
      }
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, [lessonId, sessionId, vimeoEmbedUrl]);

  return (
    <div className="relative w-full pb-[56.25%] bg-black">
      <iframe 
        ref={iframeRef}
        src={vimeoEmbedUrl} 
        className="absolute top-0 left-0 w-full h-full border-0" 
        allow="autoplay; fullscreen; picture-in-picture" 
        allowFullScreen
      ></iframe>
    </div>
  );
}
