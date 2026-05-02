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
        <div
          className="portal-crm-card-header"
          style={{ gridTemplateColumns: `repeat(${view.columns.length}, minmax(0, 1fr))` }}
        >
          {view.columns.map((column) => (
            <span key={column.key}>{column.label}</span>
          ))}
        </div>
        {view.rows.length > 0 ? (
          view.rows.map((row) => (
            <div
              key={row.id}
              className="portal-crm-card-row"
              style={{ gridTemplateColumns: `repeat(${view.columns.length}, minmax(0, 1fr))` }}
            >
              {view.columns.map((column, index) => {
                const cell = row.cells[column.key];
                const content = cell?.href ? (
                  <Link href={cell.href} target="_blank">{cell.value}</Link>
                ) : row.href && index === 0 ? (
                  <Link href={row.href} target="_blank">{cell?.value ?? "-"}</Link>
                ) : (
                  <span className={cell?.muted ? "is-muted" : undefined}>{cell?.value ?? "-"}</span>
                );
                return <span key={`${row.id}-${column.key}`}>{content}</span>;
              })}
            </div>
          ))
        ) : (
          <div className="portal-crm-table-empty">No records found.</div>
        )}
      </section>

      <style jsx>{`
        .portal-crm-list-page {
          display: grid;
          gap: 1rem;
          font-family: var(--ds-font, system-ui);
        }
        .portal-crm-list-hero,
        .portal-crm-table-wrap {
          border: 1px solid #eee9e0;
          border-radius: 18px;
          background: #ffffff;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
        }
        .portal-crm-list-hero {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          padding: 1.25rem 1.5rem;
          background: linear-gradient(180deg, #ffffff 0%, #faf8f5 100%);
        }
        .portal-crm-list-badge {
          margin: 0 0 0.2rem;
          font-size: 0.82rem;
          color: #78716c;
        }
        .portal-crm-list-hero h1 {
          margin: 0;
          font-size: 1.5rem;
          line-height: 1.15;
          color: #292524;
        }
        .portal-crm-list-hero p:last-child {
          margin: 0.35rem 0 0;
          max-width: 62rem;
          color: #57534e;
          font-size: 0.88rem;
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
          min-height: 40px;
          padding: 0.55rem 1rem;
          border-radius: 10px;
          border: 1px solid #4a7c59;
          background: #4a7c59;
          color: #fff;
          font-weight: 600;
          font-size: 0.84rem;
          text-decoration: none;
          transition: all 0.15s ease;
        }
        .portal-crm-list-button:hover {
          opacity: 0.9;
        }
        .portal-crm-list-button--ghost {
          background: transparent;
          color: #292524;
          border-color: #d9d4cb;
        }
        .portal-crm-list-button--ghost:hover {
          background: #faf8f5;
        }
        .portal-crm-table-wrap {
          overflow: hidden;
          background: #fff;
        }
        .portal-crm-card-header {
          display: grid;
          gap: 0.75rem;
          padding: 0.85rem 1rem;
          font-size: 0.72rem;
          font-weight: 600;
          color: #a8a29e;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          border-bottom: 1px solid #eee9e0;
          background: transparent;
        }
        .portal-crm-card-row {
          display: grid;
          gap: 0.75rem;
          padding: 0.8rem 1rem;
          border-bottom: 1px solid #f5f2ec;
          font-size: 0.84rem;
          color: #292524;
          align-items: start;
        }
        .portal-crm-card-row:hover {
          background: #faf8f5;
        }
        .portal-crm-card-row:last-child {
          border-bottom: none;
        }
        .portal-crm-card-row a {
          color: #4a7c59;
          text-decoration: none;
          font-weight: 600;
        }
        .portal-crm-card-row a:hover {
          text-decoration: underline;
        }
        .is-muted {
          color: #78716c;
        }
        .portal-crm-table-empty {
          text-align: center;
          color: #78716c;
          padding: 1.25rem 1rem;
        }
        @media (max-width: 960px) {
          .portal-crm-list-hero {
            flex-direction: column;
          }
          .portal-crm-table-wrap {
            overflow-x: auto;
          }
        }
      `}</style>
    </div>
  );
}
