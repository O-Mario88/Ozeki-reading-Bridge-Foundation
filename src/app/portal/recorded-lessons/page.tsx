import { Metadata } from "next";
import { PageHeader } from "@/components/portal/PageHeader";
import { PortalRecordedLessonsManager } from "@/components/portal/PortalRecordedLessonsManager";
import { listRecordedLessonsPostgres } from "@/lib/server/postgres/repositories/recorded-lessons";

export const metadata: Metadata = {
  title: "Recorded Lessons Management | Portal",
};

export const revalidate = 0;

export default async function RecordedLessonsAdminPage() {
  let lessons = [];
  try {
    lessons = await listRecordedLessonsPostgres();
  } catch (err) {
    console.error("Failed to load recorded lessons", err);
  }

  return (
    <>
      <PageHeader 
        title="Recorded Lessons Library" 
        description="Schedule recordings, import from Google Drive, and manage Vimeo uploads."
      />
      <div className="portal-content">
         <PortalRecordedLessonsManager initialLessons={lessons} />
      </div>
    </>
  );
}
