"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp, TrendingDown, Activity, School as SchoolIcon, Users,
  Award, ChevronRight, BarChart3, AlertCircle, Loader2,
} from "lucide-react";
import Link from "next/link";

interface SessionEffectiveness {
  sessionId: number;
  sessionTitle: string;
  sessionEndedAt: string | null;
  schoolsRepresented: number;
  teachersAttended: number;
  followupVisitsCount: number;
  observationsAfter: {
    total: number;
    fidelityCount: number;
    fidelityPct: number;
  };
  outcomeDelta: {
    comprehensionBefore: number | null;
    comprehensionAfter: number | null;
    comprehensionDeltaPp: number | null;
    fluencyBefore: number | null;
    fluencyAfter: number | null;
    fluencyDeltaPp: number | null;
    sampleSize: number;
  };
  schoolsList: Array<{
    schoolId: number;
    schoolName: string;
    district: string;
    teachersAttended: number;
    followupVisits: number;
    fidelityObservations: number;
    comprehensionDeltaPp: number | null;
  }>;
}

interface Props {
  sessionId: number;
}

function deltaIcon(delta: number | null) {
  if (delta == null) return null;
  if (delta > 0.5) return <TrendingUp className="w-4 h-4 text-emerald-600" />;
  if (delta < -0.5) return <TrendingDown className="w-4 h-4 text-red-500" />;
  return <Activity className="w-4 h-4 text-gray-400" />;
}

function deltaClass(delta: number | null): string {
  if (delta == null) return "text-gray-400";
  if (delta > 0.5) return "text-emerald-700";
  if (delta < -0.5) return "text-red-600";
  return "text-gray-500";
}

export function SessionEffectivenessPanel({ sessionId }: Props) {
  const [data, setData] = useState<SessionEffectiveness | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/portal/training/sessions/${sessionId}/effectiveness`);
        if (!res.ok) {
          setError("Unable to load effectiveness data.");
          return;
        }
        const d = await res.json();
        if (!cancelled) setData(d);
      } catch {
        if (!cancelled) setError("Network error.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Computing session effectiveness…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-700">{error ?? "No data available yet."}</p>
      </div>
    );
  }

  if (data.schoolsRepresented === 0) {
    return (
      <div className="rounded-xl bg-gray-50 border border-dashed border-gray-200 py-12 text-center">
        <BarChart3 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-sm font-semibold text-gray-700">No attendance data linked yet</p>
        <p className="text-xs text-gray-500 mt-1">
          Effectiveness analysis compares outcomes at schools whose teachers attended this session.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Executive summary line */}
      <div className="rounded-2xl bg-gradient-to-br from-[#006b61] to-[#004d46] text-white p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-white/70 mb-2">
          Session Effectiveness
        </p>
        {data.outcomeDelta.comprehensionDeltaPp != null && data.outcomeDelta.sampleSize >= 5 ? (
          <p className="text-lg md:text-xl font-semibold leading-tight">
            Schools attending this session improved comprehension by{" "}
            <span className="text-3xl font-extrabold">
              {data.outcomeDelta.comprehensionDeltaPp >= 0 ? "+" : ""}{data.outcomeDelta.comprehensionDeltaPp} pp
            </span>{" "}
            on average, measured across {data.outcomeDelta.sampleSize.toLocaleString()} post-session learner assessments.
          </p>
        ) : (
          <p className="text-sm text-white/90">
            {data.teachersAttended} teachers from {data.schoolsRepresented} schools attended.
            Post-session outcomes will appear here as follow-up assessments are logged.
          </p>
        )}
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <SchoolIcon className="w-4 h-4 text-gray-400" />
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Schools</p>
          </div>
          <p className="text-2xl font-extrabold text-gray-900">{data.schoolsRepresented}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <Users className="w-4 h-4 text-gray-400" />
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Teachers</p>
          </div>
          <p className="text-2xl font-extrabold text-gray-900">{data.teachersAttended}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <Activity className="w-4 h-4 text-gray-400" />
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Follow-up Visits</p>
          </div>
          <p className="text-2xl font-extrabold text-gray-900">{data.followupVisitsCount}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <Award className="w-4 h-4 text-gray-400" />
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Fidelity Obs</p>
          </div>
          <p className="text-2xl font-extrabold text-gray-900">
            {data.observationsAfter.fidelityCount}
            <span className="text-sm text-gray-400"> / {data.observationsAfter.total}</span>
          </p>
        </div>
      </div>

      {/* Outcome deltas (if available) */}
      {(data.outcomeDelta.comprehensionDeltaPp != null || data.outcomeDelta.fluencyDeltaPp != null) && (
        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">
            Learner Outcomes — Before vs After
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            {data.outcomeDelta.comprehensionDeltaPp != null && (
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
                <p className="text-xs font-semibold text-gray-500 mb-2">Reading Comprehension</p>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">Before</span>
                  <span className="text-sm font-bold text-gray-700">{data.outcomeDelta.comprehensionBefore}%</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">After</span>
                  <span className="text-sm font-bold text-gray-700">{data.outcomeDelta.comprehensionAfter}%</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Change</span>
                  <span className={`flex items-center gap-1 text-lg font-extrabold ${deltaClass(data.outcomeDelta.comprehensionDeltaPp)}`}>
                    {deltaIcon(data.outcomeDelta.comprehensionDeltaPp)}
                    {data.outcomeDelta.comprehensionDeltaPp >= 0 ? "+" : ""}{data.outcomeDelta.comprehensionDeltaPp} pp
                  </span>
                </div>
              </div>
            )}
            {data.outcomeDelta.fluencyDeltaPp != null && (
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
                <p className="text-xs font-semibold text-gray-500 mb-2">Fluency (CWPM accuracy)</p>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">Before</span>
                  <span className="text-sm font-bold text-gray-700">{data.outcomeDelta.fluencyBefore}%</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">After</span>
                  <span className="text-sm font-bold text-gray-700">{data.outcomeDelta.fluencyAfter}%</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Change</span>
                  <span className={`flex items-center gap-1 text-lg font-extrabold ${deltaClass(data.outcomeDelta.fluencyDeltaPp)}`}>
                    {deltaIcon(data.outcomeDelta.fluencyDeltaPp)}
                    {data.outcomeDelta.fluencyDeltaPp >= 0 ? "+" : ""}{data.outcomeDelta.fluencyDeltaPp} pp
                  </span>
                </div>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400 italic mt-3">
            Window: 90 days before session vs 180 days after. n = {data.outcomeDelta.sampleSize.toLocaleString()} post-session assessments.
          </p>
        </div>
      )}

      {/* Schools breakdown */}
      {data.schoolsList.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
            School-Level Breakdown
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100">
                  <th className="py-2 px-2 font-semibold">School</th>
                  <th className="py-2 px-2 font-semibold text-center">Teachers</th>
                  <th className="py-2 px-2 font-semibold text-center">Visits</th>
                  <th className="py-2 px-2 font-semibold text-center">Fidelity Obs</th>
                  <th className="py-2 px-2 font-semibold text-right">Comp. Δ</th>
                  <th className="py-2 px-2"></th>
                </tr>
              </thead>
              <tbody>
                {data.schoolsList.slice(0, 15).map((s) => (
                  <tr key={s.schoolId} className="border-b border-gray-50">
                    <td className="py-2.5 px-2">
                      <p className="font-semibold text-gray-800">{s.schoolName}</p>
                      <p className="text-xs text-gray-400">{s.district}</p>
                    </td>
                    <td className="py-2.5 px-2 text-center text-gray-700">{s.teachersAttended}</td>
                    <td className="py-2.5 px-2 text-center text-gray-700">{s.followupVisits}</td>
                    <td className="py-2.5 px-2 text-center text-gray-700">{s.fidelityObservations}</td>
                    <td className={`py-2.5 px-2 text-right font-semibold ${deltaClass(s.comprehensionDeltaPp)}`}>
                      {s.comprehensionDeltaPp != null
                        ? `${s.comprehensionDeltaPp >= 0 ? "+" : ""}${s.comprehensionDeltaPp} pp`
                        : "—"}
                    </td>
                    <td className="py-2.5 px-2 text-right">
                      <Link
                        href={`/portal/schools/${s.schoolId}/dossier`}
                        className="text-xs text-[#006b61] font-semibold hover:underline inline-flex items-center gap-0.5"
                      >
                        Dossier <ChevronRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
