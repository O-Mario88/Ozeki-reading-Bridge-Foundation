
import { requirePortalStaffUser } from "@/lib/portal-auth";
import { getDistrictStats, listSchoolSupportStatuses } from "@/lib/db";
import { notFound } from "next/navigation";
import { DistrictProfileView } from "@/components/portal/DistrictProfileView";

export default async function DistrictProfilePage({ params }: { params: Promise<{ district: string }> }) {
    await requirePortalStaffUser();
    const { district } = await params;
    const decodedDistrict = decodeURIComponent(district);

    const stats = getDistrictStats(decodedDistrict);
    const supportStatuses = listSchoolSupportStatuses({
        district: decodedDistrict,
        limit: 300,
    });

    if (!stats) {
        notFound();
    }

    return <DistrictProfileView stats={stats} initialSupportStatuses={supportStatuses} />;
}
