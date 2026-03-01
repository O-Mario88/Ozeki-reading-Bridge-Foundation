import { redirect } from "next/navigation";

/**
 * /impact/reports now redirects to /impact#reports where
 * the reports section is consolidated into the main impact dashboard page.
 */
export default function ImpactReportsRedirect() {
  redirect("/impact#reports");
}
