import { redirect } from "next/navigation";
import { requirePortalStaffUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PortalInterventionsPage() {
  await requirePortalStaffUser();
  redirect("/portal/data-quality?tab=interventions");
}
