import { PortalShell } from "@/components/portal/PortalShell";
import { StoryLibraryManager } from "@/components/portal/StoryLibraryManager";
import {
    listStoryEntries,
    listStoryAnthologies,
    listSchoolDirectoryRecords,
} from "@/lib/db";
import { requirePortalStaffUser } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Story Library Manager",
    description: "Manage learner-authored stories for the 1001 Story Library.",
};

export default async function PortalStoriesPage() {
    const user = await requirePortalStaffUser();
    const stories = listStoryEntries();
    const anthologies = listStoryAnthologies();
    const schools = listSchoolDirectoryRecords();

    return (
        <PortalShell
            user={user}
            activeHref="/portal/stories"
            title="1001 Story Library"
            description="Create, approve, and publish learner-authored stories. Manage anthologies and consent workflow."
        >
            <StoryLibraryManager
                initialStories={stories}
                initialAnthologies={anthologies}
                schools={schools}
                currentUser={user}
            />
        </PortalShell>
    );
}
