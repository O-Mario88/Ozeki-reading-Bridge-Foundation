import { redirect } from "next/navigation";
import { listSupportRequests, listPortalUsersForAdmin } from "@/lib/db";
import { getCurrentPortalUser } from "@/lib/portal-auth";
import SupportManager from "@/components/portal/SupportManager";
import { PortalShell } from "@/components/portal/PortalShell";

export default async function SupportPage() {
    const user = await getCurrentPortalUser();
    if (!user) {
        redirect("/portal/login");
    }

    // Fetch initial data
    const initialRequests = listSupportRequests();
    const staffMembers = listPortalUsersForAdmin(user);

    return (
        <PortalShell
            user={user}
            activeHref="/portal/support"
            title="Support Tickets"
            description="Manage and track school support requests."
        >
            <div className="container mx-auto py-8 px-4">
                <SupportManager
                    initialRequests={initialRequests}
                    staffMembers={staffMembers}
                />
            </div>
        </PortalShell>
    );
}
