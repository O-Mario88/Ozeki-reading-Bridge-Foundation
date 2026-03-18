
import { requirePortalStaffUser } from "@/lib/portal-auth";
import { getDistrictStats, listSchoolSupportStatuses, listSchoolsByDistrict } from "@/services/dataService";
import { notFound } from "next/navigation";
import { DistrictProfileView } from "@/components/portal/DistrictProfileView";

export default async function DistrictProfilePage({ params }: { params: Promise<{ district: string }> }) {
    await requirePortalStaffUser();
    const { district } = await params;
    const decodedDistrict = decodeURIComponent(district);

    const stats = await getDistrictStats(decodedDistrict);
    const supportStatuses = await listSchoolSupportStatuses({
        district: decodedDistrict,
        limit: 300,
    });
    const schools = await listSchoolsByDistrict(decodedDistrict);

    if (!stats) {
        notFound();
    }

    return (
        <DistrictProfileView 
            stats={stats} 
            initialSupportStatuses={supportStatuses} 
            initialSchools={schools} 
        />
    );
}

