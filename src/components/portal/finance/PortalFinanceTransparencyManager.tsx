"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { FileText, Plus, CheckCircle, Archive, Eye, Upload } from "lucide-react";
import { FloatingSurface } from "@/components/FloatingSurface";
import { DashboardListHeader, DashboardListRow } from "@/components/portal/DashboardList";
import type { FinanceCurrency, FinancePublicSnapshotRecord, FinanceAuditedStatementRecord } from "@/lib/types";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

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
  const [error, setError] = useState<string | null>(null);

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
    onSuccess: () => { setError(null); queryClient.invalidateQueries({ queryKey: ["finance", "transparency", "admin"] }); },
    onError: (err) => setError(err.message)
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
    onSuccess: () => { setError(null); queryClient.invalidateQueries({ queryKey: ["finance", "transparency", "admin"] }); },
    onError: (err) => setError(err.message)
  });

  const handlePublish = (id: number, type: "snapshot" | "audited") => {
    setError(null);
    const text = type === "snapshot" ? "PUBLISH FY SNAPSHOT" : "PUBLISH AUDITED STATEMENTS";
    const conf = prompt(`Type "${text}" to confirm publishing to the public page:`);
    if (conf === text) {
      publishMutation.mutate({ id, type, confirmation: text });
    } else if (conf !== null) {
      setError("Verification failed. You must type the phrase exactly.");
      setTimeout(() => setError(null), 4000);
    }
  };

  const handleArchive = (id: number, type: "snapshot" | "audited") => {
    setError(null);
    if (confirm("Are you sure you want to archive this document? It will no longer be visible publicly if it was published.")) {
      archiveMutation.mutate({ id, type });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-brand-primary border-none outline-none ring-0 appearance-none">Financial Transparency Hub</h2>
          <p className="text-sm text-gray-500">Manage public financial snapshots and audited statements.</p>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm mb-4">
          Error: {error}
        </div>
      )}

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("fy")}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === "fy" ? "border-[#ff7235] text-[#ff7235]" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
          >
            Annual Snapshots
          </button>
          <button
            onClick={() => setActiveTab("quarterly")}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === "quarterly" ? "border-[#ff7235] text-[#ff7235]" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
          >
            Quarterly Snapshots
          </button>
          <button
            onClick={() => setActiveTab("audited")}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === "audited" ? "border-[#ff7235] text-[#ff7235]" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
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
              data={data?.snapshots.filter((s) => s.snapshotType === "fy") || []}
              type="fy"
              onPublish={(id) => handlePublish(id, "snapshot")}
              onArchive={(id) => handleArchive(id, "snapshot")}
              isPending={publishMutation.isPending || archiveMutation.isPending}
            />
          )}
          {activeTab === "quarterly" && (
            <SnapshotManager
              data={data?.snapshots.filter((s) => s.snapshotType === "quarterly") || []}
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
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800"><CheckCircle className="w-3 h-3 mr-1" /> Published</span>;
  }
  if (status === "archived") {
    return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"><Archive className="w-3 h-3 mr-1" /> Archived</span>;
  }
  return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">Draft / Private</span>;
}

function SnapshotManager({ data, type, onPublish, onArchive, isPending }: { data: FinancePublicSnapshotRecord[], type: "fy" | "quarterly", onPublish: (id: number) => void, onArchive: (id: number) => void, isPending: boolean }) {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openGenerate, setOpenGenerate] = useState(false);
  const [fy, setFy] = useState(new Date().getFullYear());
  const [currency, setCurrency] = useState<FinanceCurrency>("UGX");
  const [quarter, setQuarter] = useState("Q1");

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
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
      setOpenGenerate(false);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to generate snapshot"));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div>
      <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-wrap gap-3 items-center justify-between">
        <p className="text-sm text-gray-600">
          Create {type === "fy" ? "annual" : "quarterly"} snapshots from live finance records.
        </p>
        <button
          type="button"
          onClick={() => setOpenGenerate(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#00155F] hover:bg-[#000d3d] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00155F]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Generate Snapshot
        </button>
      </div>

      <FloatingSurface
        open={openGenerate}
        onClose={() => setOpenGenerate(false)}
        title={type === "fy" ? "Generate Annual Snapshot" : "Generate Quarterly Snapshot"}
        description="Run a new financial transparency snapshot."
        closeLabel="Close"
        maxWidth="640px"
      >
        {error && <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm mb-4">Error: {error}</div>}
        <form
          className="form-grid portal-form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            void handleGenerate();
          }}
        >
          <label>
            <span className="portal-field-label">Fiscal Year</span>
            <input type="number" value={fy} onChange={(e) => setFy(parseInt(e.target.value, 10))} />
          </label>
          {type === "quarterly" && (
            <label>
              <span className="portal-field-label">Quarter</span>
              <select value={quarter} onChange={(e) => setQuarter(e.target.value)}>
                <option value="Q1">Q1</option>
                <option value="Q2">Q2</option>
                <option value="Q3">Q3</option>
                <option value="Q4">Q4</option>
              </select>
            </label>
          )}
          <label>
            <span className="portal-field-label">Currency</span>
            <select value={currency} onChange={(e) => setCurrency(e.target.value as FinanceCurrency)}>
              <option value="UGX">UGX</option>
              <option value="USD">USD</option>
            </select>
          </label>
          <div className="full-width action-row portal-form-actions">
            <button type="submit" className="button button-sm" disabled={isGenerating}>
              {isGenerating ? "Generating..." : "Generate Snapshot"}
            </button>
          </div>
        </form>
      </FloatingSurface>

      <div className="px-4">
        <DashboardListHeader template="minmax(0,1.6fr) 110px 130px minmax(0,1.6fr)">
          <span>Period</span>
          <span>Status</span>
          <span>Generated</span>
          <span className="text-right">Actions</span>
        </DashboardListHeader>
        {data.length === 0 ? (
          <div className="py-4 text-center text-sm text-gray-500">No snapshots generated yet.</div>
        ) : data.map((item) => (
          <DashboardListRow
            key={item.id}
            template="minmax(0,1.6fr) 110px 130px minmax(0,1.6fr)"
          >
            <span className="text-sm font-medium text-gray-900 truncate">
              FY {item.fy} {item.quarter ? `(${item.quarter})` : ""} • {item.currency}
            </span>
            <span className="text-sm text-gray-500">
              <StatusBadge status={item.status} />
            </span>
            <span className="text-sm text-gray-500">
              {format(new Date(item.generatedAt), "MMM d, yyyy")}
            </span>
            <span className="text-right text-sm font-medium space-x-3">
              <a href={`/api/portal/finance/transparency/download?id=${item.id}&type=snapshot`} target="_blank" rel="noreferrer" className="text-gray-600 hover:text-gray-900 inline-flex items-center">
                <Eye className="w-4 h-4 mr-1" /> View PDF
              </a>
              {item.status === "draft" && (
                <button type="button" onClick={() => onPublish(item.id)} disabled={isPending} className="text-[#ff7235] hover:text-[#c35d0e] disabled:opacity-50">Publish</button>
              )}
              {item.status !== "archived" && (
                <button type="button" onClick={() => onArchive(item.id)} disabled={isPending} className="text-gray-500 hover:text-gray-700 disabled:opacity-50">Archive</button>
              )}
            </span>
          </DashboardListRow>
        ))}
      </div>
    </div>
  );
}

function AuditedManager({ data, onPublish, onArchive, isPending }: { data: FinanceAuditedStatementRecord[], onPublish: (id: number) => void, onArchive: (id: number) => void, isPending: boolean }) {
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openUpload, setOpenUpload] = useState(false);
  const [fy, setFy] = useState(new Date().getFullYear() - 1);
  const [auditor, setAuditor] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setIsUploading(true);
    setError(null);
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
      setOpenUpload(false);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Upload failed"));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-wrap gap-3 items-center justify-between">
        <p className="text-sm text-gray-600">Upload audited financial statement PDF for controlled publication.</p>
        <button
          type="button"
          onClick={() => setOpenUpload(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#00155F] hover:bg-[#000d3d] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00155F]"
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload Statement
        </button>
      </div>

      <FloatingSurface
        open={openUpload}
        onClose={() => setOpenUpload(false)}
        title="Upload Audited Statement"
        description="Attach the official audited PDF for the selected fiscal year."
        closeLabel="Close"
        maxWidth="700px"
      >
        {error && <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm mb-4">Error: {error}</div>}
        <form className="form-grid portal-form-grid" onSubmit={handleUpload}>
          <label>
            <span className="portal-field-label">Fiscal Year</span>
            <input type="number" required value={fy} onChange={(e) => setFy(parseInt(e.target.value, 10))} />
          </label>
          <label>
            <span className="portal-field-label">Auditor Firm (Optional)</span>
            <input type="text" value={auditor} onChange={(e) => setAuditor(e.target.value)} placeholder="e.g. PwC" />
          </label>
          <label className="full-width">
            <span className="portal-field-label">PDF Statement</span>
            <input type="file" required accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </label>
          <div className="full-width action-row portal-form-actions">
            <button type="submit" className="button button-sm" disabled={isUploading || !file}>
              {isUploading ? "Uploading..." : "Upload File"}
            </button>
          </div>
        </form>
      </FloatingSurface>

      <div className="px-4">
        <DashboardListHeader template="minmax(0,1.8fr) 110px 130px minmax(0,1.6fr)">
          <span>Statement</span>
          <span>Status</span>
          <span>Uploaded</span>
          <span className="text-right">Actions</span>
        </DashboardListHeader>
        {data.length === 0 ? (
          <div className="py-4 text-center text-sm text-gray-500">No audited statements uploaded.</div>
        ) : data.map((item) => (
          <DashboardListRow
            key={item.id}
            template="minmax(0,1.8fr) 110px 130px minmax(0,1.6fr)"
          >
            <span className="text-sm font-medium text-gray-900 min-w-0">
              <span className="flex items-center">
                <FileText className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
                <span className="min-w-0">
                  <span className="block truncate">FY {item.fy} Audited Financials</span>
                  {item.auditorName && <span className="block text-xs text-gray-500 font-normal truncate">{item.auditorName}</span>}
                </span>
              </span>
            </span>
            <span className="text-sm text-gray-500">
              <StatusBadge status={item.status === "private_uploaded" ? "draft" : item.status} />
            </span>
            <span className="text-sm text-gray-500">
              {format(new Date(item.uploadedAt || item.publishedAt || new Date()), "MMM d, yyyy")}
            </span>
            <span className="text-right text-sm font-medium space-x-3">
              <a href={`/api/portal/finance/transparency/download?id=${item.id}&type=audited`} target="_blank" rel="noreferrer" className="text-gray-600 hover:text-gray-900 inline-flex items-center">
                <Eye className="w-4 h-4 mr-1" /> View PDF
              </a>
              {item.status === "private_uploaded" && (
                <button type="button" onClick={() => onPublish(item.id)} disabled={isPending} className="text-[#ff7235] hover:text-[#c35d0e] disabled:opacity-50">Publish</button>
              )}
              {item.status !== "archived" && (
                <button type="button" onClick={() => onArchive(item.id)} disabled={isPending} className="text-gray-500 hover:text-gray-700 disabled:opacity-50">Archive</button>
              )}
            </span>
          </DashboardListRow>
        ))}
      </div>
    </div>
  );
}
