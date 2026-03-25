
import { requirePortalStaffUser } from "@/lib/auth";
import { getRegionStats, listSchoolSupportStatuses } from "@/services/dataService";
import { notFound } from "next/navigation";
import { RegionProfileView } from "@/components/portal/RegionProfileView";

export default async function RegionProfilePage({ params }: { params: Promise<{ region: string }> }) {
    await requirePortalStaffUser();
    const { region } = await params;
    const decodedRegion = decodeURIComponent(region);

    const stats = await getRegionStats(decodedRegion);
    const supportStatuses = await listSchoolSupportStatuses({
        region: decodedRegion,
        limit: 600,
    });

    if (!stats) {
        notFound();
    }

    return <RegionProfileView stats={stats} initialSupportStatuses={supportStatuses} />;
}
