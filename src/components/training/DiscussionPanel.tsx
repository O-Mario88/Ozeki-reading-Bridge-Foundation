"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageSquare, Send, Pin, Trash2, Edit2, Loader2 } from "lucide-react";

interface DiscussionPost {
  id: number;
  sessionId: number;
  parentId: number | null;
  authorUserId: number;
  authorName: string;
  body: string;
  pinned: boolean;
  editedAt: string | null;
  createdAt: string;
  replyCount: number;
}

interface Props {
  sessionId?: number;
  currentUserId?: number;
  currentUserName?: string;
  isAdmin?: boolean;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  } catch {
    return iso;
  }
}

function avatarColor(name: string): string {
  const colors = ["bg-blue-100 text-blue-700", "bg-emerald-100 text-[#066a67]", "bg-purple-100 text-purple-700", "bg-amber-100 text-amber-700", "bg-pink-100 text-pink-700"];
  const hash = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

export function DiscussionPanel({ sessionId, currentUserId, currentUserName, isAdmin = false }: Props) {
  const [posts, setPosts] = useState<DiscussionPost[]>([]);
  const [newBody, setNewBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editBody, setEditBody] = useState("");

  const fetchPosts = useCallback(async () => {
    if (!sessionId) { setLoading(false); return; }
    try {
      const res = await fetch(`/api/portal/training/sessions/${sessionId}/discussions`);
      if (!res.ok) return;
      const data = await res.json();
      setPosts(data.posts ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const submitPost = async () => {
    if (!sessionId) return;
    const body = newBody.trim();
    if (!body) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/portal/training/sessions/${sessionId}/discussions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (res.ok) {
        setNewBody("");
        await fetchPosts();
      }
    } finally {
      setPosting(false);
    }
  };

  const startEdit = (post: DiscussionPost) => {
    setEditingId(post.id);
    setEditBody(post.body);
  };

  const saveEdit = async (id: number) => {
    if (!sessionId) return;
    const body = editBody.trim();
    if (!body) return;
    const res = await fetch(`/api/portal/training/sessions/${sessionId}/discussions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    if (res.ok) {
      setEditingId(null);
      setEditBody("");
      await fetchPosts();
    }
  };

  const deletePost = async (id: number) => {
    if (!sessionId) return;
    if (!window.confirm("Delete this post?")) return;
    await fetch(`/api/portal/training/sessions/${sessionId}/discussions/${id}`, { method: "DELETE" });
    await fetchPosts();
  };

  const togglePin = async (id: number, pinned: boolean) => {
    if (!sessionId) return;
    await fetch(`/api/portal/training/sessions/${sessionId}/discussions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: !pinned }),
    });
    await fetchPosts();
  };

  const topLevel = posts.filter((p) => p.parentId === null);

  if (!sessionId) {
    return (
      <div className="h-full flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-bold text-gray-800">Discussion</h3>
        </div>
        <div className="flex-1 flex items-center justify-center p-6 text-center text-sm text-gray-400">
          Discussion is available once a session is created.
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-gray-400" />
        <h3 className="text-sm font-bold text-gray-800">Discussion</h3>
        {topLevel.length > 0 && (
          <span className="ml-auto text-xs text-gray-500">{topLevel.length} post{topLevel.length === 1 ? "" : "s"}</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {loading && (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-4 h-4 text-gray-300 animate-spin" />
          </div>
        )}

        {!loading && topLevel.length === 0 && (
          <div className="text-center py-10 text-gray-400">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">No discussion yet</p>
            <p className="text-xs mt-1">
              Share what worked in your classroom after this session.
            </p>
          </div>
        )}

        {topLevel.map((p) => {
          const isAuthor = currentUserId != null && p.authorUserId === currentUserId;
          return (
            <div
              key={p.id}
              className={`rounded-xl border p-3 ${p.pinned ? "bg-amber-50 border-amber-100" : "bg-gray-50 border-gray-100"}`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${avatarColor(p.authorName)}`}>
                  {p.authorName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-gray-800 truncate">{p.authorName}</span>
                    {p.pinned && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                        <Pin className="w-2.5 h-2.5" /> Pinned
                      </span>
                    )}
                    <span className="text-xs text-gray-400 ml-auto">
                      {relativeTime(p.createdAt)}
                      {p.editedAt && <span className="ml-1 italic">(edited)</span>}
                    </span>
                  </div>
                  {editingId === p.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
                        rows={3}
                        autoFocus
                      />
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setEditingId(null)} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
                        <button onClick={() => saveEdit(p.id)} className="text-xs font-semibold text-blue-600 hover:underline">Save</button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{p.body}</p>
                  )}
                  {(isAuthor || isAdmin) && editingId !== p.id && (
                    <div className="flex items-center gap-3 mt-2 text-xs">
                      {isAdmin && (
                        <button
                          onClick={() => togglePin(p.id, p.pinned)}
                          className="text-gray-400 hover:text-amber-600 font-medium flex items-center gap-1"
                        >
                          <Pin className="w-3 h-3" /> {p.pinned ? "Unpin" : "Pin"}
                        </button>
                      )}
                      {isAuthor && (
                        <button
                          onClick={() => startEdit(p)}
                          className="text-gray-400 hover:text-blue-600 font-medium flex items-center gap-1"
                        >
                          <Edit2 className="w-3 h-3" /> Edit
                        </button>
                      )}
                      <button
                        onClick={() => deletePost(p.id)}
                        className="text-gray-400 hover:text-red-600 font-medium flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {currentUserId ? (
        <div className="border-t border-gray-100 p-3">
          <div className="flex items-start gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${avatarColor(currentUserName ?? "?")}`}>
              {(currentUserName ?? "?").charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 space-y-2">
              <textarea
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submitPost();
                }}
                placeholder="Share what worked, what didn't, or ask a question…"
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
                rows={2}
              />
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-400">⌘/Ctrl + Enter to post</span>
                <button
                  onClick={submitPost}
                  disabled={!newBody.trim() || posting}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 text-white text-xs font-semibold rounded-lg transition"
                >
                  {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Post
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="border-t border-gray-100 p-4 text-center text-xs text-gray-400">
          Sign in to join the discussion.
        </div>
      )}
    </div>
  );
}
