"use client";

import { useState } from "react";
import { Loader2, Mail, ShieldCheck } from "lucide-react";
import type { ExternalUserRole } from "@/lib/server/postgres/repositories/external-users";

type Props = {
  role: ExternalUserRole;
  roleLabel: string;
  helperText: string;
  showOrganization?: boolean;
  showDistrict?: boolean;
};

type SubmitState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "sent"; devClaimUrl?: string; deliveryStatus: "sent" | "failed" | "skipped" }
  | { kind: "error"; message: string };

export function ExternalLoginShell({ role, roleLabel, helperText, showOrganization, showDistrict }: Props) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [organization, setOrganization] = useState("");
  const [district, setDistrict] = useState("");
  const [state, setState] = useState<SubmitState>({ kind: "idle" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !fullName.trim()) {
      setState({ kind: "error", message: "Please enter your name and email." });
      return;
    }
    setState({ kind: "submitting" });
    try {
      const res = await fetch("/api/external/auth/request-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          fullName: fullName.trim(),
          role,
          organization: organization.trim() || undefined,
          district: district.trim() || undefined,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        deliveryStatus?: "sent" | "failed" | "skipped";
        devClaimUrl?: string;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setState({ kind: "error", message: data.error ?? "Could not send link." });
        return;
      }
      setState({
        kind: "sent",
        devClaimUrl: data.devClaimUrl,
        deliveryStatus: data.deliveryStatus ?? "sent",
      });
    } catch {
      setState({ kind: "error", message: "Network error. Please try again." });
    }
  };

  if (state.kind === "sent") {
    return (
      <div className="rounded-2xl bg-white border border-gray-100 p-8 max-w-md w-full">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Check your inbox</h2>
            <p className="text-sm text-gray-600 mt-1">
              We sent a sign-in link to <strong>{email}</strong>. It expires in 30 minutes.
            </p>
          </div>
        </div>
        {state.devClaimUrl ? (
          <div className="mt-5 rounded-xl bg-amber-50 border border-amber-100 p-4 text-xs text-amber-900">
            <p className="font-semibold">SMTP not configured on this environment.</p>
            <p className="mt-1">For testing, open this URL directly:</p>
            <p className="mt-2 break-all"><a href={state.devClaimUrl} className="text-[#066a67] underline">{state.devClaimUrl}</a></p>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl bg-white border border-gray-100 p-8 max-w-md w-full">
      <div className="flex items-center gap-2 mb-1">
        <ShieldCheck className="w-4 h-4 text-[#066a67]" />
        <p className="text-xs font-semibold text-[#066a67] uppercase tracking-wider">{roleLabel} portal</p>
      </div>
      <h1 className="text-xl font-bold text-gray-900">Sign in or get started</h1>
      <p className="text-sm text-gray-600 mt-1">{helperText}</p>

      <div className="mt-5 space-y-3">
        <div>
          <label htmlFor="ext-name" className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Full name *</label>
          <input id="ext-name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-gray-200" />
        </div>
        <div>
          <label htmlFor="ext-email" className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Email *</label>
          <input id="ext-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-gray-200" />
        </div>
        {showOrganization ? (
          <div>
            <label htmlFor="ext-org" className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Organisation</label>
            <input id="ext-org" value={organization} onChange={(e) => setOrganization(e.target.value)} className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-gray-200" />
          </div>
        ) : null}
        {showDistrict ? (
          <div>
            <label htmlFor="ext-district" className="text-xs font-semibold text-gray-500 uppercase tracking-wider">District</label>
            <input id="ext-district" value={district} onChange={(e) => setDistrict(e.target.value)} className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-gray-200" />
          </div>
        ) : null}
      </div>

      {state.kind === "error" ? (
        <p className="mt-4 text-xs text-red-600">{state.message}</p>
      ) : null}

      <button type="submit" disabled={state.kind === "submitting"} className="mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#066a67] text-white text-sm font-bold hover:bg-[#066a67]/90 disabled:bg-gray-300">
        {state.kind === "submitting" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
        {state.kind === "submitting" ? "Sending link…" : "Email me a sign-in link"}
      </button>

      <p className="mt-4 text-[11px] text-gray-500">
        We don't use passwords. Click the link we email you, and you're in.
      </p>
    </form>
  );
}
