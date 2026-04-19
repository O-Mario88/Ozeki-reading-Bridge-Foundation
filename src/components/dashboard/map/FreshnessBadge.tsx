"use client";

import { useEffect, useState } from "react";

type Props = {
  lastUpdatedIso: string | undefined | null;
  nextRefreshMinutes?: number;
};

function formatRelative(ts: number): string {
  const diffMs = Date.now() - ts;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins === 1) return "1 min ago";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs === 1) return "1 hr ago";
  if (hrs < 24) return `${hrs} hrs ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}

export function FreshnessBadge({ lastUpdatedIso, nextRefreshMinutes = 15 }: Props) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  if (!lastUpdatedIso) return null;
  const ts = new Date(lastUpdatedIso).getTime();
  const ageMs = Date.now() - ts;
  const isStale = ageMs > nextRefreshMinutes * 60_000;

  return (
    <div className={`impact-freshness ${isStale ? "is-stale" : "is-fresh"}`} title={new Date(lastUpdatedIso).toLocaleString()}>
      <span className="impact-freshness-dot" aria-hidden />
      <span className="impact-freshness-text">
        {isStale ? "Refreshing soon" : "Live"} · updated {formatRelative(ts)}
      </span>
    </div>
  );
}
