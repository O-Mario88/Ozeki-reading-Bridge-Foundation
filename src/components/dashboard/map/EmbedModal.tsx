"use client";

import { useMemo, useState } from "react";
import type { PublicImpactAggregate } from "@/lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
  payload: PublicImpactAggregate;
  period: string;
};

type EmbedVariant = "scorecard" | "kpis" | "funnel";

export function EmbedModal({ open, onClose, payload, period }: Props) {
  const [variant, setVariant] = useState<EmbedVariant>("scorecard");
  const [copied, setCopied] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const { level, id } = payload.scope;

  const embedUrl = useMemo(() => {
    const params = new URLSearchParams({ variant, period });
    return `${origin}/embed/${encodeURIComponent(level)}/${encodeURIComponent(id)}?${params.toString()}`;
  }, [origin, level, id, variant, period]);

  const iframeCode = `<iframe src="${embedUrl}" width="100%" height="480" frameborder="0" loading="lazy" style="border:1px solid #e5e7eb;border-radius:12px;"></iframe>`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(iframeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="embed-modal-title"
      className="impact-modal-backdrop"
      onClick={onClose}
    >
      <div
        className="impact-modal-panel card"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="impact-modal-header">
          <h3 id="embed-modal-title">Embed this dashboard</h3>
          <button
            type="button"
            className="impact-modal-close"
            onClick={onClose}
            aria-label="Close embed dialog"
          >
            ×
          </button>
        </header>
        <p className="text-gray-600">
          Share a live scorecard for <strong>{payload.scope.name}</strong> in
          reports, donor pages, or partner sites. The embed always reflects the
          latest published data.
        </p>
        <div className="impact-embed-variants">
          {(["scorecard", "kpis", "funnel"] as EmbedVariant[]).map((v) => (
            <button
              key={v}
              type="button"
              className={variant === v ? "active" : ""}
              onClick={() => setVariant(v)}
            >
              {v === "scorecard" && "Scorecard (6 KPIs)"}
              {v === "kpis" && "KPI strip (18 KPIs)"}
              {v === "funnel" && "Implementation funnel"}
            </button>
          ))}
        </div>
        <label className="impact-embed-label">
          <span>Preview URL</span>
          <input type="text" readOnly value={embedUrl} onFocus={(e) => e.currentTarget.select()} />
        </label>
        <label className="impact-embed-label">
          <span>Embed code</span>
          <textarea readOnly value={iframeCode} rows={3} onFocus={(e) => e.currentTarget.select()} />
        </label>
        <div className="impact-embed-preview">
          <iframe
            src={embedUrl}
            title={`Live scorecard for ${payload.scope.name}`}
            width="100%"
            height="420"
            frameBorder={0}
            style={{ border: "1px solid #e5e7eb", borderRadius: 12 }}
          />
        </div>
        <footer className="impact-modal-footer">
          <button type="button" className="impact-toolbar-btn" onClick={handleCopy}>
            {copied ? "✓ Copied" : "Copy embed code"}
          </button>
          <a
            href={embedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="impact-toolbar-btn"
          >
            Open preview
          </a>
        </footer>
      </div>
    </div>
  );
}
