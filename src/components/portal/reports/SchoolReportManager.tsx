"use client";

import { useState } from "react";
import { 
  createReportDraftAction, 
  generateNarrativeAction, 
  approveReportAction 
} from "@/app/actions/school-report-actions";
import { LucideFileText, LucideZap, LucideCheckCircle, LucideEdit3, LucideLoader2 } from "lucide-react";

interface SchoolReportManagerProps {
  schoolId: number;
}

export default function SchoolReportManager({ schoolId }: SchoolReportManagerProps) {
  const [step, setStep] = useState<"init" | "facts" | "narrative" | "review" | "done">("init");
  const [loading, setLoading] = useState(false);
  const [reportId, setReportId] = useState<number | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [factPack, setFactPack] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [narrative, setNarrative] = useState<any>(null);
  const [override, setOverride] = useState("");

  const [dates, setDates] = useState({
    start: "2024-01-01",
    end: "2024-12-31"
  });

  async function handleInit() {
    setLoading(true);
    try {
      const { draftId, factPack } = await createReportDraftAction(schoolId, dates.start, dates.end);
      setReportId(draftId);
      setFactPack(factPack);
      setStep("facts");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateAI() {
    if (!reportId) return;
    setLoading(true);
    try {
      const result = await generateNarrativeAction(reportId);
      setNarrative(result);
      setOverride(result.executiveSummary);
      setStep("narrative");
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    if (!reportId) return;
    setLoading(true);
    try {
      await approveReportAction(reportId, override);
      setStep("done");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card shadow-lg overflow-hidden">
      <header className="bg-gray-50 p-6 border-bottom flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <LucideFileText className="text-blue-600" />
            Governed School Report Pipeline
          </h2>
          <p className="text-sm text-gray-500 mt-1">Facts → AI → Staff Review → Immutable PDF</p>
        </div>
        <div className="flex gap-2">
          {["init", "facts", "narrative", "done"].map((s, i) => (
            <div 
              key={s} 
              className={`h-2 w-8 rounded-full ${i <= ["init", "facts", "narrative", "done"].indexOf(step) ? 'bg-blue-600' : 'bg-gray-200'}`}
            />
          ))}
        </div>
      </header>

      <div className="p-8 min-h-[400px]">
        {step === "init" && (
          <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto py-10">
            <div className="p-4 bg-blue-50 rounded-full mb-6">
              <LucideZap className="w-10 h-10 text-blue-600" />
            </div>
            <h3 className="text-lg font-bold mb-2">Initialize Performance Scan</h3>
            <p className="text-gray-500 mb-8">
              Ozeki will scan all literacy assessments, coaching visits, and teacher evaluations for the selected period to build an immutable Fact Pack.
            </p>
            <div className="grid grid-cols-2 gap-4 w-full mb-8">
              <input type="date" value={dates.start} onChange={e => setDates({...dates, start: e.target.value})} className="input" />
              <input type="date" value={dates.end} onChange={e => setDates({...dates, end: e.target.value})} className="input" />
            </div>
            <button disabled={loading} onClick={handleInit} className="button button-primary w-full">
              {loading ? <LucideLoader2 className="animate-spin mr-2" /> : "Extract School Facts"}
            </button>
          </div>
        )}

        {step === "facts" && factPack && (
          <div className="space-y-6">
            <div className="p-4 bg-green-50 border border-green-100 rounded-lg text-green-800 text-sm">
              <strong>Fact Pack Extracted</strong>. All metrics below are code-computed and locked for analysis.
            </div>
            <div className="grid grid-cols-3 gap-6">
              <div className="p-4 bg-gray-50 rounded-lg">
                <span className="text-xs uppercase font-bold text-gray-400">Literacy Progress</span>
                <p className="text-2xl font-bold">{factPack.assessments.totalLearners} Learners</p>
                <p className="text-sm text-gray-500">Avg: {factPack.assessments.avgStoryScore.toFixed(1)} / 6.0</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <span className="text-xs uppercase font-bold text-gray-400">Operational Benchmarks</span>
                <p className="text-2xl font-bold">{factPack.visits.total} Visits</p>
                <p className="text-sm text-gray-500">Last: {factPack.visits.lastVisitDate || "N/A"}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <span className="text-xs uppercase font-bold text-gray-400">Teacher Quality</span>
                <p className="text-2xl font-bold">{factPack.evaluations.total} Evaluations</p>
                <p className="text-sm text-gray-500">Avg Level: {factPack.evaluations.avgLevel}</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-8">
              <button disabled={loading} onClick={() => setStep("init")} className="button button-ghost">Reset</button>
              <button disabled={loading} onClick={handleGenerateAI} className="button button-primary flex items-center gap-2">
                {loading ? <LucideLoader2 className="animate-spin" /> : <LucideZap className="w-4 h-4" />}
                Run AI Narrative Analysis
              </button>
            </div>
          </div>
        )}

        {step === "narrative" && narrative && (
          <div className="space-y-6">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <LucideEdit3 className="text-blue-600" />
              Draft Narrative Review
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase">AI Executive Summary (Edit if needed)</label>
                <textarea 
                  value={override} 
                  onChange={e => setOverride(e.target.value)}
                  className="input w-full min-h-[120px] mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="p-4 border rounded-lg bg-gray-50">
                  <strong className="block text-sm mb-2">Literacy Analysis</strong>
                  <p className="text-sm text-gray-600 italic">"{narrative.literacyProgressNarrative}"</p>
                </div>
                <div className="p-4 border rounded-lg bg-gray-50">
                  <strong className="block text-sm mb-2">Operational Health</strong>
                  <p className="text-sm text-gray-600 italic">"{narrative.operationalEfficiency}"</p>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-8">
              <button onClick={() => setStep("facts")} className="button button-ghost">Back</button>
              <button disabled={loading} onClick={handleApprove} className="button button-primary flex items-center gap-2">
                {loading ? <LucideLoader2 className="animate-spin" /> : <LucideCheckCircle className="w-4 h-4" />}
                Approve & Finalize PDF
              </button>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto py-10">
            <div className="p-4 bg-green-100 rounded-full mb-6">
              <LucideCheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-lg font-bold mb-2">Report Approved & Locked</h3>
            <p className="text-gray-500 mb-8">
              The report is now archived. A permanent, immutable PDF has been generated and is ready for donor distribution or school feedback.
            </p>
            <a href={`/api/portal/schools/${schoolId}/reports/${reportId}/pdf`} target="_blank" rel="noreferrer" className="button button-primary w-full shadow-md text-center inline-block">
              Download PDF Report
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
