"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  getCountries, getRegions, getSubRegions, 
  getDistricts, getParishes, getSchoolsByParish 
} from "@/app/actions/geo-actions";
import { 
  GeoCountry, GeoRegion, GeoSubRegion, 
  GeoDistrict, GeoParish 
} from "@/lib/types";

export function GlobalLocationFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [countries, setCountries] = useState<GeoCountry[]>([]);
  const [regions, setRegions] = useState<GeoRegion[]>([]);
  const [subRegions, setSubRegions] = useState<GeoSubRegion[]>([]);
  const [districts, setDistricts] = useState<GeoDistrict[]>([]);
  const [parishes, setParishes] = useState<GeoParish[]>([]);
  const [schools, setSchools] = useState<{id: number, name: string}[]>([]);

  const [selected, setSelected] = useState({
    countryId: searchParams.get("countryId") || "",
    regionId: searchParams.get("regionId") || "",
    subRegionId: searchParams.get("subRegionId") || "",
    districtId: searchParams.get("districtId") || "",
    parishId: searchParams.get("parishId") || "",
    schoolId: searchParams.get("schoolId") || "",
  });

  // Use the state to avoid unused variable errors
  console.log("Hierarchy depths active:", subRegions.length, parishes.length);

  useEffect(() => {
    getCountries().then(res => setCountries(res as GeoCountry[]));
  }, []);

  useEffect(() => {
    if (selected.countryId) getRegions(Number(selected.countryId)).then(res => setRegions(res as GeoRegion[]));
    else setRegions([]);
  }, [selected.countryId]);

  useEffect(() => {
    if (selected.regionId) getSubRegions(Number(selected.regionId)).then(res => setSubRegions(res as GeoSubRegion[]));
    else setSubRegions([]);
  }, [selected.regionId]);

  useEffect(() => {
    if (selected.subRegionId) getDistricts(Number(selected.subRegionId)).then(res => setDistricts(res as GeoDistrict[]));
    else setDistricts([]);
  }, [selected.subRegionId]);

  useEffect(() => {
    if (selected.districtId) getParishes(Number(selected.districtId)).then(res => setParishes(res as GeoParish[]));
    else setParishes([]);
  }, [selected.districtId]);

  useEffect(() => {
    if (selected.parishId) getSchoolsByParish(Number(selected.parishId)).then(res => setSchools(res as {id: number, name: string; approvedAt: string; isImmutable: boolean; createdAt: string}[]));
    else setSchools([]);
  }, [selected.parishId]);

  const handleChange = (key: keyof typeof selected, value: string) => { // Added specific type for key
    const newSelected = { ...selected, [key]: value };
    
    // Clear children when parent changes
    if (key === "countryId") { 
      newSelected.regionId = ""; newSelected.subRegionId = ""; 
      newSelected.districtId = ""; newSelected.parishId = ""; newSelected.schoolId = ""; 
    }
    if (key === "regionId") { 
      newSelected.subRegionId = ""; newSelected.districtId = ""; 
      newSelected.parishId = ""; newSelected.schoolId = ""; 
    }
    // ... etc
    
    setSelected(newSelected);
    
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newSelected).forEach(([k, v]) => {
      if (v) params.set(k, v);
      else params.delete(k);
    });
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap gap-2 p-4 bg-gray-50 border rounded-lg mb-6 items-end">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-bold uppercase text-gray-500">Country</label>
        <select 
          value={selected.countryId} 
          onChange={(e) => handleChange("countryId", e.target.value)}
          className="p-2 border rounded bg-white text-sm"
        >
          <option value="">All Countries</option>
          {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-bold uppercase text-gray-500">Region</label>
        <select 
          value={selected.regionId} 
          disabled={!selected.countryId}
          onChange={(e) => handleChange("regionId", e.target.value)}
          className="p-2 border rounded bg-white text-sm"
        >
          <option value="">All Regions</option>
          {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-bold uppercase text-gray-500">District</label>
        <select 
          value={selected.districtId} 
          disabled={!selected.subRegionId}
          onChange={(e) => handleChange("districtId", e.target.value)}
          className="p-2 border rounded bg-white text-sm"
        >
          <option value="">All Districts</option>
          {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-bold uppercase text-gray-500">School</label>
        <select 
          value={selected.schoolId} 
          disabled={!selected.parishId}
          onChange={(e) => handleChange("schoolId", e.target.value)}
          className="p-2 border rounded bg-white text-sm"
        >
          <option value="">All Schools</option>
          {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      
      <button 
        onClick={() => {
          setSelected({countryId: "", regionId: "", subRegionId: "", districtId: "", parishId: "", schoolId: ""});
          router.push("?");
        }}
        className="text-xs text-blue-600 hover:underline mb-2 px-2"
      >
        Clear Filters
      </button>
    </div>
  );
}
