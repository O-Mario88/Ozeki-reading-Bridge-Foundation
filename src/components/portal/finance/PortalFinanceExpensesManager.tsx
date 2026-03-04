"use client";

import { FormEvent, useMemo, useState } from "react";
import { FloatingSurface } from "@/components/FloatingSurface";
import { formatDate, formatMoney } from "@/components/portal/finance/format";
import type { FinanceExpenseRecord } from "@/lib/types";

type PortalFinanceExpensesManagerProps = {
  initialExpenses: FinanceExpenseRecord[];
};

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function PortalFinanceExpensesManager({ initialExpenses }: PortalFinanceExpensesManagerProps) {
  const [expenses, setExpenses] = useState(initialExpenses);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [form, setForm] = useState({
    vendorName: "",
    date: todayIsoDate(),
    subcategory: "",
    amount: "",
    currency: "UGX",
    paymentMethod: "bank_transfer",
    description: "",
    notes: "",
  });
  const [receiptFiles, setReceiptFiles] = useState<FileList | null>(null);

  const totals = useMemo(() => {
    return expenses.reduce(
      (acc, item) => {
        acc.count += 1;
        acc.total += Number(item.amount || 0);
        if (item.status === "posted") {
          acc.posted += Number(item.amount || 0);
        }
        return acc;
      },
      { count: 0, total: 0, posted: 0 },
    );
  }, [expenses]);

  function resetForm() {
    setForm({
      vendorName: "",
      date: todayIsoDate(),
      subcategory: "",
      amount: "",
      currency: "UGX",
      paymentMethod: "bank_transfer",
      description: "",
      notes: "",
    });
    setReceiptFiles(null);
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatusMessage("");
    try {
      const body = new FormData();
      body.set("vendorName", form.vendorName);
      body.set("date", form.date);
      body.set("subcategory", form.subcategory);
      body.set("amount", form.amount);
      body.set("currency", form.currency);
      body.set("paymentMethod", form.paymentMethod);
      body.set("description", form.description);
      body.set("notes", form.notes);
      if (receiptFiles) {
        Array.from(receiptFiles).forEach((file) => body.append("receipts", file));
      }

      const response = await fetch("/api/portal/finance/expenses", {
        method: "POST",
        body,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to create expense.");
      }
      setExpenses((prev) => [data.expense as FinanceExpenseRecord, ...prev]);
      resetForm();
      setOpen(false);
      setStatusMessage("Expense draft created.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to create expense.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePost(expenseId: number) {
    setSaving(true);
    setStatusMessage("");
    try {
      const response = await fetch(`/api/portal/finance/expenses/${expenseId}/post`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to post expense.");
      }
      setExpenses((prev) =>
        prev.map((item) => (item.id === expenseId ? (data.expense as FinanceExpenseRecord) : item)),
      );
      setStatusMessage("Expense posted.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to post expense.");
    } finally {
      setSaving(false);
    }
  }

  async function handleVoid(expenseId: number) {
    const reason = window.prompt("Enter void reason:");
    if (!reason) {
      return;
    }
    setSaving(true);
    setStatusMessage("");
    try {
      const response = await fetch(`/api/portal/finance/expenses/${expenseId}/void`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to void expense.");
      }
      setExpenses((prev) =>
        prev.map((item) => (item.id === expenseId ? (data.expense as FinanceExpenseRecord) : item)),
      );
      setStatusMessage("Expense voided.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to void expense.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="portal-grid">
      <section className="portal-kpis">
        <article className="portal-kpi-card">
          <p>Expenses</p>
          <strong>{totals.count.toLocaleString()}</strong>
        </article>
        <article className="portal-kpi-card">
          <p>Total drafts + posted</p>
          <strong>{formatMoney("UGX", totals.total)}</strong>
        </article>
        <article className="portal-kpi-card">
          <p>Total posted</p>
          <strong>{formatMoney("UGX", totals.posted)}</strong>
        </article>
      </section>

      <section className="card">
        <h2>Expense Tracker</h2>
        <p>Draft expenses, upload receipt evidence, and post to create immutable money-out ledger entries.</p>
        <div className="action-row portal-form-actions">
          <button type="button" className="button" onClick={() => setOpen(true)}>+ New Expense</button>
          <a className="button button-ghost" href="/api/portal/finance/expenses?format=csv">Export CSV</a>
        </div>
        {statusMessage ? <p className="portal-muted">{statusMessage}</p> : null}
      </section>

      <section className="card">
        <h2>Expense Register</h2>
        {expenses.length === 0 ? (
          <p>No expenses yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Expense #</th>
                  <th>Date</th>
                  <th>Vendor</th>
                  <th>Subcategory</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((item) => (
                  <tr key={item.id}>
                    <td>{item.expenseNumber}</td>
                    <td>{formatDate(item.date)}</td>
                    <td>{item.vendorName}</td>
                    <td>{item.subcategory || "—"}</td>
                    <td>{formatMoney(item.currency, item.amount)}</td>
                    <td>{item.status}</td>
                    <td>
                      <div className="action-row">
                        <button
                          type="button"
                          className="button button-ghost"
                          onClick={() => handlePost(item.id)}
                          disabled={saving || item.status !== "draft"}
                        >
                          Post
                        </button>
                        <button
                          type="button"
                          className="button button-ghost"
                          onClick={() => handleVoid(item.id)}
                          disabled={saving || item.status === "void"}
                        >
                          Void
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <FloatingSurface
        open={open}
        onClose={() => setOpen(false)}
        title="Create Expense"
        description="Upload receipt evidence before posting the expense."
        closeLabel="Close"
        maxWidth="900px"
      >
        <form className="form-grid portal-form-grid" onSubmit={handleCreate}>
          <label>
            <span className="portal-field-label">Vendor Name</span>
            <input
              required
              value={form.vendorName}
              onChange={(event) => setForm((prev) => ({ ...prev, vendorName: event.target.value }))}
            />
          </label>
          <label>
            <span className="portal-field-label">Date</span>
            <input
              type="date"
              required
              value={form.date}
              onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
            />
          </label>
          <label>
            <span className="portal-field-label">Subcategory</span>
            <input
              value={form.subcategory}
              onChange={(event) => setForm((prev) => ({ ...prev, subcategory: event.target.value }))}
            />
          </label>
          <label>
            <span className="portal-field-label">Amount</span>
            <input
              type="number"
              min={0.01}
              step="0.01"
              required
              value={form.amount}
              onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
            />
          </label>
          <label>
            <span className="portal-field-label">Currency</span>
            <select
              value={form.currency}
              onChange={(event) => setForm((prev) => ({ ...prev, currency: event.target.value }))}
            >
              <option value="UGX">UGX</option>
              <option value="USD">USD</option>
            </select>
          </label>
          <label>
            <span className="portal-field-label">Payment Method</span>
            <select
              value={form.paymentMethod}
              onChange={(event) => setForm((prev) => ({ ...prev, paymentMethod: event.target.value }))}
            >
              <option value="cash">cash</option>
              <option value="bank_transfer">bank_transfer</option>
              <option value="mobile_money">mobile_money</option>
              <option value="cheque">cheque</option>
              <option value="other">other</option>
            </select>
          </label>
          <label className="full-width">
            <span className="portal-field-label">Description</span>
            <textarea
              rows={3}
              required
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            />
          </label>
          <label className="full-width">
            <span className="portal-field-label">Notes</span>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
            />
          </label>
          <label className="full-width">
            <span className="portal-field-label">Receipt Upload(s)</span>
            <input type="file" multiple accept="image/*,.pdf" onChange={(event) => setReceiptFiles(event.target.files)} />
            <small className="portal-field-help">At least one file is required before posting.</small>
          </label>
          <div className="full-width action-row portal-form-actions">
            <button className="button" type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Draft Expense"}
            </button>
          </div>
        </form>
      </FloatingSurface>
    </div>
  );
}

