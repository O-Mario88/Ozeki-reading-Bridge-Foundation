"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, ShieldAlert, Loader2 } from "lucide-react";

interface IntegrityStatus {
  verifiedOk: boolean;
  checkpointDate: string | null;
  rowsVerified: number;
  lastSequence: number;
}

/**
 * Public "Integrity verified" badge for the transparency page. Hits
 * /api/integrity/status (cached 5 min) which reads the last daily
 * checkpoint from finance_audit_checkpoints. Green = chain verified by
 * yesterday's cron; red = chain was broken at last check.
 */
export function IntegrityBadge() {
  const [data, setData] = useState<IntegrityStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/integrity/status");
        if (!res.ok) return;
        const d = await res.json();
        if (!cancelled) setData(d);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-gray-500 text-xs font-semibold">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Checking integrity…
      </span>
    );
  }

  if (!data || !data.checkpointDate) {
    return null; // no checkpoint yet — don't mislead either way
  }

  if (data.verifiedOk) {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-[#044f4d] text-xs font-semibold"
        title={`${data.rowsVerified.toLocaleString()} events hash-chained and verified on ${data.checkpointDate}.`}
      >
        <ShieldCheck className="w-3.5 h-3.5" />
        Integrity verified · {data.checkpointDate}
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 border border-red-200 text-red-800 text-xs font-semibold"
      title="The finance audit chain could not be verified at the last check. Ozeki's team has been notified."
    >
      <ShieldAlert className="w-3.5 h-3.5" />
      Integrity check failed · {data.checkpointDate}
    </span>
  );
}
