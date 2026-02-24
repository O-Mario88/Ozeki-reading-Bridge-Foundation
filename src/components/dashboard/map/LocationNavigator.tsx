"use client";

import { getMapSubRegionsByRegion, getDistrictsByMapSubRegion, UGANDA_MAP_SUB_REGIONS } from "@/lib/uganda-map-taxonomy";
import { ugandaRegions } from "@/lib/uganda-locations";

export type PublicMapSelection = {
  region: string;
  subRegion: string;
  district: string;
  school: string;
};

type LocationNavigatorProps = {
  period: string;
  onPeriodChange: (next: string) => void;
  selection: PublicMapSelection;
  schoolOptions: Array<{ id: number; name: string }>;
  onSelectionChange: (next: PublicMapSelection) => void;
  onReset: () => void;
  onBack: () => void;
};

const PERIOD_OPTIONS = [
  { value: "FY", label: "FY" },
  { value: "TERM", label: "Term" },
  { value: "QTR", label: "Quarter" },
];

export function LocationNavigator({
  period,
  onPeriodChange,
  selection,
  schoolOptions,
  onSelectionChange,
  onReset,
  onBack,
}: LocationNavigatorProps) {
  const regionOptions = ugandaRegions.map((entry) => entry.region);
  const subRegionOptions =
    selection.region.length > 0
      ? getMapSubRegionsByRegion(selection.region).map((entry) => entry.subRegion)
      : UGANDA_MAP_SUB_REGIONS.map((entry) => entry.subRegion);

  const districtOptions =
    selection.subRegion.length > 0
      ? getDistrictsByMapSubRegion(selection.subRegion)
      : selection.region.length > 0
        ? getMapSubRegionsByRegion(selection.region).flatMap((entry) => entry.districts)
        : UGANDA_MAP_SUB_REGIONS.flatMap((entry) => entry.districts);

  return (
    <aside className="location-navigator">
      <header>
        <h3>Location Navigator</h3>
        <p>Drill down from Uganda to district and school.</p>
      </header>

      <div>
        <label>
          <span>Period</span>
          <select value={period} onChange={(event) => onPeriodChange(event.target.value)}>
            {PERIOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Region</span>
          <select
            value={selection.region}
            onChange={(event) =>
              onSelectionChange({
                region: event.target.value,
                subRegion: "",
                district: "",
                school: "",
              })
            }
          >
            <option value="">All regions</option>
            {regionOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Sub-region</span>
          <select
            value={selection.subRegion}
            onChange={(event) =>
              onSelectionChange({
                ...selection,
                subRegion: event.target.value,
                district: "",
                school: "",
              })
            }
          >
            <option value="">All sub-regions</option>
            {subRegionOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>District</span>
          <select
            value={selection.district}
            onChange={(event) =>
              onSelectionChange({
                ...selection,
                district: event.target.value,
                school: "",
              })
            }
          >
            <option value="">All districts</option>
            {[...new Set(districtOptions)].sort((a, b) => a.localeCompare(b)).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>School</span>
          <select
            value={selection.school}
            onChange={(event) =>
              onSelectionChange({
                ...selection,
                school: event.target.value,
              })
            }
          >
            <option value="">All schools</option>
            {schoolOptions.map((school) => (
              <option key={school.id} value={String(school.id)}>
                {school.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="location-navigator-actions">
        <button type="button" className="button button-ghost" onClick={onBack}>
          Back to Previous Level
        </button>
        <button type="button" className="button" onClick={onReset}>
          Reset Navigation
        </button>
      </div>
    </aside>
  );
}
