"use client";

import { useMemo, useState } from "react";
import { formatDate, formatMoney } from "@/components/portal/finance/format";
import type {
  FinanceAuditComplianceCheckRecord,
  FinanceAuditExceptionRecord,
  FinanceReceiptRegistryRecord,
  FinanceTxnRiskScoreRecord,
} from "@/lib/types";

type PortalFinanceAuditCenterManagerProps = {
  initialExceptions: FinanceAuditExceptionRecord[];
  initialReceiptRegistry: FinanceReceiptRegistryRecord[];
  initialRiskItems: FinanceTxnRiskScoreRecord[];
  initialComplianceChecks: FinanceAuditComplianceCheckRecord[];
  canOverride: boolean;
};

type TabKey = "exceptions" | "registry" | "risk" | "compliance";

export function PortalFinanceAuditCenterManager({
  initialExceptions,
  initialReceiptRegistry,
  initialRiskItems,
  initialComplianceChecks,
  canOverride,
}: PortalFinanceAuditCenterManagerProps) {
  const [tab, setTab] = useState<TabKey>("exceptions");
  const [exceptions, setExceptions] = useState(initialExceptions);
  const [receiptRegistry, setReceiptRegistry] = useState(initialReceiptRegistry);
  const [riskItems, setRiskItems] = useState(initialRiskItems);
  const [complianceChecks, setComplianceChecks] = useState(initialComplianceChecks);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState<"all" | "low" | "medium" | "high">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "acknowledged" | "resolved" | "overridden">("open");
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);

  const filteredExceptions = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return exceptions.filter((item) => {
      if (severityFilter !== "all" && item.severity !== severityFilter) {
        return false;
      }
      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }
      if (monthFilter && item.createdAt.slice(0, 7) !== monthFilter) {
        return false;
      }
      if (!needle) {
        return true;
      }
      return `${item.ruleCode} ${item.entityType} ${item.entityId} ${item.message} ${item.status} ${item.severity}`
        .toLowerCase()
        .includes(needle);
    });
  }, [exceptions, search, monthFilter, severityFilter, statusFilter]);

  const filteredRegistry = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) {
      return receiptRegistry;
    }
    return receiptRegistry.filter((item) =>
      `${item.vendorName} ${item.referenceNo || ""} ${item.expenseNumber || ""} ${item.fileHashSha256}`
        .toLowerCase()
        .includes(needle));
  }, [receiptRegistry, search]);

  const filteredRisk = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) {
      return riskItems;
    }
    return riskItems.filter((item) =>
      `${item.entityType} ${item.entityId} ${item.riskScore} ${item.signals.join(" ")}`
        .toLowerCase()
        .includes(needle));
  }, [riskItems, search]);

  async function refreshData() {
    setLoading(true);
    setMessage("");
    try {
      const [exceptionsRes, registryRes, riskRes, checksRes] = await Promise.all([
        fetch(`/api/portal/finance/audit-center/exceptions?${new URLSearchParams({
          ...(statusFilter !== "all" ? { status: statusFilter } : {}),
          ...(severityFilter !== "all" ? { severity: severityFilter } : {}),
          ...(monthFilter ? { month: monthFilter } : {}),
        })}`),
        fetch("/api/portal/finance/audit-center/receipt-registry"),
        fetch("/api/portal/finance/audit-center/high-risk?limit=30"),
        fetch("/api/portal/finance/audit-center/compliance"),
      ]);
      const [exceptionsData, registryData, riskData, checksData] = await Promise.all([
        exceptionsRes.json(),
        registryRes.json(),
        riskRes.json(),
        checksRes.json(),
      ]);

      if (!exceptionsRes.ok) throw new Error(exceptionsData.error || "Failed to load exceptions.");
      if (!registryRes.ok) throw new Error(registryData.error || "Failed to load receipt registry.");
      if (!riskRes.ok) throw new Error(riskData.error || "Failed to load risk items.");
      if (!checksRes.ok) throw new Error(checksData.error || "Failed to load compliance checks.");

      setExceptions(exceptionsData.exceptions || []);
      setReceiptRegistry(registryData.receipts || []);
      setRiskItems(riskData.items || []);
      setComplianceChecks(checksData.checks || []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to refresh audit center.");
    } finally {
      setLoading(false);
    }
  }

  async function runAuditSweep() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/portal/finance/audit-center/run", { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to run audit sweep.");
      }
      setMessage(`Audit run complete. Checked ${data.summary?.checkedExpenses || 0} expense(s).`);
      await refreshData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to run audit sweep.");
      setLoading(false);
    }
  }

  async function handleExceptionAction(
    exceptionId: number,
    status: "acknowledged" | "resolved" | "overridden",
  ) {
    const requiresNotes = status === "resolved" || status === "overridden";
    const notes = requiresNotes ? window.prompt(status === "overridden" ? "Override reason (required):" : "Resolution note (required):", "") || "" : "";
    if (requiresNotes && !notes.trim()) {
      setMessage("A note/reason is required.");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`/api/portal/finance/audit-center/exceptions/${exceptionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update exception.");
      }
      setExceptions((prev) => prev.map((item) => (item.id === exceptionId ? (data.exception as FinanceAuditExceptionRecord) : item)));
      setMessage(`Exception ${status}.`);
      await refreshData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to update exception.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="portal-grid">
      <section className="card">
        <h2>Finance Audit Center</h2>
        <p>Internal-only controls for exception management, receipt registry checks, and risk monitoring.</p>
        <div className="action-row portal-form-actions">
          <button type="button" className="button button-sm" onClick={runAuditSweep} disabled={loading}>
            {loading ? "Running..." : "Run Audit Checks"}
          </button>
          <button type="button" className="button button-ghost button-sm" onClick={refreshData} disabled={loading}>
            Refresh
          </button>
        </div>
        {message ? <p className="portal-muted">{message}</p> : null}
      </section>

      <section className="card">
        <div className="finance-list-toolbar">
          <div className="finance-list-toolbar-left">
            <button type="button" className={`button button-sm ${tab === "exceptions" ? "" : "button-ghost"}`} onClick={() => { setTab("exceptions"); setSelectedMessage(null); }}>
              Exceptions
            </button>
            <button type="button" className={`button button-sm ${tab === "registry" ? "" : "button-ghost"}`} onClick={() => setTab("registry")}>
              Receipt Registry
            </button>
            <button type="button" className={`button button-sm ${tab === "risk" ? "" : "button-ghost"}`} onClick={() => setTab("risk")}>
              High-Risk
            </button>
            <button type="button" className={`button button-sm ${tab === "compliance" ? "" : "button-ghost"}`} onClick={() => setTab("compliance")}>
              Compliance
            </button>
          </div>
          <div className="finance-list-toolbar-right">
            <input
              className="finance-search-input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search current tab"
              aria-label="Search audit center data"
            />
          </div>
        </div>
        {tab === "exceptions" ? (
          <div className="finance-list-toolbar">
            <div className="finance-list-toolbar-left">
              <label>
                <span className="portal-field-label">Month</span>
                <input type="month" value={monthFilter} onChange={(event) => setMonthFilter(event.target.value)} />
              </label>
              <label>
                <span className="portal-field-label">Severity</span>
                <select value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value as typeof severityFilter)}>
                  <option value="all">All</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </label>
              <label>
                <span className="portal-field-label">Status</span>
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
                  <option value="all">All</option>
                  <option value="open">Open</option>
                  <option value="acknowledged">Acknowledged</option>
                  <option value="resolved">Resolved</option>
                  <option value="overridden">Overridden</option>
                </select>
              </label>
            </div>
          </div>
        ) : null}

        {selectedMessage && tab === "exceptions" && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-md mb-4 flex justify-between items-start">
            <div className="text-sm">{selectedMessage}</div>
            <button className="text-blue-800 hover:text-blue-900 font-bold ml-4" onClick={() => setSelectedMessage(null)}>&times;</button>
          </div>
        )}

        {tab === "exceptions" ? (
          filteredExceptions.length === 0 ? (
            <p>No open exceptions.</p>
          ) : (
            <div className="table-wrap finance-table-compact">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Entity</th>
                    <th>Rule</th>
                    <th>Severity</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExceptions.map((item) => (
                    <tr key={item.id}>
                      <td>{formatDate(item.createdAt)}</td>
                      <td>{item.entityType} #{item.entityId}</td>
                      <td title={item.message}>{item.ruleCode}</td>
                      <td><span className={`finance-status-tag finance-status-${item.severity}`}>{item.severity}</span></td>
                      <td>{item.amount !== undefined ? formatMoney(item.currency || "UGX", item.amount) : "—"}</td>
                      <td><span className={`finance-status-tag finance-status-${item.status}`}>{item.status}</span></td>
                      <td>
                        <div className="action-row finance-row-actions">
                          <button
                            type="button"
                            className="button button-ghost button-sm"
                            onClick={() => setSelectedMessage(item.message)}
                          >
                            View
                          </button>
                          <button
                            type="button"
                            className="button button-ghost button-sm"
                            onClick={() => handleExceptionAction(item.id, "resolved")}
                            disabled={loading}
                          >
                            Resolve
                          </button>
                          {canOverride ? (
                            <button
                              type="button"
                              className="button button-ghost button-sm finance-row-danger"
                              onClick={() => handleExceptionAction(item.id, "overridden")}
                              disabled={loading}
                            >
                              Override
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : null}

        {tab === "registry" ? (
          filteredRegistry.length === 0 ? (
            <p>No receipt records found.</p>
          ) : (
            <div className="table-wrap finance-table-compact">
              <table>
                <thead>
                  <tr>
                    <th>Vendor</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Expense</th>
                    <th>Hash</th>
                    <th>Flags</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRegistry.map((item) => (
                    <tr key={item.id}>
                      <td>{item.vendorName}</td>
                      <td>{formatDate(item.receiptDate)}</td>
                      <td>{formatMoney(item.currency, item.receiptAmount)}</td>
                      <td>{item.expenseNumber || `#${item.expenseId}`}</td>
                      <td><code>{item.fileHashSha256.slice(0, 14)}...</code></td>
                      <td>{item.flags.length > 0 ? item.flags.join(", ") : "ok"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : null}

        {tab === "risk" ? (
          filteredRisk.length === 0 ? (
            <p>No risk scores available.</p>
          ) : (
            <div className="table-wrap finance-table-compact">
              <table>
                <thead>
                  <tr>
                    <th>Entity</th>
                    <th>Risk Score</th>
                    <th>Signals</th>
                    <th>Computed</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRisk.map((item) => (
                    <tr key={item.id}>
                      <td>{item.entityType} #{item.entityId}</td>
                      <td>{item.riskScore}</td>
                      <td>{item.signals.join(", ") || "—"}</td>
                      <td>{formatDate(item.computedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : null}

        {tab === "compliance" ? (
          complianceChecks.length === 0 ? (
            <p>No active compliance issues.</p>
          ) : (
            <div className="table-wrap finance-table-compact">
              <table>
                <thead>
                  <tr>
                    <th>Rule</th>
                    <th>Title</th>
                    <th>Severity</th>
                    <th>Open Count</th>
                  </tr>
                </thead>
                <tbody>
                  {complianceChecks.map((item) => (
                    <tr key={item.ruleCode}>
                      <td>{item.ruleCode}</td>
                      <td>{item.title}</td>
                      <td><span className={`finance-status-tag finance-status-${item.severity}`}>{item.severity}</span></td>
                      <td>{item.openCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : null}
      </section>
    </div>
  );
}
