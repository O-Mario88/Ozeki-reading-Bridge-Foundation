import Link from "next/link";
import { requirePortalStaffUser } from "@/lib/auth";
import { PortalShell } from "@/components/portal/PortalShell";
import { queryPostgres } from "@/lib/server/postgres/client";
import { CoachingVisitForm } from "@/components/portal/CoachingVisitForm";
import { ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "New Coaching Visit | Ozeki Portal" };

interface PageProps {
  searchParams: Promise<{ schoolId?: string; coachId?: string }>;
}

async function getSchools() {
  try {
    const res = await queryPostgres(
      `SELECT id, name, district FROM schools_directory ORDER BY name ASC LIMIT 1000`,
    );
    return res.rows.map((r) => ({
      id: Number(r.id),
      name: String(r.name ?? ""),
      district: String(r.district ?? ""),
    }));
  } catch {
    return [];
  }
}

async function getCoaches() {
  try {
    const res = await queryPostgres(
      `SELECT id, full_name, email FROM portal_users
       WHERE role IN ('Staff', 'Admin', 'Coach')
       ORDER BY full_name ASC LIMIT 200`,
    );
    return res.rows.map((r) => ({
      id: Number(r.id),
      fullName: String(r.full_name ?? "Unknown"),
      email: String(r.email ?? ""),
    }));
  } catch {
    return [];
  }
}

export default async function NewVisitPage({ searchParams }: PageProps) {
  const user = await requirePortalStaffUser();
  const sp = await searchParams;
  const [schools, coaches] = await Promise.all([getSchools(), getCoaches()]);

  return (
    <PortalShell
      user={user}
      activeHref="/portal/visits"
      title="New Coaching Visit"
      description="Record a coaching visit to a school. Links to teacher observations and follow-ups."
    >
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <Link href="/portal/visits" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
          <ChevronLeft className="w-4 h-4" />
          All visits
        </Link>

        <CoachingVisitForm
          schools={schools}
          coaches={coaches}
          defaultSchoolId={sp.schoolId ? Number(sp.schoolId) : undefined}
          defaultCoachId={sp.coachId ? Number(sp.coachId) : user.id}
        />
      </div>
    </PortalShell>
  );
}
