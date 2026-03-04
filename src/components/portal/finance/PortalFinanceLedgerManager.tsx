"use client";

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
            className="button button-ghost"
            href={`/api/portal/finance/ledger?txnType=${txnType}&format=csv`}
          >
            Export CSV
          </a>
        </div>
      </section>

      <section className="card">
        <h2>Ledger Entries</h2>
        {transactions.length === 0 ? (
          <p>No transactions found.</p>
        ) : (
          <div className="table-wrap">
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
                {transactions.map((item) => (
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
                    <td>{item.postedStatus}</td>
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

