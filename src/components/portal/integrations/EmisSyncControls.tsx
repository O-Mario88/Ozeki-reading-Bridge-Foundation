"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowDown, ArrowUp } from "lucide-react";

export function EmisSyncControls() {
  const router = useRouter();
  const [running, setRunning] = useState<"pull" | "push" | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const trigger = async (direction: "pull" | "push") => {
    setRunning(direction);
    setFeedback(null);
    try {
      const res = await fetch(`/api/portal/integrations/emis/sync-now?direction=${direction}`, { method: "POST" });
      const data = (await res.json()) as { ok?: boolean; result?: { status: string; summary: string }; error?: string };
      if (!res.ok || !data.ok) {
        setFeedback(data.error ?? "Run failed.");
        return;
      }
      setFeedback(`${direction === "pull" ? "Pull" : "Push"} ${data.result?.status}: ${data.result?.summary ?? ""}`);
      router.refresh();
    } catch {
      setFeedback("Network error.");
    } finally {
      setRunning(null);
    }
  };

  return (
    <div className="rounded-2xl bg-white border border-gray-100 p-5">
      <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-3">Run a sync now</h3>
      <p className="text-xs text-gray-500 mb-4">Manual triggers. Cron auto-runs nightly when EMIS_API_TOKEN + CRON_TOKEN are set.</p>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => trigger("pull")} disabled={running !== null} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#066a67] text-white text-sm font-bold disabled:bg-gray-300">
          {running === "pull" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowDown className="w-4 h-4" />}
          Pull EMIS roster now
        </button>
        <button type="button" onClick={() => trigger("push")} disabled={running !== null} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm font-semibold text-gray-700 disabled:bg-gray-50">
          {running === "push" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
          Push outcomes now
        </button>
      </div>
      {feedback ? <p className="mt-3 text-xs text-gray-700">{feedback}</p> : null}
    </div>
  );
}
