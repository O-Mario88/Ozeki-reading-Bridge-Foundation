"use client";

import { UGANDA_MAP_SUB_REGIONS } from "@/lib/uganda-map-taxonomy";

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
  navigatorSchools: Array<{
    id: number;
    name: string;
    district: string;
    subRegion: string;
    region: string;
  }>;
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
  navigatorSchools,
  onSelectionChange,
  onReset,
  onBack,
}: LocationNavigatorProps) {
  const regionOptions = [
    ...new Set([
      ...UGANDA_MAP_SUB_REGIONS.map((entry) => entry.region),
      ...navigatorSchools.map((school) => school.region),
      selection.region,
    ]),
  ]
    .filter((value) => value.trim().length > 0)
    .sort((left, right) => left.localeCompare(right));

  const schoolsByRegion = navigatorSchools.reduce<Record<string, number>>((acc, school) => {
    const key = school.region?.trim();
    if (!key) {
      return acc;
    }
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const schoolsForRegion = selection.region
    ? navigatorSchools.filter((school) => school.region === selection.region)
    : navigatorSchools;
  const subRegionOptions = [
    ...new Set([
      ...UGANDA_MAP_SUB_REGIONS
        .filter((entry) => !selection.region || entry.region === selection.region)
        .map((entry) => entry.subRegion),
      ...schoolsForRegion.map((school) => school.subRegion),
      selection.subRegion,
    ]),
  ]
    .filter((value) => value.trim().length > 0)
    .sort((left, right) => left.localeCompare(right));

  const schoolsBySubRegion = schoolsForRegion.reduce<Record<string, number>>((acc, school) => {
    const key = school.subRegion?.trim();
    if (!key) {
      return acc;
    }
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const schoolsForSubRegion = selection.subRegion
    ? schoolsForRegion.filter((school) => school.subRegion === selection.subRegion)
    : schoolsForRegion;
  const districtOptions = [
    ...new Set([
      ...UGANDA_MAP_SUB_REGIONS
        .filter((entry) => !selection.region || entry.region === selection.region)
        .filter((entry) => !selection.subRegion || entry.subRegion === selection.subRegion)
        .flatMap((entry) => entry.districts),
      ...schoolsForSubRegion.map((school) => school.district),
      selection.district,
    ]),
  ]
    .filter((value) => value.trim().length > 0)
    .sort((left, right) => left.localeCompare(right));

  const schoolsByDistrict = schoolsForSubRegion.reduce<Record<string, number>>((acc, school) => {
    const key = school.district?.trim();
    if (!key) {
      return acc;
    }
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const schoolsForDistrict = selection.district
    ? schoolsForSubRegion.filter((school) => school.district === selection.district)
    : schoolsForSubRegion;
  const schoolOptions = [...schoolsForDistrict]
    .filter((school) => Number.isFinite(school.id) && school.id > 0)
    .sort((left, right) => left.name.localeCompare(right.name));

  return (
    <aside className="location-navigator">
      <header>
        <h3>Location Navigator</h3>
        <p>Drill down: Region → Sub-region → District → School.</p>
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
                {option} ({(schoolsByRegion[option] ?? 0).toLocaleString()} schools)
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
                {option} ({(schoolsBySubRegion[option] ?? 0).toLocaleString()} schools)
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
                {option} ({(schoolsByDistrict[option] ?? 0).toLocaleString()} schools)
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
