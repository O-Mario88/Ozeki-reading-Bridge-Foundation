"use client";

import { useEffect, useMemo, useState } from "react";

interface TableRow {
  table: string;
  label: string;
  count: number;
}

type PanelStatus = { tone: "success" | "error"; message: string };

export function DataManagementPanel() {
  const [tables, setTables] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyTarget, setBusyTarget] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [status, setStatus] = useState<PanelStatus | null>(null);

  async function fetchCounts() {
    setLoading(true);
    try {
      const res = await fetch("/api/portal/data-management", { cache: "no-store" });
      const data = (await res.json()) as { tables?: TableRow[]; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to load table counts.");
      }
      setTables(data.tables ?? []);
      setStatus(null);
    } catch (error) {
      setStatus({
        tone: "error",
        message: error instanceof Error ? error.message : "Failed to load table counts.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchCounts();
  }, []);

  async function clearTables(tableNames?: string[]) {
    setBusyTarget(tableNames?.join(",") ?? "*");
    setStatus(null);
    try {
      const res = await fetch("/api/portal/data-management", {
        method: "DELETE",
        headers: tableNames && tableNames.length > 0 ? { "Content-Type": "application/json" } : undefined,
        body: tableNames && tableNames.length > 0 ? JSON.stringify({ tables: tableNames }) : undefined,
      });
      const data = (await res.json()) as { tables?: TableRow[]; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Delete operation failed.");
      }
      setTables(data.tables ?? []);
      setStatus({
        tone: "success",
        message:
          tableNames && tableNames.length === 1
            ? `Cleared ${tableNames[0]}.`
            : "All selected data has been deleted.",
      });
    } catch (error) {
      setStatus({
        tone: "error",
        message: error instanceof Error ? error.message : "Delete operation failed.",
      });
    } finally {
      setBusyTarget(null);
      setConfirmOpen(false);
      setConfirmText("");
    }
  }

  async function handleClearSingleTable(tableName: string) {
    const approved = window.confirm(
      `Delete all rows from ${tableName}? This cannot be undone.`,
    );
    if (!approved) return;
    await clearTables([tableName]);
  }

  async function handlePurgeAll() {
    if (confirmText !== "PURGE") return;
    await clearTables();
  }

  const totalRows = useMemo(() => tables.reduce((sum, table) => sum + table.count, 0), [tables]);
  const tablesWithData = useMemo(() => tables.filter((table) => table.count > 0), [tables]);

  return (
    <section className="card portal-data-management-card" style={{ marginTop: "1rem" }}>
      <div className="portal-module-header">
        <div>
          <p className="portal-overline">Super Admin</p>
          <h2>Data Management</h2>
          <p>
            Clear dummy or test data safely table-by-table, or wipe all operational tables before
            go-live. User accounts and geography masters are preserved.
          </p>
        </div>
        <div className="action-row">
          <button
            className="button button-ghost"
            type="button"
            disabled={loading || busyTarget !== null}
            onClick={() => void fetchCounts()}
          >
            {loading ? "Refreshing..." : "Refresh counts"}
          </button>
        </div>
      </div>

      <div className="portal-data-management-summary">
        <article className="card">
          <span>Tracked tables</span>
          <strong>{tables.length.toLocaleString()}</strong>
        </article>
        <article className="card">
          <span>Tables with data</span>
          <strong>{tablesWithData.length.toLocaleString()}</strong>
        </article>
        <article className="card">
          <span>Total rows</span>
          <strong>{totalRows.toLocaleString()}</strong>
        </article>
      </div>

      {loading ? <p className="portal-muted">Loading table counts...</p> : null}

      {!loading ? (
        <div className="table-wrap portal-table-compact portal-data-management-table">
          <table>
            <thead>
              <tr>
                <th>Table</th>
                <th>Description</th>
                <th>Rows</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {tables.map((table) => {
                const isBusy = busyTarget === table.table;
                return (
                  <tr key={table.table}>
                    <td title={table.table}>
                      <span className="portal-table-cell-ellipsis">{table.table}</span>
                    </td>
                    <td title={table.label}>
                      <span className="portal-table-cell-ellipsis is-wide">{table.label}</span>
                    </td>
                    <td>{table.count.toLocaleString()}</td>
                    <td>
                      <button
                        className="button button-ghost button-compact"
                        type="button"
                        disabled={table.count === 0 || busyTarget !== null}
                        onClick={() => void handleClearSingleTable(table.table)}
                      >
                        {isBusy ? "Clearing..." : "Delete table data"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      <section className="portal-danger-zone">
        <div>
          <h3>Full purge</h3>
          <p>
            Delete all operational rows and uploaded runtime files in one step. Use this only when
            resetting the backend before deployment.
          </p>
        </div>

        {!confirmOpen ? (
          <button
            className="button"
            type="button"
            disabled={totalRows === 0 || busyTarget !== null}
            onClick={() => setConfirmOpen(true)}
          >
            {totalRows === 0 ? "No data to purge" : "Open full purge"}
          </button>
        ) : (
          <div className="portal-danger-zone-actions">
            <label>
              <span className="portal-field-label">Type PURGE to confirm</span>
              <input
                type="text"
                value={confirmText}
                onChange={(event) => setConfirmText(event.target.value)}
                autoFocus
              />
            </label>
            <div className="action-row">
              <button
                className="button"
                type="button"
                disabled={confirmText !== "PURGE" || busyTarget !== null}
                onClick={() => void handlePurgeAll()}
              >
                {busyTarget === "*" ? "Purging..." : "Confirm full purge"}
              </button>
              <button
                className="button button-ghost"
                type="button"
                disabled={busyTarget !== null}
                onClick={() => {
                  setConfirmOpen(false);
                  setConfirmText("");
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      {status ? (
        <p className={`form-message ${status.tone === "success" ? "success" : "error"}`}>
          {status.message}
        </p>
      ) : null}
    </section>
  );
}
