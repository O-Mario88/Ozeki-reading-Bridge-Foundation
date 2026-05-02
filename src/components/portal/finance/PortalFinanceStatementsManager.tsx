"use client";

import { FormEvent, useMemo, useState } from "react";
import { FloatingSurface } from "@/components/FloatingSurface";
import { formatDate, formatMoney } from "@/components/portal/finance/format";
import { DashboardListHeader, DashboardListRow } from "@/components/portal/DashboardList";
import { FINANCE_INCOME_CATEGORIES } from "@/lib/finance-categories";
import type { FinanceMonthlyStatementRecord } from "@/lib/types";

type PortalFinanceStatementsManagerProps = {
  initialStatements: FinanceMonthlyStatementRecord[];
};

type StatementPeriodType = FinanceMonthlyStatementRecord["periodType"];

import { currentMonth, currentYear, formatPeriodType, formatPeriodLabel } from "./date-utils";

export function PortalFinanceStatementsManager({ initialStatements }: PortalFinanceStatementsManagerProps) {
  const [statements, setStatements] = useState(initialStatements);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [form, setForm] = useState({
    periodType: "monthly" as StatementPeriodType,
    month: currentMonth(),
    year: currentYear(),
    quarter: "Q1" as "Q1" | "Q2" | "Q3" | "Q4",
    currency: "UGX",
  });

  const totals = useMemo(() => {
    return statements.reduce(
      (acc, item) => {
        acc.count += 1;
        acc.in += Number(item.totalMoneyIn || 0);
        acc.out += Number(item.totalMoneyOut || 0);
        return acc;
      },
      { count: 0, in: 0, out: 0 },
    );
  }, [statements]);

  const hasAnyStatementDocument = (item: FinanceMonthlyStatementRecord) =>
    Boolean(
      item.balanceSheetPdfUrl
      || item.statementOfFinancialPositionPdfUrl
      || item.incomeStatementPdfUrl
      || item.pdfUrl,
    );

  const latestPdfStatement = useMemo(() => statements.find((item) => hasAnyStatementDocument(item)), [statements]);

  function statementDocumentUrl(
    statement: FinanceMonthlyStatementRecord,
    documentType: "balance_sheet" | "statement_of_financial_position" | "income_statement",
  ) {
    return `/api/portal/finance/statements/${statement.id}/document?type=${documentType}`;
  }

  async function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatusMessage("");
    const payload =
      form.periodType === "monthly"
        ? {
          periodType: form.periodType,
          month: form.month,
          currency: form.currency,
        }
        : form.periodType === "quarterly"
          ? {
            periodType: form.periodType,
            year: form.year,
            quarter: form.quarter,
            currency: form.currency,
          }
          : {
            periodType: form.periodType,
            year: form.year,
            currency: form.currency,
          };
    try {
      const response = await fetch("/api/portal/finance/statements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to generate statement.");
      }
      setStatements((prev) => {
        const withoutSame = prev.filter(
          (item) => !(
            item.month === data.statement.month
            && item.periodType === data.statement.periodType
            && item.currency === data.statement.currency
          ),
        );
        return [data.statement as FinanceMonthlyStatementRecord, ...withoutSame];
      });
      setOpen(false);
      setStatusMessage("Financial statement generated.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to generate statement.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="portal-grid">
      <section className="portal-kpis">
        <article className="portal-kpi-card">
          <p>Statements</p>
          <strong>{totals.count.toLocaleString()}</strong>
        </article>
        <article className="portal-kpi-card">
          <p>Total money in (all statements)</p>
          <strong>{formatMoney("UGX", totals.in)}</strong>
        </article>
        <article className="portal-kpi-card">
          <p>Total money out (all statements)</p>
          <strong>{formatMoney("UGX", totals.out)}</strong>
        </article>
      </section>

      <section className="card">
        <h2>Financial Statements</h2>
        <div className="action-row portal-form-actions">
          <button type="button" className="button" onClick={() => setOpen(true)}>+ Generate Statement</button>
          <a className="button button-ghost" href="/api/portal/finance/statements?format=csv">Export CSV</a>
        </div>
        {statusMessage ? <p className="portal-muted">{statusMessage}</p> : null}
      </section>

      <section className="card">
        <h2>Accounting Documents</h2>
        <p className="portal-muted">
          Open statement PDFs and export accounting schedules from posted ledger data.
        </p>
        <div className="action-row portal-form-actions">
          {latestPdfStatement ? (
            <>
              <a className="button" href={statementDocumentUrl(latestPdfStatement, "income_statement")} target="_blank" rel="noreferrer">
                Income Statement
              </a>
              <a className="button button-ghost" href={statementDocumentUrl(latestPdfStatement, "statement_of_financial_position")} target="_blank" rel="noreferrer">
                Statement of Financial Position
              </a>
              <a className="button button-ghost" href={statementDocumentUrl(latestPdfStatement, "balance_sheet")} target="_blank" rel="noreferrer">
                Balance Sheet
              </a>
            </>
          ) : (
            <span className="portal-muted">Generate a statement to unlock PDF document buttons.</span>
          )}
          <a className="button button-ghost" href="/api/portal/finance/ledger?format=csv">General Ledger</a>
          <a className="button button-ghost" href="/api/portal/finance/ledger?format=csv&txnType=money_in">Money In Register</a>
          <a className="button button-ghost" href="/api/portal/finance/ledger?format=csv&txnType=money_out">Money Out Register</a>
          <a className="button button-ghost" href="/api/portal/finance/invoices?format=csv">Invoices Register</a>
          <a className="button button-ghost" href="/api/portal/finance/receipts?format=csv">Receipts Register</a>
          <a className="button button-ghost" href="/api/portal/finance/expenses?format=csv">Expenses Register</a>
        </div>
      </section>

      <section className="card">
        <h2>Generated Statements</h2>
        {statements.length === 0 ? (
          <p>No statements generated yet.</p>
        ) : (
          <div className="table-wrap">
            <DashboardListHeader template="120px 110px 90px 130px 130px 130px minmax(0,2fr) minmax(0,2fr)">
              <span>Period</span>
              <span>Frequency</span>
              <span>Currency</span>
              <span>Money In</span>
              <span>Money Out</span>
              <span>Net</span>
              <span>Breakdown</span>
              <span>Documents</span>
            </DashboardListHeader>
            {statements.map((item) => (
              <DashboardListRow
                key={`${item.periodType}-${item.month}-${item.currency}`}
                template="120px 110px 90px 130px 130px 130px minmax(0,2fr) minmax(0,2fr)"
              >
                <span>{formatPeriodLabel(item.periodType, item.month)}</span>
                <span>{formatPeriodType(item.periodType)}</span>
                <span>{item.currency}</span>
                <span>{formatMoney(item.currency, item.totalMoneyIn)}</span>
                <span>{formatMoney(item.currency, item.totalMoneyOut)}</span>
                <span>{formatMoney(item.currency, item.net)}</span>
                <span className="min-w-0">
                  <span className="portal-list">
                    {FINANCE_INCOME_CATEGORIES.map((category) => (
                      <span key={category}>
                        {category}: {formatMoney(item.currency, item.breakdownByCategory[category])}
                      </span>
                    ))}
                    <span>Expense: {formatMoney(item.currency, item.breakdownByCategory.Expense)}</span>
                  </span>
                  <span className="portal-muted block">Generated {formatDate(item.generatedAt)}</span>
                </span>
                <span className="min-w-0">
                  {hasAnyStatementDocument(item) ? (
                    <span className="action-row">
                      <a className="button button-ghost" href={statementDocumentUrl(item, "income_statement")} target="_blank" rel="noreferrer">
                        Income Statement
                      </a>
                      <a className="button button-ghost" href={statementDocumentUrl(item, "statement_of_financial_position")} target="_blank" rel="noreferrer">
                        Statement of Financial Position
                      </a>
                      <a className="button button-ghost" href={statementDocumentUrl(item, "balance_sheet")} target="_blank" rel="noreferrer">
                        Balance Sheet
                      </a>
                    </span>
                  ) : (
                    "—"
                  )}
                </span>
              </DashboardListRow>
            ))}
          </div>
        )}
      </section>

      <FloatingSurface
        open={open}
        onClose={() => setOpen(false)}
        title="Generate Financial Statement"
        description="Generate statement totals from posted ledger entries (Monthly, Quarterly, or Fiscal Year)."
        closeLabel="Close"
        maxWidth="620px"
      >
        <form className="form-grid portal-form-grid" onSubmit={handleGenerate}>
          <label>
            <span className="portal-field-label">Report Frequency</span>
            <select
              value={form.periodType}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  periodType: event.target.value as StatementPeriodType,
                }))
              }
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="fiscal_year">Fiscal Year</option>
            </select>
          </label>
          {form.periodType === "monthly" ? (
            <label>
              <span className="portal-field-label">Report Month</span>
              <input
                type="month"
                value={form.month}
                required
                onChange={(event) => setForm((prev) => ({ ...prev, month: event.target.value }))}
              />
            </label>
          ) : null}
          {form.periodType === "quarterly" ? (
            <>
              <label>
                <span className="portal-field-label">Year</span>
                <input
                  type="number"
                  min={2000}
                  max={3000}
                  value={form.year}
                  required
                  onChange={(event) => setForm((prev) => ({ ...prev, year: Number(event.target.value) || currentYear() }))}
                />
              </label>
              <label>
                <span className="portal-field-label">Quarter</span>
                <select
                  value={form.quarter}
                  onChange={(event) => setForm((prev) => ({ ...prev, quarter: event.target.value as "Q1" | "Q2" | "Q3" | "Q4" }))}
                >
                  <option value="Q1">Q1</option>
                  <option value="Q2">Q2</option>
                  <option value="Q3">Q3</option>
                  <option value="Q4">Q4</option>
                </select>
              </label>
            </>
          ) : null}
          {form.periodType === "fiscal_year" ? (
            <label>
              <span className="portal-field-label">Fiscal Year</span>
              <input
                type="number"
                min={2000}
                max={3000}
                value={form.year}
                required
                onChange={(event) => setForm((prev) => ({ ...prev, year: Number(event.target.value) || currentYear() }))}
              />
            </label>
          ) : null}
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
          <div className="full-width action-row portal-form-actions">
            <button className="button" type="submit" disabled={saving}>
              {saving ? "Generating..." : "Generate"}
            </button>
          </div>
        </form>
      </FloatingSurface>
    </div>
  );
}
