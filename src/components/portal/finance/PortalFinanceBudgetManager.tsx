"use client";

import { useCallback, useEffect, useState } from "react";
import { formatMoney } from "@/components/portal/finance/format";
import type { FinanceBudgetMonthlyRecord, FinanceBudgetVsActualLine } from "@/lib/types";

const DEFAULT_SUBCATEGORIES = [
    "Transport & Fuel",
    "Meals & Accommodation",
    "Printing & Training Materials",
    "Allowances/Per diem",
    "Data/Airtime",
    "Equipment & Repairs",
    "Office/Admin",
    "Other",
];

type Props = {
    initialBudgets: FinanceBudgetMonthlyRecord[];
};

export function PortalFinanceBudgetManager({ initialBudgets }: Props) {
    const [budgets, setBudgets] = useState(initialBudgets);
    const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
    const [currency, setCurrency] = useState<"UGX" | "USD">("UGX");
    const [variance, setVariance] = useState<FinanceBudgetVsActualLine[]>([]);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState("");
    const [mode, setMode] = useState<"entry" | "variance">("entry");
    const [editValues, setEditValues] = useState<Record<string, string>>({});

    /* Initialize edit values from existing budgets */
    useEffect(() => {
        const vals: Record<string, string> = {};
        for (const sub of DEFAULT_SUBCATEGORIES) {
            const existing = budgets.find((b) => b.subcategory === sub && b.month === month && b.currency === currency);
            vals[sub] = existing ? String(existing.budgetAmount) : "";
        }
        setEditValues(vals);
    }, [budgets, month, currency]);

    const loadBudgets = useCallback(async () => {
        const res = await fetch(`/api/portal/finance/budgets?month=${month}&currency=${currency}`);
        const data = await res.json();
        setBudgets(data.budgets || []);
    }, [month, currency]);

    const loadVariance = useCallback(async () => {
        const res = await fetch(`/api/portal/finance/budgets?month=${month}&currency=${currency}&mode=variance`);
        const data = await res.json();
        setVariance(data.lines || []);
    }, [month, currency]);

    useEffect(() => {
        if (mode === "entry") loadBudgets();
        else loadVariance();
    }, [mode, month, currency, loadBudgets, loadVariance]);

    const handleSave = useCallback(async (subcategory: string) => {
        const val = Number(editValues[subcategory] || 0);
        if (!val || val < 0) return;
        setSaving(true);
        setMsg("");
        try {
            const res = await fetch("/api/portal/finance/budgets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ month, currency, subcategory, budgetAmount: val }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setMsg(`Saved ${subcategory}`);
            loadBudgets();
        } catch (err) {
            setMsg(err instanceof Error ? err.message : "Error");
        } finally {
            setSaving(false);
        }
    }, [editValues, month, currency, loadBudgets]);

    const totalBudget = budgets
        .filter((b) => b.month === month && b.currency === currency)
        .reduce((sum, b) => sum + b.budgetAmount, 0);

    return (
        <div>
            {/* Controls */}
            <div className="finance-list-toolbar">
                <div className="finance-list-toolbar-left">
                    <input
                        type="month"
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--fin-border)", fontFamily: "inherit" }}
                    />
                    <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value as "UGX" | "USD")}
                        style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--fin-border)", fontFamily: "inherit" }}
                    >
                        <option value="UGX">UGX</option>
                        <option value="USD">USD</option>
                    </select>
                    <button
                        type="button"
                        className={`finance-btn ${mode === "entry" ? "finance-btn-primary" : "finance-btn-outline"}`}
                        onClick={() => setMode("entry")}
                    >
                        Budget Entry
                    </button>
                    <button
                        type="button"
                        className={`finance-btn ${mode === "variance" ? "finance-btn-primary" : "finance-btn-outline"}`}
                        onClick={() => setMode("variance")}
                    >
                        Budget vs Actual
                    </button>
                </div>
            </div>

            {msg && <p style={{ fontSize: 13, color: "var(--fin-primary)", fontWeight: 600, marginBottom: 12 }}>{msg}</p>}

            {mode === "entry" ? (
                <div className="finance-table-card">
                    <div className="finance-table-card-header">
                        <h3>Monthly Budget — {month}</h3>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>Total: {formatMoney(currency, totalBudget)}</span>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>Subcategory</th>
                                <th style={{ textAlign: "right" }}>Budget Amount ({currency})</th>
                                <th style={{ width: 100 }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {DEFAULT_SUBCATEGORIES.map((sub) => (
                                <tr key={sub}>
                                    <td>{sub}</td>
                                    <td style={{ textAlign: "right" }}>
                                        <input
                                            type="number"
                                            min={0}
                                            step="1000"
                                            value={editValues[sub] || ""}
                                            onChange={(e) => setEditValues((p) => ({ ...p, [sub]: e.target.value }))}
                                            style={{
                                                width: 140, textAlign: "right", padding: "6px 10px",
                                                borderRadius: 8, border: "1px solid var(--fin-border)", fontFamily: "inherit",
                                            }}
                                            placeholder="0"
                                        />
                                    </td>
                                    <td>
                                        <button
                                            type="button"
                                            className="finance-btn finance-btn-primary"
                                            style={{ fontSize: 12, padding: "4px 12px" }}
                                            onClick={() => handleSave(sub)}
                                            disabled={saving}
                                        >
                                            Save
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="finance-table-card">
                    <div className="finance-table-card-header">
                        <h3>Budget vs Actual — {month}</h3>
                    </div>
                    {variance.length === 0 ? (
                        <div style={{ padding: 24, textAlign: "center", color: "var(--fin-text-muted)" }}>No data for this month.</div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Subcategory</th>
                                    <th style={{ textAlign: "right" }}>Budget</th>
                                    <th style={{ textAlign: "right" }}>Actual</th>
                                    <th style={{ textAlign: "right" }}>Variance</th>
                                    <th style={{ textAlign: "right" }}>%</th>
                                </tr>
                            </thead>
                            <tbody>
                                {variance.map((line) => (
                                    <tr key={line.subcategory}>
                                        <td>{line.subcategory}</td>
                                        <td style={{ textAlign: "right" }}>{formatMoney(currency, line.budgetAmount)}</td>
                                        <td style={{ textAlign: "right" }}>{formatMoney(currency, line.actualAmount)}</td>
                                        <td style={{
                                            textAlign: "right", fontWeight: 600,
                                            color: line.variance >= 0 ? "var(--fin-success)" : "var(--fin-danger)",
                                        }}>
                                            {line.variance >= 0 ? "+" : ""}{formatMoney(currency, line.variance)}
                                        </td>
                                        <td style={{
                                            textAlign: "right",
                                            color: line.variance >= 0 ? "var(--fin-success)" : "var(--fin-danger)",
                                        }}>
                                            {line.variancePct !== null ? `${line.variancePct}%` : "—"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
}
