import { redirect } from "next/navigation";
import { requirePortalStaffUser } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

export default async function PortalNationalIntelligencePage() {
  await requirePortalStaffUser();
  redirect("/portal/data-quality");
}
