import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalCrmListView } from "@/components/portal/crm/PortalCrmListView";
import { requirePortalStaffUser } from "@/lib/auth";
import { listAssessmentCrmRows } from "@/lib/server/postgres/repositories/portal-crm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Assessments",
  description: "CRM-style assessment profiles and PostgreSQL-backed assessment records.",
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

export default async function PortalAssessmentsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const serialized = toSearchParams(params);
  if (serialized) {
    redirect(`/portal/assessments/manage?${serialized}`);
  }

  const user = await requirePortalStaffUser();
  const view = await listAssessmentCrmRows();

  return (
    <PortalShell user={user} activeHref="/portal/assessments" title={view.title} description={view.subtitle}>
      <PortalCrmListView view={view} />
    </PortalShell>
  );
}
