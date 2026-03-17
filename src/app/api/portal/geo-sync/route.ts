import { NextResponse } from "next/server";
import { importUgandaGeoData } from "@/lib/geo-importer";
import { queryPostgres, requirePostgresConfigured } from "@/lib/server/postgres/client";
import { ugandaRegions } from "@/lib/uganda-locations";

export async function GET() {
    try {
        requirePostgresConfigured();
        const [regions, subregions, districts, subcounties, parishes] = await Promise.all([
            queryPostgres<{ count: string }>("SELECT COUNT(*)::text AS count FROM geo_regions"),
            queryPostgres<{ count: string }>("SELECT COUNT(*)::text AS count FROM geo_subregions"),
            queryPostgres<{ count: string }>("SELECT COUNT(*)::text AS count FROM geo_districts"),
            queryPostgres<{ count: string }>("SELECT COUNT(*)::text AS count FROM geo_subcounties"),
            queryPostgres<{ count: string }>("SELECT COUNT(*)::text AS count FROM geo_parishes"),
        ]);

        return NextResponse.json({
            ok: true,
            stats: {
                regions: Number(regions.rows[0]?.count ?? 0),
                subregions: Number(subregions.rows[0]?.count ?? 0),
                districts: Number(districts.rows[0]?.count ?? 0),
                subcounties: Number(subcounties.rows[0]?.count ?? 0),
                parishes: Number(parishes.rows[0]?.count ?? 0),
            }
        });
    } catch (_error) {
        return NextResponse.json({ ok: false, error: "Failed to fetch geo stats" }, { status: 500 });
    }
}

export async function POST() {
    try {
        // Transform regionSeed to UgandaGeoUnit format for the importer
        // Note: Since our current seed only goes down to District, we'll use placeholders for SC/Parish if needed,
        // or rely on a future authoritative dataset for the full hierarchy.
        // For now, we'll at least sync what we have in uganda-locations.ts correctly.

        const units: Array<{ region: string; subregion: string; district: string; subcounty: string; parish: string }> = [];
        ugandaRegions.forEach(region => {
            region.subRegions.forEach(subregion => {
                subregion.districts.forEach(district => {
                    // Add a placeholder for SC/Parish to allow the importer to process the district at least
                    units.push({
                        region: region.region,
                        subregion: subregion.subRegion,
                        district: district,
                        subcounty: "Unknown Sub-county", // Placeholder
                        parish: "Unknown Parish" // Placeholder
                    });
                });
            });
        });

        const result = await importUgandaGeoData(units);
        return NextResponse.json({ ok: true, result });
    } catch (_error) {
        return NextResponse.json({ ok: false, error: "Failed to sync geo hierarchy" }, { status: 500 });
    }
}
