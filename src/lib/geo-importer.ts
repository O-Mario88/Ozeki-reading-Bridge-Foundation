import { getDb, stableIdFromText } from "./db";

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

export function importUgandaGeoData(data: UgandaGeoUnit[]): GeoImportResult {
    const db = getDb();
    const result: GeoImportResult = {
        regions: 0,
        subregions: 0,
        districts: 0,
        subcounties: 0,
        parishes: 0,
        warnings: [],
    };

    const upsertRegion = db.prepare(`
    INSERT INTO geo_regions (id, name, updated_at)
    VALUES (@id, @name, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET name = excluded.name, updated_at = datetime('now')
  `);

    const upsertSubregion = db.prepare(`
    INSERT INTO geo_subregions (id, region_id, name, updated_at)
    VALUES (@id, @regionId, @name, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET name = excluded.name, updated_at = datetime('now')
  `);

    const upsertDistrict = db.prepare(`
    INSERT INTO geo_districts (id, subregion_id, name, updated_at)
    VALUES (@id, @subregionId, @name, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET name = excluded.name, updated_at = datetime('now')
  `);

    const upsertSubcounty = db.prepare(`
    INSERT INTO geo_subcounties (id, district_id, name, updated_at)
    VALUES (@id, @districtId, @name, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET name = excluded.name, updated_at = datetime('now')
  `);

    const upsertParish = db.prepare(`
    INSERT INTO geo_parishes (id, subcounty_id, name, updated_at)
    VALUES (@id, @subcountyId, @name, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET name = excluded.name, updated_at = datetime('now')
  `);

    const regionIds = new Set<string>();
    const subregionIds = new Set<string>();
    const districtIds = new Set<string>();
    const subcountyIds = new Set<string>();
    const parishIds = new Set<string>();

    const tx = db.transaction(() => {
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
                upsertRegion.run({ id: rId, name: unit.region });
                regionIds.add(rId);
                result.regions++;
            }

            if (!subregionIds.has(srId)) {
                upsertSubregion.run({ id: srId, regionId: rId, name: unit.subregion });
                subregionIds.add(srId);
                result.subregions++;
            }

            if (!districtIds.has(dId)) {
                upsertDistrict.run({ id: dId, subregionId: srId, name: unit.district });
                districtIds.add(dId);
                result.districts++;
            }

            if (!subcountyIds.has(scId)) {
                upsertSubcounty.run({ id: scId, districtId: dId, name: unit.subcounty });
                subcountyIds.add(scId);
                result.subcounties++;
            }

            if (!parishIds.has(pId)) {
                upsertParish.run({ id: pId, subcountyId: scId, name: unit.parish });
                parishIds.add(pId);
                result.parishes++;
            }
        }

        // Refresh school linkage
        db.exec(`
      UPDATE schools_directory
      SET geo_district_id = (SELECT id FROM geo_districts WHERE name = schools_directory.district)
      WHERE geo_district_id IS NULL AND district IS NOT NULL;

      UPDATE schools_directory
      SET geo_subregion_id = (SELECT subregion_id FROM geo_districts WHERE id = schools_directory.geo_district_id),
          geo_region_id = (SELECT r.id FROM geo_regions r JOIN geo_subregions sr ON r.id = sr.region_id JOIN geo_districts d ON sr.id = d.subregion_id WHERE d.id = schools_directory.geo_district_id)
      WHERE geo_district_id IS NOT NULL AND (geo_subregion_id IS NULL OR geo_region_id IS NULL);
      
      -- Link subcounties/parishes if names match exactly
      UPDATE schools_directory
      SET geo_subcounty_id = (SELECT id FROM geo_subcounties WHERE name = schools_directory.sub_county AND district_id = schools_directory.geo_district_id)
      WHERE geo_subcounty_id IS NULL AND sub_county IS NOT NULL AND geo_district_id IS NOT NULL;

      UPDATE schools_directory
      SET geo_parish_id = (SELECT id FROM geo_parishes WHERE name = schools_directory.parish AND subcounty_id = schools_directory.geo_subcounty_id)
      WHERE geo_parish_id IS NULL AND parish IS NOT NULL AND geo_subcounty_id IS NOT NULL;
    `);
    });

    tx();

    return result;
}
