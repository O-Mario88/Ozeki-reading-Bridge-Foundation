"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck, ShieldAlert, CheckCircle2, Clock, Lock,
  AlertTriangle, Loader2, Plus,
} from "lucide-react";

interface PendingApproval {
  approvalId: number;
  expenseId: number;
  expenseNumber: string;
  amount: number;
  currency: string;
  vendorName: string | null;
  category: string | null;
  requiredRole: string;
  sequenceNumber: number;
  submittedAt: string;
}
interface PeriodLock {
  id: number;
  periodStart: string;
  periodEnd: string;
  lockedAt: string;
  reason: string | null;
}
interface ChainVerifyResult {
  ok: boolean;
  rowsVerified: number;
  lastSequence: number;
  lastHash: string;
  brokenAt: number | null;
  brokenReason: string | null;
}
interface Checkpoint {
  checkpointDate: string | null;
  verifiedOk: boolean;
  lastSequence: number;
  rowsVerified: number;
  brokenAt: number | null;
}

interface Props {
  approvals: PendingApproval[];
  locks: PeriodLock[];
  checkpoint: Checkpoint;
  liveVerify: ChainVerifyResult;
  userRoles: string[];
  canLockPeriods: boolean;
}

export function FinanceControlsPanel({ approvals, locks, checkpoint, liveVerify, userRoles, canLockPeriods }: Props) {
  const router = useRouter();
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const [newLock, setNewLock] = useState({ start: "", end: "", reason: "" });
  const [locking, setLocking] = useState(false);

  const decide = async (approvalId: number, decision: "approved" | "rejected") => {
    const notes = decision === "rejected" ? (window.prompt("Reason for rejection (required):") ?? "").trim() : null;
    if (decision === "rejected" && !notes) return;
    setPendingIds(new Set([...pendingIds, approvalId]));
    setError(null);
    try {
      const res = await fetch(`/api/portal/finance/approvals/${approvalId}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, notes }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? data.error ?? "Decision failed.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      const next = new Set(pendingIds);
      next.delete(approvalId);
      setPendingIds(next);
    }
  };

  const createLock = async () => {
    if (!newLock.start || !newLock.end) return;
    setLocking(true);
    setError(null);
    try {
      const res = await fetch(`/api/portal/finance/period-locks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodStart: newLock.start, periodEnd: newLock.end, reason: newLock.reason || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Lock failed.");
        return;
      }
      setNewLock({ start: "", end: "", reason: "" });
      router.refresh();
    } finally {
      setLocking(false);
    }
  };

  const chainOk = liveVerify.ok;

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Audit-chain integrity */}
      <div className={`rounded-2xl border p-6 ${chainOk ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
        <div className="flex items-start gap-4">
          {chainOk ? (
            <ShieldCheck className="w-10 h-10 text-emerald-600 shrink-0" />
          ) : (
            <ShieldAlert className="w-10 h-10 text-red-600 shrink-0" />
          )}
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900">
              Audit chain {chainOk ? "verified" : "BROKEN"}
            </h3>
            <p className="text-sm text-gray-700 mt-1">
              {chainOk ? (
                <>
                  {liveVerify.rowsVerified.toLocaleString()} events in chain · last sequence{" "}
                  <code className="bg-white px-1 rounded">{liveVerify.lastSequence}</code>
                </>
              ) : (
                <>
                  Break detected at sequence <strong>{liveVerify.brokenAt}</strong>: {liveVerify.brokenReason}.
                  Investigate immediately — a prior row has been mutated or the chain was corrupted.
                </>
              )}
            </p>
            {checkpoint.checkpointDate && (
              <p className="text-xs text-gray-500 mt-2">
                Last daily checkpoint: <strong>{checkpoint.checkpointDate}</strong>
                {checkpoint.verifiedOk ? " · verified" : " · BROKEN"}
                {" · "}{checkpoint.rowsVerified.toLocaleString()} rows verified
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Pending approvals */}
      <div className="rounded-2xl bg-white border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-gray-900">Pending Approvals</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Awaiting your decision · your roles:{" "}
              <strong className="text-gray-700">{userRoles.join(", ")}</strong>
            </p>
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100">
            <Clock className="w-3 h-3" />
            {approvals.length}
          </span>
        </div>

        {approvals.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-400">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            Nothing to review. You&apos;re all caught up.
          </div>
        ) : (
          <div className="space-y-2">
            {approvals.map((a) => (
              <div key={a.approvalId} className="flex items-start gap-4 rounded-xl bg-gray-50 border border-gray-100 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs bg-white border border-gray-200 px-1.5 py-0.5 rounded">
                      {a.expenseNumber}
                    </span>
                    <span className="text-xs text-gray-500">· step {a.sequenceNumber}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      · {a.requiredRole.replace("_", " ")}
                    </span>
                  </div>
                  <p className="font-semibold text-gray-900">
                    {a.currency} {Number(a.amount).toLocaleString()}
                    {a.vendorName && <span className="text-gray-500 font-normal"> — {a.vendorName}</span>}
                  </p>
                  {a.category && <p className="text-xs text-gray-500">{a.category}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => decide(a.approvalId, "rejected")}
                    disabled={pendingIds.has(a.approvalId)}
                    className="px-3 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-sm font-semibold disabled:opacity-50"
                  >
                    {pendingIds.has(a.approvalId) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Reject"}
                  </button>
                  <button
                    onClick={() => decide(a.approvalId, "approved")}
                    disabled={pendingIds.has(a.approvalId)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold disabled:opacity-50 flex items-center gap-1"
                  >
                    {pendingIds.has(a.approvalId) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Period locks */}
      <div className="rounded-2xl bg-white border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-gray-400" />
              Period Locks
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Once a period is locked, edits to expenses/receipts in that range are rejected at the database level.
            </p>
          </div>
        </div>

        {locks.length === 0 ? (
          <p className="text-sm text-gray-400 italic text-center py-6">No periods locked yet.</p>
        ) : (
          <div className="space-y-2 mb-4">
            {locks.map((l) => (
              <div key={l.id} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 border border-gray-100 px-3 py-2">
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-gray-400" />
                  <span className="font-mono text-xs">{l.periodStart} → {l.periodEnd}</span>
                  {l.reason && <span className="text-xs text-gray-500">· {l.reason}</span>}
                </div>
                <span className="text-xs text-gray-400">locked {new Date(l.lockedAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}

        {canLockPeriods && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Lock a new period</p>
            <div className="grid md:grid-cols-4 gap-2">
              <input
                type="date"
                value={newLock.start}
                onChange={(e) => setNewLock({ ...newLock, start: e.target.value })}
                className="px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <input
                type="date"
                value={newLock.end}
                onChange={(e) => setNewLock({ ...newLock, end: e.target.value })}
                className="px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <input
                type="text"
                placeholder="Reason (FY2025 close, etc.)"
                value={newLock.reason}
                onChange={(e) => setNewLock({ ...newLock, reason: e.target.value })}
                className="px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <button
                onClick={createLock}
                disabled={locking || !newLock.start || !newLock.end}
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#006b61] hover:bg-[#006b61]/90 disabled:bg-gray-300 text-white text-sm font-semibold"
              >
                {locking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Lock Period
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Locks are retroactive-edit blockers. Corrections to a locked period must be posted as reversing journal entries, never modifications.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
