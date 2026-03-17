import { redirect } from "next/navigation";
import { getCurrentPortalUser, getPortalHomePath } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

export default async function PortalRootPage() {
  const user = await getCurrentPortalUser();

  if (user) {
    redirect(getPortalHomePath(user));
  }

  redirect("/portal/login");
}
