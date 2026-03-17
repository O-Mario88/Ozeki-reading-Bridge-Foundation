
import { requirePortalStaffUser } from "@/lib/portal-auth";
import { getRegionStats } from "@/lib/db";
import { notFound } from "next/navigation";
import { RegionProfileView } from "@/components/portal/RegionProfileView";

export default async function RegionProfilePage({ params }: { params: Promise<{ region: string }> }) {
    await requirePortalStaffUser();
    const { region } = await params;
    const decodedRegion = decodeURIComponent(region);

    const stats = getRegionStats(decodedRegion);

    if (!stats) {
        notFound();
    }

    return <RegionProfileView stats={stats} />;
}
