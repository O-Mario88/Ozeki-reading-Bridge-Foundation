"use server";

import { queryPostgres } from "@/lib/server/postgres/client";

export async function getCountries() {
  const res = await queryPostgres("SELECT id, name, iso_code as isoCode FROM geo_countries ORDER BY name");
  return res.rows;
}

export async function getRegions(countryId?: number) {
  if (!countryId) return [];
  const res = await queryPostgres("SELECT id, name, country_id as countryId FROM geo_regions WHERE country_id = $1 ORDER BY name", [countryId]);
  return res.rows;
}

export async function getSubRegions(regionId?: number) {
  if (!regionId) return [];
  const res = await queryPostgres("SELECT id, name, region_id as regionId FROM geo_subregions WHERE region_id = $1 ORDER BY name", [regionId]);
  return res.rows;
}

export async function getDistricts(subRegionId?: number) {
  if (!subRegionId) return [];
  const res = await queryPostgres("SELECT id, name, subregion_id as subRegionId FROM geo_districts WHERE subregion_id = $1 ORDER BY name", [subRegionId]);
  return res.rows;
}

export async function getParishes(districtId?: number) {
  if (!districtId) return [];
  const res = await queryPostgres("SELECT id, name, district_id_direct as districtId FROM geo_parishes WHERE district_id_direct = $1 ORDER BY name", [districtId]);
  return res.rows;
}

export async function getSchoolsByParish(parishId?: number) {
  if (!parishId) return [];
  const res = await queryPostgres("SELECT id, name, parish_id as parishId FROM schools_directory WHERE parish_id = $1 ORDER BY name", [parishId]);
  return res.rows;
}
