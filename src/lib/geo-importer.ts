import { requirePostgresConfigured, withPostgresClient } from "@/lib/server/postgres/client";

export interface GeoImportResult {
    regions: number;
    subregions: number;
    districts: number;
    subcounties: number;
    parishes: number;
    warnings: string[];
}

export interface UgandaGeoUnit {
    region: string;
    subregion: string;
    district: string;
    subcounty: string;
    parish: string;
}

function stableIdFromText(prefix: string, value: string) {
    const normalized = value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    return `${prefix}_${normalized || "unknown"}`;
}

export async function importUgandaGeoData(data: UgandaGeoUnit[]): Promise<GeoImportResult> {
    requirePostgresConfigured();
    const result: GeoImportResult = {
        regions: 0,
        subregions: 0,
        districts: 0,
        subcounties: 0,
        parishes: 0,
        warnings: [],
    };

    const regionIds = new Set<string>();
    const subregionIds = new Set<string>();
    const districtIds = new Set<string>();
    const subcountyIds = new Set<string>();
    const parishIds = new Set<string>();

    await withPostgresClient(async (client) => {
        await client.query("BEGIN");
        try {
        const countryResult = await client.query<{ id: number }>(
            `
            INSERT INTO geo_countries (iso_code, name)
            VALUES ('UGA', 'Uganda')
            ON CONFLICT (iso_code) DO UPDATE SET name = EXCLUDED.name
            RETURNING id
            `,
        );
        const ugandaCountryId = Number(countryResult.rows[0]?.id ?? 0);
        if (!ugandaCountryId) {
            throw new Error("Failed to resolve Uganda country row.");
        }

        const regions = new Map<string, { legacyId: string; name: string }>();
        const subregions = new Map<string, { legacyId: string; regionLegacyId: string; name: string }>();
        const districts = new Map<string, { legacyId: string; subregionLegacyId: string; name: string }>();
        const subcounties = new Map<string, { legacyId: string; districtLegacyId: string; name: string }>();
        const parishes = new Map<string, { legacyId: string; subcountyLegacyId: string; districtLegacyId: string; name: string }>();

        for (const unit of data) {
            if (!unit.region || !unit.subregion || !unit.district || !unit.subcounty || !unit.parish) {
                result.warnings.push(`Skipping incomplete row: ${JSON.stringify(unit)}`);
                continue;
            }

            const rId = stableIdFromText("reg", unit.region);
            const srId = stableIdFromText("sub", unit.subregion);
            const dId = stableIdFromText("dist", unit.district);
            const scId = stableIdFromText("sc", unit.subcounty + "_" + unit.district); // Multi-district sc names exist
            const pId = stableIdFromText("par", unit.parish + "_" + scId); // Multi-sc parish names exist

            if (!regionIds.has(rId)) {
                regionIds.add(rId);
                regions.set(rId, { legacyId: rId, name: unit.region });
                result.regions++;
            }

            if (!subregionIds.has(srId)) {
                subregionIds.add(srId);
                subregions.set(srId, { legacyId: srId, regionLegacyId: rId, name: unit.subregion });
                result.subregions++;
            }

            if (!districtIds.has(dId)) {
                districtIds.add(dId);
                districts.set(dId, { legacyId: dId, subregionLegacyId: srId, name: unit.district });
                result.districts++;
            }

            if (!subcountyIds.has(scId)) {
                subcountyIds.add(scId);
                subcounties.set(scId, { legacyId: scId, districtLegacyId: dId, name: unit.subcounty });
                result.subcounties++;
            }

            if (!parishIds.has(pId)) {
                parishIds.add(pId);
                parishes.set(pId, {
                    legacyId: pId,
                    subcountyLegacyId: scId,
                    districtLegacyId: dId,
                    name: unit.parish,
                });
                result.parishes++;
            }
        }

        await client.query(
            `TRUNCATE TABLE geo_parishes, geo_subcounties, geo_districts, geo_subregions, geo_regions RESTART IDENTITY CASCADE`,
        );

        const regionIdMap = new Map<string, number>();
        let nextRegionId = 1;
        for (const region of regions.values()) {
            const id = nextRegionId++;
            regionIdMap.set(region.legacyId, id);
            await client.query(
                `
                INSERT INTO geo_regions (id, region_id, name, country_id)
                VALUES ($1, $2, $3, $4)
                `,
                [id, region.legacyId, region.name, ugandaCountryId],
            );
        }

        const subregionIdMap = new Map<string, number>();
        let nextSubregionId = 1;
        for (const subregion of subregions.values()) {
            const id = nextSubregionId++;
            subregionIdMap.set(subregion.legacyId, id);
            await client.query(
                `
                INSERT INTO geo_subregions (id, subregion_id, region_id, name)
                VALUES ($1, $2, $3, $4)
                `,
                [id, subregion.legacyId, regionIdMap.get(subregion.regionLegacyId) ?? null, subregion.name],
            );
        }

        const districtIdMap = new Map<string, number>();
        let nextDistrictId = 1;
        for (const district of districts.values()) {
            const id = nextDistrictId++;
            districtIdMap.set(district.legacyId, id);
            const regionId = regionIdMap.get(subregions.get(district.subregionLegacyId)?.regionLegacyId ?? "") ?? null;
            await client.query(
                `
                INSERT INTO geo_districts (id, district_id, subregion_id, region_id, name)
                VALUES ($1, $2, $3, $4, $5)
                `,
                [id, district.legacyId, subregionIdMap.get(district.subregionLegacyId) ?? null, regionId, district.name],
            );
        }

        const subcountyIdMap = new Map<string, number>();
        let nextSubcountyId = 1;
        for (const subcounty of subcounties.values()) {
            const id = nextSubcountyId++;
            subcountyIdMap.set(subcounty.legacyId, id);
            await client.query(
                `
                INSERT INTO geo_subcounties (id, subcounty_id, district_id, name)
                VALUES ($1, $2, $3, $4)
                `,
                [id, subcounty.legacyId, districtIdMap.get(subcounty.districtLegacyId) ?? null, subcounty.name],
            );
        }

        let nextParishId = 1;
        for (const parish of parishes.values()) {
            const id = nextParishId++;
            await client.query(
                `
                INSERT INTO geo_parishes (id, parish_id, subcounty_id, district_id, name)
                VALUES ($1, $2, $3, $4, $5)
                `,
                [
                    id,
                    parish.legacyId,
                    subcountyIdMap.get(parish.subcountyLegacyId) ?? null,
                    districtIdMap.get(parish.districtLegacyId) ?? null,
                    parish.name,
                ],
            );
        }

        await client.query(
            `
            UPDATE schools_directory
            SET geo_district_id = gd.district_id
            FROM geo_districts gd
            WHERE schools_directory.geo_district_id IS NULL
              AND schools_directory.district IS NOT NULL
              AND lower(trim(gd.name)) = lower(trim(schools_directory.district))
            `,
        );
        await client.query(
            `
            UPDATE schools_directory
            SET
              geo_subregion_id = gs.subregion_id,
              geo_region_id = gr.region_id
            FROM geo_districts gd
            JOIN geo_subregions gs ON gs.id = gd.subregion_id
            JOIN geo_regions gr ON gr.id = gs.region_id
            WHERE schools_directory.geo_district_id = gd.district_id
              AND (schools_directory.geo_subregion_id IS NULL OR schools_directory.geo_region_id IS NULL)
            `,
        );
        await client.query(
            `
            UPDATE schools_directory
            SET geo_subcounty_id = gsc.subcounty_id
            FROM geo_subcounties gsc
            JOIN geo_districts gd ON gd.id = gsc.district_id
            WHERE schools_directory.geo_subcounty_id IS NULL
              AND schools_directory.sub_county IS NOT NULL
              AND schools_directory.geo_district_id = gd.district_id
              AND lower(trim(gsc.name)) = lower(trim(schools_directory.sub_county))
            `,
        );
        await client.query(
            `
            UPDATE schools_directory
            SET geo_parish_id = gp.parish_id
            FROM geo_parishes gp
            JOIN geo_subcounties gsc ON gsc.id = gp.subcounty_id
            WHERE schools_directory.geo_parish_id IS NULL
              AND schools_directory.parish IS NOT NULL
              AND schools_directory.geo_subcounty_id = gsc.subcounty_id
              AND lower(trim(gp.name)) = lower(trim(schools_directory.parish))
            `,
        );

        // ── Backfill text columns (region, sub_region) from geo hierarchy ──
        // The map/dashboard uses these text columns for drill-down, not the geo_*_id columns.
        await client.query(
            `
            UPDATE schools_directory
            SET region = gr.name
            FROM geo_districts gd
            JOIN geo_subregions gs ON gs.id = gd.subregion_id
            JOIN geo_regions gr ON gr.id = gs.region_id
            WHERE schools_directory.geo_district_id = gd.district_id
              AND (schools_directory.region IS NULL OR trim(schools_directory.region) = '')
            `,
        );
        await client.query(
            `
            UPDATE schools_directory
            SET sub_region = gs.name
            FROM geo_districts gd
            JOIN geo_subregions gs ON gs.id = gd.subregion_id
            WHERE schools_directory.geo_district_id = gd.district_id
              AND (schools_directory.sub_region IS NULL OR trim(schools_directory.sub_region) = '')
            `,
        );
        // Also set the legacy text-based IDs (region_id, subregion_id, district_id) for views
        await client.query(
            `
            UPDATE schools_directory
            SET
              region_id = gr.region_id,
              subregion_id = gs.subregion_id,
              district_id = gd.district_id
            FROM geo_districts gd
            JOIN geo_subregions gs ON gs.id = gd.subregion_id
            JOIN geo_regions gr ON gr.id = gs.region_id
            WHERE schools_directory.geo_district_id = gd.district_id
              AND (schools_directory.region_id IS NULL OR schools_directory.subregion_id IS NULL OR schools_directory.district_id IS NULL)
            `,
        );
        await client.query("COMMIT");
        } catch (error) {
            await client.query("ROLLBACK");
            throw error;
        }
    });

    return result;
}
