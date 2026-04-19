"use client";

import { useEffect, useState } from "react";

type ResumeData = {
  lessonId: number;
  userId: number;
  currentPositionSeconds: number;
  maxPositionSeconds: number;
  percentWatched: number;
  completed: boolean;
  lastWatchedAt: string | null;
};

function formatTime(s: number): string {
  const mins = Math.floor(s / 60);
  const secs = Math.floor(s % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

type Props = {
  lessonSlug: string;
  onResume: (seconds: number) => void;
};

export function ResumeBanner({ lessonSlug, onResume }: Props) {
  const [data, setData] = useState<ResumeData | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`/api/recorded-lessons/${encodeURIComponent(lessonSlug)}/resume`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json: ResumeData | null) => {
        if (active && json && json.currentPositionSeconds > 15) {
          setData(json);
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, [lessonSlug]);

  if (!data || dismissed || data.completed) return null;

  return (
    <div className="lms-resume-banner" role="status">
      <div className="lms-resume-content">
        <strong>Welcome back.</strong>
        <span>
          You left off at <strong>{formatTime(data.currentPositionSeconds)}</strong>
          {data.percentWatched > 0 ? ` (${data.percentWatched}%)` : ""}.
          {data.lastWatchedAt ? ` Last watched ${new Date(data.lastWatchedAt).toLocaleDateString("en-GB")}.` : ""}
        </span>
      </div>
      <div className="lms-resume-actions">
        <button type="button" onClick={() => { onResume(data.currentPositionSeconds); setDismissed(true); }}>
          Resume from {formatTime(data.currentPositionSeconds)}
        </button>
        <button type="button" onClick={() => { onResume(0); setDismissed(true); }} className="lms-resume-secondary">
          Start over
        </button>
      </div>
      <div className="lms-resume-progress">
        <div className="lms-resume-progress-bar" style={{ width: `${data.percentWatched}%` }} />
      </div>
    </div>
  );
}
