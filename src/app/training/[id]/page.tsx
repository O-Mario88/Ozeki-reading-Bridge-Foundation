import { notFound } from "next/navigation";
import { TrainingShellSidebar } from "@/components/training/TrainingShellSidebar";
import { TrainingTopBar } from "@/components/training/TrainingTopBar";
import { SessionVideoPanel } from "@/components/training/SessionVideoPanel";
import { SessionTabs } from "@/components/training/SessionTabs";
import { UpNextPanel } from "@/components/training/UpNextPanel";
import { DiscussionPanel } from "@/components/training/DiscussionPanel";
import {
  getTrainingSession,
  listTrainingArtifacts,
  listTrainingResources,
} from "@/lib/training-db";

export const revalidate = 300;

export const metadata = {
    title: "Session Room | Ozeki Online Training",
};

export default async function PublicSessionRoomPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const sessionId = Number(id);
    if (!Number.isFinite(sessionId) || sessionId <= 0) notFound();

    // Direct repository calls — self-fetching /api/* during SSG causes build-host
    // "socket hang up" errors.
    const session = await getTrainingSession(sessionId);
    if (!session) notFound();
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
        <TrainingTopBar sessionTitle={session.title} isStaff={false} />

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-50/30">
          <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
            
            <div className="flex flex-col xl:flex-row gap-6 lg:gap-8">
              
              {/* Center Column: Video + Tabs */}
              <div className="flex-1 min-w-0 flex flex-col">
                <SessionVideoPanel session={session} isHost={false} />
                <SessionTabs 
                  session={session} 
                  resources={resources || []} 
                  artifacts={artifacts || []} 
                  isStaff={false} 
                />
              </div>

              {/* Right Column: Playlist + Discussion */}
              <div className="w-full xl:w-80 2xl:w-96 shrink-0 flex flex-col gap-6">
                 {/* Stack Panels vertically */}
                 <div className="h-auto xl:h-[40%] min-h-[250px]">
                   <UpNextPanel />
                 </div>
                 <div className="flex-1 min-h-[400px]">
                   <DiscussionPanel sessionId={session.id} />
                 </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
