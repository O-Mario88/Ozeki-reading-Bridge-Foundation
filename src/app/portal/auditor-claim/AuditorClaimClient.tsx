"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";

type ClaimState =
  | { kind: "idle" }
  | { kind: "claiming" }
  | { kind: "success"; redirectTo: string; accountExpiresAt: string }
  | { kind: "error"; message: string };

export function AuditorClaimClient() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<ClaimState>({ kind: "idle" });

  useEffect(() => {
    if (state.kind === "success") {
      const t = setTimeout(() => router.push(state.redirectTo), 1200);
      return () => clearTimeout(t);
    }
  }, [router, state]);

  const claim = async () => {
    if (!token) {
      setState({ kind: "error", message: "Missing token in URL." });
      return;
    }
    setState({ kind: "claiming" });
    try {
      const res = await fetch("/api/portal/auditor-claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        redirectTo?: string;
        accountExpiresAt?: string;
      };
      if (!res.ok || !data.ok) {
        setState({ kind: "error", message: data.error ?? "Could not claim invite." });
        return;
      }
      setState({
        kind: "success",
        redirectTo: data.redirectTo ?? "/portal/auditor",
        accountExpiresAt: data.accountExpiresAt ?? "",
      });
    } catch {
      setState({ kind: "error", message: "Network error. Please try again." });
    }
  };

  if (!token) {
    return (
      <p className="text-sm text-red-600 mt-4">
        This page needs a token. Open the link from the invite email.
      </p>
    );
  }

  if (state.kind === "success") {
    return (
      <div className="mt-6 rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-sm text-[#066a67] flex items-start gap-2">
        <ShieldCheck className="w-5 h-5 shrink-0" />
        <div>
          <p className="font-semibold">Session granted.</p>
          <p className="text-xs mt-1">
            Read-only access until{" "}
            {state.accountExpiresAt
              ? new Date(state.accountExpiresAt).toLocaleString()
              : "the issued window expires"}
            . Redirecting…
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={claim}
        disabled={state.kind === "claiming"}
        className="mt-6 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#066a67] text-white text-sm font-bold hover:bg-[#066a67]/90 disabled:bg-gray-300"
      >
        {state.kind === "claiming" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
        {state.kind === "claiming" ? "Claiming…" : "Claim audit session"}
      </button>
      {state.kind === "error" ? (
        <p className="mt-4 text-sm text-red-600">{state.message}</p>
      ) : null}
    </>
  );
}
