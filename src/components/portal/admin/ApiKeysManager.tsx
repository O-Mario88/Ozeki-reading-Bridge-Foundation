"use client";

import { useState, useEffect } from "react";
import {
  Key, Plus, Trash2, Copy, CheckCircle2, Loader2, AlertCircle,
  Eye, EyeOff, Building2,
} from "lucide-react";
import { DashboardListHeader, DashboardListRow } from "@/components/portal/DashboardList";

interface ApiKey {
  id: number;
  keyPrefix: string;
  name: string;
  organisation: string | null;
  contactEmail: string | null;
  scopes: string[];
  rateLimitPerMinute: number;
  rateLimitPerDay: number;
  status: "active" | "revoked" | "expired";
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  revokedAt: string | null;
}

export function ApiKeysManager() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: "",
    organisation: "",
    contactEmail: "",
    rateLimitPerMinute: 60,
    rateLimitPerDay: 5000,
  });
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<{ key: string; record: ApiKey } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchKeys = async () => {
    try {
      const res = await fetch("/api/portal/admin/api-keys");
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys ?? []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchKeys(); }, []);

  const submit = async () => {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/portal/admin/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          organisation: form.organisation || null,
          contactEmail: form.contactEmail || null,
          rateLimitPerMinute: Number(form.rateLimitPerMinute),
          rateLimitPerDay: Number(form.rateLimitPerDay),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Unable to create key.");
        return;
      }
      setNewKey({ key: data.plaintextKey, record: data.record });
      setShowCreate(false);
      setForm({ name: "", organisation: "", contactEmail: "", rateLimitPerMinute: 60, rateLimitPerDay: 5000 });
      await fetchKeys();
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (id: number, name: string) => {
    const reason = window.prompt(`Revoke the API key "${name}"? Enter a short reason:`);
    if (reason === null) return;
    await fetch(`/api/portal/admin/api-keys/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason || "Revoked by admin" }),
    });
    await fetchKeys();
  };

  const copy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* New key reveal banner */}
      {newKey && (
        <div className="rounded-2xl bg-emerald-50 border-2 border-emerald-300 p-5">
          <div className="flex items-start gap-3 mb-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-emerald-900">API key created for {newKey.record.name}</p>
              <p className="text-sm text-[#044f4d] mt-1">
                This key will be shown <strong>only once</strong>. Copy it now and deliver it securely to the partner.
              </p>
            </div>
            <button onClick={() => setNewKey(null)} className="text-[#066a67] text-sm font-semibold hover:underline">
              Dismiss
            </button>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2.5 rounded-lg bg-white border border-emerald-200 font-mono text-sm text-gray-800 break-all">
              {revealed ? newKey.key : "ork_" + "•".repeat(24)}
            </code>
            <button
              onClick={() => setRevealed(!revealed)}
              className="p-2.5 rounded-lg bg-white border border-emerald-200 hover:bg-emerald-50 text-gray-600"
              aria-label={revealed ? "Hide" : "Reveal"}
            >
              {revealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button
              onClick={() => copy(newKey.key, "new")}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-[#066a67] text-white text-sm font-semibold transition"
            >
              {copiedId === "new" ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiedId === "new" ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}

      {/* Create form */}
      {showCreate ? (
        <div className="rounded-2xl bg-white border border-gray-200 p-5 space-y-3">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <Key className="w-4 h-4 text-gray-400" />
            Create new API key
          </h3>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</label>
              <input
                type="text"
                placeholder="e.g. Ministry of Education — Data Team"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Organisation</label>
              <input
                type="text"
                placeholder="e.g. Uganda MoES"
                value={form.organisation}
                onChange={(e) => setForm({ ...form, organisation: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact email</label>
              <input
                type="email"
                placeholder="data@ministry.go.ug"
                value={form.contactEmail}
                onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Per minute</label>
                <input
                  type="number"
                  value={form.rateLimitPerMinute}
                  onChange={(e) => setForm({ ...form, rateLimitPerMinute: Number(e.target.value) })}
                  className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Per day</label>
                <input
                  type="number"
                  value={form.rateLimitPerDay}
                  onChange={(e) => setForm({ ...form, rateLimitPerDay: Number(e.target.value) })}
                  className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button onClick={() => setShowCreate(false)} className="text-sm text-gray-600 font-semibold hover:text-gray-900">
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={creating || !form.name.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#006b61] hover:bg-[#006b61]/90 disabled:bg-gray-300 text-white text-sm font-semibold transition"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
              Create Key
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#006b61] hover:bg-[#006b61]/90 text-white text-sm font-semibold transition"
        >
          <Plus className="w-4 h-4" />
          New API Key
        </button>
      )}

      {/* Keys list */}
      <div className="rounded-2xl bg-white border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            {keys.length} key{keys.length === 1 ? "" : "s"} total
          </p>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-4 h-4 text-gray-300 animate-spin" />
          </div>
        ) : keys.length === 0 ? (
          <div className="text-center py-12">
            <Key className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500 font-medium">No API keys yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Create a key to give a research partner authenticated access to the public API.
            </p>
          </div>
        ) : (
          <div className="px-2">
            <DashboardListHeader template="minmax(0,1.4fr) minmax(0,1.2fr) 110px 130px 100px 60px">
              <span>Name &amp; Prefix</span>
              <span>Organisation</span>
              <span className="text-center">Rate Limit</span>
              <span>Last Used</span>
              <span className="text-center">Status</span>
              <span />
            </DashboardListHeader>
            {keys.map((k) => (
              <DashboardListRow
                key={k.id}
                template="minmax(0,1.4fr) minmax(0,1.2fr) 110px 130px 100px 60px"
              >
                <span className="min-w-0">
                  <span className="block font-semibold text-gray-800 truncate">{k.name}</span>
                  <span className="block text-xs text-gray-400 font-mono truncate">{k.keyPrefix}…</span>
                </span>
                <span className="text-gray-500 text-xs min-w-0">
                  {k.organisation ? (
                    <span className="flex items-center gap-1 truncate">
                      <Building2 className="w-3 h-3 shrink-0" />
                      {k.organisation}
                    </span>
                  ) : "—"}
                  {k.contactEmail && <span className="block text-gray-400 mt-0.5 truncate">{k.contactEmail}</span>}
                </span>
                <span className="text-center text-xs text-gray-600">
                  <span className="block">{k.rateLimitPerMinute}/min</span>
                  <span className="block text-gray-400">{k.rateLimitPerDay.toLocaleString()}/day</span>
                </span>
                <span className="text-xs text-gray-500">
                  {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "Never"}
                </span>
                <span className="text-center">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                    k.status === "active" ? "bg-emerald-50 text-[#066a67] border border-emerald-100" :
                    k.status === "revoked" ? "bg-red-50 text-red-600 border border-red-100" :
                    "bg-gray-50 text-gray-500 border border-gray-100"
                  }`}>
                    {k.status}
                  </span>
                </span>
                <span className="text-right">
                  {k.status === "active" && (
                    <button
                      type="button"
                      onClick={() => revoke(k.id, k.name)}
                      className="p-1.5 text-gray-400 hover:text-red-600 transition"
                      aria-label="Revoke"
                      title="Revoke"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </span>
              </DashboardListRow>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-semibold mb-1">API documentation</p>
          <p className="text-xs text-blue-700">
            Partners can hit <code className="bg-white px-1 rounded">GET /api/v1</code> for a self-describing index
            of endpoints. Supported: districts, literacy indicators, national benchmarks, data quality scores,
            and programme comparisons. All responses include <code className="bg-white px-1 rounded">X-RateLimit-*</code> headers.
          </p>
        </div>
      </div>
    </div>
  );
}
