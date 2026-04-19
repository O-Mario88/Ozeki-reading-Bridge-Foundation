"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { PlayCircle, Plus, Trash2, Video, ListChecks, Clock } from "lucide-react";

interface Chapter {
  id: number;
  sessionId: number;
  title: string;
  description: string | null;
  startSeconds: number;
  sortOrder: number;
}

interface Props {
  sessionId: number;
  recordingUrl: string | null;
  canEdit?: boolean;
  initialChapters?: Chapter[];
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function parseTimeInput(input: string): number | null {
  const parts = input.trim().split(":").reverse();
  if (parts.length > 3) return null;
  let seconds = 0;
  for (let i = 0; i < parts.length; i++) {
    const n = Number(parts[i]);
    if (!Number.isFinite(n) || n < 0) return null;
    seconds += n * Math.pow(60, i);
  }
  return seconds;
}

export function SessionReplayPlayer({
  sessionId,
  recordingUrl,
  canEdit = false,
  initialChapters = [],
}: Props) {
  const [chapters, setChapters] = useState<Chapter[]>(initialChapters);
  const [currentChapterId, setCurrentChapterId] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTime, setNewTime] = useState("00:00");
  const [newDescription, setNewDescription] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);

  const fetchChapters = useCallback(async () => {
    try {
      const res = await fetch(`/api/portal/training/sessions/${sessionId}/chapters`);
      if (!res.ok) return;
      const data = await res.json();
      setChapters(data.chapters ?? []);
    } catch {
      // ignore
    }
  }, [sessionId]);

  useEffect(() => {
    if (initialChapters.length === 0) fetchChapters();
  }, [fetchChapters, initialChapters.length]);

  // Watch video timeupdate to highlight the currently-playing chapter
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onUpdate = () => {
      const t = Math.floor(video.currentTime);
      setCurrentTime(t);
      // Find the chapter whose start_seconds is the greatest <= current time
      const active = [...chapters]
        .sort((a, b) => a.startSeconds - b.startSeconds)
        .reduce<Chapter | null>((acc, c) => (c.startSeconds <= t ? c : acc), null);
      setCurrentChapterId(active?.id ?? null);
    };
    video.addEventListener("timeupdate", onUpdate);
    return () => video.removeEventListener("timeupdate", onUpdate);
  }, [chapters]);

  const jumpTo = (seconds: number, chapterId: number) => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = seconds;
      video.play().catch(() => {});
    }
    setCurrentChapterId(chapterId);
  };

  const handleAddChapter = async () => {
    const parsed = parseTimeInput(newTime);
    if (parsed == null || !newTitle.trim()) return;
    try {
      const res = await fetch(`/api/portal/training/sessions/${sessionId}/chapters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          description: newDescription.trim() || null,
          startSeconds: parsed,
        }),
      });
      if (res.ok) {
        setNewTitle("");
        setNewDescription("");
        setNewTime("00:00");
        setIsAdding(false);
        await fetchChapters();
      }
    } catch {
      // ignore
    }
  };

  const handleDeleteChapter = async (id: number) => {
    if (!window.confirm("Delete this chapter marker?")) return;
    await fetch(`/api/portal/training/sessions/${sessionId}/chapters/${id}`, { method: "DELETE" });
    await fetchChapters();
  };

  const handleAddAtCurrent = () => {
    setNewTime(formatTime(currentTime));
    setIsAdding(true);
  };

  return (
    <div className="grid md:grid-cols-3 gap-5">
      {/* Video player */}
      <div className="md:col-span-2 space-y-3">
        {recordingUrl ? (
          <div className="rounded-2xl overflow-hidden bg-black shadow-lg">
            <video
              ref={videoRef}
              src={recordingUrl}
              controls
              className="w-full aspect-video"
              preload="metadata"
            />
          </div>
        ) : (
          <div className="rounded-2xl bg-gray-900 aspect-video flex flex-col items-center justify-center text-gray-500">
            <Video className="w-12 h-12 mb-3 opacity-40" />
            <p className="font-semibold">No recording available yet</p>
            <p className="text-xs mt-1">The recording will appear here shortly after the session ends.</p>
          </div>
        )}

        {canEdit && recordingUrl && (
          <button
            onClick={handleAddAtCurrent}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-800 font-semibold text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Mark chapter at {formatTime(currentTime)}
          </button>
        )}
      </div>

      {/* Chapters sidebar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
            <ListChecks className="w-4 h-4 text-gray-400" />
            Chapters
          </h3>
          {canEdit && !isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="text-xs text-blue-600 font-semibold hover:underline"
            >
              + Add
            </button>
          )}
        </div>

        {/* Add chapter form */}
        {canEdit && isAdding && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 space-y-2">
            <input
              type="text"
              placeholder="Chapter title (e.g. Introduction, Practice)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
              autoFocus
            />
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="mm:ss"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="w-24 px-3 py-2 text-sm font-mono rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setIsAdding(false); setNewTitle(""); setNewDescription(""); }}
                className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleAddChapter}
                disabled={!newTitle.trim()}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:bg-blue-300 transition"
              >
                Add Chapter
              </button>
            </div>
          </div>
        )}

        {chapters.length === 0 && !isAdding && (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 py-6 text-center">
            <Clock className="w-6 h-6 text-gray-300 mx-auto mb-2" />
            <p className="text-xs text-gray-400">No chapters yet</p>
            {canEdit && (
              <p className="text-xs text-gray-400 mt-1">
                Add markers like &ldquo;Introduction&rdquo;, &ldquo;Demo&rdquo;, &ldquo;Q&amp;A&rdquo;.
              </p>
            )}
          </div>
        )}

        <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
          {chapters.map((c) => {
            const active = currentChapterId === c.id;
            return (
              <div
                key={c.id}
                className={`group rounded-xl transition-colors ${active ? "bg-blue-50 border border-blue-200" : "bg-white border border-gray-100 hover:border-gray-200"}`}
              >
                <button
                  onClick={() => jumpTo(c.startSeconds, c.id)}
                  disabled={!recordingUrl}
                  className="w-full flex items-start gap-3 p-3 text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PlayCircle className={`w-5 h-5 shrink-0 mt-0.5 ${active ? "text-blue-600" : "text-gray-400"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-xs font-mono font-semibold ${active ? "text-blue-700" : "text-gray-500"}`}>
                        {formatTime(c.startSeconds)}
                      </span>
                      {active && <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Playing</span>}
                    </div>
                    <p className={`text-sm font-semibold truncate ${active ? "text-blue-900" : "text-gray-800"}`}>
                      {c.title}
                    </p>
                    {c.description && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{c.description}</p>
                    )}
                  </div>
                  {canEdit && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteChapter(c.id); }}
                      className="p-1 text-gray-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
                      aria-label="Delete chapter"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
