"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Loader2, Mail, ShieldCheck, AlertCircle, CheckCircle2 } from "lucide-react";
import type { AuditInviteRow } from "@/lib/server/postgres/repositories/audit-invites";

type Props = { initialInvites: AuditInviteRow[] };

type FormState = {
  email: string;
  fullName: string;
  organization: string;
  scopeNote: string;
  inviteValidHours: number;
  accountValidDays: number;
};

const EMPTY_FORM: FormState = {
  email: "",
  fullName: "",
  organization: "",
  scopeNote: "",
  inviteValidHours: 48,
  accountValidDays: 7,
};

export function AuditInviteManager({ initialInvites }: Props) {
  const router = useRouter();
  const [invites, setInvites] = useState(initialInvites);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latestClaimUrl, setLatestClaimUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const submit = async () => {
    if (!form.email.trim() || !form.fullName.trim()) {
      setError("Email and full name are required.");
      return;
    }
    setError(null);
    setSubmitting(true);
    setLatestClaimUrl(null);
    try {
      const res = await fetch("/api/portal/superadmin/audit-invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim(),
          fullName: form.fullName.trim(),
          organization: form.organization.trim() || undefined,
          scopeNote: form.scopeNote.trim() || undefined,
          inviteValidHours: form.inviteValidHours,
          accountValidDays: form.accountValidDays,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; invite?: AuditInviteRow; claimUrl?: string };
      if (!res.ok || !data.ok || !data.invite) {
        setError(data.error ?? "Could not issue invite.");
        return;
      }
      setInvites((prev) => [data.invite!, ...prev]);
      setLatestClaimUrl(data.claimUrl ?? null);
      setForm(EMPTY_FORM);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-white border border-gray-100 p-6">
        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4">Issue an audit invite</h2>

        {error ? (
          <div className="rounded-xl bg-red-50 border border-red-100 p-3 mb-4 flex items-start gap-2 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        ) : null}

        {latestClaimUrl ? (
          <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 mb-4 text-[#066a67] text-sm">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold">Invite issued. Send this link to the auditor:</p>
                <div className="mt-2 flex items-stretch gap-2">
                  <input readOnly value={latestClaimUrl} className="flex-1 px-3 py-2 text-xs rounded-lg border border-emerald-100 bg-white" />
                  <button type="button" onClick={() => copy(latestClaimUrl)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#066a67] text-white text-xs font-bold">
                    <Copy className="w-3.5 h-3.5" /> {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <p className="text-[10px] text-[#066a67]/80 mt-2">
                  This is the only time this URL is shown. Email it directly — once it's claimed it cannot be re-used.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="auditor-email" className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Auditor email *</label>
            <input id="auditor-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-gray-200" placeholder="auditor@firm.example" />
          </div>
          <div>
            <label htmlFor="auditor-name" className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Full name *</label>
            <input id="auditor-name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-gray-200" />
          </div>
          <div>
            <label htmlFor="auditor-org" className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Organisation</label>
            <input id="auditor-org" value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-gray-200" placeholder="e.g. KPMG, Gates Foundation" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="invite-hours" className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Invite valid (hours)</label>
              <input id="invite-hours" type="number" min={1} max={168} value={form.inviteValidHours} onChange={(e) => setForm({ ...form, inviteValidHours: Number(e.target.value) })} className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-gray-200" />
            </div>
            <div>
              <label htmlFor="account-days" className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Access (days)</label>
              <input id="account-days" type="number" min={1} max={60} value={form.accountValidDays} onChange={(e) => setForm({ ...form, accountValidDays: Number(e.target.value) })} className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-gray-200" />
            </div>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="scope-note" className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Scope note (visible in audit log)</label>
            <textarea id="scope-note" rows={3} value={form.scopeNote} onChange={(e) => setForm({ ...form, scopeNote: e.target.value })} className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-gray-200" placeholder="Why this auditor was given access — e.g. 'Q4 financial due diligence for Gates Foundation grant'." />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end">
          <button type="button" onClick={submit} disabled={submitting} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#066a67] text-white text-sm font-bold disabled:bg-gray-300">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            {submitting ? "Issuing…" : "Issue invite"}
          </button>
        </div>
      </section>

      <section className="rounded-2xl bg-white border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Issued invites</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <tr>
              <th className="px-4 py-2.5 text-left">Issued</th>
              <th className="px-4 py-2.5 text-left">Auditor</th>
              <th className="px-4 py-2.5 text-left">Org</th>
              <th className="px-4 py-2.5 text-left">Invite expires</th>
              <th className="px-4 py-2.5 text-left">Account expires</th>
              <th className="px-4 py-2.5 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {invites.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-xs text-gray-500">No invites issued yet.</td></tr>
            ) : (
              invites.map((invite) => {
                const inviteExpired = new Date(invite.expiresAt).getTime() <= Date.now();
                const accountExpired = new Date(invite.accountExpiresAt).getTime() <= Date.now();
                const status = invite.consumedAt
                  ? (accountExpired ? { label: "Expired", tone: "bg-gray-100 text-gray-600" } : { label: "Active", tone: "bg-emerald-50 text-emerald-700" })
                  : (inviteExpired ? { label: "Lapsed", tone: "bg-red-50 text-red-700" } : { label: "Pending", tone: "bg-amber-50 text-amber-700" });
                return (
                  <tr key={invite.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">{new Date(invite.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-800">
                      <div className="font-semibold">{invite.invitedFullName}</div>
                      <div className="text-gray-500 inline-flex items-center gap-1"><Mail className="w-3 h-3" /> {invite.invitedEmail}</div>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-600">{invite.invitedOrganization ?? "—"}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-600 whitespace-nowrap">{new Date(invite.expiresAt).toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-600 whitespace-nowrap">{new Date(invite.accountExpiresAt).toLocaleString()}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${status.tone} uppercase tracking-wider`}>{status.label}</span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
