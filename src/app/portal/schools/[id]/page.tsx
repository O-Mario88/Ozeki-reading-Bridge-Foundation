import { SchoolProfileView } from "@/components/portal/SchoolProfileView";
import { PortalShell } from "@/components/portal/PortalShell";
import { getSchoolAccountProfile, getSchoolDirectoryRecord } from "@/services/dataService";
import { requirePortalStaffUser } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

export async function generateMetadata({ params }: PageProps) {
    const { id: schoolIdStr } = await params;
    const schoolId = parseInt(schoolIdStr, 10);
    if (isNaN(schoolId)) return { title: "School Not Found" };

    const profile = await getSchoolAccountProfile(schoolId);
    const school = profile?.school ?? (await getSchoolDirectoryRecord(schoolId));
    return {
        title: school ? `${school.name} - School Profile` : "School Not Found",
    };
}

export default async function SchoolProfilePage({ params }: PageProps) {
    const user = await requirePortalStaffUser();
    const { id: schoolIdStr } = await params;
    const schoolId = parseInt(schoolIdStr, 10);

    if (isNaN(schoolId)) {
        notFound();
    }

    const profile = await getSchoolAccountProfile(schoolId);
    const school = profile?.school ?? null;

    if (!school || !profile) {
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
                        href={`/portal/schools/${schoolId}/dossier`}
                        className="button button-primary"
                    >
                        Intelligence Dossier
                    </Link>
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
                    <Link href={`/portal/trainings/import-participants?schoolId=${schoolId}`} className="button button-ghost">
                        Import Participants
                    </Link>
                    <div className="dropdown">
                        <span className="button button-ghost">Templates ▾</span>
                        <div className="dropdown-content">
                            <Link href={`/api/import/templates/training-participants.xlsx?schoolId=${schoolId}`}>
                                Excel Template
                            </Link>
                            <Link href={`/api/import/templates/training-participants.csv?schoolId=${schoolId}`}>
                                CSV Template
                            </Link>
                        </div>
                    </div>
                </div>
            }
        >
            <SchoolProfileView profile={profile} />
        </PortalShell>
    );
}
