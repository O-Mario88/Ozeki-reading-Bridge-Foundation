"use client";

import { useState } from "react";
import type { StoryComment } from "@/lib/types";

interface Props {
    slug: string;
    initialStats: { averageStars: number | null, ratingCount: number };
    initialComments: StoryComment[];
}

export function StoryFeedback({ slug, initialStats, initialComments }: Props) {
    const [ratingStats, setRatingStats] = useState(initialStats);
    const [comments, setComments] = useState(initialComments);
    const [hoverRating, setHoverRating] = useState(0);
    const [userRating, setUserRating] = useState(0);
    const [commentText, setCommentText] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState("");
    const [hasRated, setHasRated] = useState(false);

    const handleRate = async (stars: number) => {
        if (hasRated) return;
        setUserRating(stars);
        setHasRated(true);

        try {
            const res = await fetch(`/api/stories/${slug}/ratings`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ stars })
            });
            const data = await res.json();
            if (data.success && data.stats) {
                setRatingStats({
                    averageStars: data.stats.average_stars,
                    ratingCount: data.stats.rating_count
                });
            }
        } catch (_err) {
            console.error("Failed to submit rating", _err);
        }
    };

    const handleComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentText.trim() || submitting) return;
        setSubmitting(true);
        setMessage("");

        try {
            const res = await fetch(`/api/stories/${slug}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ commentText, displayName: displayName || "Anonymous Reader" })
            });
            const data = await res.json();

            if (data.success && data.comment) {
                setComments([data.comment, ...comments]);
                setCommentText("");
                setMessage("Your comment was posted successfully!");
            } else {
                setMessage(data.error || "Failed to post comment");
            }
        } catch (_err) {
            setMessage("Error posting comment.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="story-feedback-section" style={{ marginTop: "3rem", paddingTop: "2rem", borderTop: "2px solid var(--md-sys-color-outline-variant)" }}>
            <h3>Reader Feedback</h3>

            <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap", alignItems: "flex-start", marginTop: "1.5rem" }}>
                {/* Rating Area */}
                <div className="card" style={{ flex: "1 1 300px", padding: "1.5rem" }}>
                    <h4 style={{ marginTop: 0 }}>Rate this Story</h4>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem", margin: "1rem 0" }}>
                        <div style={{ display: "flex", gap: "0.2rem", fontSize: "2rem", cursor: hasRated ? "default" : "pointer" }}>
                            {[1, 2, 3, 4, 5].map(star => (
                                <span
                                    key={star}
                                    onMouseEnter={() => !hasRated && setHoverRating(star)}
                                    onMouseLeave={() => !hasRated && setHoverRating(0)}
                                    onClick={() => handleRate(star)}
                                    style={{ color: (hoverRating || userRating) >= star ? "#ffc107" : "#e0e0e0", transition: "color 0.2s" }}
                                >
                                    ★
                                </span>
                            ))}
                        </div>
                        {ratingStats.averageStars !== null && (
                            <div style={{ fontSize: "0.9rem", color: "var(--md-sys-color-on-surface-variant)" }}>
                                {ratingStats.averageStars.toFixed(1)} out of 5 ({ratingStats.ratingCount} ratings)
                            </div>
                        )}
                    </div>
                    {hasRated && <p style={{ color: "var(--md-sys-color-primary)", margin: 0, fontSize: "0.9rem" }}>Thanks for your feedback!</p>}
                </div>

                {/* Comment Form */}
                <div className="card" style={{ flex: "2 1 400px", padding: "1.5rem" }}>
                    <h4 style={{ marginTop: 0 }}>Leave a Comment</h4>
                    <form onSubmit={handleComment} style={{ display: "grid", gap: "1rem", marginTop: "1rem" }}>
                        <div>
                            <input
                                type="text"
                                placeholder="Your Name (Optional)"
                                value={displayName}
                                onChange={e => setDisplayName(e.target.value)}
                                style={{ width: "100%", maxWidth: "300px" }}
                            />
                        </div>
                        <div>
                            <textarea
                                placeholder="What did you think of the story?"
                                value={commentText}
                                onChange={e => setCommentText(e.target.value)}
                                rows={3}
                                required
                                style={{ width: "100%" }}
                            />
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                            <button type="submit" className="button" disabled={submitting || !commentText.trim()}>
                                {submitting ? "Posting..." : "Post Comment"}
                            </button>
                            {message && <span style={{ fontSize: "0.9rem", color: message.includes("success") ? "var(--md-sys-color-primary)" : "red" }}>{message}</span>}
                        </div>
                    </form>
                </div>
            </div>

            {/* Comment List */}
            <div style={{ marginTop: "3rem" }}>
                <h4>Comments ({comments.length})</h4>
                {comments.length === 0 ? (
                    <p style={{ color: "var(--md-sys-color-on-surface-variant)", fontStyle: "italic" }}>No comments yet. Be the first to share your thoughts!</p>
                ) : (
                    <div style={{ display: "grid", gap: "1.5rem", marginTop: "1.5rem" }}>
                        {comments.map(c => (
                            <div key={c.id} style={{ padding: "1rem", backgroundColor: "var(--md-sys-color-surface-variant)", borderRadius: "8px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                                    <strong>{c.displayName || "Anonymous Reader"}</strong>
                                    <small style={{ opacity: 0.7 }}>{new Date(c.createdAt).toLocaleDateString()}</small>
                                </div>
                                <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{c.commentText}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
