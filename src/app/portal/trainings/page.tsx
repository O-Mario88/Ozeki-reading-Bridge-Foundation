import { redirect } from "next/navigation";
import Link from "next/link";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalCrmListView } from "@/components/portal/crm/PortalCrmListView";
import { requirePortalStaffUser } from "@/lib/portal-auth";
import { listTrainingCrmRows } from "@/lib/server/postgres/repositories/portal-crm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Training Sessions",
  description: "CRM-style training session profiles and PostgreSQL-backed training records.",
};

function toSearchParams(record: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(record)) {
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, item));
    } else if (typeof value === "string" && value.length > 0) {
      params.set(key, value);
    }
  }
  return params.toString();
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PortalTrainingsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const serialized = toSearchParams(params);
  if (serialized) {
    redirect(`/portal/trainings/manage?${serialized}`);
  }

  const user = await requirePortalStaffUser();
  const view = await listTrainingCrmRows();

  return (
    <PortalShell
      user={user}
      activeHref="/portal/trainings"
      title={view.title}
      description={view.subtitle}
      actions={
        <div className="action-row">
          <Link href="/portal/trainings/manage?action=new" className="button">
            New Training Session
          </Link>
          <Link href="/portal/trainings/participants/new" className="button button-ghost">
            Add Participant
          </Link>
          <Link href="/portal/trainings/import-participants" className="button button-ghost">
            Import Participants
          </Link>
          <Link href="/api/import/templates/training-participants.xlsx" className="button button-ghost">
            Download Excel Template
          </Link>
          <Link href="/api/import/templates/training-participants.csv" className="button button-ghost">
            Download CSV Template
          </Link>
        </div>
      }
    >
      <PortalCrmListView view={view} />
    </PortalShell>
  );
}
