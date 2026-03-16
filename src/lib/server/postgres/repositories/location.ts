import { LocationFilterState } from "@/lib/types";

/**
 * Standardized service for geographic filtering across all modules.
 * This service provides the SQL WHERE clause and parameters needed to filter
 * any table that contains a 'school_id' column based on the 6-level hierarchy.
 */
export function buildLocationFilters(
  filters: LocationFilterState,
  tableNameOrAlias: string = "s", // Assumed to be a table with 'school_id' or 'id' if schools table
  paramOffset: number = 1
) {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let currentParam = paramOffset;

  // If the target is NOT the schools table itself, we usually join with v_school_hierarchy
  // or use a subquery. For simplicity and performance, we'll assume the query
  // can join with v_school_hierarchy 'vh' on s.school_id = vh.school_id.

  if (filters.countryId) {
    conditions.push(`vh.country_id = $${currentParam++}`);
    params.push(filters.countryId);
  }
  if (filters.regionId) {
    conditions.push(`vh.region_id = $${currentParam++}`);
    params.push(filters.regionId);
  }
  if (filters.subRegionId) {
    conditions.push(`vh.sub_region_id = $${currentParam++}`);
    params.push(filters.subRegionId);
  }
  if (filters.districtId) {
    conditions.push(`vh.district_id = $${currentParam++}`);
    params.push(filters.districtId);
  }
  if (filters.parishId) {
    conditions.push(`vh.parish_id = $${currentParam++}`);
    params.push(filters.parishId);
  }
  if (filters.schoolId) {
    conditions.push(`vh.school_id = $${currentParam++}`);
    params.push(filters.schoolId);
  }

  return {
    whereClause: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
    joinClause: `JOIN v_school_hierarchy vh ON ${tableNameOrAlias}.${tableNameOrAlias === 'schools_directory' || tableNameOrAlias === 's' && !filters.schoolId ? 'id' : 'school_id'} = vh.school_id`,
    conditions,
    params,
    nextParam: currentParam
  };
}

/**
 * Utility to parse filters from URLSearchParams.
 */
export function parseLocationFilters(searchParams: URLSearchParams): LocationFilterState {
  return {
    countryId: searchParams.get("countryId") ? Number(searchParams.get("countryId")) : undefined,
    regionId: searchParams.get("regionId") ? Number(searchParams.get("regionId")) : undefined,
    subRegionId: searchParams.get("subRegionId") ? Number(searchParams.get("subRegionId")) : undefined,
    districtId: searchParams.get("districtId") ? Number(searchParams.get("districtId")) : undefined,
    parishId: searchParams.get("parishId") ? Number(searchParams.get("parishId")) : undefined,
    schoolId: searchParams.get("schoolId") ? Number(searchParams.get("schoolId")) : undefined,
    academicYear: searchParams.get("academicYear") ? Number(searchParams.get("academicYear")) : undefined,
    term: searchParams.get("term") || undefined,
    grade: searchParams.get("grade") || undefined,
  };
}

/**
 * Formats filters for display in headers/PDFs.
 */
export async function getFilterLabels(
  filters: LocationFilterState, 
  queryPostgres: (sql: string, params: unknown[]) => Promise<{ rows: { name: string }[] }>
): Promise<string[]> {
  const labels: string[] = [];
  
  if (filters.countryId) {
    const res = await queryPostgres("SELECT name FROM geo_countries WHERE id = $1", [filters.countryId]);
    if (res.rows[0]) labels.push(`Country: ${res.rows[0].name}`);
  }
  // ... repeat for all levels ...
  if (filters.schoolId) {
    const res = await queryPostgres("SELECT name FROM schools_directory WHERE id = $1", [filters.schoolId]);
    if (res.rows[0]) labels.push(`School: ${res.rows[0].name}`);
  }

  return labels;
}
