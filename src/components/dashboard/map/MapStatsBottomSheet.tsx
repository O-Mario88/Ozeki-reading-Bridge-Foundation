"use client";

import Link from "next/link";
import { FloatingMetric } from "./FloatingStatCard";

type MapStatsBottomSheetProps = {
  open: boolean;
  title: string;
  chip: string;
  metrics: FloatingMetric[];
  profileHref?: string;
  periodLabel: string;
  lastUpdatedFriendly: string;
  dataCompleteness?: "Complete" | "Partial";
  onClose: () => void;
  onClearSelection?: () => void;
};

export function MapStatsBottomSheet({
  open,
  title,
  chip,
  metrics,
  profileHref,
  periodLabel,
  lastUpdatedFriendly,
  dataCompleteness,
  onClose,
  onClearSelection,
}: MapStatsBottomSheetProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="impact-map-sheet-backdrop" role="dialog" aria-modal="true" aria-label={`${title} statistics`}>
      <div className="impact-map-sheet-panel">
        <button type="button" className="impact-map-sheet-close" onClick={onClose} aria-label="Close panel">
          ×
        </button>

        <header className="impact-map-sheet-header">
          <p className="impact-map-sheet-title">{title}</p>
          <p className="impact-map-sheet-chip">{chip}</p>
        </header>

        {dataCompleteness === "Partial" ? (
          <p className="impact-map-sheet-partial">Partial data</p>
        ) : null}

        <ul className="impact-map-sheet-list">
          {metrics.map((metric) => (
            <li key={`${title}-${metric.label}`}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </li>
          ))}
        </ul>

        <p className="impact-map-sheet-meta">Period: {periodLabel}</p>
        <p className="impact-map-sheet-meta">Last updated: {lastUpdatedFriendly}</p>

        <div className="impact-map-sheet-actions">
          {profileHref ? (
            <Link href={profileHref} className="button button-ghost">
              View profile →
            </Link>
          ) : null}
          {onClearSelection ? (
            <button type="button" className="button" onClick={onClearSelection}>
              Clear selection
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
