
import { requirePortalStaffUser } from "@/lib/portal-auth";
import { getDistrictStats } from "@/lib/db";
import { notFound } from "next/navigation";
import { DistrictProfileView } from "@/components/portal/DistrictProfileView";

export default async function DistrictProfilePage({ params }: { params: Promise<{ district: string }> }) {
    await requirePortalStaffUser();
    const { district } = await params;
    const decodedDistrict = decodeURIComponent(district);

    const stats = getDistrictStats(decodedDistrict);

    if (!stats) {
        notFound();
    }

    return <DistrictProfileView stats={stats} />;
}
