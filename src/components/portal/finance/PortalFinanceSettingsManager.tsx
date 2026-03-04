"use client";

import { FormEvent, useState } from "react";
import type { FinanceSettingsRecord } from "@/lib/types";

type PortalFinanceSettingsManagerProps = {
  initialSettings: FinanceSettingsRecord;
};

export function PortalFinanceSettingsManager({ initialSettings }: PortalFinanceSettingsManagerProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatusMessage("");
    try {
      const response = await fetch("/api/portal/finance/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update settings.");
      }
      setSettings(data.settings as FinanceSettingsRecord);
      setStatusMessage("Finance settings saved.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to update settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="portal-grid">
      <section className="card">
        <h2>Finance Settings</h2>
        <p>Manage prefixes, category subcategories, and invoice/receipt email templates.</p>
        {statusMessage ? <p className="portal-muted">{statusMessage}</p> : null}
      </section>

      <section className="card">
        <form className="form-grid portal-form-grid" onSubmit={handleSubmit}>
          <label>
            <span className="portal-field-label">From Email</span>
            <input
              type="email"
              value={settings.fromEmail || ""}
              onChange={(event) => setSettings((prev) => ({ ...prev, fromEmail: event.target.value || null }))}
            />
          </label>
          <label>
            <span className="portal-field-label">CC Finance Email</span>
            <input
              type="email"
              value={settings.ccFinanceEmail || ""}
              onChange={(event) =>
                setSettings((prev) => ({ ...prev, ccFinanceEmail: event.target.value || null }))
              }
            />
          </label>
          <label>
            <span className="portal-field-label">Invoice Prefix</span>
            <input
              value={settings.invoicePrefix}
              onChange={(event) => setSettings((prev) => ({ ...prev, invoicePrefix: event.target.value }))}
            />
          </label>
          <label>
            <span className="portal-field-label">Receipt Prefix</span>
            <input
              value={settings.receiptPrefix}
              onChange={(event) => setSettings((prev) => ({ ...prev, receiptPrefix: event.target.value }))}
            />
          </label>
          <label>
            <span className="portal-field-label">Expense Prefix</span>
            <input
              value={settings.expensePrefix}
              onChange={(event) => setSettings((prev) => ({ ...prev, expensePrefix: event.target.value }))}
            />
          </label>
          <label className="full-width">
            <span className="portal-field-label">Payment Instructions</span>
            <textarea
              rows={3}
              value={settings.paymentInstructions}
              onChange={(event) =>
                setSettings((prev) => ({ ...prev, paymentInstructions: event.target.value }))
              }
            />
          </label>
          <label className="full-width">
            <span className="portal-field-label">Invoice Email Template</span>
            <textarea
              rows={8}
              value={settings.invoiceEmailTemplate}
              onChange={(event) =>
                setSettings((prev) => ({ ...prev, invoiceEmailTemplate: event.target.value }))
              }
            />
            <small className="portal-field-help">
              Supported placeholders: {"{{contactName}}"}, {"{{invoiceNumber}}"}, {"{{currency}}"}, {"{{total}}"}, {"{{dueDate}}"}, {"{{paymentInstructions}}"}
            </small>
          </label>
          <label className="full-width">
            <span className="portal-field-label">Receipt Email Template</span>
            <textarea
              rows={8}
              value={settings.receiptEmailTemplate}
              onChange={(event) =>
                setSettings((prev) => ({ ...prev, receiptEmailTemplate: event.target.value }))
              }
            />
            <small className="portal-field-help">
              Supported placeholders: {"{{contactName}}"}, {"{{receiptNumber}}"}, {"{{currency}}"}, {"{{amount}}"}, {"{{receiptDate}}"}, {"{{description}}"}, {"{{descriptionLine}}"}
            </small>
          </label>

          <label className="full-width">
            <span className="portal-field-label">Category Subcategories (JSON)</span>
            <textarea
              rows={8}
              value={JSON.stringify(settings.categorySubcategories, null, 2)}
              onChange={(event) => {
                try {
                  const parsed = JSON.parse(event.target.value) as Record<string, string[]>;
                  setSettings((prev) => ({ ...prev, categorySubcategories: parsed }));
                } catch {
                  // Keep raw editing without crashing
                }
              }}
            />
          </label>

          <div className="full-width action-row portal-form-actions">
            <button className="button" type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
