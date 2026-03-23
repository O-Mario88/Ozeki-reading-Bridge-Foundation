import { redirect } from "next/navigation";

export const revalidate = 300;

export default function GovernanceRedirectPage() {
  redirect("/transparency");
}
