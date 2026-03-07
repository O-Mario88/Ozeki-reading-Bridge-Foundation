import { PortalShell } from "@/components/portal/PortalShell";
import { PortalTrainingReportsManager } from "@/components/portal/PortalTrainingReportsManager";
import { listTrainingReportArtifacts } from "@/lib/training-report-automation";
import { getPortalHomePath, requirePortalUser } from "@/lib/portal-auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Training Reports",
  description: "Generate and download facts-locked training reports with AI-assisted narrative.",
};

function canAccessTrainingReports(user: {
  role: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
}) {
  return user.isAdmin || user.isSuperAdmin || user.role === "Staff" || user.role === "Admin";
}

export default async function PortalTrainingReportsPage() {
  const user = await requirePortalUser();
  if (!canAccessTrainingReports(user)) {
    redirect(getPortalHomePath(user));
  }

  const reports = listTrainingReportArtifacts({ limit: 40 });

  return (
    <PortalShell
      user={user}
      activeHref="/portal/training-reports"
      title="Training Reports"
      description="AI-assisted reports with deterministic facts and internal PDF artifacts."
    >
      <PortalTrainingReportsManager initialReports={reports} />
    </PortalShell>
  );
}

