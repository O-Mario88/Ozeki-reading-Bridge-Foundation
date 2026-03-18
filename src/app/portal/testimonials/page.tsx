import Link from "next/link";
import { PortalTestimonialsManager } from "@/components/portal/PortalTestimonialsManager";
import { PortalShell } from "@/components/portal/PortalShell";
import { listSchoolDirectoryRecords } from "@/services/dataService";
import { requirePortalUser } from "@/lib/portal-auth";
import { listPortalTestimonialsPostgres } from "@/lib/server/postgres/repositories/public-content";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "School Change Stories",
  description: "Capture school-linked stories of measurable reading-performance change.",
};

function parseSchoolId(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) {
    return null;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export default async function PortalTestimonialsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePortalUser();
  const params = await searchParams;
  const canModerate = user.isSupervisor || user.isME || user.isAdmin || user.isSuperAdmin;

  const schoolOptions = (await listSchoolDirectoryRecords(undefined, user))
    .map((school) => ({
      id: school.id,
      name: school.name,
      district: school.district,
      region: school.region,
      subRegion: school.subRegion,
    }))
    .sort((left, right) => left.name.localeCompare(right.name));

  const requestedSchoolId = parseSchoolId(params.schoolId);
  const selectedSchool =
    requestedSchoolId !== null
      ? schoolOptions.find((item) => item.id === requestedSchoolId) ?? null
      : null;

  const testimonials = (await listPortalTestimonialsPostgres(
    user,
    180,
    selectedSchool ? { schoolId: selectedSchool.id } : undefined,
  )).map((item) => ({
    ...item,
    videoUrl:
      item.videoSourceType === "youtube"
        ? item.youtubeEmbedUrl || item.youtubeWatchUrl || `/api/testimonials/${item.id}/video`
        : `/api/testimonials/${item.id}/video`,
    photoUrl: item.photoFileName ? `/api/testimonials/${item.id}/photo` : null,
  }));

  return (
    <PortalShell
      user={user}
      activeHref="/portal/schools"
      title={selectedSchool ? `${selectedSchool.name} Change Stories` : "School Change Stories"}
      description={
        selectedSchool
          ? `General performance in reading at ${selectedSchool.name} (${selectedSchool.district}).`
          : "Capture measurable, school-linked reading-change stories with photo/video evidence."
      }
      actions={
        selectedSchool ? (
          <div className="action-row">
            <Link className="button button-ghost" href={`/portal/schools/${selectedSchool.id}`}>
              Open School Profile
            </Link>
            <Link className="button button-ghost" href="/portal/testimonials">
              View All Schools
            </Link>
          </div>
        ) : undefined
      }
    >
      <PortalTestimonialsManager
        initialTestimonials={testimonials}
        canModerate={canModerate}
        schoolOptions={schoolOptions}
        defaultSchoolId={selectedSchool?.id ?? null}
      />
    </PortalShell>
  );
}
