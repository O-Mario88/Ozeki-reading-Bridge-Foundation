"use client";

import { useState, useTransition } from "react";
import { joinOnlineTrainingSessionAction } from "@/app/events/actions";
import { Calendar, Clock, Video, Download, User as UserIcon, CheckCircle2, Copy } from "lucide-react";
import Image from "next/image";

export type EventCardProps = {
  session: {
    id: number;
    title: string;
    description: string | null;
    audience: string | null;
    startTime: string;
    endTime: string;
    meetJoinUrl: string | null;
  };
  resources: Array<{ id: number; title: string }>;
  isSignedUp: boolean;
  isLoggedIn: boolean;
};

export function EventCard({ session, resources, isSignedUp: initiallySignedUp, isLoggedIn }: EventCardProps) {
  const [isPending, startTransition] = useTransition();
  const [isSignedUp, setIsSignedUp] = useState(initiallySignedUp);
  const [copied, setCopied] = useState(false);

  const startDate = new Date(session.startTime);
  const endDate = new Date(session.endTime);

  const handleSignUp = () => {
    if (!isLoggedIn) {
      window.location.href = `/portal/login?continue=/events`;
      return;
    }

    startTransition(async () => {
      const res = await joinOnlineTrainingSessionAction(session.id);
      if (res.ok) {
        setIsSignedUp(true);
      } else if (res.redirectTo) {
        window.location.href = res.redirectTo;
      }
    });
  };

  const handleCopyLink = () => {
    if (session.meetJoinUrl) {
      navigator.clipboard.writeText(session.meetJoinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <article className="group bg-white rounded-[2rem] overflow-hidden shadow-lg border border-gray-100 transition-all hover:shadow-2xl hover:-translate-y-1 relative flex flex-col h-full">
      {/* Fallback pattern block for thumbnail */}
      <div className="h-48 relative bg-gradient-to-br from-brand-primary/90 to-[#1f2a44] p-6 flex flex-col justify-end overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 bg-white opacity-10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10">
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold uppercase tracking-wider backdrop-blur-sm mb-3">
            Online Training
          </span>
          <h3 className="text-2xl font-bold text-white leading-tight line-clamp-2">
            {session.title}
          </h3>
        </div>
      </div>

      <div className="p-8 flex-1 flex flex-col">
        {/* Metadata grid */}
        <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm text-gray-600 mb-6">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-brand-primary" />
            <span className="font-medium">{startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-brand-primary" />
            <span className="font-medium">
              {startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </span>
          </div>
          <div className="flex items-start gap-2 col-span-2">
            <UserIcon size={16} className="text-brand-primary shrink-0 mt-0.5" />
            <span className="font-medium leading-snug">
              Audience: {session.audience || "Educators & Stakeholders"}
            </span>
          </div>
        </div>

        {session.description ? (
          <p className="text-gray-600 line-clamp-3 mb-8 flex-1">
            {session.description}
          </p>
        ) : (
          <div className="flex-1 mb-8" />
        )}

        {/* Action Buttons */}
        <div className="mt-auto space-y-3">
          {isSignedUp ? (
            <div className="px-6 py-3.5 rounded-full bg-green-50 text-green-700 font-bold flex items-center justify-center gap-2 border border-green-200 w-full text-center">
              <CheckCircle2 size={18} />
              You are signed up!
            </div>
          ) : (
            <button
              onClick={handleSignUp}
              disabled={isPending}
              className="w-full px-6 py-3.5 rounded-full bg-brand-primary text-white font-bold hover:bg-brand-primary/90 transition-colors flex justify-center items-center shadow-md hover:shadow-lg disabled:opacity-70"
            >
              {isPending ? "Signing up..." : "Sign Up"}
            </button>
          )}

          {isSignedUp && session.meetJoinUrl ? (
            <button
              onClick={handleCopyLink}
              className="w-full px-6 py-3.5 rounded-full bg-blue-50 text-blue-700 font-semibold hover:bg-blue-100 transition-colors flex justify-center items-center gap-2 border border-blue-100 shadow-sm"
            >
              <Video size={18} />
              {copied ? "Link Copied!" : "Copy Google Meet Link"}
            </button>
          ) : null}

          {resources.length > 0 ? (
            resources.map(res => (
              <a
                key={res.id}
                href={isSignedUp ? `/api/events/${session.id}/resources/${res.id}/download` : '#'}
                onClick={(e) => {
                  if (!isSignedUp) {
                    e.preventDefault();
                    alert("Please Sign Up first to unlock and download this training material.");
                  }
                }}
                className={`w-full px-6 py-3.5 rounded-full font-semibold flex items-center justify-center gap-2 border transition-colors ${
                  isSignedUp
                    ? "bg-white border-gray-200 text-gray-800 hover:bg-gray-50 shadow-sm"
                    : "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                <Download size={18} />
                <span className="truncate max-w-[200px]">{res.title}</span>
                {!isSignedUp && <span className="ml-1 text-xs uppercase tracking-wider">(Locked)</span>}
              </a>
            ))
          ) : (
             <div className={`w-full px-6 py-3.5 rounded-full font-semibold flex items-center justify-center gap-2 border transition-colors bg-gray-50 border-gray-100 text-gray-400 cursor-not-allowed`}>
               <Download size={18} />
               <span>No resources posted yet</span>
             </div>
          )}
        </div>
      </div>
    </article>
  );
}
