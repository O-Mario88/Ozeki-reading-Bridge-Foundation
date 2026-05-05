"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

/**
 * Tall square-ish wrapper for the Uganda map. The screenshot mandates a
 * generous, near-square map canvas so Uganda doesn't look vertically
 * compressed. We:
 *   * mount the existing UgandaImpactMapPro for its choropleth + region
 *     interactivity, but
 *   * hide its built-in chrome (header / breadcrumb / hover toggles)
 *     via scoped CSS so OUR outer panel can supply the title + mode
 *     tabs that match the reference exactly.
 */

type MapSelection = {
  region: string;
  subRegion: string;
  district: string;
  school?: string;
};

const UgandaImpactMapPro = dynamic(
  () => import("@/components/dashboard/map/UgandaImpactMapPro").then((m) => m.UgandaImpactMapPro),
  {
    ssr: false,
    loading: () => (
      <div className="grid place-items-center" style={{ minHeight: 520 }}>
        <p style={{ fontSize: 12, color: "#94a3b8" }}>Loading map…</p>
      </div>
    ),
  },
);

export function LiveMapEmbed({ periodLabel = "FY 2024/2025" }: { periodLabel?: string }) {
  const [selection, setSelection] = useState<MapSelection>({
    region: "",
    subRegion: "",
    district: "",
    school: "",
  });

  return (
    <div className="orbf-map-canvas">
      <UgandaImpactMapPro
        periodLabel={periodLabel}
        selection={selection}
        onSelectionChange={setSelection}
      />
      <style jsx global>{`
        .orbf-map-canvas {
          position: relative;
          width: 100%;
          /* Square-ish: canvas height tracks width, capped so the map stays
             a sensible centerpiece on tall screens. */
          aspect-ratio: 1 / 1;
          min-height: 520px;
          max-height: 720px;
          overflow: hidden;
        }
        .orbf-map-canvas .impact-map-card {
          height: 100%;
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
          margin: 0 !important;
          border-radius: 0 !important;
        }
        /* Strip the inner card's chrome — our outer panel supplies the
           title, mode tabs, search, and zoom buttons that match the
           reference screenshot. */
        .orbf-map-canvas .impact-map-card > .impact-map-card-header,
        .orbf-map-canvas .impact-map-card > .impact-map-controls-row,
        .orbf-map-canvas .impact-map-card > .impact-map-breadcrumb-row {
          display: none !important;
        }
        .orbf-map-canvas .impact-map-card--compact {
          aspect-ratio: 1 / 1;
        }
      `}</style>
    </div>
  );
}
