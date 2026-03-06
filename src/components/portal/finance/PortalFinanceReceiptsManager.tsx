"use client";

import { FormEvent, useMemo, useState } from "react";
import { FloatingSurface } from "@/components/FloatingSurface";
import { FinanceDestructiveActionModal } from "@/components/portal/finance/FinanceDestructiveActionModal";
import { formatDate, formatMoney } from "@/components/portal/finance/format";
import { FINANCE_INCOME_CATEGORIES } from "@/lib/finance-categories";
import type { FinanceContactRecord, FinanceInvoiceRecord, FinanceReceiptRecord } from "@/lib/types";

type PortalFinanceReceiptsManagerProps = {
  initialReceipts: FinanceReceiptRecord[];
  contacts: FinanceContactRecord[];
  invoices: FinanceInvoiceRecord[];
};

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function parseEmailList(value: string) {
  return value
    .split(/[\n,;]/)
    .map((item) => item.trim())
    .filter((item) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item));
}

export function PortalFinanceReceiptsManager({
  initialReceipts,
  contacts,
  invoices,
}: PortalFinanceReceiptsManagerProps) {
  const [receipts, setReceipts] = useState(initialReceipts);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | FinanceReceiptRecord["status"]>("all");
  const [destructiveTarget, setDestructiveTarget] = useState<FinanceReceiptRecord | null>(null);
  const [form, setForm] = useState({
    contactId: "",
    category: "Donation",
    receivedFrom: "",
    receiptDate: todayIsoDate(),
    currency: "UGX",
    amountReceived: "",
    paymentMethod: "bank_transfer",
    referenceNo: "",
    relatedInvoiceId: "",
    description: "",
    notes: "",
    issueNow: true,
    sendEmail: false,
  });

  const totals = useMemo(() => {
    return receipts.reduce(
      (acc, item) => {
        acc.count += 1;
        acc.amount += Number(item.amountReceived || 0);
        if (item.status === "issued") {
          acc.issued += 1;
        }
        return acc;
      },
      { count: 0, amount: 0, issued: 0 },
    );
  }, [receipts]);

  const filteredReceipts = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return receipts.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }
      if (!needle) {
        return true;
      }
      const haystack = [
        item.receiptNumber,
        item.receivedFrom,
        item.category,
        item.status,
        item.referenceNo || "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [receipts, search, statusFilter]);

  function resetForm() {
    setForm({
      contactId: "",
      category: "Donation",
      receivedFrom: "",
      receiptDate: todayIsoDate(),
      currency: "UGX",
      amountReceived: "",
      paymentMethod: "bank_transfer",
      referenceNo: "",
      relatedInvoiceId: "",
      description: "",
      notes: "",
      issueNow: true,
      sendEmail: false,
    });
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedDescription = form.description.trim();
    if (form.description.length > 0 && trimmedDescription.length === 0) {
      setStatusMessage("Description cannot be only whitespace.");
      return;
    }
    setSaving(true);
    setStatusMessage("");
    try {
      const response = await fetch("/api/portal/finance/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: Number(form.contactId),
          category: form.category,
          receivedFrom: form.receivedFrom,
          receiptDate: form.receiptDate,
          currency: form.currency,
          amountReceived: Number(form.amountReceived),
          paymentMethod: form.paymentMethod,
          referenceNo: form.referenceNo || undefined,
          relatedInvoiceId: form.relatedInvoiceId ? Number(form.relatedInvoiceId) : undefined,
          description: trimmedDescription || undefined,
          notes: form.notes || undefined,
          issueNow: form.issueNow,
          sendEmail: form.issueNow ? form.sendEmail : false,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to create receipt.");
      }
      setReceipts((prev) => [data.receipt as FinanceReceiptRecord, ...prev]);
      resetForm();
      setOpen(false);
      setStatusMessage(
        data.issuedNow
          ? (data.email ? `Receipt issued and emailed (${data.email.status || "processed"}).` : "Receipt issued and income recorded.")
          : "Receipt draft created.",
      );
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to create receipt.");
    } finally {
      setSaving(false);
    }
  }

  async function handleIssue(receiptId: number) {
    const toInput = window.prompt("Issue and send receipt to (email or comma-separated emails). Leave blank to use contact default:", "");
    if (toInput === null) {
      return;
    }
    const ccInput = window.prompt("Optional CC emails (comma-separated). Leave blank for default CC only:", "");
    if (ccInput === null) {
      return;
    }
    const to = parseEmailList(toInput);
    const cc = parseEmailList(ccInput);

    setSaving(true);
    setStatusMessage("");
    try {
      const response = await fetch(`/api/portal/finance/receipts/${receiptId}/issue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sendEmail: true,
          to: to.length > 0 ? to : undefined,
          cc: cc.length > 0 ? cc : undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to issue receipt.");
      }
      setReceipts((prev) =>
        prev.map((item) => (item.id === receiptId ? (data.receipt as FinanceReceiptRecord) : item)),
      );
      setStatusMessage("Receipt issued.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to issue receipt.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSend(receiptId: number) {
    const toInput = window.prompt("Send receipt to (email or comma-separated emails). Leave blank to use contact default:", "");
    if (toInput === null) {
      return;
    }
    const ccInput = window.prompt("Optional CC emails (comma-separated). Leave blank for default CC only:", "");
    if (ccInput === null) {
      return;
    }
    const to = parseEmailList(toInput);
    const cc = parseEmailList(ccInput);

    setSaving(true);
    setStatusMessage("");
    try {
      const response = await fetch(`/api/portal/finance/receipts/${receiptId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: to.length > 0 ? to : undefined,
          cc: cc.length > 0 ? cc : undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to send receipt.");
      }
      setReceipts((prev) =>
        prev.map((item) => (item.id === receiptId ? (data.receipt as FinanceReceiptRecord) : item)),
      );
      setStatusMessage(`Receipt email ${data.email?.status || "processed"}.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to send receipt.");
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
      const response = await fetch(`/api/portal/finance/receipts/${target.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to delete/void receipt.");
      }
      if (data.deleted) {
        setReceipts((prev) => prev.filter((item) => item.id !== target.id));
        setStatusMessage("Draft receipt deleted.");
      } else if (data.receipt) {
        setReceipts((prev) =>
          prev.map((item) => (item.id === target.id ? (data.receipt as FinanceReceiptRecord) : item)),
        );
        setStatusMessage("Receipt voided.");
      }
      setDestructiveTarget(null);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to delete/void receipt.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="portal-grid">
      <section className="portal-kpis">
        <article className="portal-kpi-card">
          <p>Receipts</p>
          <strong>{totals.count.toLocaleString()}</strong>
        </article>
        <article className="portal-kpi-card">
          <p>Total received</p>
          <strong>{formatMoney("UGX", totals.amount)}</strong>
        </article>
        <article className="portal-kpi-card">
          <p>Issued receipts</p>
          <strong>{totals.issued.toLocaleString()}</strong>
        </article>
      </section>

      <section className="card">
        <h2>Receipts</h2>
        <p className="portal-muted">
          Use this as your income entry form. Issued receipts are automatically posted to Money In and appear in statements/reports.
        </p>
        <div className="action-row portal-form-actions">
          <button type="button" className="button button-sm" onClick={() => setOpen(true)}>+ New Receipt</button>
          <a className="button button-ghost button-sm" href="/api/portal/finance/receipts?format=csv">Export CSV</a>
        </div>
        {statusMessage ? <p className="portal-muted">{statusMessage}</p> : null}
      </section>

      <section className="card">
        <h2>Receipt Register</h2>
        <div className="finance-list-toolbar">
          <div className="finance-list-toolbar-left">
            <input
              className="finance-search-input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search receipts"
              aria-label="Search receipts"
            />
            <details className="finance-filter-popover">
              <summary>Filters</summary>
              <div className="finance-filter-popover-body">
                <label>
                  <span>Status</span>
                  <select
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(event.target.value as "all" | FinanceReceiptRecord["status"])}
                  >
                    <option value="all">All</option>
                    <option value="draft">Draft</option>
                    <option value="issued">Issued</option>
                    <option value="void">Void</option>
                  </select>
                </label>
              </div>
            </details>
          </div>
          <div className="finance-list-toolbar-right portal-muted">
            {filteredReceipts.length} shown
          </div>
        </div>
        {filteredReceipts.length === 0 ? (
          <p>No receipts match the current search/filter.</p>
        ) : (
          <div className="table-wrap finance-table-compact">
            <table>
              <thead>
                <tr>
                  <th>Receipt</th>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReceipts.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.receiptNumber}</strong>
                      <div className="portal-muted">{item.receivedFrom}</div>
                    </td>
                    <td>{formatDate(item.receiptDate)}</td>
                    <td>{item.category}</td>
                    <td>{formatMoney(item.currency, item.amountReceived)}</td>
                    <td>{item.paymentMethod}</td>
                    <td><span className={`finance-status-tag finance-status-${item.status}`}>{item.status}</span></td>
                    <td>
                      <div className="action-row finance-row-actions">
                        <button
                          type="button"
                          className="button button-ghost button-sm"
                          onClick={() => handleIssue(item.id)}
                          disabled={saving || item.status !== "draft"}
                        >
                          Issue
                        </button>
                        <button
                          type="button"
                          className="button button-ghost button-sm"
                          onClick={() => handleSend(item.id)}
                          disabled={saving || item.status === "void"}
                        >
                          Send
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
                        {item.pdfUrl ? (
                          <a className="button button-ghost button-sm" href={item.pdfUrl} target="_blank" rel="noreferrer">
                            PDF
                          </a>
                        ) : null}
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
        title="Create Receipt"
        description="Record income clearly. Issue immediately to post Money In and make it available to financial reports."
        closeLabel="Close"
        maxWidth="880px"
      >
        <form className="form-grid portal-form-grid" onSubmit={handleCreate}>
          <label>
            <span className="portal-field-label">Contact</span>
            <select
              value={form.contactId}
              required
              onChange={(event) => {
                const contactId = event.target.value;
                const selected = contacts.find((contact) => String(contact.id) === contactId);
                setForm((prev) => ({
                  ...prev,
                  contactId,
                  receivedFrom: selected?.name || prev.receivedFrom,
                }));
              }}
            >
              <option value="">Select contact</option>
              {contacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="portal-field-label">Category</span>
            <select
              value={form.category}
              onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
            >
              {FINANCE_INCOME_CATEGORIES.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="portal-field-label">Received From</span>
            <input
              value={form.receivedFrom}
              required
              onChange={(event) => setForm((prev) => ({ ...prev, receivedFrom: event.target.value }))}
            />
          </label>
          <label>
            <span className="portal-field-label">Date</span>
            <input
              type="date"
              value={form.receiptDate}
              required
              onChange={(event) => setForm((prev) => ({ ...prev, receiptDate: event.target.value }))}
            />
          </label>
          <label>
            <span className="portal-field-label">Amount</span>
            <input
              type="number"
              min={0.01}
              step="0.01"
              value={form.amountReceived}
              required
              onChange={(event) => setForm((prev) => ({ ...prev, amountReceived: event.target.value }))}
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
              rows={4}
              maxLength={1000}
              placeholder="e.g., Donation towards phonics training in Lango; Sponsorship for teacher workshop; Contract payment for coaching support..."
              value={form.description}
              style={{ resize: "vertical", minHeight: 96, maxHeight: 192 }}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            />
            <small className="portal-field-help">Optional but strongly recommended.</small>
            <small className="portal-field-help">{form.description.length}/1000</small>
          </label>
          <label>
            <span className="portal-field-label">Reference</span>
            <input
              value={form.referenceNo}
              onChange={(event) => setForm((prev) => ({ ...prev, referenceNo: event.target.value }))}
            />
          </label>
          <label>
            <span className="portal-field-label">Related Invoice (optional)</span>
            <select
              value={form.relatedInvoiceId}
              onChange={(event) => setForm((prev) => ({ ...prev, relatedInvoiceId: event.target.value }))}
            >
              <option value="">None</option>
              {invoices.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.invoiceNumber} ({formatMoney(invoice.currency, invoice.balanceDue)})
                </option>
              ))}
            </select>
          </label>
          <label className="full-width">
            <span className="portal-field-label">Notes / Internal comments</span>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
            />
          </label>
          <label>
            <span className="portal-field-label">Issue now</span>
            <input
              type="checkbox"
              checked={form.issueNow}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  issueNow: event.target.checked,
                  sendEmail: event.target.checked ? prev.sendEmail : false,
                }))}
            />
            <small className="portal-field-help">Recommended. Posts this receipt to Money In immediately.</small>
          </label>
          <label>
            <span className="portal-field-label">Send email now</span>
            <input
              type="checkbox"
              checked={form.sendEmail}
              disabled={!form.issueNow}
              onChange={(event) => setForm((prev) => ({ ...prev, sendEmail: event.target.checked }))}
            />
            <small className="portal-field-help">Optional. Sends receipt email after issuing.</small>
          </label>
          <div className="full-width action-row portal-form-actions">
            <button className="button button-sm" type="submit" disabled={saving}>
              {saving ? "Saving..." : form.issueNow ? "Save & Issue Receipt" : "Save Draft Receipt"}
            </button>
          </div>
        </form>
      </FloatingSurface>

      <FinanceDestructiveActionModal
        open={Boolean(destructiveTarget)}
        onClose={() => setDestructiveTarget(null)}
        title={destructiveTarget?.status === "draft" ? "Delete receipt draft?" : "Void receipt?"}
        impactText={
          destructiveTarget?.status === "draft"
            ? "This removes the draft receipt permanently. Issued receipts are never hard-deleted."
            : "This will mark the receipt as void and preserve the ledger/audit trail."
        }
        confirmLabel={destructiveTarget?.status === "draft" ? "Delete Draft" : "Void Receipt"}
        loading={saving}
        onConfirm={handleDeleteOrVoid}
      />
    </div>
  );
}
