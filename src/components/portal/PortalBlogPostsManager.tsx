"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { blogCategories } from "@/lib/content";

type PortalBlogPostView = {
  id: number;
  slug: string;
  title: string;
  subtitle: string | null;
  body: string;
  category: string;
  tags: string[];
  authorName: string;
  publishedAt: string;
  views: number;
  imageUrl: string | null;
  videoUrl: string | null;
};

interface PortalBlogPostsManagerProps {
  initialPosts: PortalBlogPostView[];
  currentUserName: string;
}

export function PortalBlogPostsManager({
  initialPosts,
  currentUserName,
}: PortalBlogPostsManagerProps) {
  const [posts, setPosts] = useState(initialPosts);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [formKey, setFormKey] = useState(0);
  const [selectedImage, setSelectedImage] = useState("");
  const [selectedVideo, setSelectedVideo] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatus("Publishing blog post...");

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/portal/blog-posts", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as {
        error?: string;
        post?: PortalBlogPostView;
      };

      if (!response.ok || !data.post) {
        throw new Error(data.error ?? "Could not publish blog post.");
      }

      setPosts((prev) => [data.post as PortalBlogPostView, ...prev]);
      event.currentTarget.reset();
      setFormKey((value) => value + 1);
      setSelectedImage("");
      setSelectedVideo("");
      setStatus("Blog post published successfully.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not publish blog post.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="portal-grid">
      <section className="card">
        <h2>Create Blog Post</h2>
        <p>
          Author and posting date are captured automatically from your portal account:
          {" "}
          <strong>{currentUserName}</strong>.
        </p>

        <form key={formKey} className="form-grid portal-form-grid" onSubmit={handleSubmit}>
          <label>
            <span className="portal-field-label">Title</span>
            <input
              name="title"
              required
              minLength={6}
              placeholder="e.g. Improving decoding in mixed-ability classes"
            />
          </label>

          <label>
            <span className="portal-field-label">Subtitle</span>
            <input
              name="subtitle"
              placeholder="Short sub-heading shown under the title"
              maxLength={280}
            />
          </label>

          <label>
            <span className="portal-field-label">Category</span>
            <select name="category" defaultValue={blogCategories[0]} required>
              {blogCategories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="portal-field-label">Tags (comma separated)</span>
            <input
              name="tags"
              placeholder="phonics, decoding, uganda, teacher coaching"
              maxLength={600}
            />
          </label>

          <label className="full-width">
            <span className="portal-field-label">Body</span>
            <textarea
              name="body"
              required
              minLength={60}
              rows={10}
              placeholder="Write the full blog article content. Use blank lines to separate paragraphs."
            />
          </label>

          <label>
            <span className="portal-field-label">Feature Image (optional)</span>
            <input
              name="image"
              type="file"
              accept="image/*,.jpg,.jpeg,.png,.webp,.avif"
              onChange={(event) =>
                setSelectedImage(event.currentTarget.files?.[0]?.name ?? "")
              }
            />
            {selectedImage ? <small className="portal-field-help">{selectedImage}</small> : null}
          </label>

          <label>
            <span className="portal-field-label">Feature Video (optional)</span>
            <input
              name="video"
              type="file"
              accept="video/*,.mp4,.mov,.webm,.m4v"
              onChange={(event) =>
                setSelectedVideo(event.currentTarget.files?.[0]?.name ?? "")
              }
            />
            {selectedVideo ? <small className="portal-field-help">{selectedVideo}</small> : null}
          </label>

          <label>
            <span className="portal-field-label">Publish now</span>
            <select name="isPublished" defaultValue="true">
              <option value="true">Yes (public on blog page)</option>
              <option value="false">No (save hidden)</option>
            </select>
          </label>

          <div className="full-width action-row portal-form-actions">
            <button className="button" type="submit" disabled={saving}>
              {saving ? "Publishing..." : "Publish blog post"}
            </button>
            <button
              className="button button-ghost"
              type="button"
              onClick={() => {
                setFormKey((value) => value + 1);
                setSelectedImage("");
                setSelectedVideo("");
                setStatus("");
              }}
              disabled={saving}
            >
              Reset form
            </button>
          </div>
        </form>
        {status ? <p className="form-message success">{status}</p> : null}
      </section>

      <section className="card">
        <h2>Latest Published Posts</h2>
        {posts.length === 0 ? (
          <p>No blog posts submitted yet.</p>
        ) : (
          <div className="cards-grid">
            {posts.slice(0, 9).map((post) => (
              <article key={post.id} className="card">
                <p className="meta-pill">{post.category}</p>
                <h3>{post.title}</h3>
                {post.subtitle ? <p>{post.subtitle}</p> : null}
                <p className="meta-line">
                  {post.authorName} · {new Date(post.publishedAt).toLocaleDateString()} ·
                  {" "}
                  {post.views} views
                </p>
                <div className="action-row">
                  <Link className="button button-ghost" href={`/blog/${post.slug}`} target="_blank">
                    View public post
                  </Link>
                  {post.imageUrl ? (
                    <a className="button button-ghost" href={post.imageUrl} target="_blank" rel="noreferrer">
                      Image
                    </a>
                  ) : null}
                  {post.videoUrl ? (
                    <a className="button button-ghost" href={post.videoUrl} target="_blank" rel="noreferrer">
                      Video
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
