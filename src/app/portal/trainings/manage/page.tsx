import { PortalModuleWorkspacePage } from "@/components/portal/PortalModuleWorkspacePage";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Trainings Workspace",
  description: "Training form workspace and review flow.",
};

export default async function PortalTrainingsWorkspacePage() {
  return (
    <PortalModuleWorkspacePage
      module="training"
      reportHref="/portal/reports?module=training"
      reportLabel="Open Training Report"
    />
  );
}
