import { requirePortalUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Training Reports",
  description: "Redirects to the unified Report Profile training reports tab.",
};

export default async function PortalTrainingReportsPage() {
  await requirePortalUser();
  redirect("/portal/reports?tab=training-reports");
}
