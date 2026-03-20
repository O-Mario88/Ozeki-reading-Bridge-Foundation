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

// Geographic Lookup Functions
import { queryPostgres } from "@/lib/server/postgres/client";

export async function listGeoRegions(_year?: string | null): Promise<string[]> {
    const res = await queryPostgres(`SELECT DISTINCT region FROM schools_directory WHERE region IS NOT NULL ORDER BY region`);
    return res.rows.map(r => r.region);
}

export async function listGeoSubregions(_regionId?: string | null, _year?: string | null): Promise<string[]> {
    let sql = `SELECT DISTINCT sub_region FROM schools_directory WHERE sub_region IS NOT NULL`;
    const params: string[] = [];
    if (_regionId) {
        params.push(_regionId);
        sql += ` AND region = $1`;
    }
    sql += ` ORDER BY sub_region`;
    const res = await queryPostgres(sql, params);
    return res.rows.map(r => r.sub_region);
}

export async function listGeoDistricts(_subRegionId?: string | null, _year?: string | null): Promise<string[]> {
    let sql = `SELECT DISTINCT district FROM schools_directory WHERE district IS NOT NULL`;
    const params: string[] = [];
    if (_subRegionId) {
        params.push(_subRegionId);
        sql += ` AND sub_region = $1`;
    }
    sql += ` ORDER BY district`;
    const res = await queryPostgres(sql, params);
    return res.rows.map(r => r.district);
}

export async function searchGeoDistricts(query: string): Promise<string[]> {
    const res = await queryPostgres(
        `SELECT DISTINCT district FROM schools_directory WHERE district ILIKE $1 ORDER BY district`,
        [`%${query}%`]
    );
    return res.rows.map(r => r.district);
}

export async function listGeoSubcounties(district?: string): Promise<string[]> {
    let sql = `SELECT DISTINCT sub_county FROM schools_directory WHERE sub_county IS NOT NULL`;
    const params: any[] = [];
    if (district) {
        params.push(district);
        sql += ` AND district = $1`;
    }
    sql += ` ORDER BY sub_county`;
    const res = await queryPostgres(sql, params);
    return res.rows.map(r => r.sub_county);
}

export async function listGeoParishes(subCounty?: string): Promise<string[]> {
    let sql = `SELECT DISTINCT parish FROM schools_directory WHERE parish IS NOT NULL`;
    const params: any[] = [];
    if (subCounty) {
        params.push(subCounty);
        sql += ` AND sub_county = $1`;
    }
    sql += ` ORDER BY parish`;
    const res = await queryPostgres(sql, params);
    return res.rows.map(r => r.parish);
}

export async function listGeoSchools(filtersOrDistrictId?: any, _year?: string | null): Promise<any[]> {
    const filters = typeof filtersOrDistrictId === 'object' ? filtersOrDistrictId : { district: filtersOrDistrictId };
    let sql = `SELECT id, name, district, sub_county, parish FROM schools_directory WHERE 1=1`;
    const params: any[] = [];
    if (filters.district) {
        params.push(filters.district);
        sql += ` AND district = $${params.length}`;
    }
    if (filters.subCounty) {
        params.push(filters.subCounty);
        sql += ` AND sub_county = $${params.length}`;
    }
    sql += ` ORDER BY name`;
    const res = await queryPostgres(sql, params);
    return res.rows;
}
