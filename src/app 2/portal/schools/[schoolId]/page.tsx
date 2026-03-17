import { SchoolProfileView } from "@/components/portal/SchoolProfileView";
import { PortalShell } from "@/components/portal/PortalShell";
import { getSchoolDirectoryRecord } from "@/lib/db";
import { requirePortalStaffUser } from "@/lib/portal-auth";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface PageProps {
    params: Promise<{
        schoolId: string;
    }>;
}

export async function generateMetadata({ params }: PageProps) {
    const { schoolId: schoolIdStr } = await params;
    const schoolId = parseInt(schoolIdStr, 10);
    if (isNaN(schoolId)) return { title: "School Not Found" };

    const school = await getSchoolDirectoryRecord(schoolId);
    return {
        title: school ? `${school.name} - School Profile` : "School Not Found",
    };
}

export default async function SchoolProfilePage({ params }: PageProps) {
    const user = await requirePortalStaffUser();
    const { schoolId: schoolIdStr } = await params;
    const schoolId = parseInt(schoolIdStr, 10);

    if (isNaN(schoolId)) {
        notFound();
    }

    const school = await getSchoolDirectoryRecord(schoolId);

    if (!school) {
        notFound();
    }

    return (
        <PortalShell
            user={user}
            activeHref="/portal/schools"
            title={`${school.name}`}
            description={`School Profile for ${school.schoolCode}`}
            actions={
                <div className="action-row">
                    <Link
                        href={`/portal/reports?module=all&district=${encodeURIComponent(
                            school.district,
                        )}&subCounty=${encodeURIComponent(school.subCounty)}&parish=${encodeURIComponent(
                            school.parish,
                        )}&search=${encodeURIComponent(school.name)}`}
                        className="button button-ghost"
                    >
                        Open School Report
                    </Link>
                </div>
            }
        >
            <SchoolProfileView school={school} />
        </PortalShell>
    );
}
