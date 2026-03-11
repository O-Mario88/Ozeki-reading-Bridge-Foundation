import { PortalNationalIntelligenceManager } from "@/components/portal/PortalNationalIntelligenceManager";
import { PortalShell } from "@/components/portal/PortalShell";
import { requirePortalStaffUser } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Education Data Quality Center",
  description:
    "Data quality, benchmarks, national insights, priority queue, interventions, and report packs in one workspace.",
};

type DataQualityTab =
  | "benchmarks"
  | "data_quality"
  | "insights"
  | "priority_queue"
  | "interventions"
  | "reports"
  | "partner_api";

function resolveTab(value: string | string[] | undefined): DataQualityTab {
  const raw = (Array.isArray(value) ? value[0] : value ?? "").trim().toLowerCase();
  if (raw === "benchmarks") return "benchmarks";
  if (raw === "insights" || raw === "national-insights") return "insights";
  if (raw === "priority_queue" || raw === "priority-queue") return "priority_queue";
  if (raw === "interventions") return "interventions";
  if (raw === "reports" || raw === "report-packs" || raw === "national-reports" || raw === "national-report") {
    return "reports";
  }
  if (raw === "partner_api" || raw === "partner-api") return "partner_api";
  return "data_quality";
}

export default async function PortalDataQualityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePortalStaffUser();
  const params = await searchParams;
  const defaultTab = resolveTab(params.tab);

  return (
    <PortalShell
      user={user}
      activeHref="/portal/data-quality"
      title="Education Data Quality Center"
      description="Unified center for data quality, benchmarks, national insights, priority queue, interventions, and national report packs."
    >
      <PortalNationalIntelligenceManager currentUser={user} defaultTab={defaultTab} />
    </PortalShell>
  );
}
