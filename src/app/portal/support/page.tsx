import { redirect } from "next/navigation";
import { listSupportRequests, listPortalUsersForAdmin } from "@/services/dataService";
import { getCurrentPortalUser } from "@/lib/auth";
import SupportHubClient from "@/components/portal/SupportHubClient";
import { PortalShell } from "@/components/portal/PortalShell";

export default async function SupportPage() {
    const user = await getCurrentPortalUser();
    if (!user) {
        redirect("/portal/login");
    }

    const isStaff = user.isAdmin || user.isSuperAdmin || user.role === "Staff";
    const filters = isStaff ? undefined : { createdByUserId: user.id };

    // Fetch initial data
    const initialRequests = await listSupportRequests(filters);
    const staffMembers = await listPortalUsersForAdmin(user) as unknown as import("@/lib/types").PortalUserAdminRecord[];

    return (
        <PortalShell
            user={user}
            activeHref="/portal/support"
            title="Support Center"
            description="Get help, access guides, and track your requests."
        >
            <div className="container mx-auto py-8">
                <SupportHubClient
                    user={user}
                    initialRequests={initialRequests}
                    staffMembers={staffMembers}
                />
            </div>
        </PortalShell>
    );
}
