"use client";

import { useState } from "react";
import { FileText, Download, Users, Lightbulb, PlayCircle, Loader2 } from "lucide-react";

type SessionViewModel = {
    agenda?: string | null;
    objectives?: string | null;
    program_tags?: string | null;
    programTags?: string | null;
};

type SessionResourceViewModel = {
    title?: string | null;
    fileUrl?: string | null;
};

type SessionArtifactViewModel = {
    type?: string | null;
    status?: string | null;
};

interface SessionTabsProps {
    session: SessionViewModel;
    resources: unknown[];
    artifacts: unknown[];
    isStaff: boolean;
}

function parseProgramTags(rawTags: string | null | undefined) {
    if (!rawTags) {
        return [] as string[];
    }
    try {
        const parsed = JSON.parse(rawTags) as unknown;
        return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
    } catch {
        return [];
    }
}

function normalizeResource(value: unknown): SessionResourceViewModel {
    if (typeof value !== "object" || value === null) {
        return {};
    }
    const record = value as Record<string, unknown>;
    return {
        title: typeof record.title === "string" ? record.title : null,
        fileUrl:
            typeof record.fileUrl === "string"
                ? record.fileUrl
                : typeof record.externalUrl === "string"
                    ? record.externalUrl
                    : typeof record.storedPath === "string"
                        ? record.storedPath
                        : typeof record.stored_path === "string"
                            ? record.stored_path
                            : null,
    };
}

function normalizeArtifact(value: unknown): SessionArtifactViewModel {
    if (typeof value !== "object" || value === null) {
        return {};
    }
    const record = value as Record<string, unknown>;
    return {
        type: typeof record.type === "string" ? record.type : null,
        status: typeof record.status === "string" ? record.status : null,
    };
}

export function SessionTabs({ session, resources, artifacts, isStaff }: SessionTabsProps) {
    const [activeTab, setActiveTab] = useState("description");
    const normalizedResources = resources.map(normalizeResource);
    const normalizedArtifacts = artifacts.map(normalizeArtifact);

    const tabs = [
        { id: "description", label: "Description" },
        { id: "transcript", label: "Transcript" },
        { id: "notes", label: "AI Notes" },
        { id: "resources", label: "Resources" },
    ];

    if (isStaff) {
        tabs.push({ id: "attendance", label: "Attendance" });
    }

    const hasTranscript = normalizedArtifacts.some(a => a.type === "transcript" && a.status === "available");
    const hasNotes = normalizedArtifacts.some(a => a.type === "ai_notes" && a.status === "available");
    const hasRecording = normalizedArtifacts.some(a => a.type === "recording" && a.status === "available");

    return (
        <div className="mt-8 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[400px]">

            {/* Tab Navigation */}
            <div className="border-b border-gray-100 px-6 pt-4 bg-gray-50/50 sticky top-0 z-10 flex space-x-6 overflow-x-auto custom-scrollbar">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`pb-4 pt-2 px-2 whitespace-nowrap text-sm font-semibold transition-all border-b-2 relative ${
                    activeTab === tab.id
                        ? "border-[#00155F] text-[#00155F]"
                        : "border-transparent text-gray-500 hover:text-gray-900"
                }`}
          >
                {tab.label}
                {/* Soft indicator for new stuff (mocked here based on status) */}
                {(tab.id === "notes" && hasNotes) && (
                    <span className="absolute top-1 right-[-8px] flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                )}
            </button>
        ))}
        </div>

      {/* Tab Content Areas */ }
    <div className="p-6 md:p-8 flex-1 bg-white">

        {/* DESCRIPTION */}
        {activeTab === "description" && (
            <div className="animate-in fade-in duration-300">
                <h3 className="text-lg font-bold text-brand-primary mb-4">Agenda</h3>
                <div className="prose prose-blue prose-sm max-w-none text-gray-600">
                    {session.agenda}
                </div>

                {session.objectives && (
                    <>
                        <h3 className="text-lg font-bold text-brand-primary mt-8 mb-4">Learning Objectives</h3>
                        <div className="prose prose-blue prose-sm max-w-none text-gray-600">
                            {session.objectives}
                        </div>
                    </>
                )}

                <div className="mt-8 pt-8 border-t border-gray-100 flex items-center space-x-6">
                    <div className="flex flex-col">
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Tags</span>
                        <div className="flex space-x-2">
                            {parseProgramTags(session.program_tags ?? session.programTags).map((tag) => (
                                <span key={tag} className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* TRANSCRIPT & RECORDING */}
        {activeTab === "transcript" && (
            <div className="animate-in fade-in duration-300">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-brand-primary">Session Artifacts</h3>
                    {isStaff && (
                        <button className="text-sm text-blue-600 hover:underline">Sync from Google</button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Recording Card */}
                    <div className="p-5 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-between">
                        <div className="flex items-center">
                            <div className={`p-3 rounded-lg mr-4 ${hasRecording ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-400'}`}>
                            <PlayCircle className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="font-bold text-brand-primary">Video Recording</h4>
                            <p className="text-sm text-gray-500">{hasRecording ? "Available on Drive" : "Waiting for Meet sync"}</p>
                        </div>
                    </div>
                    {hasRecording && (
                        <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                            Open Video
                        </button>
                    )}
                </div>

                {/* Transcript Card */}
                <div className="p-5 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-between">
                    <div className="flex items-center">
                        <div className={`p-3 rounded-lg mr-4 ${hasTranscript ? 'bg-amber-100 text-amber-600' : 'bg-gray-200 text-gray-400'}`}>
                        <FileText className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-brand-primary">Full Transcript</h4>
                        <p className="text-sm text-gray-500">{hasTranscript ? "Available" : "Will appear post-session"}</p>
                    </div>
                </div>
                {hasTranscript && (
                    <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                        Open Doc
                    </button>
                )}
            </div>
             </div>
          </div >
        )
}

{/* AI NOTES */ }
{
    activeTab === "notes" && (
        <div className="animate-in fade-in duration-300">
            {hasNotes ? (
                <div>
                    <div className="flex items-center space-x-3 mb-6 bg-amber-50 border border-amber-200 p-4 rounded-xl">
                        <Lightbulb className="w-6 h-6 text-amber-500" />
                        <div>
                            <h3 className="font-bold text-amber-900">Ozeki AI Meeting Minutes</h3>
                            <p className="text-sm text-amber-700">Strictly fact-checked against the transcript. Review recommended.</p>
                        </div>
                        <div className="ml-auto">
                            <button className="flex items-center px-4 py-2 bg-amber-600 text-white text-sm font-bold rounded-lg hover:bg-amber-700 transition-colors">
                                <Download className="w-4 h-4 mr-2" /> PDF Export
                            </button>
                        </div>
                    </div>
                    <div className="p-8 border border-gray-200 rounded-xl bg-white shadow-sm prose prose-sm max-w-none prose-h2:text-[#00155F] prose-h2:mb-4">
                        {/* The HTML notes from training_notes table would be injected here */}
                        <p className="text-gray-500 italic">Notes preview available in PDF export.</p>
                    </div>
                </div>
            ) : (
                <div className="text-center py-16 px-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Loader2 className="w-8 h-8 text-gray-400 rotate-180" />
                    </div>
                    <h3 className="text-lg font-bold text-brand-primary mb-2">Notes not available yet</h3>
                    <p className="text-gray-500 max-w-md mx-auto">
                        Once the session concludes and the Google Meet transcript finishes processing, AI meeting notes will appear here.
                    </p>
                </div>
            )}
        </div>
    )
}

{/* RESOURCES */ }
{
    activeTab === "resources" && (
        <div className="animate-in fade-in duration-300">
            <h3 className="text-lg font-bold text-brand-primary mb-6">Session Materials</h3>
            {normalizedResources.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 rounded-xl border border-gray-200 border-dashed">
                    <p className="text-gray-500">No resources uploaded for this session yet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {normalizedResources.map((r, i) => (
                        <div key={i} className="group p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between">
                            <div className="flex items-start mb-4">
                                <FileText className="w-8 h-8 text-blue-500 shrink-0 mr-3" />
                                <h4 className="font-medium text-brand-primary text-sm line-clamp-2">{r.title || "Resource"}</h4>
                            </div>
                            <a href={r.fileUrl || "#"} download className="text-sm font-bold text-blue-600 group-hover:underline flex items-center">
                                Download <Download className="w-3 h-3 ml-1" />
                            </a>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

{/* ATTENDANCE (Staff) */ }
{
    activeTab === "attendance" && isStaff && (
        <div className="animate-in fade-in duration-300">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-brand-primary flex items-center">
                    <Users className="w-5 h-5 mr-2 text-gray-400" />
                    Participant Roster Tracker
                </h3>
                <button className="px-4 py-2 bg-[#00155F] text-white text-sm font-medium rounded-lg hover:bg-opacity-90 transition-colors">
                    Export Roster
                </button>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
                <p className="text-gray-600">Roster management UI module goes here.</p>
            </div>
        </div>
    )
}

      </div >
    </div >
  );
}
