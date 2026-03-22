"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

type GeoOption = { id: string; name: string };
type SchoolOption = { id: number; name: string; district: string };

type ImpactReportFiltersProps = {
  initialYear: string;
  initialReportType: string;
  initialReportCategory: string;
  initialPeriodType: string;
  initialOutput: string;
  initialRegion: string;
  initialSubRegion: string;
  initialDistrict: string;
  initialSchoolId: string;
  reportTypes: string[];
  reportCategories: string[];
  periodTypes: string[];
  outputs: string[];
  period?: string;
};

const START_YEAR = 2025;
const END_YEAR = 2050;

function yearValues() {
  const years: string[] = [];
  for (let year = START_YEAR; year <= END_YEAR; year += 1) {
    years.push(String(year));
  }
  return years;
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export function ImpactReportFilters({
  initialYear,
  initialReportType,
  initialReportCategory,
  initialPeriodType,
  initialOutput,
  initialRegion,
  initialSubRegion,
  initialDistrict,
  initialSchoolId,
  reportTypes,
  reportCategories,
  periodTypes,
  outputs,
  period,
}: ImpactReportFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [year, setYear] = useState(initialYear);
  const [reportType, setReportType] = useState(initialReportType);
  const [reportCategory, setReportCategory] = useState(initialReportCategory);
  const [periodType, setPeriodType] = useState(initialPeriodType || "This Fiscal Year");
  const [output, setOutput] = useState(initialOutput || "PDF");
  const [region, setRegion] = useState(initialRegion);
  const [subRegion, setSubRegion] = useState(initialSubRegion);
  const [district, setDistrict] = useState(initialDistrict);
  const [schoolId, setSchoolId] = useState(initialSchoolId);

  const [regions, setRegions] = useState<GeoOption[]>([]);
  const [subRegions, setSubRegions] = useState<GeoOption[]>([]);
  const [districts, setDistricts] = useState<GeoOption[]>([]);
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [loadingGeo, setLoadingGeo] = useState(false);

  const years = useMemo(() => yearValues(), []);

  // Keep local form controls in sync with URL-driven server props.
  useEffect(() => {
    setYear(initialYear);
    setReportType(initialReportType);
    setReportCategory(initialReportCategory);
    setPeriodType("This Fiscal Year");
    setOutput(initialOutput || "PDF");
    setRegion(initialRegion);
    setSubRegion(initialSubRegion);
    setDistrict(initialDistrict);
    setSchoolId(initialSchoolId);
  }, [
    initialDistrict,
    initialOutput,
    initialPeriodType,
    initialRegion,
    initialReportCategory,
    initialReportType,
    initialSchoolId,
    initialSubRegion,
    initialYear,
  ]);

  const selectedRegionOption = useMemo(
    () =>
      ((Array.isArray(regions) ? regions : [])).find(
        (item) => normalize(item.name) === normalize(region) || normalize(item.id) === normalize(region),
      ) ?? null,
    [regions, region],
  );
  const selectedSubRegionOption = useMemo(
    () =>
      ((Array.isArray(subRegions) ? subRegions : [])).find(
        (item) =>
          normalize(item.name) === normalize(subRegion) || normalize(item.id) === normalize(subRegion),
      ) ?? null,
    [subRegions, subRegion],
  );
  const selectedDistrictOption = useMemo(
    () =>
      ((Array.isArray(districts) ? districts : [])).find(
        (item) => normalize(item.name) === normalize(district) || normalize(item.id) === normalize(district),
      ) ?? null,
    [districts, district],
  );

  useEffect(() => {
    let active = true;
    async function fetchRegions() {
      setLoadingGeo(true);
      try {
        const response = await fetch(`/api/geo/regions?year=${encodeURIComponent(year)}`, {
          cache: "no-store",
        });
        const json = (await response.json()) as { regions?: GeoOption[] };
        if (!active) return;
        const nextRegions = Array.isArray(json.regions) ? json.regions : [];
        setRegions(nextRegions);
        if (region && !nextRegions.some((item) => normalize(item.name) === normalize(region))) {
          setRegion("");
          setSubRegion("");
          setDistrict("");
          setSchoolId("");
        }
      } finally {
        if (active) setLoadingGeo(false);
      }
    }
    fetchRegions();
    return () => {
      active = false;
    };
  }, [year, region]);

  useEffect(() => {
    if (!selectedRegionOption) {
      setSubRegions([]);
      setSubRegion("");
      setDistricts([]);
      setDistrict("");
      setSchools([]);
      setSchoolId("");
      return;
    }

    let active = true;
    const regionId = selectedRegionOption.id;
    async function fetchSubRegions() {
      const response = await fetch(
        `/api/geo/subregions?region_id=${encodeURIComponent(regionId)}&year=${encodeURIComponent(year)}`,
        { cache: "no-store" },
      );
      const json = (await response.json()) as { subregions?: GeoOption[] };
      if (!active) return;
      const nextSubRegions = Array.isArray(json.subregions) ? json.subregions : [];
      setSubRegions(nextSubRegions);
      if (
        subRegion &&
        !nextSubRegions.some((item) => normalize(item.name) === normalize(subRegion))
      ) {
        setSubRegion("");
        setDistrict("");
        setSchoolId("");
      }
    }
    fetchSubRegions();
    return () => {
      active = false;
    };
  }, [selectedRegionOption, subRegion, year]);

  useEffect(() => {
    if (!selectedSubRegionOption) {
      setDistricts([]);
      setDistrict("");
      setSchools([]);
      setSchoolId("");
      return;
    }

    let active = true;
    const subRegionId = selectedSubRegionOption.id;
    async function fetchDistricts() {
      const response = await fetch(
        `/api/geo/districts?subregion_id=${encodeURIComponent(subRegionId)}&year=${encodeURIComponent(year)}`,
        { cache: "no-store" },
      );
      const json = (await response.json()) as { districts?: GeoOption[] };
      if (!active) return;
      const nextDistricts = Array.isArray(json.districts) ? json.districts : [];
      setDistricts(nextDistricts);
      if (
        district &&
        !nextDistricts.some((item) => normalize(item.name) === normalize(district))
      ) {
        setDistrict("");
        setSchoolId("");
      }
    }
    fetchDistricts();
    return () => {
      active = false;
    };
  }, [selectedSubRegionOption, district, year]);

  useEffect(() => {
    if (!selectedDistrictOption) {
      setSchools([]);
      setSchoolId("");
      return;
    }

    let active = true;
    const districtId = selectedDistrictOption.id;
    async function fetchSchools() {
      const response = await fetch(
        `/api/geo/schools?district_id=${encodeURIComponent(districtId)}&year=${encodeURIComponent(year)}`,
        { cache: "no-store" },
      );
      const json = (await response.json()) as { schools?: SchoolOption[] };
      if (!active) return;
      const nextSchools = Array.isArray(json.schools) ? json.schools : [];
      setSchools(nextSchools);
      if (
        schoolId &&
        !nextSchools.some((item) => String(item.id) === String(schoolId))
      ) {
        setSchoolId("");
      }
    }
    fetchSchools();
    return () => {
      active = false;
    };
  }, [selectedDistrictOption, schoolId, year]);

  const scopeSummary = [
    region || "All regions",
    subRegion || "All sub-regions",
    district || "All districts",
    schoolId
      ? ((Array.isArray(schools) ? schools : [])).find((item) => String(item.id) === String(schoolId))?.name ?? "Selected school"
      : "All schools",
  ].join(" > ");

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = new URLSearchParams();
    if (period) query.set("period", period);
    if (year) query.set("year", year);
    if (reportType) query.set("reportType", reportType);
    if (reportCategory) query.set("reportCategory", reportCategory);
    if (periodType) query.set("periodType", periodType);
    if (output) query.set("output", output);
    if (region) query.set("region", region);
    if (subRegion) query.set("subRegion", subRegion);
    if (district) query.set("district", district);
    if (schoolId) query.set("schoolId", schoolId);
    router.push(`${pathname}?${query.toString()}#reports`);
  }

  function clearFilters() {
    const query = new URLSearchParams();
    if (period) query.set("period", period);
    query.set("year", initialYear);
    setYear(initialYear);
    setReportType("");
    setReportCategory("");
    setPeriodType("This Fiscal Year");
    setOutput("PDF");
    setRegion("");
    setSubRegion("");
    setDistrict("");
    setSchoolId("");
    router.push(`${pathname}?${query.toString()}#reports`);
  }

  return (
    <form onSubmit={applyFilters} className="filters impact-filter-grid">
      <label>
        <span>Year/FY</span>
        <select value={year} onChange={(event) => setYear(event.target.value)}>
          {(years ?? []).map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>Report Type</span>
        <select value={reportType} onChange={(event) => setReportType(event.target.value)}>
          <option value="">All report types</option>
          {(reportTypes ?? []).map((type) => (
            <option value={type} key={type}>
              {type}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>Report Category</span>
        <select value={reportCategory} onChange={(event) => setReportCategory(event.target.value)}>
          <option value="">All categories</option>
          {(reportCategories ?? []).map((category) => (
            <option value={category} key={category}>
              {category}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>Period Type</span>
        <select value={periodType} onChange={(event) => setPeriodType(event.target.value)}>
          {(periodTypes ?? []).map((type) => (
            <option value={type} key={type}>
              {type}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>Output</span>
        <select value={output} onChange={(event) => setOutput(event.target.value)}>
          {(outputs ?? []).map((type) => (
            <option value={type} key={type}>
              {type}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>Region</span>
        <select
          value={region}
          onChange={(event) => {
            setRegion(event.target.value);
            setSubRegion("");
            setDistrict("");
            setSchoolId("");
          }}
        >
          <option value="">All regions</option>
          {((Array.isArray(regions) ? regions : [])).map((item) => (
            <option value={item.name} key={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>Sub-region</span>
        <select
          value={subRegion}
          disabled={!region || loadingGeo}
          onChange={(event) => {
            setSubRegion(event.target.value);
            setDistrict("");
            setSchoolId("");
          }}
        >
          <option value="">All sub-regions</option>
          {((Array.isArray(subRegions) ? subRegions : [])).map((item) => (
            <option value={item.name} key={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>District</span>
        <select
          value={district}
          disabled={!subRegion || loadingGeo}
          onChange={(event) => {
            setDistrict(event.target.value);
            setSchoolId("");
          }}
        >
          <option value="">All districts</option>
          {((Array.isArray(districts) ? districts : [])).map((item) => (
            <option value={item.name} key={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>School</span>
        <select
          value={schoolId}
          disabled={!district || loadingGeo}
          onChange={(event) => setSchoolId(event.target.value)}
        >
          <option value="">All schools</option>
          {((Array.isArray(schools) ? schools : [])).map((item) => (
            <option value={String(item.id)} key={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>

      <p className="meta-line" style={{ gridColumn: "1 / -1", margin: 0 }}>
        Scope: {scopeSummary} • Year: {year}
      </p>

      <div className="action-row" style={{ gridColumn: "1 / -1" }}>
        <Button type="submit">
          Apply Filters
        </Button>
        <Button variant="secondary" type="button" onClick={clearFilters}>
          Clear
        </Button>
      </div>
    </form>
  );
}
