import { PortalModuleWorkspacePage } from "@/components/portal/PortalModuleWorkspacePage";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "1001 Story Workspace",
  description: "1001 Story form workspace and review flow.",
};

export default async function PortalStoryWorkspacePage() {
  return (
    <PortalModuleWorkspacePage
      module="story"
      reportHref="/portal/reports?module=story"
      reportLabel="Open 1001 Story Report"
    />
  );
}
