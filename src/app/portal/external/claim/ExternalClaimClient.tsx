"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";

type State =
  | { kind: "claiming" }
  | { kind: "success"; redirectTo: string }
  | { kind: "error"; message: string };

export function ExternalClaimClient() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<State>({ kind: "claiming" });

  useEffect(() => {
    if (!token) {
      setState({ kind: "error", message: "Missing token in URL." });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/external/auth/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = (await res.json()) as { ok?: boolean; redirectTo?: string; error?: string };
        if (cancelled) return;
        if (!res.ok || !data.ok) {
          setState({ kind: "error", message: data.error ?? "Could not verify link." });
          return;
        }
        const target = data.redirectTo ?? "/";
        setState({ kind: "success", redirectTo: target });
        setTimeout(() => router.push(target), 600);
      } catch {
        if (!cancelled) setState({ kind: "error", message: "Network error. Please try again." });
      }
    })();
    return () => { cancelled = true; };
  }, [router, token]);

  if (state.kind === "claiming") {
    return (
      <div className="mt-5 flex items-center gap-2 text-sm text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin" /> Verifying…
      </div>
    );
  }
  if (state.kind === "success") {
    return <p className="mt-5 text-sm text-emerald-700">Signed in. Redirecting…</p>;
  }
  return (
    <div className="mt-5 rounded-xl bg-red-50 border border-red-100 p-4 flex items-start gap-2 text-red-700 text-sm">
      <AlertCircle className="w-5 h-5 shrink-0" />
      <div>
        <p className="font-semibold">Could not sign you in.</p>
        <p className="text-xs mt-1">{state.message}</p>
      </div>
    </div>
  );
}
