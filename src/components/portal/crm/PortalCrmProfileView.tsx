"use client";

import Link from "next/link";
import { useState } from "react";
import type { PortalCrmProfileViewModel } from "@/lib/portal-crm-types";
import { AddContactToTrainingModal } from "./AddContactToTrainingModal";

interface PortalCrmProfileViewProps {
  profile: PortalCrmProfileViewModel;
  contactId?: number;
}

function renderDetail(item: { label: string; value: string; href?: string | null }) {
  return (
    <div key={item.label} className="portal-crm-detail-row">
      <span>{item.label}</span>
      {item.href ? <Link href={item.href} target="_blank">{item.value}</Link> : <strong>{item.value}</strong>}
    </div>
  );
}

export function PortalCrmProfileView({ profile, contactId }: PortalCrmProfileViewProps) {
  const [activeTab, setActiveTab] = useState(profile.tabs[0]?.id ?? "details");
  const active = profile.tabs.find((tab) => tab.id === activeTab) ?? profile.tabs[0] ?? null;

  return (
    <div className="portal-crm-page">
      <section className="portal-crm-hero">
        <div className="portal-crm-hero-main">
          <div className="portal-crm-badge">{profile.badge}</div>
          <h1>{profile.title}</h1>
          {profile.subtitle ? <p className="portal-crm-subtitle">{profile.subtitle}</p> : null}
          <div className="portal-crm-overview">
            {profile.heroFields.map((field) => (
              <div key={field.label}>
                <span>{field.label}</span>
                {field.href ? <Link href={field.href} target="_blank">{field.value}</Link> : <strong>{field.value}</strong>}
              </div>
            ))}
          </div>
        </div>
        {profile.primaryActions?.length ? (
          <div className="portal-crm-hero-actions">
            {profile.primaryActions.map((action) =>
              action.href === "#add-to-training" && contactId ? (
                <AddContactToTrainingModal key={action.label} contactId={contactId} />
              ) : (
                <Link
                  key={action.label}
                  className={`portal-crm-button${action.tone === "ghost" ? " portal-crm-button--ghost" : ""}`}
                  href={action.href}
                >
                  {action.label}
                </Link>
              ),
            )}
          </div>
        ) : null}
      </section>

      {profile.notice ? (
        <section className="portal-crm-notice">
          <strong>{profile.notice}</strong>
        </section>
      ) : null}

      <section className="portal-crm-layout">
        <div className="portal-crm-main">
          <article className="portal-crm-card">
            <header>
              <h2>Related List Quick Links</h2>
            </header>
            <div className="portal-crm-quick-grid">
              {profile.quickLinks.map((link) => (
                <Link key={link.label} href={link.href} target="_blank" className="portal-crm-quick-link">
                  <span>{link.icon || "•"}</span>
                  <strong>{link.label}</strong>
                  <small>({link.count})</small>
                </Link>
              ))}
            </div>
          </article>

          <article className="portal-crm-card">
            <div className="portal-crm-tabs">
              <button
                type="button"
                className={activeTab === "details" ? "is-active" : undefined}
                onClick={() => setActiveTab("details")}
              >
                Details
              </button>
              {profile.tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={activeTab === tab.id ? "is-active" : undefined}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === "details" ? (
              <div className="portal-crm-details-grid">
                <div className="portal-crm-details-column">{profile.detailsLeft.map(renderDetail)}</div>
                <div className="portal-crm-details-column">{profile.detailsRight.map(renderDetail)}</div>
              </div>
            ) : active?.columns?.length && active.rows ? (
              <div className="portal-crm-tab-table-wrap">
                <table className="portal-crm-tab-table">
                  <thead>
                    <tr>
                      {active.columns.map((column) => (
                        <th key={`${active.id}-${column.key}`}>{column.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {active.rows.length > 0 ? (
                      active.rows.map((row) => (
                        <tr key={`${active.id}-${row.id}`}>
                          {active.columns?.map((column) => {
                            const cell = row.cells[column.key];
                            const content = cell?.href ? (
                              <Link href={cell.href} target="_blank">{cell.value}</Link>
                            ) : (
                              <span className={cell?.muted ? "is-muted" : undefined}>{cell?.value ?? "-"}</span>
                            );
                            return <td key={`${active.id}-${row.id}-${column.key}`}>{content}</td>;
                          })}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={active.columns.length} className="portal-crm-empty">
                          {active.emptyLabel}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : active ? (
              <div className="portal-crm-activity-list">
                {(active.items ?? []).length > 0 ? (
                  (active.items ?? []).map((item) => (
                    <div key={`${active.id}-${item.id}`} className="portal-crm-activity-item">
                      <div>
                        {item.href ? <Link href={item.href} target="_blank">{item.title}</Link> : <strong>{item.title}</strong>}
                        {item.subtitle ? <p>{item.subtitle}</p> : null}
                      </div>
                      <div>
                        {item.meta ? <span>{item.meta}</span> : null}
                        {item.date ? <small>{item.date}</small> : null}
                        {item.status ? <i>{item.status}</i> : null}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="portal-crm-empty">{active.emptyLabel}</p>
                )}
              </div>
            ) : null}
          </article>
        </div>

        {profile.sidebarCards?.length ? (
          <aside className="portal-crm-sidebar">
            {profile.sidebarCards.map((card) => (
              <article key={card.title} className="portal-crm-card">
                <header>
                  <h2>{card.title}</h2>
                </header>
                <div className="portal-crm-sidebar-list">
                  {card.items.map(renderDetail)}
                </div>
              </article>
            ))}
          </aside>
        ) : null}
      </section>

      <style jsx>{`
        .portal-crm-page {
          display: grid;
          gap: 1rem;
          font-family: var(--portal-backend-font);
        }
        .portal-crm-hero,
        .portal-crm-card,
        .portal-crm-notice {
          border: 1px solid rgba(78, 108, 136, 0.24);
          border-radius: 18px;
          background: #f7f8fa;
          box-shadow: 0 16px 36px rgba(23, 39, 65, 0.08);
        }
        .portal-crm-hero {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          padding: 1.35rem 1.5rem;
          background: linear-gradient(180deg, #fdfefe 0%, #f1f5f9 100%);
        }
        .portal-crm-badge {
          color: #4b5563;
          font-size: 0.92rem;
          margin-bottom: 0.2rem;
        }
        .portal-crm-hero h1 {
          margin: 0;
          font-size: 2rem;
          line-height: 1.15;
          color: #1f2937;
        }
        .portal-crm-subtitle {
          margin: 0.35rem 0 0;
          color: #4b5563;
          font-size: 1rem;
        }
        .portal-crm-overview {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 0.95rem;
          margin-top: 1rem;
        }
        .portal-crm-overview span,
        .portal-crm-detail-row span,
        .portal-crm-activity-item span,
        .portal-crm-activity-item small,
        .portal-crm-activity-item i {
          display: block;
          color: #6b7280;
          font-size: 0.9rem;
          font-style: normal;
        }
        .portal-crm-overview strong,
        .portal-crm-overview :global(a),
        .portal-crm-detail-row strong,
        .portal-crm-detail-row :global(a),
        .portal-crm-activity-item strong,
        .portal-crm-activity-item :global(a) {
          color: #1f2937;
          font-size: 1.15rem;
          font-weight: 700;
          text-decoration: none;
        }
        .portal-crm-overview :global(a),
        .portal-crm-detail-row :global(a),
        .portal-crm-activity-item :global(a) {
          color: #0f5fc5;
        }
        .portal-crm-overview :global(a:hover),
        .portal-crm-detail-row :global(a:hover),
        .portal-crm-activity-item :global(a:hover) {
          text-decoration: underline;
        }
        .portal-crm-hero-actions {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
          align-self: flex-start;
        }
        .portal-crm-button {
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
        .portal-crm-button--ghost {
          background: transparent;
          color: #1f2937;
          border-color: rgba(78, 108, 136, 0.32);
        }
        .portal-crm-notice {
          padding: 0.95rem 1.25rem;
        }
        .portal-crm-layout {
          display: grid;
          grid-template-columns: minmax(0, 2fr) minmax(280px, 0.9fr);
          gap: 1rem;
        }
        .portal-crm-main,
        .portal-crm-sidebar {
          display: grid;
          gap: 1rem;
        }
        .portal-crm-card {
          padding: 1.25rem;
        }
        .portal-crm-card header h2 {
          margin: 0;
          font-size: 1.55rem;
          color: #1f2937;
        }
        .portal-crm-quick-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 0.85rem;
          margin-top: 1rem;
        }
        .portal-crm-quick-link {
          display: grid;
          gap: 0.15rem;
          padding: 0.85rem 0.95rem;
          border: 1px solid #d7dde7;
          border-radius: 14px;
          background: #fff;
          color: #0f5fc5;
          text-decoration: none;
        }
        .portal-crm-quick-link span {
          color: #2563eb;
          font-size: 0.82rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .portal-crm-quick-link strong {
          font-size: 1rem;
        }
        .portal-crm-quick-link small {
          color: #6b7280;
          font-size: 0.9rem;
        }
        .portal-crm-tabs {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
          padding-bottom: 1rem;
          border-bottom: 1px solid #d7dde7;
        }
        .portal-crm-tabs button {
          border: 0;
          background: transparent;
          color: #4b5563;
          font: inherit;
          font-weight: 700;
          padding: 0.25rem 0;
          border-bottom: 3px solid transparent;
          cursor: pointer;
        }
        .portal-crm-tabs button.is-active {
          color: #0f5fc5;
          border-bottom-color: #2563eb;
        }
        .portal-crm-details-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1rem;
          margin-top: 1rem;
        }
        .portal-crm-details-column {
          display: grid;
          gap: 0.75rem;
        }
        .portal-crm-detail-row {
          padding: 0.85rem 0;
          border-bottom: 1px solid #e5e7eb;
        }
        .portal-crm-activity-list {
          display: grid;
          gap: 0.85rem;
          margin-top: 1rem;
        }
        .portal-crm-tab-table-wrap {
          margin-top: 1rem;
          overflow-x: auto;
        }
        .portal-crm-tab-table {
          width: 100%;
          min-width: 920px;
          border-collapse: collapse;
          background: #fff;
          border: 1px solid #d7dde7;
          border-radius: 14px;
          overflow: hidden;
        }
        .portal-crm-tab-table th,
        .portal-crm-tab-table td {
          padding: 0.85rem 0.95rem;
          border-bottom: 1px solid #e5e7eb;
          text-align: left;
          vertical-align: top;
        }
        .portal-crm-tab-table th {
          background: #f8fafc;
          color: #475569;
          font-size: 0.94rem;
          font-weight: 700;
          white-space: nowrap;
        }
        .portal-crm-tab-table td {
          color: #1f2937;
          font-size: 0.98rem;
        }
        .portal-crm-tab-table :global(a) {
          color: #0f5fc5;
          font-weight: 600;
          text-decoration: none;
        }
        .portal-crm-tab-table :global(a:hover) {
          text-decoration: underline;
        }
        .portal-crm-activity-item {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          padding: 0.95rem 1rem;
          border: 1px solid #d7dde7;
          border-radius: 14px;
          background: #fff;
        }
        .portal-crm-activity-item p {
          margin: 0.25rem 0 0;
          color: #4b5563;
        }
        .portal-crm-activity-item > div:last-child {
          text-align: right;
          min-width: 180px;
        }
        .portal-crm-empty {
          margin: 1rem 0 0;
          color: #6b7280;
        }
        .portal-crm-sidebar-list {
          display: grid;
          gap: 0.75rem;
          margin-top: 1rem;
        }
        @media (max-width: 1024px) {
          .portal-crm-layout {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 768px) {
          .portal-crm-hero {
            flex-direction: column;
          }
          .portal-crm-details-grid {
            grid-template-columns: 1fr;
          }
          .portal-crm-activity-item {
            flex-direction: column;
          }
          .portal-crm-activity-item > div:last-child {
            text-align: left;
            min-width: auto;
          }
        }
      `}</style>
    </div>
  );
}
