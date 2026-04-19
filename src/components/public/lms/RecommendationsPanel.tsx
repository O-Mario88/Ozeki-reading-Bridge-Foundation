"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Recommendation = {
  lessonId: number;
  slug: string;
  title: string;
  description: string | null;
  classLevel: string | null;
  phonicsLevel: string | null;
  thumbnailUrl: string | null;
  duration: number | null;
  teacherName: string | null;
  avgRating: number | null;
  ratingsCount: number;
  totalViews: number;
  reasonCode: "weakest_domain" | "popular" | "unwatched_peer_recommended" | "same_level";
  reasonText: string;
};

function formatDuration(s: number | null): string {
  if (!s) return "";
  const mins = Math.floor(s / 60);
  return `${mins}m`;
}

export function RecommendationsPanel() {
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/recorded-lessons/recommendations")
      .then((r) => {
        if (r.status === 401 || r.status === 307) {
          setUnauthorized(true);
          return null;
        }
        return r.ok ? r.json() : null;
      })
      .then((json) => { if (active && json?.data) setRecs(json.data); })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  if (unauthorized) {
    return (
      <aside className="lms-recs">
        <h3>Recommended for you</h3>
        <p className="text-gray-500 text-sm">
          <Link href="/portal/login">Sign in</Link> to get personalised lesson recommendations based on your class grade and your school&apos;s reading outcomes.
        </p>
      </aside>
    );
  }
  if (loading) return <aside className="lms-recs"><h3>Recommended for you</h3><p>Loading…</p></aside>;
  if (recs.length === 0) return null;

  return (
    <aside className="lms-recs">
      <h3>Recommended for you</h3>
      <div className="lms-recs-grid">
        {recs.map((r) => (
          <Link key={r.lessonId} href={`/recorded-lessons/${r.slug}`} className="lms-rec-card">
            {r.thumbnailUrl ? (
              <div className="lms-rec-thumb" style={{ backgroundImage: `url(${r.thumbnailUrl})` }}>
                {r.duration ? <span className="lms-rec-duration">{formatDuration(r.duration)}</span> : null}
              </div>
            ) : (
              <div className="lms-rec-thumb lms-rec-thumb-placeholder">{r.classLevel ?? "Lesson"}</div>
            )}
            <div className="lms-rec-body">
              <small className={`lms-rec-reason lms-rec-reason-${r.reasonCode.replace("_", "-")}`}>
                {r.reasonCode === "weakest_domain" && "🎯 Targeted for your school"}
                {r.reasonCode === "same_level" && "👩‍🏫 Same class level"}
                {r.reasonCode === "popular" && "⭐ Popular"}
                {r.reasonCode === "unwatched_peer_recommended" && "Peers recommend"}
              </small>
              <strong className="lms-rec-title">{r.title}</strong>
              <small className="lms-rec-meta">
                {r.teacherName ? `${r.teacherName} · ` : ""}
                {r.classLevel ?? ""}
                {r.avgRating !== null ? ` · ★${r.avgRating.toFixed(1)}` : ""}
              </small>
              <small className="lms-rec-reason-text">{r.reasonText}</small>
            </div>
          </Link>
        ))}
      </div>
    </aside>
  );
}
