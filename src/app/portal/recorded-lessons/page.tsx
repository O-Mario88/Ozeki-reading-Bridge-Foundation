import { Metadata } from "next";
import { RecordedLessonRow } from "@/lib/server/postgres/repositories/recorded-lessons";
import { PortalRecordedLessonsManager } from "@/components/portal/PortalRecordedLessonsManager";
import { listRecordedLessonsPostgres } from "@/lib/server/postgres/repositories/recorded-lessons";

export const metadata: Metadata = {
  title: "Recorded Lessons Management | Portal",
};

export const revalidate = 0;

export default async function RecordedLessonsAdminPage() {
  let lessons: RecordedLessonRow[] = [];
  try {
    lessons = await listRecordedLessonsPostgres();
  } catch (err) {
    console.error("Failed to load recorded lessons", err);
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Recorded Lessons Library</h1>
        <p className="text-gray-500">Schedule recordings, import from Google Drive, and manage Vimeo uploads.</p>
      </div>
      <div className="portal-content">
         <PortalRecordedLessonsManager initialLessons={lessons} />
      </div>
    </>
  );
}
