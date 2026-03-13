import { redirect } from "next/navigation";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalCrmListView } from "@/components/portal/crm/PortalCrmListView";
import { requirePortalStaffUser } from "@/lib/portal-auth";
import { listVisitCrmRows } from "@/lib/server/postgres/repositories/portal-crm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "School Visits",
  description: "CRM-style visit profiles and PostgreSQL-backed school visit records.",
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

export default async function PortalVisitsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const serialized = toSearchParams(params);
  if (serialized) {
    redirect(`/portal/visits/manage?${serialized}`);
  }

  const user = await requirePortalStaffUser();
  const view = await listVisitCrmRows();

  return (
    <PortalShell user={user} activeHref="/portal/visits" title={view.title} description={view.subtitle}>
      <PortalCrmListView view={view} />
    </PortalShell>
  );
}
