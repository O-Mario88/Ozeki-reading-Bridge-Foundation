"use client";

import { FormEvent, useMemo, useState } from "react";
import { FormModal, FormPage, FormSection, FormField, FormActions } from "@/components/forms";
import { FinanceDestructiveActionModal } from "@/components/portal/finance/FinanceDestructiveActionModal";
import { formatDate, formatMoney } from "@/components/portal/finance/format";
import { FINANCE_INCOME_CATEGORIES } from "@/lib/finance-categories";
import { submitJsonWithOfflineQueue } from "@/lib/offline-form-queue";
import type { FinanceContactRecord, FinanceInvoiceRecord } from "@/lib/types";

type PortalFinanceInvoicesManagerProps = {
  initialInvoices: FinanceInvoiceRecord[];
  initialContacts: FinanceContactRecord[];
};

type InvoiceLineItemForm = {
  description: string;
  qty: string;
  unitPrice: string;
};

const paymentMethods = ["cash", "bank_transfer", "mobile_money", "cheque", "other"] as const;

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function parseEmailList(value: string) {
  return value
    .split(/[\n,;]/)
    .map((item) => item.trim())
    .filter((item) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item));
}

export function PortalFinanceInvoicesManager({
  initialInvoices,
  initialContacts,
}: PortalFinanceInvoicesManagerProps) {
  const [invoices, setInvoices] = useState(initialInvoices);
  const [contacts, setContacts] = useState(initialContacts);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | FinanceInvoiceRecord["status"]>("all");
  const [destructiveTarget, setDestructiveTarget] = useState<FinanceInvoiceRecord | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [paymentOpenFor, setPaymentOpenFor] = useState<FinanceInvoiceRecord | null>(null);

  const [contactForm, setContactForm] = useState({
    name: "",
    emails: "",
    phone: "",
    address: "",
    contactType: "partner",
  });

  const [invoiceForm, setInvoiceForm] = useState({
    contactId: "",
    category: "Donation",
    issueDate: todayIsoDate(),
    dueDate: todayIsoDate(),
    currency: "UGX",
    tax: "",
    notes: "",
  });
  const [lineItems, setLineItems] = useState<InvoiceLineItemForm[]>([
    { description: "", qty: "1", unitPrice: "" },
  ]);

  const [paymentForm, setPaymentForm] = useState({
    date: todayIsoDate(),
    amount: "",
    method: "bank_transfer",
    reference: "",
    notes: "",
  });
  const [paymentEvidence, setPaymentEvidence] = useState<FileList | null>(null);

  const totals = useMemo(() => {
    return invoices.reduce(
      (acc, item) => {
        acc.count += 1;
        acc.total += Number(item.total || 0);
        acc.balance += Number(item.balanceDue || 0);
        return acc;
      },
      { count: 0, total: 0, balance: 0 },
    );
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return invoices.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }
      if (!needle) {
        return true;
      }
      const haystack = [
        item.invoiceNumber,
        item.category,
        item.status,
        item.createdByName || "",
        item.lastSentTo || "",
        item.linkedReceipt?.receiptNumber || "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [invoices, search, statusFilter]);

  function resetCreateForm() {
    setInvoiceForm({
      contactId: "",
      category: "Donation",
      issueDate: todayIsoDate(),
      dueDate: todayIsoDate(),
      currency: "UGX",
      tax: "",
      notes: "",
    });
    setLineItems([{ description: "", qty: "1", unitPrice: "" }]);
  }

  async function handleCreateContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatusMessage("");
    try {
      const emails = contactForm.emails
        .split(/[\n,;]/)
        .map((item) => item.trim())
        .filter(Boolean);

      const payload = {
        name: contactForm.name,
        emails,
        phone: contactForm.phone || undefined,
        address: contactForm.address || undefined,
        contactType: contactForm.contactType,
      };
      const result = await submitJsonWithOfflineQueue<{
        error?: string;
        contact?: FinanceContactRecord;
      }>("/api/portal/finance/contacts", {
        payload,
        label: "Finance contact",
      });
      if (result.queued) {
        setContactForm({
          name: "",
          emails: "",
          phone: "",
          address: "",
          contactType: "partner",
        });
        setContactOpen(false);
        setStatusMessage(
          "No internet connection. Contact saved on this device and will sync automatically when connected.",
        );
        return;
      }

      const data = result.data ?? {};
      const createdContact = data.contact;
      if (!result.response.ok || !createdContact) {
        throw new Error(data.error || "Failed to create contact.");
      }

      setContacts((prev) => [createdContact, ...prev]);
      setContactForm({
        name: "",
        emails: "",
        phone: "",
        address: "",
        contactType: "partner",
      });
      setContactOpen(false);
      setStatusMessage("Contact created.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to create contact.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatusMessage("");

    try {
      const payload = {
        contactId: Number(invoiceForm.contactId),
        category: invoiceForm.category,
        issueDate: invoiceForm.issueDate,
        dueDate: invoiceForm.dueDate,
        currency: invoiceForm.currency,
        tax: invoiceForm.tax ? Number(invoiceForm.tax) : undefined,
        notes: invoiceForm.notes || undefined,
        lineItems: lineItems.map((item) => ({
          description: item.description,
          qty: Number(item.qty || 0),
          unitPrice: Number(item.unitPrice || 0),
        })),
      };

      const result = await submitJsonWithOfflineQueue<{
        error?: string;
        invoice?: FinanceInvoiceRecord;
      }>("/api/portal/finance/invoices", {
        payload,
        label: "Finance invoice",
      });
      if (result.queued) {
        resetCreateForm();
        setCreateOpen(false);
        setStatusMessage(
          "No internet connection. Invoice saved on this device and will sync automatically when connected.",
        );
        return;
      }

      const data = result.data ?? {};
      const createdInvoice = data.invoice;
      if (!result.response.ok || !createdInvoice) {
        throw new Error(data.error || "Failed to create invoice.");
      }

      setInvoices((prev) => [createdInvoice, ...prev]);
      resetCreateForm();
      setCreateOpen(false);
      setStatusMessage("Invoice created.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to create invoice.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSendInvoice(invoiceId: number) {
    const toInput = window.prompt("Send invoice to (email or comma-separated emails). Leave blank to use contact default:", "");
    if (toInput === null) {
      return;
    }
    const ccInput = window.prompt(
      "Optional extra CC emails (comma-separated). Edwin and Amos are copied automatically:",
      "",
    );
    if (ccInput === null) {
      return;
    }
    const to = parseEmailList(toInput);
    const cc = parseEmailList(ccInput);

    setSaving(true);
    setStatusMessage("");
    try {
      const response = await fetch(`/api/portal/finance/invoices/${invoiceId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: to.length > 0 ? to : undefined,
          cc: cc.length > 0 ? cc : undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to send invoice.");
      }
      setInvoices((prev) =>
        prev.map((item) => (item.id === invoiceId ? (data.invoice as FinanceInvoiceRecord) : item)),
      );
      const emailStatus = data.email?.status || "processed";
      setStatusMessage(
        data.email?.providerMessage
          ? `Invoice email ${emailStatus}: ${data.email.providerMessage}`
          : `Invoice email ${emailStatus}.`,
      );
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to send invoice.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSendReceipt(receiptId: number) {
    const toInput = window.prompt("Send receipt to (email or comma-separated emails). Leave blank to use contact default:", "");
    if (toInput === null) {
      return;
    }
    const ccInput = window.prompt(
      "Optional extra CC emails (comma-separated). Edwin and Amos are copied automatically:",
      "",
    );
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
      const receipt = data.receipt as { id: number; relatedInvoiceId?: number };
      if (receipt?.relatedInvoiceId) {
        const refreshed = await fetch(`/api/portal/finance/invoices/${receipt.relatedInvoiceId}`);
        const refreshedData = await refreshed.json();
        if (refreshed.ok && refreshedData.invoice) {
          setInvoices((prev) =>
            prev.map((item) => (
              item.id === receipt.relatedInvoiceId ? (refreshedData.invoice as FinanceInvoiceRecord) : item
            )),
          );
        }
      }
      const emailStatus = data.email?.status || "processed";
      setStatusMessage(
        data.email?.providerMessage
          ? `Receipt email ${emailStatus}: ${data.email.providerMessage}`
          : `Receipt email ${emailStatus}.`,
      );
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to send receipt.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteOrVoidInvoice(reason: string) {
    if (!destructiveTarget) {
      return;
    }
    const target = destructiveTarget;
    setSaving(true);
    setStatusMessage("");
    try {
      const response = await fetch(`/api/portal/finance/invoices/${target.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to delete/void invoice.");
      }

      if (data.deleted) {
        setInvoices((prev) => prev.filter((item) => item.id !== target.id));
        setStatusMessage("Draft invoice deleted.");
      } else if (data.invoice) {
        setInvoices((prev) =>
          prev.map((item) => (item.id === target.id ? (data.invoice as FinanceInvoiceRecord) : item)),
        );
        setStatusMessage("Invoice voided.");
      }
      setDestructiveTarget(null);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to delete/void invoice.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRecordPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!paymentOpenFor) {
      return;
    }
    setSaving(true);
    setStatusMessage("");
    try {
      const formData = new FormData();
      formData.set("date", paymentForm.date);
      formData.set("amount", paymentForm.amount);
      formData.set("method", paymentForm.method);
      formData.set("reference", paymentForm.reference);
      formData.set("notes", paymentForm.notes);
      if (paymentEvidence) {
        Array.from(paymentEvidence).forEach((file) => {
          formData.append("evidence", file);
        });
      }

      const response = await fetch(`/api/portal/finance/invoices/${paymentOpenFor.id}/payments`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to record payment.");
      }
      if (data.invoice) {
        setInvoices((prev) =>
          prev.map((item) => (item.id === paymentOpenFor.id ? (data.invoice as FinanceInvoiceRecord) : item)),
        );
      }

      setPaymentOpenFor(null);
      setPaymentForm({
        date: todayIsoDate(),
        amount: "",
        method: "bank_transfer",
        reference: "",
        notes: "",
      });
      setPaymentEvidence(null);
      setStatusMessage(
        data.autoReceipt
          ? "Payment recorded. Linked receipt PDF is ready and can be sent."
          : "Payment recorded.",
      );
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to record payment.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="portal-grid">
      <section className="portal-kpis">
        <article className="portal-kpi-card">
          <p>Invoices</p>
          <strong>{totals.count.toLocaleString()}</strong>
        </article>
        <article className="portal-kpi-card">
          <p>Total invoiced</p>
          <strong>{formatMoney("UGX", totals.total)}</strong>
        </article>
        <article className="portal-kpi-card">
          <p>Total balance due</p>
          <strong>{formatMoney("UGX", totals.balance)}</strong>
        </article>
      </section>

      <section className="card">
        <h2>Invoices</h2>
        <p>Create, send, collect, delete drafts, and void posted invoices with immutable audit trails.</p>
        <div className="action-row portal-form-actions">
          <button type="button" className="button button-sm" onClick={() => setCreateOpen(true)}>+ New Invoice</button>
          <button type="button" className="button button-ghost button-sm" onClick={() => setContactOpen(true)}>+ New Contact</button>
          <a className="button button-ghost button-sm" href="/api/portal/finance/invoices?format=csv">Export CSV</a>
        </div>
        {statusMessage ? <p className="portal-muted">{statusMessage}</p> : null}
      </section>

      <section className="card">
        <h2>Invoice Register</h2>
        <div className="finance-list-toolbar">
          <div className="finance-list-toolbar-left">
            <input
              className="finance-search-input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search invoices"
              aria-label="Search invoices"
            />
            <details className="finance-filter-popover">
              <summary>Filters</summary>
              <div className="finance-filter-popover-body">
                <label>
                  <span>Status</span>
                  <select
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(event.target.value as "all" | FinanceInvoiceRecord["status"])}
                  >
                    <option value="all">All</option>
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="partially_paid">Partially paid</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                    <option value="void">Void</option>
                  </select>
                </label>
              </div>
            </details>
          </div>
          <div className="finance-list-toolbar-right portal-muted">
            {filteredInvoices.length} shown
          </div>
        </div>
        {filteredInvoices.length === 0 ? (
          <p>No invoices match the current search/filter.</p>
        ) : (
          <div className="table-wrap finance-table-compact">
            <table>
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Dates</th>
                  <th>Category</th>
                  <th>Total</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.invoiceNumber}</strong>
                      <div className="portal-muted">{item.lastSentTo || "Not emailed yet"}</div>
                      {item.linkedReceipt ? (
                        <div className="portal-muted">
                          Receipt {item.linkedReceipt.receiptNumber} ({item.linkedReceipt.status})
                        </div>
                      ) : null}
                    </td>
                    <td>
                      <div>{formatDate(item.issueDate)}</div>
                      <div className="portal-muted">Due {formatDate(item.dueDate)}</div>
                    </td>
                    <td>{item.category}</td>
                    <td>{formatMoney(item.currency, item.total)}</td>
                    <td>{formatMoney(item.currency, item.balanceDue)}</td>
                    <td><span className={`finance-status-tag finance-status-${item.status}`}>{item.status}</span></td>
                    <td>
                      <div className="action-row finance-row-actions">
                        <button
                          type="button"
                          className="button button-ghost button-sm"
                          onClick={() => handleSendInvoice(item.id)}
                          disabled={saving || item.status === "void"}
                          title="Send invoice"
                        >
                          Send
                        </button>
                        <button
                          type="button"
                          className="button button-ghost button-sm"
                          onClick={async () => {
                            if (saving) return;
                            const balance = Number(item.balanceDue || item.total || 0);
                            if (balance <= 0) {
                              setStatusMessage("Nothing to pay — balance is zero.");
                              return;
                            }
                            setSaving(true);
                            setStatusMessage("");
                            try {
                              const formData = new FormData();
                              formData.set("date", todayIsoDate());
                              formData.set("amount", String(balance));
                              formData.set("method", "bank_transfer");
                              formData.set("reference", "");
                              formData.set("notes", "");
                              const response = await fetch(`/api/portal/finance/invoices/${item.id}/payments`, {
                                method: "POST",
                                body: formData,
                              });
                              const data = await response.json();
                              if (!response.ok) {
                                throw new Error(data.error || "Failed to record payment.");
                              }
                              if (data.invoice) {
                                setInvoices((prev) =>
                                  prev.map((inv) => (inv.id === item.id ? (data.invoice as FinanceInvoiceRecord) : inv)),
                                );
                              }
                              setStatusMessage(
                                data.autoReceipt
                                  ? `Payment of ${formatMoney(item.currency, balance)} recorded. Receipt PDF is ready.`
                                  : `Payment of ${formatMoney(item.currency, balance)} recorded.`,
                              );
                            } catch (error) {
                              setStatusMessage(error instanceof Error ? error.message : "Failed to record payment.");
                            } finally {
                              setSaving(false);
                            }
                          }}
                          disabled={saving || item.status === "void" || item.status === "paid"}
                          title="Record full balance as paid"
                        >
                          Record Payment
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
                        <a
                          className="button button-ghost button-sm"
                          href={`/api/portal/finance/invoices/${item.id}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                          title="Download latest A4 PDF"
                        >
                          Download PDF
                        </a>
                        {item.linkedReceipt ? (
                          <a
                            className="button button-ghost button-sm"
                            href={`/api/portal/finance/receipts/${item.linkedReceipt.id}/pdf`}
                            target="_blank"
                            rel="noreferrer"
                            title="Download latest Receipt PDF"
                          >
                            Receipt PDF
                          </a>
                        ) : null}
                        {item.linkedReceipt ? (
                          <button
                            type="button"
                            className="button button-ghost button-sm"
                            onClick={() => {
                              if (item.linkedReceipt) {
                                void handleSendReceipt(item.linkedReceipt.id);
                              }
                            }}
                            disabled={saving}
                          >
                            Send Receipt
                          </button>
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

      <FormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create Invoice"
        description="Draft invoice details, then send the invoice email with PDF attachment."
        closeLabel="Close"
        maxWidth="980px"
      >
        <form onSubmit={handleCreateInvoice}>
          <FormPage title="Draft Invoice">
            <FormSection title="Details">
              <div className="form-grid portal-form-grid">
                <FormField label="Contact" required>
                  <select
                    value={invoiceForm.contactId}
                    required
                    onChange={(event) => setInvoiceForm((prev) => ({ ...prev, contactId: event.target.value }))}
                  >
                    <option value="">Select contact</option>
                    {contacts.map((contact) => (
                      <option key={contact.id} value={contact.id}>
                        {contact.name} ({contact.emails[0] || "no-email"})
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Category">
                  <select
                    value={invoiceForm.category}
                    onChange={(event) => setInvoiceForm((prev) => ({ ...prev, category: event.target.value }))}
                  >
                    {FINANCE_INCOME_CATEGORIES.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Currency">
                  <select
                    value={invoiceForm.currency}
                    onChange={(event) => setInvoiceForm((prev) => ({ ...prev, currency: event.target.value }))}
                  >
                    <option value="UGX">UGX</option>
                    <option value="USD">USD</option>
                  </select>
                </FormField>
                <FormField label="Issue Date" required>
                  <input
                    type="date"
                    value={invoiceForm.issueDate}
                    onChange={(event) => setInvoiceForm((prev) => ({ ...prev, issueDate: event.target.value }))}
                    required
                  />
                </FormField>
                <FormField label="Due Date" required>
                  <input
                    type="date"
                    value={invoiceForm.dueDate}
                    onChange={(event) => setInvoiceForm((prev) => ({ ...prev, dueDate: event.target.value }))}
                    required
                  />
                </FormField>
                <FormField label="Tax">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={invoiceForm.tax}
                    onChange={(event) => setInvoiceForm((prev) => ({ ...prev, tax: event.target.value }))}
                  />
                </FormField>
              </div>
            </FormSection>

            <FormSection title="Line Items">
              <div className="portal-list" style={{ marginTop: "1rem" }}>
                {lineItems.map((item, index) => (
                  <div key={index} className="portal-filter-grid">
                    <FormField label={index === 0 ? "Description" : ""} required>
                      <input
                        placeholder="Description"
                        value={item.description}
                        onChange={(event) => {
                          const next = [...lineItems];
                          next[index] = { ...next[index], description: event.target.value };
                          setLineItems(next);
                        }}
                        required
                      />
                    </FormField>
                    <FormField label={index === 0 ? "Qty" : ""} required>
                      <input
                        type="number"
                        min={0.01}
                        step="0.01"
                        placeholder="Qty"
                        value={item.qty}
                        onChange={(event) => {
                          const next = [...lineItems];
                          next[index] = { ...next[index], qty: event.target.value };
                          setLineItems(next);
                        }}
                        required
                      />
                    </FormField>
                    <FormField label={index === 0 ? "Unit Price" : ""} required>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="Unit Price"
                        value={item.unitPrice}
                        onChange={(event) => {
                          const next = [...lineItems];
                          next[index] = { ...next[index], unitPrice: event.target.value };
                          setLineItems(next);
                        }}
                        required
                      />
                    </FormField>
                    <FormField label={index === 0 ? "Action" : ""}>
                      <button
                        type="button"
                        className="button button-ghost"
                        onClick={() => setLineItems((prev) => prev.filter((_, i) => i !== index))}
                        disabled={lineItems.length <= 1}
                      >
                        Remove
                      </button>
                    </FormField>
                  </div>
                ))}
              </div>
              <div className="action-row" style={{ marginTop: "1rem" }}>
                <button
                  type="button"
                  className="button button-ghost"
                  onClick={() => setLineItems((prev) => [...prev, { description: "", qty: "1", unitPrice: "" }])}
                >
                  + Add Line
                </button>
              </div>
            </FormSection>

            <FormSection title="Additional Information">
              <FormField label="Notes">
                <textarea
                  rows={4}
                  value={invoiceForm.notes}
                  onChange={(event) => setInvoiceForm((prev) => ({ ...prev, notes: event.target.value }))}
                />
              </FormField>
            </FormSection>

            <FormActions>
              <button className="button" type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Invoice"}
              </button>
              <button type="button" className="button button-ghost" onClick={resetCreateForm} disabled={saving}>
                Reset
              </button>
            </FormActions>
          </FormPage>
        </form>
      </FormModal>

      <FormModal
        open={contactOpen}
        onClose={() => setContactOpen(false)}
        title="New Finance Contact"
        description="Add invoice recipient details (donor, partner, sponsor)."
        closeLabel="Close"
        maxWidth="760px"
      >
        <form onSubmit={handleCreateContact}>
          <FormPage title="Contact Details">
            <FormSection title="Basic Info">
              <div className="form-grid portal-form-grid">
                <FormField label="Name" required>
                  <input
                    value={contactForm.name}
                    required
                    onChange={(event) => setContactForm((prev) => ({ ...prev, name: event.target.value }))}
                  />
                </FormField>
                <FormField label="Type">
                  <select
                    value={contactForm.contactType}
                    onChange={(event) => setContactForm((prev) => ({ ...prev, contactType: event.target.value }))}
                  >
                    <option value="donor">Donor</option>
                    <option value="partner">Partner</option>
                    <option value="sponsor">Sponsor</option>
                    <option value="other">Other</option>
                  </select>
                </FormField>
              </div>
            </FormSection>
            
            <FormSection title="Contact Information">
              <FormField label="Emails (comma or new line separated)" required>
                <textarea
                  rows={3}
                  value={contactForm.emails}
                  required
                  onChange={(event) => setContactForm((prev) => ({ ...prev, emails: event.target.value }))}
                />
              </FormField>
              <div className="form-grid portal-form-grid">
                <FormField label="Phone">
                  <input
                    value={contactForm.phone}
                    onChange={(event) => setContactForm((prev) => ({ ...prev, phone: event.target.value }))}
                  />
                </FormField>
                <FormField label="Address">
                  <input
                    value={contactForm.address}
                    onChange={(event) => setContactForm((prev) => ({ ...prev, address: event.target.value }))}
                  />
                </FormField>
              </div>
            </FormSection>

            <FormActions>
              <button className="button" type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Contact"}
              </button>
            </FormActions>
          </FormPage>
        </form>
      </FormModal>

      <FormModal
        open={Boolean(paymentOpenFor)}
        onClose={() => setPaymentOpenFor(null)}
        title={paymentOpenFor ? `Record Payment • ${paymentOpenFor.invoiceNumber}` : "Record Payment"}
        description="Record manual payment and optional evidence (bank slip/mobile money screenshot)."
        closeLabel="Close"
        maxWidth="760px"
      >
        <form onSubmit={handleRecordPayment}>
          <FormPage title="Payment Details">
            <FormSection title="Transaction">
              <div className="form-grid portal-form-grid">
                <FormField label="Date" required>
                  <input
                    type="date"
                    value={paymentForm.date}
                    onChange={(event) => setPaymentForm((prev) => ({ ...prev, date: event.target.value }))}
                    required
                  />
                </FormField>
                <FormField label="Amount" required>
                  <input
                    type="number"
                    min={0.01}
                    step="0.01"
                    value={paymentForm.amount}
                    onChange={(event) => setPaymentForm((prev) => ({ ...prev, amount: event.target.value }))}
                    required
                  />
                </FormField>
                <FormField label="Method">
                  <select
                    value={paymentForm.method}
                    onChange={(event) => setPaymentForm((prev) => ({ ...prev, method: event.target.value }))}
                  >
                    {paymentMethods.map((method) => (
                      <option key={method} value={method}>{method}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Reference">
                  <input
                    value={paymentForm.reference}
                    onChange={(event) => setPaymentForm((prev) => ({ ...prev, reference: event.target.value }))}
                  />
                </FormField>
              </div>
            </FormSection>

            <FormSection title="Additional Information">
              <FormField label="Notes">
                <textarea
                  rows={3}
                  value={paymentForm.notes}
                  onChange={(event) => setPaymentForm((prev) => ({ ...prev, notes: event.target.value }))}
                />
              </FormField>
              <FormField label="Evidence (optional)">
                <input type="file" multiple accept="image/*,.pdf" onChange={(event) => setPaymentEvidence(event.target.files)} />
              </FormField>
            </FormSection>

            <FormActions>
              <button className="button" type="submit" disabled={saving}>
                {saving ? "Saving..." : "Post Payment"}
              </button>
            </FormActions>
          </FormPage>
        </form>
      </FormModal>

      <FinanceDestructiveActionModal
        open={Boolean(destructiveTarget)}
        onClose={() => setDestructiveTarget(null)}
        title={destructiveTarget?.status === "draft" ? "Delete invoice draft?" : "Void invoice?"}
        impactText={
          destructiveTarget?.status === "draft"
            ? "This removes the draft invoice permanently. Posted records are not deleted."
            : "This will mark the invoice as void and keep a full audit trail."
        }
        confirmLabel={destructiveTarget?.status === "draft" ? "Delete Draft" : "Void Invoice"}
        loading={saving}
        onConfirm={handleDeleteOrVoidInvoice}
      />
    </div>
  );
}
