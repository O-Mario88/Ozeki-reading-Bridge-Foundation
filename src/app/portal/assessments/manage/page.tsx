import { PortalModuleWorkspacePage } from "@/components/portal/PortalModuleWorkspacePage";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Assessments Workspace",
  description: "Assessment form workspace and review flow.",
};

export default async function PortalAssessmentsWorkspacePage() {
  return (
    <PortalModuleWorkspacePage
      module="assessment"
      reportHref="/portal/reports?module=learner-assessment"
      reportLabel="Open Assessments Report"
    />
  );
}
