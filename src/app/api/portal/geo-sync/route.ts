import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { importUgandaGeoData } from "@/lib/geo-importer";
import { ugandaRegions } from "@/lib/uganda-locations";

export async function GET() {
    try {
        const db = getDb();
        const stats = {
            regions: db.prepare("SELECT COUNT(*) as count FROM geo_regions").get() as { count: number },
            subregions: db.prepare("SELECT COUNT(*) as count FROM geo_subregions").get() as { count: number },
            districts: db.prepare("SELECT COUNT(*) as count FROM geo_districts").get() as { count: number },
            subcounties: db.prepare("SELECT COUNT(*) as count FROM geo_subcounties").get() as { count: number },
            parishes: db.prepare("SELECT COUNT(*) as count FROM geo_parishes").get() as { count: number },
        };

        return NextResponse.json({
            ok: true,
            stats: {
                regions: stats.regions.count,
                subregions: stats.subregions.count,
                districts: stats.districts.count,
                subcounties: stats.subcounties.count,
                parishes: stats.parishes.count,
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

        const result = importUgandaGeoData(units);
        return NextResponse.json({ ok: true, result });
    } catch (_error) {
        return NextResponse.json({ ok: false, error: "Failed to sync geo hierarchy" }, { status: 500 });
    }
}
