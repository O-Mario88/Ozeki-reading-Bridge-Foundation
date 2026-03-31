"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  FinanceDashboardSummary,
  FinanceExpenseRecord,
  FinanceInvoiceRecord,
  FinanceReceiptRecord,
} from "@/lib/types";
import { formatDate, formatMoney } from "@/components/portal/finance/format";

type PortalFinanceDashboardProps = {
  summary: FinanceDashboardSummary;
  totalAssets: number;
  recentInvoices: FinanceInvoiceRecord[];
  recentReceipts: FinanceReceiptRecord[];
  recentExpenses: FinanceExpenseRecord[];
  period?: string;
};

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function PortalFinanceDashboard({
  summary,
  totalAssets,
  recentInvoices,
  recentReceipts,
  recentExpenses,
  period = "fy",
}: PortalFinanceDashboardProps) {
  const router = useRouter();
  const [txnFilter, setTxnFilter] = useState<
    "all" | "Invoice" | "Receipt" | "Expense"
  >("all");
  const [txnSort, setTxnSort] = useState<
    | "date_desc"
    | "date_asc"
    | "amount_desc"
    | "amount_asc"
    | "name_asc"
    | "name_desc"
  >("date_desc");
  const [showFilters, setShowFilters] = useState(false);

  const today = todayIsoDate();
  const soonCutoff = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const dueSoon = useMemo(
    () =>
      recentInvoices
        .filter(
          (item) =>
            item.status !== "void" &&
            item.status !== "paid" &&
            item.balanceDue > 0 &&
            item.dueDate >= today &&
            item.dueDate <= soonCutoff,
        )
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
        .slice(0, 8),
    [recentInvoices, soonCutoff, today],
  );

  const overdue = useMemo(
    () =>
      recentInvoices
        .filter(
          (item) =>
            item.status !== "void" &&
            item.status !== "paid" &&
            item.balanceDue > 0 &&
            item.dueDate < today,
        )
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
        .slice(0, 8),
    [recentInvoices, today],
  );

  const activityRows = useMemo(() => {
    const rows: Array<{
      id: string;
      type: "Invoice" | "Receipt" | "Expense";
      ref: string;
      date: string;
      counterparty: string;
      amount: string;
      status: string;
    }> = [];

    recentInvoices.forEach((item) => {
      rows.push({
        id: `invoice-${item.id}`,
        type: "Invoice",
        ref: item.invoiceNumber,
        date: item.issueDate,
        counterparty: item.createdByName || "—",
        amount: formatMoney(item.currency, item.total),
        status: item.status,
      });
    });

    recentReceipts.forEach((item) => {
      rows.push({
        id: `receipt-${item.id}`,
        type: "Receipt",
        ref: item.receiptNumber,
        date: item.receiptDate,
        counterparty: item.receivedFrom || "—",
        amount: formatMoney(item.currency, item.amountReceived),
        status: item.status,
      });
    });

    recentExpenses.forEach((item) => {
      rows.push({
        id: `expense-${item.id}`,
        type: "Expense",
        ref: item.expenseNumber,
        date: item.date,
        counterparty: item.vendorName || "—",
        amount: formatMoney(item.currency, item.amount),
        status: item.status,
      });
    });

    let sorted = rows;
    if (txnFilter !== "all") {
      sorted = sorted.filter((r) => r.type === txnFilter);
    }

    sorted.sort((a, b) => {
      if (txnSort === "date_desc") return b.date.localeCompare(a.date);
      if (txnSort === "date_asc") return a.date.localeCompare(b.date);
      if (txnSort === "name_asc")
        return a.counterparty.localeCompare(b.counterparty);
      if (txnSort === "name_desc")
        return b.counterparty.localeCompare(a.counterparty);

      const numA = Number(a.amount.replace(/[^0-9.-]+/g, ""));
      const numB = Number(b.amount.replace(/[^0-9.-]+/g, ""));
      if (txnSort === "amount_desc") return numB - numA;
      return numA - numB;
    });

    return sorted.slice(0, 14);
  }, [recentExpenses, recentInvoices, recentReceipts, txnFilter, txnSort]);

  return (
    <div
      className="compact-finance-ui"
      style={{ minWidth: 0, paddingBottom: "2rem" }}
    >
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
        <select
          value={period}
          onChange={(e) => router.push(`/portal/finance?period=${e.target.value}`)}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "10px",
            border: "1px solid #e5e7eb",
            fontSize: "0.85rem",
            background: "white",
            outline: "none",
            cursor: "pointer",
            fontWeight: 500,
            color: "#111827",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
          }}
        >
          <option value="week">Past 7 Days</option>
          <option value="month">This Month</option>
          <option value="fy">Financial Year (YTD)</option>
          <option value="all">All Time</option>
        </select>
      </div>

      {/* Main Grid Setup */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(320px, 360px) 1fr",
          gap: "1.5rem",
        }}
      >
        {/* LEFT COLUMN */}
        <div
          style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
        >
          {/* Total Balance Card */}
          <div
            className="ds-card"
            style={{
              padding: "1.75rem",
              borderRadius: "24px",
              border: "none",
              boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
              }}
            >
              <span
                style={{
                  fontSize: "0.9rem",
                  color: "#6b7280",
                  fontWeight: 500,
                }}
              >
                Total Balance
              </span>
              <span
                style={{
                  fontSize: "1.2rem",
                  background: "#f3f4f6",
                  padding: "0.2rem 0.5rem",
                  borderRadius: "8px",
                }}
              >
                🏦
              </span>
            </div>
            <div
              style={{
                fontSize: "2.4rem",
                fontWeight: 800,
                color: "#111827",
                margin: "0.5rem 0 2rem",
                letterSpacing: "-0.03em",
              }}
            >
              {formatMoney(summary.currency, totalAssets)}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.75rem",
              }}
            >
              <Link
                href="/portal/finance/receipts"
                style={{
                  background: "#4f46e5",
                  color: "white",
                  padding: "0.85rem",
                  borderRadius: "12px",
                  textAlign: "center",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                <span style={{ fontSize: "1.1rem" }}>⤓</span> Transfer
              </Link>
              <Link
                href="/portal/finance/invoices"
                style={{
                  background: "#e0e7ff",
                  color: "#4f46e5",
                  padding: "0.85rem",
                  borderRadius: "12px",
                  textAlign: "center",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                <span style={{ fontSize: "1.1rem" }}>↗</span> Request
              </Link>
            </div>
          </div>

          {/* Action Items (Replacing Saving Plans) */}
          <div
            className="ds-card"
            style={{
              padding: "1.75rem",
              borderRadius: "24px",
              border: "none",
              boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.5rem",
              }}
            >
              <h3 style={{ fontSize: "1.05rem", fontWeight: 700, margin: 0 }}>
                Action Items
              </h3>
              {dueSoon.length > 0 && (
                <span style={{ fontSize: "1.2rem", color: "#9ca3af" }}>
                  ...
                </span>
              )}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.5rem",
              }}
            >
              {dueSoon.slice(0, 3).map((item, i) => (
                <div key={item.id}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                      marginBottom: "0.75rem",
                    }}
                  >
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "12px",
                        background:
                          i === 0 ? "#e0f2fe" : i === 1 ? "#ffedd5" : "#f3e8ff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1.2rem",
                      }}
                    >
                      {i === 0 ? "🚙" : i === 1 ? "💍" : "🎮"}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "0.1rem",
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: "0.9rem",
                            color: "#111827",
                          }}
                        >
                          {item.invoiceNumber}
                        </span>
                        <span
                          style={{
                            fontSize: "1.2rem",
                            color: "#d1d5db",
                            lineHeight: 1,
                          }}
                        >
                          ...
                        </span>
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                        Due {formatDate(item.dueDate)}
                      </div>
                    </div>
                  </div>
                  {/* Progress Bar Mock */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "0.4rem",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      color: "#111827",
                    }}
                  >
                    <span>{formatMoney(item.currency, item.balanceDue)}</span>
                    <span style={{ color: "#9ca3af", fontWeight: 500 }}>
                      target: {formatMoney(item.currency, item.total)}
                    </span>
                  </div>
                  <div
                    style={{
                      width: "100%",
                      height: "6px",
                      background: "#f3f4f6",
                      borderRadius: "3px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.max(10, Math.min(100, ((item.total - item.balanceDue) / item.total) * 100))}%`,
                        height: "100%",
                        background: "#4f46e5",
                        borderRadius: "3px",
                      }}
                    ></div>
                  </div>
                  {i < Math.min(2, dueSoon.length - 1) && (
                    <hr
                      style={{
                        border: "none",
                        borderBottom: "1px solid #f3f4f6",
                        margin: "1.5rem 0 0 0",
                      }}
                    />
                  )}
                </div>
              ))}
              {dueSoon.length === 0 && (
                <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>
                  All clear! No upcoming invoices.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div
          style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}
        >
          {/* KPI Grid 2x2 */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: "1.5rem",
            }}
          >
            {/* Income */}
            <div
              className="ds-card"
              style={{
                padding: "1.5rem",
                borderRadius: "24px",
                border: "none",
                boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: "0.85rem",
                      color: "#6b7280",
                      fontWeight: 500,
                    }}
                  >
                    Total Income
                  </span>
                  <div
                    style={{
                      fontSize: "1.7rem",
                      fontWeight: 700,
                      color: "#111827",
                      margin: "0.5rem 0",
                    }}
                  >
                    {formatMoney(summary.currency, summary.moneyIn)}
                  </div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "#10b981",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <span style={{ fontSize: "1rem" }}>✓</span> Real-time data
                  </div>
                </div>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: "#e0e7ff",
                    color: "#4f46e5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1rem",
                  }}
                >
                  📥
                </div>
              </div>
            </div>

            {/* Spending Limit / Net */}
            <div
              className="ds-card"
              style={{
                padding: "1.5rem",
                borderRadius: "24px",
                border: "none",
                boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div style={{ width: "100%" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.85rem",
                        color: "#6b7280",
                        fontWeight: 500,
                      }}
                    >
                      Net Position
                    </span>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        border: "1px solid #e5e7eb",
                        padding: "0.2rem 0.5rem",
                        borderRadius: "6px",
                        color: "#6b7280",
                      }}
                    >
                      Weeks ∨
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: "0.5rem",
                      margin: "1.25rem 0 1rem",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "1.7rem",
                        fontWeight: 700,
                        color: "#111827",
                      }}
                    >
                      {formatMoney(summary.currency, summary.net)}
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                      Current Balance
                    </span>
                  </div>
                  <div
                    style={{
                      width: "100%",
                      height: "8px",
                      background: "#f3f4f6",
                      borderRadius: "4px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: "65%",
                        height: "100%",
                        background: "#4f46e5",
                        borderRadius: "4px",
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Expense */}
            <div
              className="ds-card"
              style={{
                padding: "1.5rem",
                borderRadius: "24px",
                border: "none",
                boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: "0.85rem",
                      color: "#6b7280",
                      fontWeight: 500,
                    }}
                  >
                    Total Expense
                  </span>
                  <div
                    style={{
                      fontSize: "1.7rem",
                      fontWeight: 700,
                      color: "#111827",
                      margin: "0.5rem 0",
                    }}
                  >
                    {formatMoney(summary.currency, summary.moneyOut)}
                  </div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "#6b7280",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <span style={{ fontSize: "1rem" }}>✓</span> Real-time data
                  </div>
                </div>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    background: "#fee2e2",
                    color: "#ef4444",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1rem",
                  }}
                >
                  📤
                </div>
              </div>
            </div>

            {/* Analytics */}
            <div
              className="ds-card"
              style={{
                padding: "1.5rem",
                borderRadius: "24px",
                border: "none",
                boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontSize: "0.85rem",
                    color: "#6b7280",
                    fontWeight: 500,
                  }}
                >
                  Receivables Analytics
                </span>
                <span
                  style={{
                    fontSize: "0.75rem",
                    border: "1px solid #e5e7eb",
                    padding: "0.2rem 0.5rem",
                    borderRadius: "6px",
                    color: "#6b7280",
                  }}
                >
                  Weeks ∨
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "4px",
                  marginTop: "1.75rem",
                  marginBottom: "1rem",
                  height: "8px",
                  borderRadius: "4px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    flex: summary.outstandingInvoiceCount || 1,
                    background: "#fbcfe8",
                  }}
                ></div>
                <div
                  style={{ flex: dueSoon.length || 1, background: "#c4b5fd" }}
                ></div>
                <div
                  style={{ flex: overdue.length || 1, background: "#bfdbfe" }}
                ></div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <div
                    style={{
                      fontSize: "0.7rem",
                      color: "#9ca3af",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      marginBottom: "4px",
                    }}
                  >
                    <span style={{ color: "#fbcfe8", fontSize: "0.8rem" }}>
                      ●
                    </span>{" "}
                    Outstanding
                  </div>
                  <div
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      color: "#111827",
                    }}
                  >
                    {formatMoney(
                      summary.currency,
                      summary.outstandingInvoiceTotal,
                    )}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "0.7rem",
                      color: "#9ca3af",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      marginBottom: "4px",
                    }}
                  >
                    <span style={{ color: "#c4b5fd", fontSize: "0.8rem" }}>
                      ●
                    </span>{" "}
                    Invoices
                  </div>
                  <div
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      color: "#111827",
                    }}
                  >
                    {summary.outstandingInvoiceCount}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "0.7rem",
                      color: "#9ca3af",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      marginBottom: "4px",
                    }}
                  >
                    <span style={{ color: "#bfdbfe", fontSize: "0.8rem" }}>
                      ●
                    </span>{" "}
                    Overdue
                  </div>
                  <div
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      color: "#111827",
                    }}
                  >
                    {overdue.length}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Transactions Table */}
          <div
            className="ds-card"
            style={{
              padding: "1.75rem",
              borderRadius: "24px",
              border: "none",
              boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
              flex: 1,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.5rem",
              }}
            >
              <h3 style={{ fontSize: "1.05rem", fontWeight: 700, margin: 0 }}>
                Transactions History
              </h3>
              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  alignItems: "center",
                  position: "relative",
                }}
              >
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "0.75rem",
                    color: "#6b7280",
                    borderBottom: "1px solid #e5e7eb",
                    padding: "0.4rem 0.8rem",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span style={{ fontSize: "0.8rem" }}>▽</span> Filter
                </button>
                {showFilters && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      right: 0,
                      marginTop: "0.5rem",
                      background: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      padding: "0.5rem",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                      zIndex: 20,
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.5rem",
                      minWidth: "150px",
                    }}
                  >
                    <select
                      value={txnFilter}
                      onChange={(e) =>
                        setTxnFilter(
                          e.target.value as
                            | "all"
                            | "Invoice"
                            | "Receipt"
                            | "Expense",
                        )
                      }
                      style={{
                        padding: "0.25rem",
                        borderRadius: "4px",
                        border: "1px solid #d1d5db",
                        fontSize: "0.8rem",
                      }}
                    >
                      <option value="all">All Types</option>
                      <option value="Invoice">Invoices</option>
                      <option value="Receipt">Receipts</option>
                      <option value="Expense">Expenses</option>
                    </select>
                    <select
                      value={txnSort}
                      onChange={(e) =>
                        setTxnSort(
                          e.target.value as
                            | "date_desc"
                            | "date_asc"
                            | "amount_desc"
                            | "amount_asc"
                            | "name_asc"
                            | "name_desc",
                        )
                      }
                      style={{
                        padding: "0.25rem",
                        borderRadius: "4px",
                        border: "1px solid #d1d5db",
                        fontSize: "0.8rem",
                      }}
                    >
                      <option value="date_desc">Newest First</option>
                      <option value="date_asc">Oldest First</option>
                      <option value="amount_desc">Highest Amount</option>
                      <option value="amount_asc">Lowest Amount</option>
                      <option value="name_asc">Name A-Z</option>
                      <option value="name_desc">Name Z-A</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.85rem",
              }}
            >
              <thead>
                <tr
                  style={{
                    color: "#9ca3af",
                    borderBottom: "1px solid #f3f4f6",
                  }}
                >
                  <th
                    style={{
                      textAlign: "left",
                      paddingBottom: "1rem",
                      fontWeight: 500,
                      fontSize: "0.75rem",
                    }}
                  >
                    Name
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      paddingBottom: "1rem",
                      fontWeight: 500,
                      fontSize: "0.75rem",
                    }}
                  >
                    Type
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      paddingBottom: "1rem",
                      fontWeight: 500,
                      fontSize: "0.75rem",
                    }}
                  >
                    Date
                  </th>
                  <th
                    style={{
                      textAlign: "center",
                      paddingBottom: "1rem",
                      fontWeight: 500,
                      fontSize: "0.75rem",
                    }}
                  >
                    Amount
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      paddingBottom: "1rem",
                      fontWeight: 500,
                      fontSize: "0.75rem",
                    }}
                  >
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {activityRows.slice(0, 5).map((item) => (
                  <tr
                    key={item.id}
                    style={{ borderBottom: "1px solid #f3f4f6" }}
                  >
                    <td
                      style={{
                        padding: "1rem 0",
                        display: "flex",
                        alignItems: "center",
                        gap: "1rem",
                      }}
                    >
                      <div
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "12px",
                          background:
                            item.type === "Receipt"
                              ? "#dcfce7"
                              : item.type === "Expense"
                                ? "#ffe4e6"
                                : "#e0e7ff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "1rem",
                        }}
                      >
                        {item.type === "Receipt"
                          ? "💵"
                          : item.type === "Expense"
                            ? "💳"
                            : "📄"}
                      </div>
                      <div>
                        <div
                          style={{
                            fontWeight: 600,
                            color: "#111827",
                            fontSize: "0.9rem",
                            marginBottom: "4px",
                          }}
                        >
                          {item.counterparty}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                          {item.ref}
                        </div>
                      </div>
                    </td>
                    <td style={{ fontWeight: 600, color: "#4b5563" }}>
                      {item.type}
                    </td>
                    <td>
                      <div
                        style={{
                          color: "#4b5563",
                          fontWeight: 500,
                          fontSize: "0.8rem",
                          marginBottom: "2px",
                        }}
                      >
                        {formatDate(item.date)}
                      </div>
                      <div style={{ color: "#9ca3af", fontSize: "0.7rem" }}>
                        10:32 PM
                      </div>
                    </td>
                    <td
                      style={{
                        textAlign: "center",
                        fontWeight: 600,
                        color: "#111827",
                      }}
                    >
                      {item.amount}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <span
                        style={{
                          padding: "0.35rem 0.85rem",
                          borderRadius: "20px",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          backgroundColor:
                            item.status === "paid" ||
                            item.status === "completed"
                              ? "#dcfce7"
                              : "#fef3c7",
                          color:
                            item.status === "paid" ||
                            item.status === "completed"
                              ? "#166534"
                              : "#b45309",
                        }}
                      >
                        {item.status.charAt(0).toUpperCase() +
                          item.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
                {activityRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      style={{
                        padding: "2rem",
                        textAlign: "center",
                        color: "#9ca3af",
                      }}
                    >
                      No recent activity found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
