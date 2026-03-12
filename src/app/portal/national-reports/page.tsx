import { redirect } from "next/navigation";
import { requirePortalStaffUser } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

export default async function PortalNationalReportsPage() {
  await requirePortalStaffUser();
  redirect("/portal/reports?tab=national-reports");
}
