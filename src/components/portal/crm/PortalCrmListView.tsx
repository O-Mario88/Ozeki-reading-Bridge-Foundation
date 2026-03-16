"use client";

import Link from "next/link";
import type { PortalCrmListViewModel } from "@/lib/portal-crm-types";

interface PortalCrmListViewProps {
  view: PortalCrmListViewModel;
}

export function PortalCrmListView({ view }: PortalCrmListViewProps) {
  return (
    <div className="portal-crm-list-page">
      <section className="portal-crm-list-hero">
        <div>
          <p className="portal-crm-list-badge">{view.badge}</p>
          <h1>{view.title}</h1>
          <p>{view.subtitle}</p>
        </div>
        <div className="portal-crm-list-actions">
          {view.secondaryActionHref && view.secondaryActionLabel ? (
            <Link className="portal-crm-list-button portal-crm-list-button--ghost" href={view.secondaryActionHref}>
              {view.secondaryActionLabel}
            </Link>
          ) : null}
          <Link className="portal-crm-list-button" href={view.primaryActionHref}>
            {view.primaryActionLabel}
          </Link>
        </div>
      </section>

      <section className="portal-crm-table-wrap">
        <table className="portal-crm-table">
          <thead>
            <tr>
              {view.columns.map((column) => (
                <th key={column.key}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.rows.length > 0 ? (
              view.rows.map((row) => (
                <tr key={row.id}>
                  {view.columns.map((column, index) => {
                    const cell = row.cells[column.key];
                    const content = cell?.href ? (
                      <Link href={cell.href} target="_blank">{cell.value}</Link>
                    ) : row.href && index === 0 ? (
                      <Link href={row.href} target="_blank">{cell?.value ?? "-"}</Link>
                    ) : (
                      <span className={cell?.muted ? "is-muted" : undefined}>{cell?.value ?? "-"}</span>
                    );
                    return <td key={`${row.id}-${column.key}`}>{content}</td>;
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={view.columns.length} className="portal-crm-table-empty">
                  No records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <style jsx>{`
        .portal-crm-list-page {
          display: grid;
          gap: 1rem;
          font-family: var(--portal-backend-font);
        }
        .portal-crm-list-hero,
        .portal-crm-table-wrap {
          border: 1px solid rgba(78, 108, 136, 0.24);
          border-radius: 18px;
          background: #f7f8fa;
          box-shadow: 0 16px 36px rgba(23, 39, 65, 0.08);
        }
        .portal-crm-list-hero {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          padding: 1.25rem 1.5rem;
          background: linear-gradient(180deg, #fdfefe 0%, #f2f5f9 100%);
        }
        .portal-crm-list-badge {
          margin: 0 0 0.2rem;
          font-size: 0.9rem;
          color: #4b5563;
        }
        .portal-crm-list-hero h1 {
          margin: 0;
          font-size: 2rem;
          line-height: 1.15;
          color: #1f2937;
        }
        .portal-crm-list-hero p:last-child {
          margin: 0.35rem 0 0;
          max-width: 62rem;
          color: #4b5563;
          font-size: 1rem;
        }
        .portal-crm-list-actions {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        .portal-crm-list-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 42px;
          padding: 0.7rem 1rem;
          border-radius: 10px;
          border: 1px solid #2563eb;
          background: #2563eb;
          color: #fff;
          font-weight: 700;
          text-decoration: none;
        }
        .portal-crm-list-button--ghost {
          background: transparent;
          color: #1f2937;
          border-color: rgba(78, 108, 136, 0.32);
        }
        .portal-crm-table-wrap {
          overflow: hidden;
        }
        .portal-crm-table {
          width: 100%;
          border-collapse: collapse;
          background: #fff;
        }
        .portal-crm-table thead th {
          text-align: left;
          padding: 0.9rem 1rem;
          font-size: 1rem;
          font-weight: 700;
          color: #3f3f46;
          border-bottom: 1px solid #d7dde7;
          background: #f8fafc;
          white-space: nowrap;
        }
        .portal-crm-table tbody td {
          padding: 0.8rem 1rem;
          border-bottom: 1px solid #e5e7eb;
          vertical-align: top;
          font-size: 0.98rem;
          color: #1f2937;
        }
        .portal-crm-table tbody tr:hover {
          background: #f9fbff;
        }
        .portal-crm-table a {
          color: #0f5fc5;
          text-decoration: none;
          font-weight: 600;
        }
        .portal-crm-table a:hover {
          text-decoration: underline;
        }
        .is-muted {
          color: #6b7280;
        }
        .portal-crm-table-empty {
          text-align: center;
          color: #6b7280;
        }
        @media (max-width: 960px) {
          .portal-crm-list-hero {
            flex-direction: column;
          }
          .portal-crm-table-wrap {
            overflow-x: auto;
          }
          .portal-crm-table {
            min-width: 980px;
          }
        }
      `}</style>
    </div>
  );
}
