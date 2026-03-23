"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Eye,
  Heart,
  MessageCircle,
} from "lucide-react";
import { ArticleContentsRail } from "@/components/blog/ArticleContentsRail";
import { ArticleHeaderStandard } from "@/components/blog/ArticleHeaderStandard";
import { ArticleReadTimeCard } from "@/components/blog/ArticleReadTimeCard";
import { ArticleSpotlightSidebar } from "@/components/blog/ArticleSpotlightSidebar";
import { ArticleShareActions } from "@/components/blog/ArticleShareActions";
import { EditorialArticleBody } from "@/components/blog/EditorialArticleBody";
import styles from "@/components/blog/EditorialBlog.module.css";
import { formatPostDate, getPostCoverImage, prepareEditorialPost, selectSpotlightPosts } from "@/lib/blog-editorial";
import type { BlogComment, BlogPost } from "@/lib/types";

type EditorialArticleLayoutProps = {
  post: BlogPost;
  allPosts: BlogPost[];
  previewMode?: boolean;
};

type EngagementApiResponse = {
  engagement: {
    postSlug: string;
    viewCount: number;
    likeCount: number;
    commentCount: number;
    likedByViewer: boolean;
    comments: BlogComment[];
  };
};

function avatarInitials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function EditorialArticleLayout({
  post,
  allPosts,
  previewMode = false,
}: EditorialArticleLayoutProps) {
  const prepared = useMemo(() => prepareEditorialPost(post), [post]);
  const toc = prepared.toc;
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(toc[0]?.id ?? null);
  const [progressPercent, setProgressPercent] = useState(0);

  const shareUrl = useMemo(() => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/blog/${post.slug}`;
    }
    return `https://www.ozekiread.org/blog/${post.slug}`;
  }, [post.slug]);

  const spotlightPosts = useMemo(() => selectSpotlightPosts(post, allPosts, 5), [allPosts, post]);
  const categories = useMemo(
    () => [...new Set(allPosts.map((item) => item.primaryCategory || item.category).filter(Boolean))],
    [allPosts],
  );
  const articleBodyId = previewMode ? "editorial-article-body-preview" : "editorial-article-body";
  const chronPosts = useMemo(
    () =>
      [...allPosts].sort(
        (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
      ),
    [allPosts],
  );
  const currentPostIndex = useMemo(
    () => chronPosts.findIndex((item) => item.slug === post.slug),
    [chronPosts, post.slug],
  );
  const previousPost = currentPostIndex >= 0 ? chronPosts[currentPostIndex + 1] ?? null : null;
  const nextPost = currentPostIndex > 0 ? chronPosts[currentPostIndex - 1] ?? null : null;
  const previousPostImage = previousPost ? getPostCoverImage(previousPost, "thumb") : null;
  const nextPostImage = nextPost ? getPostCoverImage(nextPost, "thumb") : null;
  const updatedAtCandidate = (post as BlogPost & { updatedAt?: string }).updatedAt;
  const updatedLabel = formatPostDate(
    typeof updatedAtCandidate === "string" && updatedAtCandidate.trim()
      ? updatedAtCandidate
      : post.publishedAt,
  );
  const initialViewCount =
    typeof post.views === "number" && Number.isFinite(post.views) && post.views > 0
      ? Math.round(post.views)
      : 0;
  const initialLikeCount =
    typeof post.likes === "number" && Number.isFinite(post.likes) && post.likes > 0
      ? Math.round(post.likes)
      : 0;
  const initialCommentCount =
    typeof post.commentCount === "number" && Number.isFinite(post.commentCount) && post.commentCount > 0
      ? Math.round(post.commentCount)
      : 0;

  const [viewCount, setViewCount] = useState(initialViewCount);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [commentCount, setCommentCount] = useState(initialCommentCount);
  const [likedByViewer, setLikedByViewer] = useState(false);
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [commentName, setCommentName] = useState("");
  const [commentText, setCommentText] = useState("");
  const [engagementBusy, setEngagementBusy] = useState(false);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [engagementError, setEngagementError] = useState("");
  const publishedLabel = formatPostDate(post.publishedAt);

  const renderAuthorInfoCard = (className: string) => (
    <section className={`${styles.readTimeCard} ${styles.authorInfoCard} ${className}`}>
      <div className={styles.authorMeta}>
        <span className={styles.authorAvatarFallback}>{avatarInitials(post.author)}</span>
        <div>
          <p className={styles.authorName}>{post.author}</p>
        </div>
      </div>

      <p className={styles.authorRole}>
        <MessageCircle size={14} aria-hidden="true" />
        {commentCount}
        <Heart size={14} aria-hidden="true" />
        {likeCount}
        <Eye size={14} aria-hidden="true" />
        {viewCount}
        <span>{publishedLabel}</span>
      </p>

      <ArticleShareActions permalink={shareUrl} title={post.title} />
    </section>
  );

  useEffect(() => {
    if (previewMode || toc.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target?.id) {
          setActiveHeadingId(visible[0].target.id);
        }
      },
      {
        rootMargin: "-28% 0px -58% 0px",
        threshold: [0.1, 0.7],
      },
    );

    toc.forEach((item) => {
      const node = document.getElementById(item.id);
      if (node) {
        observer.observe(node);
      }
    });

    return () => observer.disconnect();
  }, [previewMode, toc]);

  useEffect(() => {
    if (previewMode) {
      setProgressPercent(0);
      return;
    }

    const updateProgress = () => {
      const articleNode = document.getElementById(articleBodyId);
      if (!articleNode) {
        return;
      }
      const rect = articleNode.getBoundingClientRect();
      const totalScrollable = rect.height - window.innerHeight;
      if (totalScrollable <= 0) {
        setProgressPercent(rect.top <= window.innerHeight * 0.45 ? 100 : 0);
        return;
      }
      const scrolled = Math.min(totalScrollable, Math.max(0, -rect.top + window.innerHeight * 0.22));
      setProgressPercent((scrolled / totalScrollable) * 100);
    };

    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
    return () => {
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, [articleBodyId, post.slug, previewMode]);

  function applyEngagement(data: EngagementApiResponse) {
    setViewCount(Math.max(0, Math.round(data.engagement.viewCount || 0)));
    setLikeCount(Math.max(0, Math.round(data.engagement.likeCount || 0)));
    setCommentCount(Math.max(0, Math.round(data.engagement.commentCount || 0)));
    setLikedByViewer(Boolean(data.engagement.likedByViewer));
    setComments(Array.isArray(data.engagement.comments) ? data.engagement.comments : []);
  }

  async function sendEngagementAction(
    action: "view" | "like" | "comment",
    payload?: { displayName?: string; commentText?: string },
  ) {
    const response = await fetch(`/api/blog/${encodeURIComponent(post.slug)}/engagement`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action,
        ...payload,
      }),
    });
    const data = (await response.json()) as EngagementApiResponse & { error?: string };
    if (!response.ok || !data.engagement) {
      throw new Error(data.error ?? "Could not update engagement.");
    }
    applyEngagement(data);
  }

  useEffect(() => {
    if (previewMode) {
      return;
    }

    let active = true;
    setEngagementError("");
    setCommentText("");
    setViewCount(initialViewCount);
    setLikeCount(initialLikeCount);
    setCommentCount(initialCommentCount);
    setLikedByViewer(false);
    setComments([]);

    const hydrate = async () => {
      try {
        const response = await fetch(`/api/blog/${encodeURIComponent(post.slug)}/engagement`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action: "view" }),
        });
        const data = (await response.json()) as EngagementApiResponse & { error?: string };
        if (!active || !response.ok || !data.engagement) {
          return;
        }
        applyEngagement(data);
      } catch {
        // Ignore engagement fetch failures to keep reading uninterrupted.
      }
    };

    void hydrate();
    return () => {
      active = false;
    };
  }, [post.slug, previewMode, initialCommentCount, initialLikeCount, initialViewCount]);

  async function handleLike() {
    if (previewMode || engagementBusy) {
      return;
    }
    setEngagementBusy(true);
    setEngagementError("");
    try {
      await sendEngagementAction("like");
    } catch (error) {
      setEngagementError(error instanceof Error ? error.message : "Could not record like.");
    } finally {
      setEngagementBusy(false);
    }
  }

  async function handleCommentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (previewMode || commentSubmitting) {
      return;
    }

    const trimmedText = commentText.trim();
    if (trimmedText.length < 2) {
      setEngagementError("Comment must be at least 2 characters.");
      return;
    }

    setCommentSubmitting(true);
    setEngagementError("");
    try {
      await sendEngagementAction("comment", {
        displayName: commentName.trim() || "Anonymous",
        commentText: trimmedText,
      });
      setCommentText("");
    } catch (error) {
      setEngagementError(error instanceof Error ? error.message : "Could not submit comment.");
    } finally {
      setCommentSubmitting(false);
    }
  }

  function formatCommentDate(value: string) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toLocaleDateString("en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  const hasRightRail = spotlightPosts.length > 0;
  const articleHeader = (
    <ArticleHeaderStandard
      post={post}
      categories={prepared.categories}
    />
  );

  return (
    <div className={`${styles.blogRoot} ${previewMode ? styles.previewMode : ""}`.trim()}>
      <section className={styles.articleShell}>
        <div className={styles.blogContainer}>
          <div className={`${styles.articleGrid} ${!hasRightRail ? styles.articleGridNoRight : ""}`.trim()}>
            <section className={styles.heroSpan}>
              {articleHeader}
            </section>

            <aside className={styles.leftRail}>
              <ArticleReadTimeCard
                readTimeLabel={prepared.readTimeLabel}
                progressPercent={progressPercent}
              />
              <ArticleContentsRail toc={toc} activeHeadingId={activeHeadingId} />
              {renderAuthorInfoCard(styles.leftAuthorCard)}
            </aside>

            <main className={styles.articleMain}>
              {toc.length > 0 ? (
                <details className={styles.mobileToc}>
                  <summary>Contents</summary>
                  <div className={styles.mobileTocContent}>
                    <ArticleContentsRail toc={toc} activeHeadingId={activeHeadingId} />
                  </div>
                </details>
              ) : null}
              {renderAuthorInfoCard(styles.mobileAuthorCard)}

              <div id={articleBodyId}>
                <EditorialArticleBody blocks={prepared.blocks} toc={toc} />
              </div>

              <footer className={styles.articleFooter}>
                <hr className={styles.articleDivider} />

                <div className={styles.footerMetaTop}>
                  <div className={styles.footerCategoryRow}>
                    {prepared.categories.map((category) => (
                      <span key={`footer-${category}`} className={styles.headerCategoryTag}>
                        <CircleDot size={13} aria-hidden="true" />
                        {category}
                      </span>
                    ))}
                  </div>
                  <p className={styles.footerUpdated}>Updated on {updatedLabel}</p>
                </div>

                <div className={styles.footerStatsRow}>
                  <span className={styles.footerStat}>
                    <Eye size={14} aria-hidden="true" />
                    {viewCount}
                  </span>
                  <span className={styles.footerStat}>
                    <MessageCircle size={14} aria-hidden="true" />
                    {commentCount}
                  </span>
                  <button
                    type="button"
                    className={`${styles.footerStat} ${styles.footerStatButton}`}
                    onClick={() => {
                      void handleLike();
                    }}
                    disabled={previewMode || engagementBusy}
                    aria-pressed={likedByViewer}
                    title={likedByViewer ? "Unlike this article" : "Like this article"}
                  >
                    <Heart size={14} fill={likedByViewer ? "currentColor" : "none"} aria-hidden="true" />
                    {likeCount}
                  </button>
                </div>

                <ArticleShareActions permalink={shareUrl} title={post.title} />

                <hr className={styles.articleDivider} />

                <div className={styles.prevNextGrid}>
                  {previousPost ? (
                    <article className={styles.prevNextCard}>
                      <Link href={`/blog/${previousPost.slug}`} className={styles.prevNextLink}>
                        <div className={styles.prevNextThumb}>
                          {previousPostImage ? (
                            <img
                              src={previousPostImage}
                              alt={previousPost.featuredImageAlt || previousPost.title}
                              loading="lazy"
                            />
                          ) : null}
                        </div>
                        <h4>{previousPost.title}</h4>
                      </Link>
                      <Link href={`/blog/${previousPost.slug}`} className={styles.prevNextButton}>
                        <ChevronLeft size={14} aria-hidden="true" />
                        Prev
                      </Link>
                    </article>
                  ) : null}

                  {nextPost ? (
                    <article className={styles.prevNextCard}>
                      <Link href={`/blog/${nextPost.slug}`} className={styles.prevNextLink}>
                        <div className={styles.prevNextThumb}>
                          {nextPostImage ? (
                            <img
                              src={nextPostImage}
                              alt={nextPost.featuredImageAlt || nextPost.title}
                              loading="lazy"
                            />
                          ) : null}
                        </div>
                        <h4>{nextPost.title}</h4>
                      </Link>
                      <Link href={`/blog/${nextPost.slug}`} className={styles.prevNextButton}>
                        Next
                        <ChevronRight size={14} aria-hidden="true" />
                      </Link>
                    </article>
                  ) : null}
                </div>

                <section className={styles.commentsCta}>
                  <div className={styles.commentsHeaderRow}>
                    <p className={styles.contentsLabel}>Comments ({commentCount})</p>
                    <button
                      type="button"
                      className={`${styles.prevNextButton} ${styles.commentsButton}`}
                      onClick={() => {
                        void handleLike();
                      }}
                      disabled={previewMode || engagementBusy}
                      aria-pressed={likedByViewer}
                    >
                      <Heart size={14} fill={likedByViewer ? "currentColor" : "none"} aria-hidden="true" />
                      {likedByViewer ? "Liked" : "Like"} ({likeCount})
                    </button>
                  </div>

                  <form className={styles.commentsForm} onSubmit={(event) => void handleCommentSubmit(event)}>
                    <input
                      className={styles.commentsInput}
                      value={commentName}
                      onChange={(event) => setCommentName(event.target.value)}
                      placeholder="Your name (optional)"
                      maxLength={80}
                      autoComplete="name"
                    />
                    <textarea
                      className={styles.commentsTextarea}
                      value={commentText}
                      onChange={(event) => setCommentText(event.target.value)}
                      placeholder="Write a comment..."
                      rows={4}
                      required
                      minLength={2}
                      maxLength={1800}
                    />
                    <button
                      type="submit"
                      className={`${styles.prevNextButton} ${styles.commentsButton}`}
                      disabled={previewMode || commentSubmitting}
                    >
                      {commentSubmitting ? "Posting..." : "Post comment"}
                    </button>
                  </form>

                  {engagementError ? (
                    <p className={styles.engagementMessage}>{engagementError}</p>
                  ) : null}

                  {comments.length > 0 ? (
                    <div className={styles.commentsList}>
                      {comments.map((item) => (
                        <article key={item.id} className={styles.commentItem}>
                          <p className={styles.commentMeta}>
                            <strong>{item.displayName}</strong>
                            <span>{formatCommentDate(item.createdAt)}</span>
                          </p>
                          <p className={styles.commentBody}>{item.commentText}</p>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.commentEmpty}>No comments yet. Be the first to comment.</p>
                  )}
                </section>
              </footer>
            </main>

            {hasRightRail ? (
              <aside className={styles.rightRail}>
                <ArticleSpotlightSidebar
                  posts={spotlightPosts}
                  categories={categories}
                  showCategoryExplorer={false}
                  showNewsletterBlock={false}
                />
              </aside>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
