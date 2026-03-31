"use client";

import { useState, useCallback, useMemo } from "react";
import { formatMoney, formatDate } from "@/components/portal/finance/format";
import type { FinanceOperationBudget, PortalUser } from "@/lib/types";

const BUDGET_CATEGORIES = [
    "Transport",
    "Accommodation",
    "Meals / Refreshments",
    "Venue / Hall Hire",
    "Training Materials",
    "Printing / Photocopying",
    "Communication / Airtime / Internet",
    "Fuel",
    "Office Supplies / Stationery",
    "Professional Services / Consultancy",
    "Allowances / Per Diem",
    "Salaries / Wages",
    "Repairs and Maintenance",
    "Utilities",
    "Monitoring and Evaluation",
    "School Support Materials",
    "Reading / Literacy Materials",
    "Events / Workshops",
    "Equipment / Assets",
    "Miscellaneous / Other"
];

type Props = {
    initialBudgets: FinanceOperationBudget[];
    currentUser: PortalUser;
};

export function PortalFinanceBudgetManager({ initialBudgets, currentUser }: Props) {
    const [budgets, setBudgets] = useState(initialBudgets);
    const [isCreating, setIsCreating] = useState(false);
    const [saving, setSaving] = useState(false);
    
    // Form state
    const [title, setTitle] = useState("");
    const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7)); // Default to YYYY-MM
    const [items, setItems] = useState<Array<{ id: string, category: string, description: string, quantity: number | '', unitCost: number | '' }>>([]);

    // Request Fund State
    const [requestingBudget, setRequestingBudget] = useState<number | null>(null);
    const [requestAmount, setRequestAmount] = useState<number | ''>('');

    const loadBudgets = useCallback(async () => {
        const res = await fetch(`/api/portal/finance/budgets`);
        if (res.ok) {
            const data = await res.json();
            setBudgets(data.budgets || []);
        }
    }, []);

    const handleAddItem = () => {
        setItems(p => [...p, { id: Math.random().toString(), category: BUDGET_CATEGORIES[0], description: "", quantity: 1, unitCost: 0 }]);
    };

    const handleRemoveItem = (id: string) => {
        setItems(p => p.filter(i => i.id !== id));
    };

    const updateItem = (id: string, field: string, val: any) => {
        setItems(p => p.map(i => i.id === id ? { ...i, [field]: val } : i));
    };

    const handleSave = async (submit: boolean) => {
        if (!title.trim() || items.length === 0) {
            alert("Title and at least 1 item is required.");
            return;
        }

        const validItems = items.map(i => {
            const q = Number(i.quantity) || 1;
            const c = Number(i.unitCost) || 0;
            return {
                category: i.category,
                description: i.description,
                quantity: q,
                unitCost: c,
                totalCost: q * c
            };
        });

        if (submit && !confirm("Once submitted, the budget will enter the formal approval workflow and cannot be edited. Proceed?")) {
            return;
        }

        setSaving(true);
        try {
            const res = await fetch("/api/portal/finance/budgets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, period, submit, items: validItems }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Save failed");
            }
            await loadBudgets();
            setIsCreating(false);
            // Reset form
            setTitle("");
            setItems([]);
        } catch (err) {
            alert(err instanceof Error ? err.message : "Error saving");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this draft budget?")) return;
        try {
            const res = await fetch(`/api/portal/finance/budgets?id=${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Delete failed");
            await loadBudgets();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleFundRequest = async (budgetId: number) => {
        if (!requestAmount || Number(requestAmount) <= 0) return alert("Enter valid amount");
        try {
            setSaving(true);
            const res = await fetch(`/api/portal/finance/budgets/requests`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ budgetId, amount: Number(requestAmount) })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to Request");
            }
            alert("Fund Request Submitted under review tracking");
            setRequestingBudget(null);
            setRequestAmount('');
            await loadBudgets();
        } catch (e: any) {
            alert(e.message);
        } finally {
            setSaving(false);
        }
    };

    const getStatusStyles = (status: string) => {
        switch (status) {
            case "draft": return { bg: "#f3f4f6", text: "#4b5563" }; // Gray
            case "submitted":
            case "under_review": return { bg: "#dbeafe", text: "#1e40af" }; // Blue
            case "approved":
            case "funded": return { bg: "#dcfce3", text: "#166534" }; // Green
            case "partially_funded": return { bg: "#fef3c7", text: "#92400e" }; // Yellow
            case "rejected": return { bg: "#fee2e2", text: "#991b1b" }; // Red
            case "closed": return { bg: "#e5e7eb", text: "#374151" };
            default: return { bg: "#f3f4f6", text: "#4b5563" };
        }
    };

    const formatStatusName = (s: string) => {
        return s.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    };

    // Calculate totals for Form
    const formTotal = items.reduce((sum, item) => sum + ((Number(item.quantity) || 1) * (Number(item.unitCost) || 0)), 0);

    return (
        <div style={{ maxWidth: "1200px", margin: "0 auto", paddingBottom: "4rem" }}>
            {/* Header Toolbar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                <div>
                    <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0, color: "#111827" }}>Budget Tracking Workspace</h1>
                    <p style={{ margin: "4px 0 0 0", color: "#6b7280", fontSize: "0.95rem" }}>
                        Create operational budgets and submit funding requests.
                    </p>
                </div>
                <button
                    onClick={() => {
                        setTitle("");
                        setPeriod(new Date().toISOString().slice(0, 7));
                        setItems([]);
                        setIsCreating(true);
                    }}
                    style={{
                        background: "var(--ds-primary)",
                        color: "white",
                        padding: "0.75rem 1.25rem",
                        borderRadius: "8px",
                        border: "none",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        gap: "8px",
                        alignItems: "center"
                    }}
                >
                    <span>+</span> New Budget
                </button>
            </div>

            {/* Existing Budgets Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "1.5rem" }}>
                {budgets.map((b) => {
                    const statusConfig = getStatusStyles(b.status);
                    
                    // compute underlying totals locally
                    const itemsTotalCost = b.items?.reduce((s, i) => s + Number(i.totalCost), 0) || 0;
                    const availableToRequest = itemsTotalCost - Number(b.requestedAmount);

                    return (
                        <div key={b.id} className="ds-card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                            {/* Card Header */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                <div>
                                    <h3 style={{ margin: "0 0 0.2rem 0", fontSize: "1.1rem", fontWeight: 700, color: "#111827" }}>{b.title}</h3>
                                    <span style={{ fontSize: "0.85rem", color: "#6b7280", background: "#f3f4f6", padding: "0.15rem 0.5rem", borderRadius: "12px" }}>
                                        {b.period}
                                    </span>
                                </div>
                                <span style={{
                                    fontSize: "0.75rem",
                                    fontWeight: 600,
                                    padding: "0.25rem 0.6rem",
                                    borderRadius: "12px",
                                    backgroundColor: statusConfig.bg,
                                    color: statusConfig.text
                                }}>
                                    {formatStatusName(b.status)}
                                </span>
                            </div>

                            {/* Line Items Summary */}
                            <div style={{ background: "#f8fafc", padding: "1rem", borderRadius: "8px", fontSize: "0.85rem", color: "#475569" }}>
                                {b.items && b.items.length > 0 ? (
                                    <ul style={{ margin: 0, paddingLeft: "1.2rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                                        {b.items.slice(0, 3).map((line, idx) => (
                                            <li key={idx}>
                                                <span style={{ fontWeight: 500 }}>{line.category}</span>
                                                {" — "}{formatMoney("UGX", line.totalCost)}
                                            </li>
                                        ))}
                                        {b.items.length > 3 && (
                                            <li style={{ color: "#94a3b8", listStyleType: "none", marginTop: "4px", paddingLeft: 0 }}>
                                                + {b.items.length - 3} more items
                                            </li>
                                        )}
                                    </ul>
                                ) : (
                                    <span style={{ fontStyle: "italic", color: "#94a3b8" }}>No line items</span>
                                )}
                            </div>

                            {/* Financial Summary */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", background: "#fff", border: "1px solid #e2e8f0", padding: "1rem", borderRadius: "8px" }}>
                                <div>
                                    <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Total Env.</div>
                                    <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0f172a", marginTop: "2px" }}>{formatMoney("UGX", itemsTotalCost)}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Requested</div>
                                    <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0f172a", marginTop: "2px" }}>{formatMoney("UGX", b.requestedAmount)}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Approved</div>
                                    <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--ds-primary)", marginTop: "2px" }}>{formatMoney("UGX", b.approvedAmount)}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Spent</div>
                                    <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#16a34a", marginTop: "2px" }}>{formatMoney("UGX", b.spentAmount)}</div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div style={{ display: "flex", gap: "0.5rem", marginTop: "auto", paddingTop: "0.5rem" }}>
                                <button className="finance-btn finance-btn-outline" style={{ flex: 1 }}>Details</button>
                                
                                {b.status === "draft" && (
                                    <button 
                                      className="finance-btn finance-btn-outline" 
                                      style={{ color: "#dc2626", borderColor: "#fca5a5" }}
                                      onClick={() => handleDelete(b.id)}
                                    >
                                        Delete
                                    </button>
                                )}

                                {b.status !== "draft" && b.status !== "closed" && (
                                    <button 
                                      className="finance-btn finance-btn-primary" 
                                      style={{ flex: 1.5, background: availableToRequest > 0 ? "#16a34a" : "#94a3b8" }}
                                      disabled={availableToRequest <= 0}
                                      onClick={() => setRequestingBudget(b.id)}
                                    >
                                        Request Fund
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Fund Request Interstitial Modal */}
            {requestingBudget && (
                <div style={{
                    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                    background: "rgba(15,23,42,0.7)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999, padding: "2rem"
                }}>
                    <div style={{ background: "white", padding: "2rem", borderRadius: "16px", width: "100%", maxWidth: "450px" }}>
                        <h3 style={{ margin: "0 0 1rem 0" }}>Request Budget Funding</h3>
                        <p style={{ fontSize: "0.9rem", color: "#64748b", marginBottom: "1.5rem" }}>
                            Enter the specific operational amount you need disbursed right now. The admin team will review current liquidity bounds before full approval.
                        </p>
                        <div style={{ marginBottom: "1.5rem" }}>
                            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, fontSize: "0.9rem" }}>Amount (UGX)</label>
                            <input 
                                type="number" step="1000" min="0"
                                value={requestAmount} onChange={e => setRequestAmount(e.target.value ? Number(e.target.value) : '')}
                                style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                            />
                        </div>
                        <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                            <button onClick={() => setRequestingBudget(null)} className="finance-btn finance-btn-outline" disabled={saving}>Cancel</button>
                            <button onClick={() => handleFundRequest(requestingBudget)} className="finance-btn finance-btn-primary" disabled={saving || !requestAmount}>
                                {saving ? "Submitting..." : "Submit Verification"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {budgets.length === 0 && (
                <div style={{ textAlign: "center", padding: "4rem 2rem", color: "#6b7280", background: "#f8fafc", borderRadius: "12px", border: "1px dashed #cbd5e1" }}>
                    <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>📋</div>
                    <h3 style={{ margin: "0 0 0.5rem 0", color: "#1e293b" }}>No Budgets Yet</h3>
                    <p style={{ margin: 0 }}>Create your first operational budget to request funding.</p>
                </div>
            )}

            {/* Create Budget Modal */}
            {isCreating && (
                <div style={{
                    position: "fixed",
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: "rgba(15, 23, 42, 0.7)",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    zIndex: 9999,
                    padding: "2rem"
                }}>
                    <div style={{
                        background: "white",
                        borderRadius: "16px",
                        width: "100%",
                        maxWidth: "800px",
                        maxHeight: "90vh",
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden"
                    }}>
                        <div style={{ padding: "1.5rem", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <h2 style={{ margin: 0, fontSize: "1.25rem", color: "#0f172a" }}>New Operational Budget</h2>
                            <button onClick={() => setIsCreating(false)} style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "#64748b" }}>×</button>
                        </div>

                        <div style={{ padding: "1.5rem", overflowY: "auto", flex: 1 }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "2rem" }}>
                                <div>
                                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", fontWeight: 600, color: "#334155" }}>Budget Title</label>
                                    <input 
                                        value={title} onChange={e => setTitle(e.target.value)} 
                                        placeholder="e.g. Q1 Training Deployment"
                                        style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.95rem" }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", fontWeight: 600, color: "#334155" }}>Period</label>
                                    <input 
                                        value={period} onChange={e => setPeriod(e.target.value)}
                                        placeholder="e.g. 2026-03"
                                        style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.95rem" }}
                                    />
                                </div>
                            </div>

                            <div style={{ marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                                <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#1e293b" }}>Budget Line Items</h3>
                                <button onClick={handleAddItem} className="finance-btn finance-btn-outline" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
                                    + Add Row
                                </button>
                            </div>

                            {items.length === 0 ? (
                                <div style={{ padding: "2rem", textAlign: "center", background: "#f8fafc", borderRadius: "8px", border: "1px dashed #cbd5e1", color: "#64748b" }}>
                                    No line items added yet.
                                </div>
                            ) : (
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
                                    <thead>
                                        <tr style={{ textAlign: "left", color: "#64748b", borderBottom: "2px solid #e2e8f0" }}>
                                            <th style={{ padding: "0.75rem 0.5rem", width: "25%" }}>Category</th>
                                            <th style={{ padding: "0.75rem 0.5rem", width: "35%" }}>Description</th>
                                            <th style={{ padding: "0.75rem 0.5rem", width: "12%" }}>Qty</th>
                                            <th style={{ padding: "0.75rem 0.5rem", width: "18%" }}>Unit Cost</th>
                                            <th style={{ padding: "0.75rem 0.5rem", width: "10%", textAlign: "center" }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((item) => (
                                            <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                                <td style={{ padding: "0.75rem 0.5rem" }}>
                                                    <select 
                                                        value={item.category} 
                                                        onChange={e => updateItem(item.id, "category", e.target.value)}
                                                        style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                                                    >
                                                        {BUDGET_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                                    </select>
                                                </td>
                                                <td style={{ padding: "0.75rem 0.5rem" }}>
                                                    <input 
                                                        value={item.description} 
                                                        onChange={e => updateItem(item.id, "description", e.target.value)}
                                                        placeholder="Item detail..."
                                                        style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                                                    />
                                                </td>
                                                <td style={{ padding: "0.75rem 0.5rem" }}>
                                                    <input 
                                                        type="number" min="1"
                                                        value={item.quantity} 
                                                        onChange={e => updateItem(item.id, "quantity", e.target.value)}
                                                        style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                                                    />
                                                </td>
                                                <td style={{ padding: "0.75rem 0.5rem" }}>
                                                    <input 
                                                        type="number" min="0" step="1000"
                                                        value={item.unitCost} 
                                                        onChange={e => updateItem(item.id, "unitCost", e.target.value)}
                                                        style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                                                    />
                                                </td>
                                                <td style={{ padding: "0.75rem 0.5rem", textAlign: "center" }}>
                                                    <button 
                                                        onClick={() => handleRemoveItem(item.id)}
                                                        style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: "1.1rem" }}
                                                    >
                                                        ✕
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td colSpan={3}></td>
                                            <td colSpan={2} style={{ padding: "1rem 0.5rem", textAlign: "right", fontWeight: 700, fontSize: "1.1rem", color: "#0f172a" }}>
                                                Total: {formatMoney("UGX", formTotal)}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            )}
                        </div>

                        <div style={{ padding: "1.5rem", background: "#f8fafc", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <button 
                                onClick={() => setIsCreating(false)} 
                                className="finance-btn finance-btn-outline"
                                disabled={saving}
                            >
                                Cancel
                            </button>
                            <div style={{ display: "flex", gap: "1rem" }}>
                                <button 
                                    className="finance-btn finance-btn-outline" 
                                    onClick={() => handleSave(false)}
                                    disabled={saving}
                                >
                                    {saving ? "Saving..." : "Save as Draft"}
                                </button>
                                <button 
                                    className="finance-btn finance-btn-primary" 
                                    onClick={() => handleSave(true)}
                                    disabled={saving}
                                >
                                    {saving ? "Submitting..." : "Submit Budget"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
