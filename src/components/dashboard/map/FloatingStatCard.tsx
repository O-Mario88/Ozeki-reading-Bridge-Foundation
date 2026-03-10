"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

export type FloatingMetric = {
  label: string;
  value: string;
  helper?: string;
};

type FloatingStatCardProps = {
  open: boolean;
  pinned: boolean;
  title: string;
  chip: string;
  periodLabel: string;
  lastUpdatedFriendly: string;
  position: { left: number; top: number } | null;
  metrics: FloatingMetric[];
  profileHref?: string;
  dataCompleteness?: "Complete" | "Partial";
  onClearSelection?: () => void;
  onSizeChange?: (size: { width: number; height: number }) => void;
};

export function FloatingStatCard({
  open,
  pinned,
  title,
  chip,
  periodLabel,
  lastUpdatedFriendly,
  position,
  metrics,
  profileHref,
  dataCompleteness,
  onClearSelection,
  onSizeChange,
}: FloatingStatCardProps) {
  const show = open && position;
  const cardRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!onSizeChange || !cardRef.current) {
      return;
    }
    const node = cardRef.current;
    const reportSize = () => {
      const rect = node.getBoundingClientRect();
      onSizeChange({
        width: rect.width,
        height: rect.height,
      });
    };
    reportSize();

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => {
      reportSize();
    });
    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [onSizeChange]);

  return (
    <aside
      ref={cardRef}
      className="impact-map-floating-card"
      style={{
        left: position?.left ?? 0,
        top: position?.top ?? 0,
      }}
      data-open={show ? "" : undefined}
      data-pinned={pinned ? "" : undefined}
      aria-live="polite"
    >
      <header className="impact-map-floating-card-header">
        <div>
          <p className="impact-map-floating-card-title">{title}</p>
          <p className="impact-map-floating-card-chip">{chip}</p>
        </div>
        {pinned ? <span className="impact-map-floating-card-pinned">Pinned</span> : null}
      </header>

      {dataCompleteness === "Partial" ? (
        <p className="impact-map-floating-card-partial" title="Some data fields are missing for this area and period.">
          Partial data
        </p>
      ) : null}

      <ul className="impact-map-floating-card-list">
        {metrics.map((metric) => (
          <li key={`${title}-${metric.label}`}>
            <span>
              {metric.label}
              {metric.helper ? <small>{metric.helper}</small> : null}
            </span>
            <strong>{metric.value}</strong>
          </li>
        ))}
      </ul>

      <footer className="impact-map-floating-card-footer">
        <p>Period: {periodLabel}</p>
        <p>Last updated: {lastUpdatedFriendly}</p>
        {profileHref ? (
          <Link href={profileHref} className="inline-download-link">
            View profile →
          </Link>
        ) : null}
        {pinned && onClearSelection ? (
          <button type="button" className="impact-map-clear-btn" onClick={onClearSelection}>
            Clear selection
          </button>
        ) : null}
      </footer>
    </aside>
  );
}
