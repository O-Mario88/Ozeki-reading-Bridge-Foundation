"use client";

import { useEffect, useState } from "react";

interface TableRow {
    table: string;
    label: string;
    count: number;
}

type PanelStatus = { tone: "success" | "error"; message: string };

export function DataManagementPanel() {
    const [tables, setTables] = useState<TableRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [purging, setPurging] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmText, setConfirmText] = useState("");
    const [status, setStatus] = useState<PanelStatus | null>(null);

    async function fetchCounts() {
        setLoading(true);
        try {
            const res = await fetch("/api/portal/data-management");
            const data = (await res.json()) as { tables?: TableRow[]; error?: string };
            if (!res.ok) throw new Error(data.error ?? "Failed to load counts.");
            setTables(data.tables ?? []);
        } catch (err) {
            setStatus({
                tone: "error",
                message: err instanceof Error ? err.message : "Failed to load counts.",
            });
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void fetchCounts();
    }, []);

    async function handlePurge() {
        if (confirmText !== "PURGE") return;
        setPurging(true);
        setStatus(null);
        try {
            const res = await fetch("/api/portal/data-management", { method: "DELETE" });
            const data = (await res.json()) as { ok?: boolean; tables?: TableRow[]; error?: string };
            if (!res.ok) throw new Error(data.error ?? "Purge failed.");
            setTables(data.tables ?? []);
            setStatus({ tone: "success", message: "All data has been purged successfully." });
        } catch (err) {
            setStatus({
                tone: "error",
                message: err instanceof Error ? err.message : "Purge failed.",
            });
        } finally {
            setPurging(false);
            setConfirmOpen(false);
            setConfirmText("");
        }
    }

    const totalRows = tables.reduce((sum, t) => sum + t.count, 0);
    const nonEmptyTables = tables.filter((t) => t.count > 0);

    return (
        <section className="card" style={{ marginTop: "2rem" }}>
            <h2>🗑️ Data Management</h2>
            <p>
                View row counts for each data table and purge all test/dummy data before
                go-live. <strong>User accounts and geography master data are preserved.</strong>
            </p>

            {loading ? (
                <p className="portal-muted">Loading table counts…</p>
            ) : (
                <>
                    {/* Summary banner */}
                    <div
                        style={{
                            display: "flex",
                            gap: "1.5rem",
                            flexWrap: "wrap",
                            marginBottom: "1.5rem",
                        }}
                    >
                        <div className="card" style={{ flex: 1, minWidth: 180, textAlign: "center" }}>
                            <p className="portal-muted" style={{ margin: 0, fontSize: "0.85rem" }}>Total Tables</p>
                            <p style={{ fontSize: "1.8rem", fontWeight: 700, margin: "0.25rem 0" }}>
                                {tables.length}
                            </p>
                        </div>
                        <div className="card" style={{ flex: 1, minWidth: 180, textAlign: "center" }}>
                            <p className="portal-muted" style={{ margin: 0, fontSize: "0.85rem" }}>Total Rows</p>
                            <p style={{ fontSize: "1.8rem", fontWeight: 700, margin: "0.25rem 0", color: totalRows > 0 ? "var(--color-warning, #e67e22)" : "var(--color-success, #27ae60)" }}>
                                {totalRows.toLocaleString()}
                            </p>
                        </div>
                        <div className="card" style={{ flex: 1, minWidth: 180, textAlign: "center" }}>
                            <p className="portal-muted" style={{ margin: 0, fontSize: "0.85rem" }}>Tables with Data</p>
                            <p style={{ fontSize: "1.8rem", fontWeight: 700, margin: "0.25rem 0" }}>
                                {nonEmptyTables.length}
                            </p>
                        </div>
                    </div>

                    {/* Table listing */}
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ borderBottom: "2px solid var(--border, #ddd)" }}>
                                    <th style={{ textAlign: "left", padding: "0.6rem 0.75rem" }}>Table</th>
                                    <th style={{ textAlign: "left", padding: "0.6rem 0.75rem" }}>Description</th>
                                    <th style={{ textAlign: "right", padding: "0.6rem 0.75rem" }}>Rows</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tables.map((t) => (
                                    <tr
                                        key={t.table}
                                        style={{
                                            borderBottom: "1px solid var(--border, #eee)",
                                            background: t.count > 0 ? "rgba(230,126,34,0.04)" : undefined,
                                        }}
                                    >
                                        <td style={{ padding: "0.5rem 0.75rem", fontFamily: "monospace", fontSize: "0.85rem" }}>
                                            {t.table}
                                        </td>
                                        <td style={{ padding: "0.5rem 0.75rem" }}>{t.label}</td>
                                        <td
                                            style={{
                                                padding: "0.5rem 0.75rem",
                                                textAlign: "right",
                                                fontWeight: t.count > 0 ? 700 : 400,
                                                color: t.count > 0 ? "var(--color-warning, #e67e22)" : undefined,
                                            }}
                                        >
                                            {t.count.toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Purge section */}
                    <div
                        style={{
                            marginTop: "2rem",
                            padding: "1.25rem",
                            border: "2px solid var(--color-danger, #e74c3c)",
                            borderRadius: "0.5rem",
                            background: "rgba(231,76,60,0.04)",
                        }}
                    >
                        <h3 style={{ margin: "0 0 0.5rem", color: "var(--color-danger, #e74c3c)" }}>
                            ⚠️ Danger Zone
                        </h3>
                        <p style={{ margin: "0 0 1rem" }}>
                            Permanently delete <strong>all {totalRows.toLocaleString()} rows</strong> across{" "}
                            {nonEmptyTables.length} table{nonEmptyTables.length !== 1 ? "s" : ""}. User accounts
                            and geography data will <strong>not</strong> be affected.
                        </p>

                        {!confirmOpen ? (
                            <button
                                className="button"
                                type="button"
                                disabled={totalRows === 0}
                                onClick={() => setConfirmOpen(true)}
                                style={{
                                    background: "var(--color-danger, #e74c3c)",
                                    borderColor: "var(--color-danger, #e74c3c)",
                                    color: "#fff",
                                }}
                            >
                                {totalRows === 0 ? "Nothing to purge" : "Purge All Data"}
                            </button>
                        ) : (
                            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
                                <input
                                    type="text"
                                    placeholder='Type "PURGE" to confirm'
                                    value={confirmText}
                                    onChange={(e) => setConfirmText(e.target.value)}
                                    style={{
                                        flex: "1 1 200px",
                                        padding: "0.5rem 0.75rem",
                                        border: "1px solid var(--border, #ccc)",
                                        borderRadius: "0.25rem",
                                    }}
                                    autoFocus
                                />
                                <button
                                    className="button"
                                    type="button"
                                    disabled={confirmText !== "PURGE" || purging}
                                    onClick={() => void handlePurge()}
                                    style={{
                                        background: confirmText === "PURGE" ? "var(--color-danger, #e74c3c)" : undefined,
                                        borderColor: confirmText === "PURGE" ? "var(--color-danger, #e74c3c)" : undefined,
                                        color: confirmText === "PURGE" ? "#fff" : undefined,
                                    }}
                                >
                                    {purging ? "Purging…" : "Confirm Purge"}
                                </button>
                                <button
                                    className="button button-ghost"
                                    type="button"
                                    onClick={() => {
                                        setConfirmOpen(false);
                                        setConfirmText("");
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}

            {status ? (
                <p
                    className={`form-message ${status.tone === "success" ? "success" : "error"}`}
                    style={{ marginTop: "1rem" }}
                >
                    {status.message}
                </p>
            ) : null}
        </section>
    );
}
