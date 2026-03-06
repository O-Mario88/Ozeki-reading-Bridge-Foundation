"use client";

import { FormEvent, useState } from "react";
import { FloatingSurface } from "@/components/FloatingSurface";
import type { FinanceSettingsRecord } from "@/lib/types";

type PortalFinanceSettingsManagerProps = {
  initialSettings: FinanceSettingsRecord;
};

export function PortalFinanceSettingsManager({ initialSettings }: PortalFinanceSettingsManagerProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [open, setOpen] = useState(false);
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
        <div className="action-row portal-form-actions">
          <button type="button" className="button button-sm" onClick={() => setOpen(true)}>
            Edit Settings
          </button>
        </div>
        {statusMessage ? <p className="portal-muted">{statusMessage}</p> : null}
      </section>

      <FloatingSurface
        open={open}
        onClose={() => setOpen(false)}
        title="Finance Settings"
        description="Update finance controls, prefixes, templates, and audit thresholds."
        closeLabel="Close settings"
        maxWidth="980px"
      >
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

          <label>
            <span className="portal-field-label">Cash Threshold (UGX)</span>
            <input
              type="number"
              min={0}
              step="1"
              value={settings.cashThresholdUgx}
              onChange={(event) =>
                setSettings((prev) => ({ ...prev, cashThresholdUgx: Number(event.target.value || 0) }))
              }
            />
          </label>
          <label>
            <span className="portal-field-label">Cash Threshold (USD)</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={settings.cashThresholdUsd}
              onChange={(event) =>
                setSettings((prev) => ({ ...prev, cashThresholdUsd: Number(event.target.value || 0) }))
              }
            />
          </label>
          <label>
            <span className="portal-field-label">Backdate Limit (days)</span>
            <input
              type="number"
              min={0}
              step="1"
              value={settings.backdateDaysLimit}
              onChange={(event) =>
                setSettings((prev) => ({ ...prev, backdateDaysLimit: Number(event.target.value || 0) }))
              }
            />
          </label>
          <label>
            <span className="portal-field-label">Outlier Multiplier</span>
            <input
              type="number"
              min={1}
              step="0.1"
              value={settings.outlierMultiplier}
              onChange={(event) =>
                setSettings((prev) => ({ ...prev, outlierMultiplier: Number(event.target.value || 1) }))
              }
            />
          </label>
          <label>
            <span className="portal-field-label">Allow Mismatch Override</span>
            <select
              value={settings.allowReceiptMismatchOverride ? "yes" : "no"}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  allowReceiptMismatchOverride: event.target.value === "yes",
                }))
              }
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>
          <label>
            <span className="portal-field-label">Allow Reuse Override</span>
            <select
              value={settings.allowReceiptReuseOverride ? "yes" : "no"}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  allowReceiptReuseOverride: event.target.value === "yes",
                }))
              }
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
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
      </FloatingSurface>
    </div>
  );
}
