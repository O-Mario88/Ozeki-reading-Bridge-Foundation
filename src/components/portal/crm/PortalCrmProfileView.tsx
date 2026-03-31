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

/* ── emoji icon map for quick-link stat cards ── */
const ICON_MAP: Record<string, string> = {
  TR: "🎓", VS: "🏫", AS: "📋", FL: "📁", PT: "👥",
  TE: "📝", ST: "📖", SC: "🏛", QR: "❓",
};

export function PortalCrmProfileView({ profile, contactId }: PortalCrmProfileViewProps) {
  const [activeTab, setActiveTab] = useState(profile.tabs[0]?.id ?? "details");
  const active = profile.tabs.find((tab) => tab.id === activeTab) ?? profile.tabs[0] ?? null;

  // ── Delete contact state (only used when profile.badge === 'Contact') ──
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const isContactProfile = profile.badge === "Contact" && contactId;

  async function handleDeleteContact() {
    if (deleteConfirmName.trim().toLowerCase() !== profile.title.trim().toLowerCase()) {
      setDeleteError("Contact name does not match. Please type it exactly to confirm.");
      return;
    }
    setDeleteLoading(true);
    setDeleteError("");
    try {
      const res = await fetch(`/api/portal/contacts/${contactId}`, { method: "DELETE" });
      const json = await res.json() as { success?: boolean; error?: string };
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? "Failed to delete contact.");
      }
      window.location.href = "/portal/contacts";
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Deletion failed. Please try again.");
      setDeleteLoading(false);
    }
  }

  return (
    <div className="portal-crm-page">
      {/* ═══════════ HERO / PROFILE SUMMARY CARD ═══════════ */}
      <section className="portal-crm-hero">
        <div className="portal-crm-hero-left">
          <div className="portal-crm-avatar">{profile.badge.charAt(0)}</div>
          <div className="portal-crm-hero-main">
            <div className="portal-crm-badge">{profile.badge}</div>
            <h1>{profile.title}</h1>
            {profile.subtitle ? <p className="portal-crm-subtitle">{profile.subtitle}</p> : null}
          </div>
        </div>

        <div className="portal-crm-hero-right">
          <div className="portal-crm-overview">
            {profile.heroFields.map((field) => (
              <div key={field.label}>
                <span>{field.label}</span>
                {field.href ? <Link href={field.href} target="_blank">{field.value}</Link> : <strong>{field.value}</strong>}
              </div>
            ))}
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
              {isContactProfile ? (
                <button
                  type="button"
                  className="portal-crm-button portal-crm-button--danger"
                  onClick={() => { setDeleteConfirmOpen(true); setDeleteConfirmName(""); setDeleteError(""); }}
                >
                  Delete Contact
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      {/* ═══════════ NOTICE BAR ═══════════ */}
      {profile.notice ? (
        <section className="portal-crm-notice">
          <strong>{profile.notice}</strong>
        </section>
      ) : null}

      {/* ═══════════ STAT COUNTER CARDS ═══════════ */}
      <section className="portal-crm-stats-row">
        {profile.quickLinks.map((link) => (
          <Link key={link.label} href={link.href} target="_blank" className="portal-crm-stat-card">
            <div className="portal-crm-stat-icon">{ICON_MAP[link.icon ?? ""] ?? "📊"}</div>
            <div className="portal-crm-stat-count">{link.count}</div>
            <div className="portal-crm-stat-label">{link.label}</div>
          </Link>
        ))}
      </section>

      {/* ═══════════ MAIN + SIDEBAR LAYOUT ═══════════ */}
      <section className="portal-crm-layout">
        <div className="portal-crm-main">
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

      {/* ═══════════ DELETE CONTACT CONFIRM DIALOG ═══════════ */}
      {deleteConfirmOpen && isContactProfile ? (
        <div className="portal-crm-delete-overlay" role="dialog" aria-modal="true" aria-labelledby="crm-delete-dialog-title">
          <div className="portal-crm-delete-dialog">
            <h2 id="crm-delete-dialog-title">⚠️ Permanently Delete Contact?</h2>
            <p>
              This action is <strong>irreversible</strong>. It will permanently remove{" "}
              <strong>{profile.title}</strong> from the database, including their training attendance and
              participation history.
            </p>
            <p className="portal-crm-delete-hint">
              To confirm, type the contact name exactly: <strong>{profile.title}</strong>
            </p>
            <input
              id="delete-contact-confirm-input"
              className="portal-crm-delete-input"
              type="text"
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
              placeholder={profile.title}
              disabled={deleteLoading}
              autoFocus
            />
            {deleteError ? <p className="portal-crm-delete-error">{deleteError}</p> : null}
            <div className="portal-crm-delete-actions">
              <button
                type="button"
                className="portal-crm-button portal-crm-button--ghost"
                onClick={() => setDeleteConfirmOpen(false)}
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                id="confirm-delete-contact-btn"
                type="button"
                className="portal-crm-button portal-crm-button--danger"
                onClick={handleDeleteContact}
                disabled={deleteLoading}
              >
                {deleteLoading ? "Deleting…" : "Yes, Delete Forever"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <style jsx>{`
        /* ================================================================
           PORTAL CRM PROFILE — WARM PREMIUM ERP THEME
           ================================================================ */
        .portal-crm-page {
          display: grid;
          gap: 1.25rem;
          font-family: var(--portal-backend-font, 'Inter', -apple-system, sans-serif);
        }

        /* ── HERO / PROFILE SUMMARY CARD ── */
        .portal-crm-hero {
          display: flex;
          justify-content: space-between;
          gap: 1.5rem;
          flex-wrap: wrap;
          padding: 1.75rem 2rem;
          border: 1px solid rgba(168,162,158,0.2);
          border-radius: 20px;
          background: linear-gradient(180deg, #ffffff 0%, #faf8f5 100%);
          box-shadow: 0 2px 12px rgba(0,0,0,0.04);
        }
        .portal-crm-hero-left {
          display: flex;
          gap: 1.25rem;
          align-items: flex-start;
        }
        .portal-crm-avatar {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: linear-gradient(135deg, #e8f0de 0%, #d4e4c8 100%);
          color: #3d6b4f;
          font-size: 1.5rem;
          font-weight: 800;
          flex-shrink: 0;
          border: 2px solid rgba(74,124,89,0.15);
        }
        .portal-crm-hero-main {
          min-width: 0;
        }
        .portal-crm-hero-right {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          align-items: flex-end;
        }
        .portal-crm-badge {
          color: #78716c;
          font-size: 0.8rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 0.25rem;
        }
        .portal-crm-hero h1 {
          margin: 0;
          font-size: 1.85rem;
          line-height: 1.15;
          color: #292524;
          font-weight: 800;
        }
        .portal-crm-subtitle {
          margin: 0.3rem 0 0;
          color: #78716c;
          font-size: 0.95rem;
        }
        .portal-crm-overview {
          display: flex;
          flex-wrap: wrap;
          gap: 1.25rem;
        }
        .portal-crm-overview span {
          display: block;
          color: #a8a29e;
          font-size: 0.72rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .portal-crm-overview strong,
        .portal-crm-overview :global(a) {
          display: block;
          color: #292524;
          font-size: 0.95rem;
          font-weight: 700;
          text-decoration: none;
          margin-top: 0.15rem;
        }
        .portal-crm-overview :global(a) {
          color: #3d6b4f;
        }
        .portal-crm-overview :global(a:hover) {
          text-decoration: underline;
        }

        /* ── ACTION BUTTONS ── */
        .portal-crm-hero-actions {
          display: flex;
          gap: 0.6rem;
          flex-wrap: wrap;
        }
        .portal-crm-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 38px;
          padding: 0.55rem 1.1rem;
          border-radius: 10px;
          border: 1px solid #4a7c59;
          background: #4a7c59;
          color: #fff;
          font-weight: 700;
          font-size: 0.85rem;
          text-decoration: none;
          transition: all 0.15s ease;
          white-space: nowrap;
        }
        .portal-crm-button:hover {
          background: #3d6b4f;
          border-color: #3d6b4f;
        }
        .portal-crm-button--ghost {
          background: transparent;
          color: #57534e;
          border-color: rgba(168,162,158,0.35);
        }
        .portal-crm-button--ghost:hover {
          background: rgba(232,240,222,0.3);
          color: #3d6b4f;
          border-color: #4a7c59;
        }
        .portal-crm-button--danger {
          background: #dc2626;
          border-color: #dc2626;
          color: #fff;
          cursor: pointer;
        }
        .portal-crm-button--danger:hover {
          background: #b91c1c;
          border-color: #b91c1c;
        }
        .portal-crm-button--danger:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* ── DELETE CONFIRM DIALOG ── */
        .portal-crm-delete-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.55);
          backdrop-filter: blur(3px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 1rem;
        }
        .portal-crm-delete-dialog {
          background: #fff;
          border-radius: 18px;
          padding: 2rem;
          max-width: 480px;
          width: 100%;
          box-shadow: 0 24px 64px rgba(0,0,0,0.18);
          border: 1px solid rgba(220,38,38,0.2);
        }
        .portal-crm-delete-dialog h2 {
          margin: 0 0 0.85rem;
          font-size: 1.25rem;
          font-weight: 800;
          color: #dc2626;
        }
        .portal-crm-delete-dialog p {
          margin: 0 0 0.85rem;
          color: #57534e;
          font-size: 0.92rem;
          line-height: 1.55;
        }
        .portal-crm-delete-hint {
          font-size: 0.88rem !important;
          color: #78716c !important;
        }
        .portal-crm-delete-input {
          width: 100%;
          padding: 0.65rem 0.85rem;
          border: 1.5px solid rgba(220,38,38,0.35);
          border-radius: 10px;
          font-size: 0.92rem;
          font-family: inherit;
          outline: none;
          margin-bottom: 0.75rem;
          background: #fff8f8;
          transition: border-color 0.15s;
          box-sizing: border-box;
        }
        .portal-crm-delete-input:focus {
          border-color: #dc2626;
          background: #fff;
        }
        .portal-crm-delete-error {
          color: #dc2626 !important;
          font-size: 0.85rem !important;
          margin-bottom: 0.75rem !important;
          font-weight: 600;
        }
        .portal-crm-delete-actions {
          display: flex;
          gap: 0.75rem;
          justify-content: flex-end;
          margin-top: 0.5rem;
        }

        /* ── NOTICE BAR ── */
        .portal-crm-notice {
          padding: 0.85rem 1.25rem;
          border: 1px solid rgba(168,162,158,0.2);
          border-radius: 14px;
          background: #faf8f5;
          color: #57534e;
          font-size: 0.9rem;
          box-shadow: 0 1px 4px rgba(0,0,0,0.02);
        }
        .portal-crm-notice strong {
          color: #292524;
        }

        /* ── STAT COUNTER CARDS ROW ── */
        .portal-crm-stats-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 0.85rem;
        }
        .portal-crm-stat-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.3rem;
          padding: 1.15rem 0.75rem;
          border: 1px solid rgba(168,162,158,0.18);
          border-radius: 16px;
          background: #ffffff;
          text-decoration: none;
          text-align: center;
          transition: all 0.18s ease;
          box-shadow: 0 1px 4px rgba(0,0,0,0.03);
        }
        .portal-crm-stat-card:hover {
          background: #faf8f5;
          border-color: rgba(74,124,89,0.3);
          box-shadow: 0 4px 16px rgba(74,124,89,0.08);
          transform: translateY(-1px);
        }
        .portal-crm-stat-icon {
          font-size: 1.35rem;
          line-height: 1;
        }
        .portal-crm-stat-count {
          font-size: 1.75rem;
          font-weight: 800;
          color: #292524;
          line-height: 1.1;
        }
        .portal-crm-stat-label {
          color: #78716c;
          font-size: 0.78rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        /* ── MAIN + SIDEBAR LAYOUT ── */
        .portal-crm-layout {
          display: grid;
          grid-template-columns: minmax(0, 2fr) minmax(280px, 0.9fr);
          gap: 1.25rem;
        }
        .portal-crm-main,
        .portal-crm-sidebar {
          display: grid;
          gap: 1.25rem;
          align-content: start;
          min-width: 0;
        }

        /* ── CARDS ── */
        .portal-crm-card {
          border: 1px solid rgba(168,162,158,0.2);
          border-radius: 18px;
          background: #ffffff;
          box-shadow: 0 2px 12px rgba(0,0,0,0.04);
          padding: 1.5rem;
          min-width: 0;
          overflow-wrap: break-word;
        }
        .portal-crm-card header h2 {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 700;
          color: #292524;
          letter-spacing: -0.01em;
        }

        /* ── TABS ── */
        .portal-crm-tabs {
          display: flex;
          gap: 0.25rem;
          flex-wrap: wrap;
          padding-bottom: 1rem;
          border-bottom: 1px solid rgba(168,162,158,0.2);
          margin-bottom: 1rem;
        }
        .portal-crm-tabs button {
          border: 0;
          background: transparent;
          color: #78716c;
          font: inherit;
          font-size: 0.88rem;
          font-weight: 600;
          padding: 0.45rem 0.85rem;
          border-radius: 8px;
          border-bottom: 2px solid transparent;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .portal-crm-tabs button:hover {
          background: rgba(232,240,222,0.3);
          color: #3d6b4f;
        }
        .portal-crm-tabs button.is-active {
          color: #3d6b4f;
          background: rgba(232,240,222,0.4);
          border-bottom-color: #4a7c59;
        }

        /* ── DETAILS GRID ── */
        .portal-crm-details-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0 2rem;
        }
        .portal-crm-details-column {
          display: grid;
          gap: 0;
          align-content: start;
        }
        .portal-crm-detail-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 1rem;
          padding: 0.65rem 0;
          border-bottom: 1px solid rgba(168,162,158,0.12);
        }
        .portal-crm-detail-row span {
          color: #78716c;
          font-size: 0.88rem;
          flex-shrink: 0;
        }
        .portal-crm-detail-row strong {
          color: #292524;
          font-size: 0.92rem;
          font-weight: 600;
          text-align: right;
        }
        .portal-crm-detail-row :global(a) {
          color: #3d6b4f;
          font-size: 0.92rem;
          font-weight: 600;
          text-decoration: none;
          text-align: right;
        }
        .portal-crm-detail-row :global(a:hover) {
          text-decoration: underline;
        }

        /* ── TABLE ── */
        .portal-crm-tab-table-wrap {
          overflow-x: auto;
        }
        .portal-crm-tab-table {
          width: 100%;
          min-width: 780px;
          border-collapse: collapse;
        }
        .portal-crm-tab-table th,
        .portal-crm-tab-table td {
          padding: 0.75rem 0.85rem;
          border-bottom: 1px solid rgba(168,162,158,0.12);
          text-align: left;
          vertical-align: top;
        }
        .portal-crm-tab-table th {
          color: #a8a29e;
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          white-space: nowrap;
          background: transparent;
          border-bottom-color: rgba(168,162,158,0.25);
        }
        .portal-crm-tab-table td {
          color: #292524;
          font-size: 0.9rem;
        }
        .portal-crm-tab-table :global(a) {
          color: #3d6b4f;
          font-weight: 600;
          text-decoration: none;
        }
        .portal-crm-tab-table :global(a:hover) {
          text-decoration: underline;
        }
        .portal-crm-tab-table .is-muted {
          color: #a8a29e;
        }

        /* ── ACTIVITY LIST ── */
        .portal-crm-activity-list {
          display: grid;
          gap: 0.75rem;
        }
        .portal-crm-activity-item {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          padding: 1rem 1.15rem;
          border: 1px solid rgba(168,162,158,0.15);
          border-radius: 14px;
          background: #faf8f5;
          transition: border-color 0.15s ease;
        }
        .portal-crm-activity-item:hover {
          border-color: rgba(74,124,89,0.25);
        }
        .portal-crm-activity-item strong,
        .portal-crm-activity-item :global(a) {
          color: #292524;
          font-size: 0.95rem;
          font-weight: 700;
          text-decoration: none;
        }
        .portal-crm-activity-item :global(a) {
          color: #3d6b4f;
        }
        .portal-crm-activity-item :global(a:hover) {
          text-decoration: underline;
        }
        .portal-crm-activity-item p {
          margin: 0.2rem 0 0;
          color: #78716c;
          font-size: 0.88rem;
        }
        .portal-crm-activity-item > div:last-child {
          text-align: right;
          min-width: 160px;
          flex-shrink: 0;
        }
        .portal-crm-activity-item span,
        .portal-crm-activity-item small,
        .portal-crm-activity-item i {
          display: block;
          color: #a8a29e;
          font-size: 0.82rem;
          font-style: normal;
        }

        /* ── EMPTY STATE ── */
        .portal-crm-empty {
          color: #a8a29e;
          padding: 1.5rem 0;
          text-align: center;
          font-size: 0.92rem;
        }

        /* ── SIDEBAR ── */
        .portal-crm-sidebar-list {
          display: grid;
          gap: 0;
          margin-top: 0.75rem;
        }

        /* ── RESPONSIVE ── */
        @media (max-width: 1024px) {
          .portal-crm-layout {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 768px) {
          .portal-crm-hero {
            flex-direction: column;
            padding: 1.25rem;
          }
          .portal-crm-hero-right {
            align-items: flex-start;
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
        @media (max-width: 480px) {
          .portal-crm-hero-actions {
            flex-direction: column;
            width: 100%;
          }
          .portal-crm-hero-actions .portal-crm-button {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
