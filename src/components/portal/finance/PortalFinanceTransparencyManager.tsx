"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { FileText, Plus, CheckCircle, Archive, Eye, Upload } from "lucide-react";
import type { FinanceCurrency, FinancePublicSnapshotRecord, FinanceAuditedStatementRecord } from "@/lib/types";

export function PortalFinanceTransparencyManager() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <PortalFinanceTransparencyManagerContent />
    </QueryClientProvider>
  );
}

function PortalFinanceTransparencyManagerContent() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"fy" | "quarterly" | "audited">("fy");

  const { data, isLoading } = useQuery<{ snapshots: FinancePublicSnapshotRecord[], audited: FinanceAuditedStatementRecord[] }>({
    queryKey: ["finance", "transparency", "admin"],
    queryFn: async () => {
      const res = await fetch("/api/portal/finance/transparency");
      if (!res.ok) throw new Error("Failed to load transparency data");
      return res.json();
    }
  });

  const publishMutation = useMutation({
    mutationFn: async ({ id, type, confirmation }: { id: number, type: "snapshot" | "audited", confirmation: string }) => {
      const res = await fetch("/api/portal/finance/transparency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: type === "snapshot" ? "publish_snapshot" : "publish_audited",
          payload: { id, confirmation }
        })
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to publish");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["finance", "transparency", "admin"] })
  });

  const archiveMutation = useMutation({
    mutationFn: async ({ id, type }: { id: number, type: "snapshot" | "audited" }) => {
      const res = await fetch("/api/portal/finance/transparency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: type === "snapshot" ? "archive_snapshot" : "archive_audited",
          payload: { id }
        })
      });
      if (!res.ok) throw new Error("Failed to archive");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["finance", "transparency", "admin"] })
  });

  const handlePublish = (id: number, type: "snapshot" | "audited") => {
    const text = type === "snapshot" ? "PUBLISH FY SNAPSHOT" : "PUBLISH AUDITED STATEMENTS";
    const conf = prompt(`Type "\${text}" to confirm publishing to the public page:`);
    if (conf === text) {
      publishMutation.mutate({ id, type, confirmation: text });
    } else if (conf !== null) {
      alert("Verification failed.");
    }
  };

  const handleArchive = (id: number, type: "snapshot" | "audited") => {
    if (confirm("Are you sure you want to archive this document? It will no longer be visible publicly if it was published.")) {
      archiveMutation.mutate({ id, type });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 border-none outline-none ring-0 appearance-none">Financial Transparency Hub</h2>
          <p className="text-sm text-gray-500">Manage public financial snapshots and audited statements.</p>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("fy")}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm \${activeTab === "fy" ? "border-[#FF4D00] text-[#FF4D00]" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
          >
            Annual Snapshots
          </button>
          <button
            onClick={() => setActiveTab("quarterly")}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm \${activeTab === "quarterly" ? "border-[#FF4D00] text-[#FF4D00]" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
          >
            Quarterly Snapshots
          </button>
          <button
            onClick={() => setActiveTab("audited")}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm \${activeTab === "audited" ? "border-[#FF4D00] text-[#FF4D00]" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
          >
            Audited Statements
          </button>
        </nav>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-100 rounded w-full max-w-md" />
          <div className="h-64 bg-gray-50 rounded" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {activeTab === "fy" && (
            <SnapshotManager
              data={data?.snapshots.filter((s: any) => s.snapshotType === "fy") || []}
              type="fy"
              onPublish={(id) => handlePublish(id, "snapshot")}
              onArchive={(id) => handleArchive(id, "snapshot")}
              isPending={publishMutation.isPending || archiveMutation.isPending}
            />
          )}
          {activeTab === "quarterly" && (
            <SnapshotManager
              data={data?.snapshots.filter((s: any) => s.snapshotType === "quarterly") || []}
              type="quarterly"
              onPublish={(id) => handlePublish(id, "snapshot")}
              onArchive={(id) => handleArchive(id, "snapshot")}
              isPending={publishMutation.isPending || archiveMutation.isPending}
            />
          )}
          {activeTab === "audited" && (
            <AuditedManager
              data={data?.audited || []}
              onPublish={(id) => handlePublish(id, "audited")}
              onArchive={(id) => handleArchive(id, "audited")}
              isPending={publishMutation.isPending || archiveMutation.isPending}
            />
          )}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "published") {
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" /> Published</span>;
  }
  if (status === "archived") {
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"><Archive className="w-3 h-3 mr-1" /> Archived</span>;
  }
  return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">Draft / Private</span>;
}

function SnapshotManager({ data, type, onPublish, onArchive, isPending }: { data: FinancePublicSnapshotRecord[], type: "fy" | "quarterly", onPublish: (id: number) => void, onArchive: (id: number) => void, isPending: boolean }) {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
  const [fy, setFy] = useState(new Date().getFullYear());
  const [currency, setCurrency] = useState<FinanceCurrency>("UGX");
  const [quarter, setQuarter] = useState("Q1");

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/portal/finance/transparency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: type === "fy" ? "generate_fy" : "generate_quarterly",
          payload: { fy, currency, quarter: type === "quarterly" ? quarter : undefined }
        })
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to generate");
      queryClient.invalidateQueries({ queryKey: ["finance", "transparency", "admin"] });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div>
      <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Fiscal Year</label>
          <input type="number" value={fy} onChange={(e) => setFy(parseInt(e.target.value, 10))} className="w-24 text-sm border-gray-300 rounded-md shadow-sm" />
        </div>
        {type === "quarterly" && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Quarter</label>
            <select value={quarter} onChange={(e) => setQuarter(e.target.value)} className="w-24 text-sm border-gray-300 rounded-md shadow-sm">
              <option value="Q1">Q1</option>
              <option value="Q2">Q2</option>
              <option value="Q3">Q3</option>
              <option value="Q4">Q4</option>
            </select>
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Currency</label>
          <select value={currency} onChange={(e) => setCurrency(e.target.value as FinanceCurrency)} className="w-24 text-sm border-gray-300 rounded-md shadow-sm">
            <option value="UGX">UGX</option>
            <option value="USD">USD</option>
          </select>
        </div>
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#00155F] hover:bg-[#000d3d] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00155F] disabled:opacity-50"
        >
          <Plus className="w-4 h-4 mr-2" />
          {isGenerating ? "Generating..." : `Generate \${type === "fy" ? "Annual" : "Quarterly"} Snapshot`}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Generated</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">No snapshots generated yet.</td></tr>
            ) : data.map((item) => (
              <tr key={item.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  FY {item.fy} {item.quarter ? `(\${item.quarter})` : ""} • {item.currency}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <StatusBadge status={item.status} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {format(new Date(item.generatedAt), "MMM d, yyyy")}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                  <a href={`/api/portal/finance/transparency/download?id=\${item.id}&type=snapshot`} target="_blank" rel="noreferrer" className="text-gray-600 hover:text-gray-900 inline-flex items-center">
                    <Eye className="w-4 h-4 mr-1" /> View PDF
                  </a>
                  {item.status === "draft" && (
                    <button onClick={() => onPublish(item.id)} disabled={isPending} className="text-[#FF4D00] hover:text-[#cc3d00] disabled:opacity-50">Publish</button>
                  )}
                  {item.status !== "archived" && (
                    <button onClick={() => onArchive(item.id)} disabled={isPending} className="text-gray-500 hover:text-gray-700 disabled:opacity-50">Archive</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AuditedManager({ data, onPublish, onArchive, isPending }: { data: FinanceAuditedStatementRecord[], onPublish: (id: number) => void, onArchive: (id: number) => void, isPending: boolean }) {
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [fy, setFy] = useState(new Date().getFullYear() - 1);
  const [auditor, setAuditor] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("fy", fy.toString());
      if (auditor) formData.append("auditorName", auditor);

      const res = await fetch("/api/portal/finance/transparency/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error((await res.json()).error || "Upload failed");
      queryClient.invalidateQueries({ queryKey: ["finance", "transparency", "admin"] });
      setFile(null);
      setAuditor("");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <form onSubmit={handleUpload} className="flex flex-col sm:flex-row gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Fiscal Year</label>
            <input type="number" required value={fy} onChange={(e) => setFy(parseInt(e.target.value, 10))} className="w-24 text-sm border-gray-300 rounded-md shadow-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Auditor Firm (Optional)</label>
            <input type="text" value={auditor} onChange={(e) => setAuditor(e.target.value)} placeholder="e.g. PwC" className="w-48 text-sm border-gray-300 rounded-md shadow-sm" />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">PDF Statement</label>
            <input type="file" required accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[#00155F]/10 file:text-[#00155F] hover:file:bg-[#00155F]/20" />
          </div>
          <button
            type="submit"
            disabled={isUploading || !file}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#00155F] hover:bg-[#000d3d] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00155F] disabled:opacity-50"
          >
            <Upload className="w-4 h-4 mr-2" />
            {isUploading ? "Uploading..." : "Upload File"}
          </button>
        </form>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statement</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uploaded</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">No audited statements uploaded.</td></tr>
            ) : data.map((item) => (
              <tr key={item.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  <div className="flex items-center">
                    <FileText className="w-4 h-4 text-gray-400 mr-2" />
                    <div>
                      <div>FY {item.fy} Audited Financials</div>
                      {item.auditorName && <div className="text-xs text-gray-500 font-normal">{item.auditorName}</div>}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <StatusBadge status={item.status === "private_uploaded" ? "draft" : item.status} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {format(new Date(item.uploadedAt || item.publishedAt || new Date()), "MMM d, yyyy")}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                  <a href={`/api/portal/finance/transparency/download?id=\${item.id}&type=audited`} target="_blank" rel="noreferrer" className="text-gray-600 hover:text-gray-900 inline-flex items-center">
                    <Eye className="w-4 h-4 mr-1" /> View PDF
                  </a>
                  {item.status === "private_uploaded" && (
                    <button onClick={() => onPublish(item.id)} disabled={isPending} className="text-[#FF4D00] hover:text-[#cc3d00] disabled:opacity-50">Publish</button>
                  )}
                  {item.status !== "archived" && (
                    <button onClick={() => onArchive(item.id)} disabled={isPending} className="text-gray-500 hover:text-gray-700 disabled:opacity-50">Archive</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
