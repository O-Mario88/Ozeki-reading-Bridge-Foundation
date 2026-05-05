"use client";

import { useState } from "react";
import { Plus, Minus, Maximize2, Crosshair } from "lucide-react";

const TEAL = "#066a67";
const TEAL_DEEP = "#033f3e";
const ORANGE = "#ff7235";
const SURFACE = "#ffffff";
const BORDER = "#e7ecf3";
const TEXT = "#0f172a";

/**
 * Map mode tabs (District / Sub-region · Coverage / Improvement / Fidelity).
 * Two pill groups in one component. State is local — clicking changes the
 * highlighted tab and dispatches a CustomEvent so the inner UgandaImpactMapPro
 * (or any other listener) can react. Today the inner map drives its own data;
 * this component at least makes the controls feel alive and is the seam to
 * wire real choropleth metric switching when wanted.
 */
export function CoverageMapModeTabs() {
  const [level, setLevel] = useState<"District" | "Sub-region">("District");
  const [mode, setMode] = useState<"Coverage" | "Improvement" | "Fidelity">("Coverage");

  const dispatch = (key: "level" | "mode", value: string) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("orbf-map-mode", { detail: { key, value } }));
    }
  };

  return (
    <div className="flex items-center gap-2">
      <SegmentedTabs
        options={["District", "Sub-region"]}
        active={level}
        variant="dark"
        onChange={(v) => { setLevel(v as typeof level); dispatch("level", v); }}
      />
      <SegmentedTabs
        options={["Coverage", "Improvement", "Fidelity"]}
        active={mode}
        variant="orange"
        onChange={(v) => { setMode(v as typeof mode); dispatch("mode", v); }}
      />
    </div>
  );
}

function SegmentedTabs({
  options,
  active,
  variant,
  onChange,
}: {
  options: string[];
  active: string;
  variant: "dark" | "orange";
  onChange: (value: string) => void;
}) {
  return (
    <div
      className="inline-flex items-center"
      style={{
        background: variant === "dark" ? TEAL_DEEP : "rgba(255,114,53,0.08)",
        padding: 3,
        borderRadius: 999,
        gap: 2,
      }}
    >
      {options.map((label) => {
        const isActive = label === active;
        const inactiveColor = variant === "dark" ? "rgba(255,255,255,0.7)" : ORANGE;
        return (
          <button
            key={label}
            type="button"
            onClick={() => onChange(label)}
            className="px-3 py-1 text-[11px] font-bold transition"
            style={{
              borderRadius: 999,
              background: isActive ? (variant === "dark" ? "#fff" : ORANGE) : "transparent",
              color: isActive ? (variant === "dark" ? TEAL_DEEP : "#fff") : inactiveColor,
              cursor: "pointer",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Zoom + recentre + fit-to-bounds buttons. They drive the map via the same
 * orbf-map-control CustomEvent contract. Inner map can listen on window for
 * `orbf-map-control` events with detail.action ∈ {zoom-in, zoom-out, fit, recentre}.
 */
export function CoverageMapZoomControls() {
  const dispatch = (action: "zoom-in" | "zoom-out" | "fit" | "recentre") => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("orbf-map-control", { detail: { action } }));
    }
  };

  return (
    <div className="flex items-center gap-1">
      <ZoomBtn onClick={() => dispatch("zoom-in")} aria="Zoom in"><Plus className="h-3.5 w-3.5" /></ZoomBtn>
      <ZoomBtn onClick={() => dispatch("zoom-out")} aria="Zoom out"><Minus className="h-3.5 w-3.5" /></ZoomBtn>
      <ZoomBtn onClick={() => dispatch("fit")} aria="Fit to viewport"><Maximize2 className="h-3.5 w-3.5" /></ZoomBtn>
      <ZoomBtn onClick={() => dispatch("recentre")} aria="Recentre"><Crosshair className="h-3.5 w-3.5" /></ZoomBtn>
    </div>
  );
}

function ZoomBtn({ children, onClick, aria }: { children: React.ReactNode; onClick: () => void; aria: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={aria}
      title={aria}
      className="inline-flex items-center justify-center transition hover:bg-gray-50 active:scale-95"
      style={{
        width: 30,
        height: 30,
        background: SURFACE,
        border: `1px solid ${BORDER}`,
        borderRadius: 8,
        color: TEXT,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

export { TEAL, ORANGE };
