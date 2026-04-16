"use client";

import { useState } from "react";
import { Maximize, Minimize, Video, Radio, ExternalLink, Mail, CheckCircle2, Loader2 } from "lucide-react";
import type { OnlineTrainingSessionRecord } from "@/lib/types";

interface SessionVideoPanelProps {
  session: OnlineTrainingSessionRecord;
  trainerName?: string;
  isStaff?: boolean;
}

export function SessionVideoPanel({ session, trainerName = "Ozeki Trainer" }: SessionVideoPanelProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [rsvpEmail, setRsvpEmail] = useState("");
  const [rsvpName, setRsvpName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rsvpStatus, setRsvpStatus] = useState<"idle" | "success" | "error">("idle");

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
      className={`relative bg-black rounded-2xl overflow-hidden shadow-sm flex flex-col ${isFullscreen ? "h-screen w-screen rounded-none" : "w-full aspect-video"
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
              : session.status === "scheduled"
                ? "This session is upcoming. Confirm your attendance below to get an official calendar invite."
                : "This session has concluded."}
          </p>
        </div>

        {session.status === "scheduled" ? (
           rsvpStatus === "success" ? (
             <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-6 py-4 rounded-xl flex flex-col items-center gap-2 max-w-md w-full">
               <CheckCircle2 className="w-8 h-8 text-emerald-400" />
               <p className="font-bold">Attendance Confirmed!</p>
               <p className="text-sm text-center">An official Google Calendar invite has been sent to your email with the secure Meet link attached.</p>
             </div>
           ) : (
             <form 
               onSubmit={async (e) => {
                 e.preventDefault();
                 setIsSubmitting(true);
                 setRsvpStatus("idle");
                 try {
                   const res = await fetch(`/api/training/${session.id}/rsvp`, {
                     method: "POST",
                     headers: { "Content-Type": "application/json" },
                     body: JSON.stringify({ name: rsvpName, email: rsvpEmail })
                   });
                   if (res.ok) setRsvpStatus("success");
                   else setRsvpStatus("error");
                 } catch {
                   setRsvpStatus("error");
                 } finally {
                   setIsSubmitting(false);
                 }
               }}
               className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 w-full max-w-md flex flex-col gap-4"
             >
               <h3 className="font-bold text-lg text-white">Confirm Attendance</h3>
               {rsvpStatus === "error" && <p className="text-red-400 text-sm">Failed to confirm attendance. Please try again.</p>}
               <input 
                 type="text" 
                 placeholder="Your Name" 
                 required 
                 value={rsvpName}
                 onChange={e => setRsvpName(e.target.value)}
                 className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500" 
               />
               <input 
                 type="email" 
                 placeholder="Your Email Address" 
                 required 
                 value={rsvpEmail}
                 onChange={e => setRsvpEmail(e.target.value)}
                 className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500" 
               />
               <button 
                 type="submit" 
                 disabled={isSubmitting}
                 className="bg-[#4A7C59] hover:bg-[#3d664a] text-white font-bold py-3 rounded-lg flex justify-center items-center gap-2 transition-colors disabled:opacity-50"
               >
                 {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mail className="w-5 h-5" />}
                 Send Calendar Invite
               </button>
             </form>
           )
        ) : session.meetJoinUrl ? (
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
