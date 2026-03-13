import { PortalModuleWorkspacePage } from "@/components/portal/PortalModuleWorkspacePage";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Visits Workspace",
  description: "Visit form workspace and review flow.",
};

export default async function PortalVisitsWorkspacePage() {
  return (
    <PortalModuleWorkspacePage
      module="visit"
      reportHref="/portal/reports?module=visit"
      reportLabel="Open Visit Report"
    />
  );
}
