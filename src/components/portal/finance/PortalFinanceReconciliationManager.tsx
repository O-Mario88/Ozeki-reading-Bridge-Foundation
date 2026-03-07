"use client";

import { FormEvent, useCallback, useMemo, useState } from "react";
import { FloatingSurface } from "@/components/FloatingSurface";
import { formatDate, formatMoney } from "@/components/portal/finance/format";
import type {
    FinanceLedgerTransactionRecord,
    FinanceStatementLineRecord,
} from "@/lib/types";

type Props = {
    initialLines: FinanceStatementLineRecord[];
    initialLedger: FinanceLedgerTransactionRecord[];
};

export function PortalFinanceReconciliationManager({ initialLines, initialLedger }: Props) {
    const [lines, setLines] = useState(initialLines);
    const [ledger] = useState(initialLedger);
    const [tab, setTab] = useState<"bank" | "cash" | "mobile_money">("bank");
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState("");
    const [showCreate, setShowCreate] = useState(false);
    const [suggestions, setSuggestions] = useState<
        Array<{ ledgerTxnId: number; date: string; amount: number; currency: string; counterpartyName: string | null; notes: string | null; score: number }>
    >([]);
    const [selectedLineId, setSelectedLineId] = useState<number | null>(null);

    const filteredLines = useMemo(() => lines.filter((l) => l.accountType === tab), [lines, tab]);
    const unmatchedLedger = useMemo(
        () => ledger.filter((t) => t.postedStatus === "posted"),
        [ledger],
    );

    const handleCreateLine = useCallback(async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSaving(true);
        setMsg("");
        const form = new FormData(e.currentTarget);
        try {
            const res = await fetch("/api/portal/finance/reconciliation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "create_line",
                    accountType: tab,
                    date: form.get("date"),
                    amount: Number(form.get("amount")),
                    currency: form.get("currency") || "UGX",
                    reference: form.get("reference") || undefined,
                    description: form.get("description") || undefined,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setLines((p) => [data.line, ...p]);
            setShowCreate(false);
            setMsg("Statement line added.");
        } catch (err) {
            setMsg(err instanceof Error ? err.message : "Error");
        } finally {
            setSaving(false);
        }
    }, [tab]);

    const handleAutoSuggest = useCallback(async (lineId: number) => {
        setSelectedLineId(lineId);
        const res = await fetch("/api/portal/finance/reconciliation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "auto_suggest", statementLineId: lineId }),
        });
        const data = await res.json();
        setSuggestions(data.suggestions || []);
    }, []);

    const handleMatch = useCallback(async (statementLineId: number, ledgerTxnId: number, amount: number) => {
        setSaving(true);
        try {
            const res = await fetch("/api/portal/finance/reconciliation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "match",
                    statementLineId,
                    ledgerTxnId,
                    matchedAmount: amount,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setMsg("Matched successfully.");
            /* Refresh lines */
            const refreshRes = await fetch(`/api/portal/finance/reconciliation?accountType=${tab}`);
            const refreshData = await refreshRes.json();
            setLines(refreshData.lines || []);
            setSuggestions([]);
            setSelectedLineId(null);
        } catch (err) {
            setMsg(err instanceof Error ? err.message : "Error");
        } finally {
            setSaving(false);
        }
    }, [tab]);

    const tabs: Array<{ key: "bank" | "cash" | "mobile_money"; label: string }> = [
        { key: "bank", label: "Bank" },
        { key: "cash", label: "Cash" },
        { key: "mobile_money", label: "Mobile Money" },
    ];

    return (
        <div>
            {/* Tabs */}
            <div className="finance-list-toolbar">
                <div className="finance-list-toolbar-left">
                    {tabs.map((t) => (
                        <button
                            key={t.key}
                            type="button"
                            className={`finance-btn ${tab === t.key ? "finance-btn-primary" : "finance-btn-outline"}`}
                            onClick={() => { setTab(t.key); setSuggestions([]); setSelectedLineId(null); }}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
                <div className="finance-list-toolbar-right">
                    <button type="button" className="finance-btn finance-btn-primary" onClick={() => setShowCreate(true)}>
                        + Add Statement Line
                    </button>
                </div>
            </div>

            {msg && <p style={{ color: "var(--fin-primary)", fontWeight: 600, marginBottom: 12 }}>{msg}</p>}

            <FloatingSurface
                open={showCreate}
                onClose={() => setShowCreate(false)}
                title={`New Statement Line (${tab.replace("_", " ")})`}
                description="Add bank, cash, or mobile money statement lines for reconciliation."
                closeLabel="Close"
                maxWidth="760px"
            >
                <form onSubmit={handleCreateLine} className="form-grid portal-form-grid">
                    <label>
                        <span className="portal-field-label">Date</span>
                        <input type="date" name="date" required />
                    </label>
                    <label>
                        <span className="portal-field-label">Amount</span>
                        <input type="number" name="amount" step="0.01" required />
                    </label>
                    <label>
                        <span className="portal-field-label">Currency</span>
                        <select name="currency">
                            <option value="UGX">UGX</option>
                            <option value="USD">USD</option>
                        </select>
                    </label>
                    <label>
                        <span className="portal-field-label">Reference</span>
                        <input type="text" name="reference" />
                    </label>
                    <label className="full-width">
                        <span className="portal-field-label">Description</span>
                        <input type="text" name="description" />
                    </label>
                    <div className="full-width action-row portal-form-actions">
                        <button type="submit" className="button button-sm" disabled={saving}>
                            {saving ? "Saving..." : "Add Line"}
                        </button>
                        <button type="button" className="button button-ghost button-sm" onClick={() => setShowCreate(false)}>
                            Cancel
                        </button>
                    </div>
                </form>
            </FloatingSurface>

            {/* Split View */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                {/* Left: Statement Lines */}
                <div className="finance-table-card">
                    <div className="finance-table-card-header">
                        <h3>Statement Lines ({filteredLines.length})</h3>
                    </div>
                    {filteredLines.length === 0 ? (
                        <div style={{ padding: 24, textAlign: "center", color: "var(--fin-text-muted)" }}>No statement lines.</div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th style={{ textAlign: "right" }}>Amount</th>
                                    <th>Reference</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLines.map((line) => (
                                    <tr key={line.id} style={selectedLineId === line.id ? { background: "var(--fin-primary-light)" } : undefined}>
                                        <td>{formatDate(line.date)}</td>
                                        <td style={{ textAlign: "right", fontWeight: 600 }}>{formatMoney(line.currency, line.amount)}</td>
                                        <td>{line.reference || "—"}</td>
                                        <td>
                                            <span className={`finance-status-pill finance-status-pill--${line.matchStatus === "matched" ? "paid" : line.matchStatus === "partial" ? "sent" : "draft"}`}>
                                                {line.matchStatus}
                                            </span>
                                        </td>
                                        <td>
                                            {line.matchStatus !== "matched" && (
                                                <button
                                                    type="button"
                                                    className="finance-btn finance-btn-outline"
                                                    style={{ fontSize: 12, padding: "4px 10px" }}
                                                    onClick={() => handleAutoSuggest(line.id)}
                                                    disabled={saving}
                                                >
                                                    Suggest
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Right: Suggestions or Unmatched Ledger */}
                <div className="finance-table-card">
                    <div className="finance-table-card-header">
                        <h3>{suggestions.length > 0 ? "Suggested Matches" : "Unmatched Ledger Transactions"}</h3>
                    </div>
                    {suggestions.length > 0 && selectedLineId ? (
                        <table>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th style={{ textAlign: "right" }}>Amount</th>
                                    <th>Counterparty</th>
                                    <th>Score</th>
                                    <th>Match</th>
                                </tr>
                            </thead>
                            <tbody>
                                {suggestions.map((s) => (
                                    <tr key={s.ledgerTxnId}>
                                        <td>{formatDate(s.date)}</td>
                                        <td style={{ textAlign: "right", fontWeight: 600 }}>{formatMoney(s.currency, s.amount)}</td>
                                        <td>{s.counterpartyName || "—"}</td>
                                        <td>
                                            <span style={{ fontWeight: 700, color: s.score >= 80 ? "var(--fin-success)" : s.score >= 60 ? "var(--fin-warning)" : "var(--fin-text-muted)" }}>
                                                {s.score}%
                                            </span>
                                        </td>
                                        <td>
                                            <button
                                                type="button"
                                                className="finance-btn finance-btn-primary"
                                                style={{ fontSize: 12, padding: "4px 10px" }}
                                                onClick={() => handleMatch(selectedLineId, s.ledgerTxnId, Math.abs(s.amount))}
                                                disabled={saving}
                                            >
                                                Match
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th style={{ textAlign: "right" }}>Amount</th>
                                    <th>Source</th>
                                    <th>Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {unmatchedLedger.slice(0, 15).map((t) => (
                                    <tr key={t.id}>
                                        <td>{formatDate(t.date)}</td>
                                        <td style={{ textAlign: "right", fontWeight: 600 }}>{formatMoney(t.currency, t.amount)}</td>
                                        <td>{t.sourceType}</td>
                                        <td>{t.notes || "—"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
