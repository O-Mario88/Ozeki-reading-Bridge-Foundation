"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp, TrendingDown, School, Users, BookOpen, Activity,
  Loader2, ChevronDown, ChevronUp, AlertCircle,
} from "lucide-react";

interface SchoolRow {
  schoolId: number;
  schoolName: string;
  district: string;
  enrollment: number;
  learnersAssessed: number;
  coachingVisits: number;
  trainingSessions: number;
  baselineComposite: number | null;
  endlineComposite: number | null;
  scoreImprovementPp: number | null;
}

interface ImpactChain {
  sponsorshipReference: string;
  donorDisplayName: string;
  amount: number;
  currency: string;
  targetType: string;
  targetName: string | null;
  district: string | null;
  region: string | null;
  reachedSchools: SchoolRow[];
  totals: {
    schools: number;
    learners: number;
    teachersTrained: number;
    coachingVisits: number;
    trainingSessions: number;
    avgScoreImprovementPp: number | null;
  };
}

interface Props {
  sponsorshipReference: string;
}

export function SponsorshipImpactChain({ sponsorshipReference }: Props) {
  const [data, setData] = useState<ImpactChain | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/sponsors/${encodeURIComponent(sponsorshipReference)}/impact`);
        if (!res.ok) {
          if (res.status === 404) setError("Your impact data is still being compiled.");
          else setError("Unable to load impact data.");
          return;
        }
        const d = await res.json();
        if (!cancelled) setData(d);
      } catch {
        if (!cancelled) setError("Network error. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [sponsorshipReference]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-400 text-sm">
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        Computing your impact…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-700">{error ?? "Impact data will appear here soon."}</p>
      </div>
    );
  }

  if (data.reachedSchools.length === 0) return null;

  const t = data.totals;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Headline */}
      <div className="bg-gradient-to-br from-[#006b61] to-[#004d46] text-white p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-2">Your Donation Reached</p>
        <p className="text-lg md:text-xl font-semibold leading-tight">
          <strong className="text-3xl">{t.schools}</strong> schools, {" "}
          <strong className="text-3xl">{t.learners.toLocaleString()}</strong> learners assessed
          {t.avgScoreImprovementPp != null && (
            <>
              , average score improvement of{" "}
              <strong className="text-3xl">
                {t.avgScoreImprovementPp >= 0 ? "+" : ""}{t.avgScoreImprovementPp} pp
              </strong>
            </>
          )}
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border-b border-gray-100">
        {[
          { label: "Schools Reached", value: t.schools, icon: School },
          { label: "Teachers Trained", value: t.teachersTrained, icon: Users },
          { label: "Coaching Visits", value: t.coachingVisits, icon: Activity },
          { label: "Training Sessions", value: t.trainingSessions, icon: BookOpen },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="p-4 text-center border-r border-b md:border-b-0 last:border-r-0 border-gray-50">
            <Icon className="w-4 h-4 text-gray-400 mx-auto mb-1" />
            <p className="text-2xl font-extrabold text-gray-900">{value.toLocaleString()}</p>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Expandable school table */}
      <div className="p-5">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
        >
          <span>See every school your sponsorship reached</span>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {expanded && (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100">
                  <th className="py-2 px-2 font-semibold">School</th>
                  <th className="py-2 px-2 font-semibold text-center">Learners</th>
                  <th className="py-2 px-2 font-semibold text-center">Visits</th>
                  <th className="py-2 px-2 font-semibold text-right">Score Δ</th>
                </tr>
              </thead>
              <tbody>
                {data.reachedSchools.map((s) => (
                  <tr key={s.schoolId} className="border-b border-gray-50">
                    <td className="py-2.5 px-2">
                      <p className="font-semibold text-gray-800">{s.schoolName}</p>
                      <p className="text-xs text-gray-400">{s.district}</p>
                    </td>
                    <td className="py-2.5 px-2 text-center text-gray-700">{s.learnersAssessed}</td>
                    <td className="py-2.5 px-2 text-center text-gray-700">{s.coachingVisits}</td>
                    <td className="py-2.5 px-2 text-right">
                      {s.scoreImprovementPp != null ? (
                        <span className={`inline-flex items-center gap-1 font-bold ${
                          s.scoreImprovementPp > 0.5 ? "text-emerald-700" :
                          s.scoreImprovementPp < -0.5 ? "text-red-600" : "text-gray-500"
                        }`}>
                          {s.scoreImprovementPp > 0 ? <TrendingUp className="w-3.5 h-3.5" /> :
                           s.scoreImprovementPp < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : null}
                          {s.scoreImprovementPp >= 0 ? "+" : ""}{s.scoreImprovementPp} pp
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-gray-400 italic mt-3">
              Score Δ = change in average composite reading score from baseline to endline
              for learners assessed at this school.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
