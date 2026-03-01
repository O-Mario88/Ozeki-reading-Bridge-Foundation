import { redirect } from "next/navigation";

/**
 * /impact/dashboard now redirects to /impact which hosts
 * the single canonical Live Impact Dashboard.
 */
export default function ImpactDashboardRedirect() {
  redirect("/impact");
}
