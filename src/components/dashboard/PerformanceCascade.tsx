import { useState } from "react";

// --- Types ---

export type PerformanceLevel = "Country" | "Region" | "District" | "Sub-County" | "School";

export interface PerformanceNode {
    id: string;
    name: string;
    level: PerformanceLevel;
    scores: {
        instruction: number;
        outcomes: number;
        leadership: number;
        community: number;
        environment: number;
    };
    children: PerformanceNode[];
    schoolCount: number;
    isWeaningEligible?: boolean;
    history?: Record<string, {
        instruction: number;
        outcomes: number;
        leadership: number;
        community: number;
        environment: number;
    }>; // Keyed by year/programType
}

interface PerformanceCascadeProps {
    data: PerformanceNode; // Country root node
}

// --- Helper Components ---

function ScoreBadge({ score }: { score: number }) {
    let colorClass = "bg-red-100 text-red-800";
    if (score >= 8) colorClass = "bg-green-100 text-green-800";
    else if (score >= 5) colorClass = "bg-yellow-100 text-yellow-800";

    return (
        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${colorClass}`}>
            {score.toFixed(1)}
        </span>
    );
}

function NodeCard({ node, expanded, onToggle }: { node: PerformanceNode; expanded: boolean; onToggle: () => void }) {
    const isSchool = node.level === "School";

    return (
        <div className={`border rounded-lg mb-2 overflow-hidden ${isSchool ? "ml-4 border-l-4 border-l-blue-500" : "bg-white"}`}>
            <div
                className={`p-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 ${isSchool ? "bg-slate-50" : ""}`}
                onClick={onToggle}
            >
                <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded ${getLevelColor(node.level)}`}>
                        {node.level}
                    </span>
                    <span className="font-semibold text-slate-800">{node.name}</span>
                    {!isSchool && <span className="text-xs text-slate-500">({node.schoolCount} schools)</span>}
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex gap-2 text-xs text-slate-600">
                        <div className="flex flex-col items-center">
                            <span className="mb-1">Instr.</span>
                            <ScoreBadge score={node.scores.instruction} />
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="mb-1">Outc.</span>
                            <ScoreBadge score={node.scores.outcomes} />
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="mb-1">Lead.</span>
                            <ScoreBadge score={node.scores.leadership} />
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="mb-1">Comm.</span>
                            <ScoreBadge score={node.scores.community} />
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="mb-1">Env.</span>
                            <ScoreBadge score={node.scores.environment} />
                        </div>
                    </div>

                    {isSchool && node.isWeaningEligible && (
                        <span className="bg-green-600 text-white text-[10px] uppercase font-bold px-2 py-1 rounded-full animate-pulse">
                            Wean Ready
                        </span>
                    )}

                    <span className="text-slate-400">
                        {expanded ? "▼" : "▶"}
                    </span>
                </div>
            </div>

            {expanded && node.children.length > 0 && (
                <div className="p-2 pl-4 border-t bg-slate-50/50">
                    {node.children.map((child) => (
                        <RecursiveNode key={child.id} node={child} />
                    ))}
                </div>
            )}
        </div>
    );
}

function RecursiveNode({ node }: { node: PerformanceNode }) {
    const [expanded, setExpanded] = useState(false);
    return <NodeCard node={node} expanded={expanded} onToggle={() => setExpanded(!expanded)} />;
}

function getLevelColor(level: PerformanceLevel) {
    switch (level) {
        case "Country": return "bg-purple-100 text-purple-800";
        case "Region": return "bg-blue-100 text-blue-800";
        case "District": return "bg-indigo-100 text-indigo-800";
        case "Sub-County": return "bg-cyan-100 text-cyan-800";
        case "School": return "bg-slate-200 text-slate-700";
        default: return "bg-gray-100 text-gray-800";
    }
}

// --- Main Component ---

export function PerformanceCascade({ data }: PerformanceCascadeProps) {
    // Always expand Country by default
    const [expanded, setExpanded] = useState(true);

    if (!data) return <div className="p-4 text-slate-500">No performance data available.</div>;

    return (
        <section className="card">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h2>School Performance Scorecard</h2>
                    <p className="text-sm text-slate-500">
                        Average scores (0-10) aggregated by location. Schools scoring ≥ 8 in all areas are eligible for weaning.
                    </p>
                </div>
            </div>

            <div className="performance-tree">
                <NodeCard node={data} expanded={expanded} onToggle={() => setExpanded(!expanded)} />
            </div>

            <div className="mt-4 text-xs text-slate-400 flex gap-4 border-t pt-2">
                <span><strong>Instr.</strong> = Instruction Quality</span>
                <span><strong>Outc.</strong> = Learner Outcomes</span>
                <span><strong>Lead.</strong> = Leadership & Governance</span>
                <span><strong>Comm.</strong> = Community Engagement</span>
                <span><strong>Env.</strong> = Safe Learning Environment</span>
            </div>
        </section>
    );
}
