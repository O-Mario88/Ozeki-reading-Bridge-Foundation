import Link from "next/link";
import { requireExternalUser } from "@/lib/external-auth";
import { ExternalShell } from "@/components/external/ExternalShell";

export const dynamic = "force-dynamic";

export default async function DonorDashboardPage() {
  const user = await requireExternalUser("donor");
  return (
    <ExternalShell
      user={user}
      roleLabel="Donor"
      title="Your impact dashboard"
      description="See where your support is going and the children, teachers, and schools it's reaching."
      navItems={[
        { href: "/portal/donors/dashboard", label: "Overview" },
        { href: `/portal/donors/${user.refCode}/portfolio`, label: "Portfolio" },
      ]}
    >
      <p className="text-sm text-gray-700">
        Welcome to your donor portal. Open your{" "}
        <Link href={`/portal/donors/${user.refCode}/portfolio`} className="text-[#066a67] font-semibold hover:underline">
          full portfolio
        </Link>{" "}
        to see allocations, attribution, and your year-end tax summary.
      </p>
    </ExternalShell>
  );
}
