"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

/**
 * Thin wrapper that mounts ONLY the inner Uganda map component.
 *
 * The parent's `<PublicImpactMapExplorer />` is a full dashboard
 * explorer (renders KPIs, sidebar, At-Risk Radar, Learning Outcomes,
 * etc. on its own) — so dropping it inside our new dashboard caused
 * every section to render twice. This wrapper bypasses the explorer
 * shell and uses just the map component with minimal local state.
 */

type MapSelection = {
  region: string;
  subRegion: string;
  district: string;
  school: string;
};

const UgandaImpactMapPro = dynamic(
  () => import("@/components/dashboard/map/UgandaImpactMapPro").then((m) => m.UgandaImpactMapPro),
  {
    ssr: false,
    loading: () => (
      <div className="h-[420px] grid place-items-center bg-[#f8fafc]">
        <p className="text-[12px] text-gray-400">Loading map…</p>
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
    <UgandaImpactMapPro
      periodLabel={periodLabel}
      selection={selection}
      onSelectionChange={setSelection}
      compact
    />
  );
}
