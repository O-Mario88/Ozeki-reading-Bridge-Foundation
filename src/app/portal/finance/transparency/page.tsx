import { PortalFinanceTransparencyManager } from "@/components/portal/finance/PortalFinanceTransparencyManager";
import { FinanceShell } from "@/components/portal/finance/FinanceShell";
import { requirePortalSuperAdminUser } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Financial Transparency",
    description: "Manage public financial snapshots and audited statements for donor trust.",
};

export default async function PortalFinanceTransparencyPage() {
    const user = await requirePortalSuperAdminUser();

    return (
        <FinanceShell user={user} activeHref="/portal/finance/transparency" title="Financial Transparency">
            <PortalFinanceTransparencyManager />
        </FinanceShell>
    );
}
