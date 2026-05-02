"use client";

import { FormEvent, useMemo, useState } from "react";
import { FloatingSurface } from "@/components/FloatingSurface";
import { FinanceDestructiveActionModal } from "@/components/portal/finance/FinanceDestructiveActionModal";
import { formatDate, formatMoney } from "@/components/portal/finance/format";
import { DashboardListHeader, DashboardListRow } from "@/components/portal/DashboardList";
import type { FinanceExpenseRecord } from "@/lib/types";

type PortalFinanceExpensesManagerProps = {
  initialExpenses: FinanceExpenseRecord[];
};

type ExpenseReceiptMetadataDraft = {
  vendorName: string;
  receiptDate: string;
  receiptAmount: string;
  currency: "UGX" | "USD";
  referenceNo: string;
};

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function PortalFinanceExpensesManager({ initialExpenses }: PortalFinanceExpensesManagerProps) {
  const [expenses, setExpenses] = useState(initialExpenses);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | FinanceExpenseRecord["status"]>("all");
  const [destructiveTarget, setDestructiveTarget] = useState<FinanceExpenseRecord | null>(null);
  const [form, setForm] = useState({
    vendorName: "",
    date: todayIsoDate(),
    subcategory: "",
    amount: "",
    currency: "UGX",
    paymentMethod: "bank_transfer",
    description: "",
    notes: "",
    submitNow: true,
    autoPost: true,
  });
  const [receiptFiles, setReceiptFiles] = useState<FileList | null>(null);
  const [receiptMetadata, setReceiptMetadata] = useState<ExpenseReceiptMetadataDraft[]>([]);

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

  const filteredExpenses = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return expenses.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }
      if (!needle) {
        return true;
      }
      const haystack = [
        item.expenseNumber,
        item.vendorName,
        item.subcategory || "",
        item.description,
        item.status,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [expenses, search, statusFilter]);

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
      submitNow: true,
      autoPost: true,
    });
    setReceiptFiles(null);
    setReceiptMetadata([]);
  }

  function updateReceiptFiles(files: FileList | null) {
    setReceiptFiles(files);
    if (!files || files.length === 0) {
      setReceiptMetadata([]);
      return;
    }
    const totalAmount = Number(form.amount || 0);
    const defaultAmounts = Array.from({ length: files.length }, (_, index) => {
      if (!(totalAmount > 0)) {
        return "";
      }
      const base = Math.floor((totalAmount / files.length) * 100) / 100;
      const assigned = base * index;
      if (index === files.length - 1) {
        return Math.max(0, totalAmount - assigned).toFixed(2);
      }
      return base.toFixed(2);
    });
    const defaults: ExpenseReceiptMetadataDraft[] = Array.from(files).map((_, index) => ({
      vendorName: form.vendorName || "",
      receiptDate: form.date || todayIsoDate(),
      receiptAmount: defaultAmounts[index] || "",
      currency: (form.currency as "UGX" | "USD") || "UGX",
      referenceNo: "",
    }));
    setReceiptMetadata(defaults);
  }

  function hasValidReceiptMetadata() {
    if (!receiptFiles || receiptFiles.length === 0) {
      return false;
    }
    if (receiptMetadata.length !== receiptFiles.length) {
      return false;
    }
    return receiptMetadata.every((item) =>
      item.vendorName.trim().length > 1 &&
      item.receiptDate.trim().length >= 8 &&
      Number(item.receiptAmount) > 0 &&
      (item.currency === "UGX" || item.currency === "USD"));
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if ((form.submitNow || form.autoPost) && !hasValidReceiptMetadata()) {
      setStatusMessage("Submitted/posted expenses require at least one receipt file with complete metadata.");
      return;
    }
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
      body.set("submitNow", form.submitNow ? "1" : "0");
      body.set("autoPost", form.autoPost ? "1" : "0");
      if (receiptFiles) {
        Array.from(receiptFiles).forEach((file) => body.append("receipts", file));
      }
      if (receiptMetadata.length > 0) {
        body.set(
          "receiptMetadata",
          JSON.stringify(
            receiptMetadata.map((item, index) => ({
              fileIndex: index,
              vendorName: item.vendorName,
              receiptDate: item.receiptDate,
              receiptAmount: Number(item.receiptAmount || 0),
              currency: item.currency,
              referenceNo: item.referenceNo || undefined,
            })),
          ),
        );
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
      setStatusMessage(
        data.autoPosted
          ? "Expense submitted, audited, and posted to Money Out."
          : data.submitted
          ? "Expense submitted for posting checks."
          : "Expense draft created.",
      );
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to create expense.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(expenseId: number) {
    setSaving(true);
    setStatusMessage("");
    try {
      const response = await fetch(`/api/portal/finance/expenses/${expenseId}/submit`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to submit expense.");
      }
      setExpenses((prev) =>
        prev.map((item) => (item.id === expenseId ? (data.expense as FinanceExpenseRecord) : item)),
      );
      setStatusMessage("Expense submitted.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to submit expense.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePost(expense: FinanceExpenseRecord) {
    setSaving(true);
    setStatusMessage("");
    try {
      let overrideReason = "";
      if (expense.status === "blocked_mismatch") {
        overrideReason = window.prompt("Mismatch detected. Super Admin override reason (required to override):", "") || "";
      }
      const response = await fetch(`/api/portal/finance/expenses/${expense.id}/post`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overrideReason }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to post expense.");
      }
      setExpenses((prev) =>
        prev.map((item) => (item.id === expense.id ? (data.expense as FinanceExpenseRecord) : item)),
      );
      setStatusMessage("Expense posted.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to post expense.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteOrVoid(reason: string) {
    if (!destructiveTarget) {
      return;
    }
    const target = destructiveTarget;
    setSaving(true);
    setStatusMessage("");
    try {
      const response = await fetch(`/api/portal/finance/expenses/${target.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to delete/void expense.");
      }
      if (data.deleted) {
        setExpenses((prev) => prev.filter((item) => item.id !== target.id));
        setStatusMessage("Draft expense deleted.");
      } else if (data.expense) {
        setExpenses((prev) =>
          prev.map((item) => (item.id === target.id ? (data.expense as FinanceExpenseRecord) : item)),
        );
        setStatusMessage("Expense voided.");
      }
      setDestructiveTarget(null);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to delete/void expense.");
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
        <p>
          Clear expense entry form for operations. Posted expenses are automatically included in ledger, reports, and
          income statements.
        </p>
        <div className="action-row portal-form-actions">
          <button type="button" className="button button-sm" onClick={() => setOpen(true)}>+ New Expense</button>
          <a className="button button-ghost button-sm" href="/api/portal/finance/expenses?format=csv">Export CSV</a>
        </div>
        {statusMessage ? <p className="portal-muted">{statusMessage}</p> : null}
      </section>

      <section className="card">
        <h2>Expense Register</h2>
        <div className="finance-list-toolbar">
          <div className="finance-list-toolbar-left">
            <input
              className="finance-search-input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search expenses"
              aria-label="Search expenses"
            />
            <details className="finance-filter-popover">
              <summary>Filters</summary>
              <div className="finance-filter-popover-body">
                <label>
                  <span>Status</span>
                  <select
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(event.target.value as "all" | FinanceExpenseRecord["status"])}
                  >
                    <option value="all">All</option>
                    <option value="draft">Draft</option>
                    <option value="submitted">Submitted</option>
                    <option value="blocked_mismatch">Blocked mismatch</option>
                    <option value="posted">Posted</option>
                    <option value="void">Void</option>
                  </select>
                </label>
              </div>
            </details>
          </div>
          <div className="finance-list-toolbar-right portal-muted">
            {filteredExpenses.length} shown
          </div>
        </div>
        {filteredExpenses.length === 0 ? (
          <p>No expenses match the current search/filter.</p>
        ) : (
          <div className="table-wrap finance-table-compact">
            <DashboardListHeader template="120px 100px minmax(0,1.4fr) minmax(0,1fr) 120px 110px 240px">
              <span>Expense #</span>
              <span>Date</span>
              <span>Vendor</span>
              <span>Subcategory</span>
              <span>Amount</span>
              <span>Status</span>
              <span>Actions</span>
            </DashboardListHeader>
            {filteredExpenses.map((item) => (
              <DashboardListRow
                key={item.id}
                template="120px 100px minmax(0,1.4fr) minmax(0,1fr) 120px 110px 240px"
              >
                <span>{item.expenseNumber}</span>
                <span>{formatDate(item.date)}</span>
                <span className="truncate">{item.vendorName}</span>
                <span className="truncate">{item.subcategory || "—"}</span>
                <span>{formatMoney(item.currency, item.amount)}</span>
                <span><span className={`finance-status-tag finance-status-${item.status}`}>{item.status}</span></span>
                <span>
                  <span className="action-row finance-row-actions">
                    <button
                      type="button"
                      className="button button-ghost button-sm"
                      onClick={() => handleSubmit(item.id)}
                      disabled={saving || (item.status !== "draft" && item.status !== "blocked_mismatch")}
                    >
                      Submit
                    </button>
                    <button
                      type="button"
                      className="button button-ghost button-sm"
                      onClick={() => handlePost(item)}
                      disabled={saving || item.status !== "submitted"}
                    >
                      Post
                    </button>
                    <button
                      type="button"
                      className="button button-ghost button-sm finance-row-danger"
                      onClick={() => setDestructiveTarget(item)}
                      disabled={saving || item.status === "void"}
                      title={item.status === "draft" ? "Delete draft" : "Void posted"}
                    >
                      {item.status === "draft" ? "Delete" : "Void"}
                    </button>
                  </span>
                </span>
              </DashboardListRow>
            ))}
          </div>
        )}
      </section>

      <FloatingSurface
        open={open}
        onClose={() => setOpen(false)}
        title="Create Expense"
        description="Draft, submit, and post expenses with receipt metadata checks and audit-safe controls."
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
            <input
              type="file"
              multiple
              accept="image/*,.pdf"
              onChange={(event) => updateReceiptFiles(event.target.files)}
            />
            <small className="portal-field-help">
              Submitted/posted expenses require receipt files plus metadata (vendor, date, amount, currency).
            </small>
          </label>
          {receiptMetadata.length > 0 ? (
            <div className="full-width portal-list">
              {receiptMetadata.map((item, index) => (
                <div key={`receipt-meta-${index}`} className="portal-form-grid" style={{ borderTop: "1px solid #e5e7eb", paddingTop: "0.75rem" }}>
                  <strong className="full-width">Receipt #{index + 1}</strong>
                  <label>
                    <span className="portal-field-label">Vendor</span>
                    <input
                      value={item.vendorName}
                      onChange={(event) =>
                        setReceiptMetadata((prev) => prev.map((meta, idx) => idx === index ? { ...meta, vendorName: event.target.value } : meta))}
                    />
                  </label>
                  <label>
                    <span className="portal-field-label">Receipt Date</span>
                    <input
                      type="date"
                      value={item.receiptDate}
                      onChange={(event) =>
                        setReceiptMetadata((prev) => prev.map((meta, idx) => idx === index ? { ...meta, receiptDate: event.target.value } : meta))}
                    />
                  </label>
                  <label>
                    <span className="portal-field-label">Receipt Amount</span>
                    <input
                      type="number"
                      min={0.01}
                      step="0.01"
                      value={item.receiptAmount}
                      onChange={(event) =>
                        setReceiptMetadata((prev) => prev.map((meta, idx) => idx === index ? { ...meta, receiptAmount: event.target.value } : meta))}
                    />
                  </label>
                  <label>
                    <span className="portal-field-label">Currency</span>
                    <select
                      value={item.currency}
                      onChange={(event) =>
                        setReceiptMetadata((prev) => prev.map((meta, idx) => idx === index ? { ...meta, currency: event.target.value as "UGX" | "USD" } : meta))}
                    >
                      <option value="UGX">UGX</option>
                      <option value="USD">USD</option>
                    </select>
                  </label>
                  <label className="full-width">
                    <span className="portal-field-label">Reference No (optional)</span>
                    <input
                      value={item.referenceNo}
                      onChange={(event) =>
                        setReceiptMetadata((prev) => prev.map((meta, idx) => idx === index ? { ...meta, referenceNo: event.target.value } : meta))}
                    />
                  </label>
                </div>
              ))}
            </div>
          ) : null}
          <label className="full-width">
            <span className="portal-field-label">Submit now</span>
            <input
              type="checkbox"
              checked={form.submitNow}
              onChange={(event) => setForm((prev) => ({ ...prev, submitNow: event.target.checked }))}
            />
            <small className="portal-field-help">Moves draft to submitted so posting checks can run.</small>
          </label>
          <label className="full-width">
            <span className="portal-field-label">Post immediately after submit</span>
            <input
              type="checkbox"
              checked={form.autoPost}
              onChange={(event) => setForm((prev) => ({ ...prev, autoPost: event.target.checked }))}
            />
            <small className="portal-field-help">Runs audit checks and posts to Money Out when all controls pass.</small>
          </label>
          <div className="full-width action-row portal-form-actions">
            <button className="button button-sm" type="submit" disabled={saving}>
              {saving
                ? "Saving..."
                : form.autoPost
                ? "Save, Submit & Post Expense"
                : form.submitNow
                ? "Save & Submit Expense"
                : "Save Draft Expense"}
            </button>
          </div>
        </form>
      </FloatingSurface>

      <FinanceDestructiveActionModal
        open={Boolean(destructiveTarget)}
        onClose={() => setDestructiveTarget(null)}
        title={destructiveTarget?.status === "draft" ? "Delete expense draft?" : "Void expense?"}
        impactText={
          destructiveTarget?.status === "draft"
            ? "This permanently removes the draft expense and its uploaded evidence references."
            : "This marks the expense as void while preserving ledger and audit history."
        }
        confirmLabel={destructiveTarget?.status === "draft" ? "Delete Draft" : "Void Expense"}
        loading={saving}
        onConfirm={handleDeleteOrVoid}
      />
    </div>
  );
}
