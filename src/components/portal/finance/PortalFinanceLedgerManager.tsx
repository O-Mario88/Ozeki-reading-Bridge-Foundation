"use client";

import { useMemo, useState } from "react";
import type { FinanceLedgerTransactionRecord } from "@/lib/types";
import { formatDate, formatMoney } from "@/components/portal/finance/format";

type PortalFinanceLedgerManagerProps = {
  title: string;
  transactions: FinanceLedgerTransactionRecord[];
  txnType: "money_in" | "money_out";
};

export function PortalFinanceLedgerManager({
  title,
  transactions,
  txnType,
}: PortalFinanceLedgerManagerProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | FinanceLedgerTransactionRecord["postedStatus"]>("all");

  const filteredTransactions = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return transactions.filter((item) => {
      if (statusFilter !== "all" && item.postedStatus !== statusFilter) {
        return false;
      }
      if (!needle) {
        return true;
      }
      const haystack = [
        item.category,
        item.subcategory || "",
        item.counterpartyName || "",
        item.sourceType,
        String(item.sourceId),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [transactions, search, statusFilter]);

  return (
    <div className="portal-grid">
      <section className="portal-kpis">
        <article className="portal-kpi-card">
          <p>Entries</p>
          <strong>{transactions.length.toLocaleString()}</strong>
        </article>
        <article className="portal-kpi-card">
          <p>Total amount</p>
          <strong>
            {formatMoney(
              "UGX",
              transactions.reduce((sum, item) => sum + Number(item.amount || 0), 0),
            )}
          </strong>
        </article>
      </section>

      <section className="card">
        <h2>{title}</h2>
        <div className="action-row portal-form-actions">
          <a
            className="button button-ghost button-sm"
            href={`/api/portal/finance/ledger?txnType=${txnType}&format=csv`}
          >
            Export CSV
          </a>
        </div>
      </section>

      <section className="card">
        <h2>Ledger Entries</h2>
        <div className="finance-list-toolbar">
          <div className="finance-list-toolbar-left">
            <input
              className="finance-search-input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search ledger entries"
              aria-label="Search ledger entries"
            />
            <details className="finance-filter-popover">
              <summary>Filters</summary>
              <div className="finance-filter-popover-body">
                <label>
                  <span>Status</span>
                  <select
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(event.target.value as "all" | FinanceLedgerTransactionRecord["postedStatus"])}
                  >
                    <option value="all">All</option>
                    <option value="draft">Draft</option>
                    <option value="posted">Posted</option>
                    <option value="void">Void</option>
                  </select>
                </label>
              </div>
            </details>
          </div>
          <div className="finance-list-toolbar-right portal-muted">
            {filteredTransactions.length} shown
          </div>
        </div>
        {filteredTransactions.length === 0 ? (
          <p>No transactions found.</p>
        ) : (
          <div className="table-wrap finance-table-compact">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Counterparty</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Evidence</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((item) => (
                  <tr key={item.id}>
                    <td>{formatDate(item.date)}</td>
                    <td>
                      <strong>{item.category}</strong>
                      <div className="portal-muted">{item.subcategory || "—"}</div>
                    </td>
                    <td>{formatMoney(item.currency, item.amount)}</td>
                    <td>{item.counterpartyName || "—"}</td>
                    <td>
                      {item.sourceType} #{item.sourceId}
                    </td>
                    <td>
                      <span className={`finance-status-tag finance-status-${item.postedStatus}`}>{item.postedStatus}</span>
                    </td>
                    <td>
                      {item.evidenceFiles.length > 0 ? (
                        <div className="portal-list">
                          {item.evidenceFiles.map((file) => (
                            <a key={file.id} href={file.signedUrl} target="_blank" rel="noreferrer">
                              {file.fileName}
                            </a>
                          ))}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
