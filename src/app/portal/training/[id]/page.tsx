import { notFound, redirect } from "next/navigation";
import { TrainingShellSidebar } from "@/components/training/TrainingShellSidebar";
import { TrainingTopBar } from "@/components/training/TrainingTopBar";
import { SessionVideoPanel } from "@/components/training/SessionVideoPanel";
import { SessionTabs } from "@/components/training/SessionTabs";
import { UpNextPanel } from "@/components/training/UpNextPanel";
import { DiscussionPanel } from "@/components/training/DiscussionPanel";
import { requirePortalUser } from "@/lib/auth";
import {
  getTrainingSession,
  listTrainingArtifacts,
  listTrainingResources,
} from "@/lib/training-db";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Training Session | Ozeki Online Training Portal",
};

export default async function TrainingSessionRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePortalUser();
  const { id } = await params;
  const sessionId = parseInt(id, 10);

  const session = await getTrainingSession(sessionId);
  if (!session) return notFound();

  const isHost =
    user.isAdmin ||
    user.isSuperAdmin ||
    session.hostUserId === user.id ||
    session.createdByUserId === user.id;

  // Non-host/non-admin staff go to the participant join page
  if (!isHost) {
    redirect(`/portal/training/${sessionId}/join`);
  }

  const [resources, artifacts] = await Promise.all([
    listTrainingResources(sessionId),
    listTrainingArtifacts(sessionId),
  ]);

  return (
    <div className="h-screen flex overflow-hidden bg-white font-sans text-gray-900">

      {/* 1. Left Sidebar Shell */}
      <TrainingShellSidebar />

      {/* Main App Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">

        {/* 2. Top Bar */}
        <TrainingTopBar sessionTitle={session.title} isStaff={true} />

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-50/30">
          <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">

            <div className="flex flex-col xl:flex-row gap-6 lg:gap-8">

              {/* Center Column: Video + Tabs */}
              <div className="flex-1 min-w-0 flex flex-col gap-6">
                <SessionVideoPanel
                  session={session}
                  trainerName={user.fullName ?? "Ozeki Trainer"}
                  isHost={true}
                  userId={user.id}
                />
                <SessionTabs
                  session={session}
                  resources={resources ?? []}
                  artifacts={artifacts ?? []}
                  isStaff={true}
                  isHost={true}
                />
              </div>

              {/* Right Column: Playlist + Discussion */}
              <div className="w-full xl:w-80 2xl:w-96 shrink-0 flex flex-col gap-6">
                <div className="h-auto xl:h-[40%] min-h-[250px]">
                  <UpNextPanel />
                </div>
                <div className="flex-1 min-h-[400px]">
                  <DiscussionPanel
                    sessionId={session.id}
                    currentUserId={user.id}
                    currentUserName={user.fullName ?? user.email ?? "Staff"}
                    isAdmin={user.isAdmin || user.isSuperAdmin}
                  />
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
