"use client";

import { FormEvent, useState } from "react";
import {
  getDistrictsByRegion,
  ugandaRegions,
} from "@/lib/uganda-locations";
import { PortalTestimonialRecord } from "@/lib/types";
import { buildVideoThumbnailFallback } from "@/lib/media-placeholders";
import { FloatingSurface } from "@/components/FloatingSurface";

type PortalTestimonialView = PortalTestimonialRecord & {
  videoUrl: string;
  photoUrl: string | null;
};

interface PortalTestimonialsManagerProps {
  initialTestimonials: PortalTestimonialView[];
  canModerate: boolean;
}

type FeedbackState = {
  kind: "idle" | "success" | "error";
  message: string;
};

function formatDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

export function PortalTestimonialsManager({
  initialTestimonials,
  canModerate,
}: PortalTestimonialsManagerProps) {
  const [testimonials, setTestimonials] = useState(initialTestimonials);
  const [region, setRegion] = useState(ugandaRegions[0]?.region ?? "");
  const [district, setDistrict] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>({
    kind: "idle",
    message: "",
  });
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [playingVideoIds, setPlayingVideoIds] = useState<Record<number, boolean>>({});
  const districtOptions = region ? getDistrictsByRegion(region) : [];
  const [formKey, setFormKey] = useState(0);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  async function handleModeration(
    testimonialId: number,
    moderationStatus: "pending" | "approved" | "hidden",
  ) {
    try {
      const response = await fetch("/api/portal/testimonials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testimonialId, moderationStatus }),
      });
      const data = (await response.json()) as { error?: string; testimonial?: PortalTestimonialView };
      if (!response.ok || !data.testimonial) {
        throw new Error(data.error ?? "Could not update testimonial moderation status.");
      }
      setTestimonials((prev) =>
        prev.map((item) => (item.id === testimonialId ? data.testimonial as PortalTestimonialView : item)),
      );
      setFeedback({
        kind: "success",
        message: `Testimonial moderation set to ${moderationStatus}.`,
      });
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Could not update moderation status.",
      });
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFeedback({ kind: "success", message: "Publishing change story..." });

    const formData = new FormData(event.currentTarget);
    if (!district) {
      setFeedback({ kind: "error", message: "Please select a district." });
      setSaving(false);
      return;
    }
    formData.set("district", district);

    try {
      const response = await fetch("/api/portal/testimonials", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as {
        error?: string;
        testimonial?: PortalTestimonialView;
      };

      if (!response.ok || !data.testimonial) {
        throw new Error(data.error ?? "Could not submit change story.");
      }

      setTestimonials((prev) => [data.testimonial as PortalTestimonialView, ...prev]);
      event.currentTarget.reset();
      setFormKey((prev) => prev + 1);
      setRegion(ugandaRegions[0]?.region ?? "");
      setDistrict("");
      setSelectedVideo(null);
      setSelectedPhoto(null);
      setPlayingVideoIds({});
      setFeedback({
        kind: "success",
        message: "Change story submitted and published successfully.",
      });
      setIsCreateOpen(false);
    } catch (error) {
      const fallback = "Could not submit change story.";
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : fallback,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="portal-grid">
      <section className="card">
        <h2>Submit Change Story</h2>
        <p>
          Staff and volunteers can capture measurable change stories with photo evidence.
          Approved submissions appear automatically in the public stories of measurable change pages.
        </p>
        <div className="action-row portal-form-actions">
          <button className="button" type="button" onClick={() => setIsCreateOpen(true)}>
            + New Change Story
          </button>
        </div>
        {feedback.message ? (
          <p
            role="status"
            className={`form-message ${feedback.kind === "error" ? "error" : "success"}`}
          >
            {feedback.message}
          </p>
        ) : null}
      </section>

      <section className="card">
        <h2>Recent Change Story Submissions</h2>
        {testimonials.length === 0 ? (
          <p>No change story submissions yet.</p>
        ) : (
          <div className="media-showcase-grid">
            {testimonials.map((item) => (
              <article className="card media-showcase-card video" key={item.id}>
                <div className="media-showcase-asset">
                  {item.photoUrl ? (
                    <img
                      src={item.photoUrl}
                      alt={`Testimonial by ${item.storytellerName}`}
                      loading="lazy"
                      decoding="async"
                    />
                  ) : item.videoSourceType === "youtube" &&
                    item.youtubeEmbedUrl ? (
                    playingVideoIds[item.id] ? (
                      <iframe
                        src={`${item.youtubeEmbedUrl}${item.youtubeEmbedUrl.includes("?") ? "&" : "?"}autoplay=1&rel=0&modestbranding=1`}
                        title={item.youtubeVideoTitle ?? `Testimonial video by ${item.storytellerName}`}
                        loading="lazy"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                    ) : (
                      <button
                        type="button"
                        className="media-showcase-thumbnail-button"
                        onClick={() =>
                          setPlayingVideoIds((prev) => ({ ...prev, [item.id]: true }))
                        }
                        aria-label={`Play testimonial video by ${item.storytellerName}`}
                      >
                        <img
                          src={
                            item.youtubeThumbnailUrl ||
                            (item.youtubeVideoId
                              ? `https://img.youtube.com/vi/${item.youtubeVideoId}/hqdefault.jpg`
                              : buildVideoThumbnailFallback(`portal-testimonial-${item.id}`, "Video thumbnail unavailable"))
                          }
                          alt={item.youtubeVideoTitle ?? `Testimonial video by ${item.storytellerName}`}
                          loading="lazy"
                          decoding="async"
                        />
                        <span className="media-showcase-play-overlay">
                          <svg width="16" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                            <path
                              d="M23 7.5A4.5 4.5 0 0 0 19.5 4C16.7 3.5 12 3.5 12 3.5s-4.7 0-7.5.5A4.5 4.5 0 0 0 1 7.5 47 47 0 0 0 .5 12 47 47 0 0 0 1 16.5 4.5 4.5 0 0 0 4.5 20c2.8.5 7.5.5 7.5.5s4.7 0 7.5-.5a4.5 4.5 0 0 0 3.5-3.5A47 47 0 0 0 23.5 12 47 47 0 0 0 23 7.5Z"
                              fill="#FF0000"
                            />
                            <path d="M10 15.5V8.5L16.25 12L10 15.5Z" fill="#fff" />
                          </svg>
                          YouTube
                        </span>
                      </button>
                    )
                  ) : (
                    <div className="media-showcase-missing-video">
                      <p>Linked YouTube video metadata is missing for this entry.</p>
                    </div>
                  )}
                </div>
                <div className="media-showcase-content">
                  <p className="meta-pill">Change story</p>
                  <p className="media-showcase-quote">"{item.storyText}"</p>
                  <p className="media-showcase-meta">
                    <strong>{item.storytellerName}</strong> · {item.storytellerRole}
                  </p>
                  <p className="media-showcase-caption">
                    {item.schoolName}, {item.district} · {formatDate(item.createdAt)}
                  </p>
                  <p className="meta-line">
                    Moderation: <strong>{item.moderationStatus}</strong>
                  </p>
                  {item.sourceType === "training_feedback" ? (
                    <p className="meta-line">Auto-generated from structured training feedback.</p>
                  ) : null}
                  {canModerate ? (
                    <div className="action-row">
                      <button
                        className="button button-ghost"
                        type="button"
                        onClick={() => void handleModeration(item.id, "pending")}
                      >
                        Mark pending
                      </button>
                      <button
                        className="button button-ghost"
                        type="button"
                        onClick={() => void handleModeration(item.id, "approved")}
                      >
                        Approve
                      </button>
                      <button
                        className="button button-ghost"
                        type="button"
                        onClick={() => void handleModeration(item.id, "hidden")}
                      >
                        Hide
                      </button>
                    </div>
                  ) : null}
                  {item.videoSourceType === "youtube" && item.youtubeWatchUrl ? (
                    <a className="button button-ghost" href={item.youtubeWatchUrl} target="_blank" rel="noreferrer">
                      Open source
                    </a>
                  ) : (
                    <span className="meta-line">Set a YouTube title to link this video.</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <FloatingSurface
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Submit Change Story"
        description="Capture baseline challenge, what happened, and measurable change from the field."
        closeLabel="Close"
        maxWidth="980px"
      >
        <form
          key={formKey}
          className="form-grid portal-form-grid portal-testimonial-form"
          onSubmit={handleSubmit}
        >
          <label>
            <span className="portal-field-label">
              <span>Storyteller Name</span>
              <span className="portal-required-indicator">
                *<span className="visually-hidden">required</span>
              </span>
            </span>
            <input
              name="storytellerName"
              required
              minLength={2}
              placeholder="e.g. Esther Namusoke"
              autoComplete="name"
            />
          </label>
          <label>
            <span className="portal-field-label">
              <span>Storyteller Role</span>
              <span className="portal-required-indicator">
                *<span className="visually-hidden">required</span>
              </span>
            </span>
            <input
              name="storytellerRole"
              required
              minLength={2}
              placeholder="Classroom Teacher / School Leader"
            />
          </label>

          <label>
            <span className="portal-field-label">
              <span>School Name</span>
              <span className="portal-required-indicator">
                *<span className="visually-hidden">required</span>
              </span>
            </span>
            <input
              name="schoolName"
              required
              minLength={2}
              placeholder="e.g. Bright Future Primary"
              autoComplete="organization"
            />
          </label>
          <label>
            <span className="portal-field-label">
              <span>Region</span>
              <span className="portal-required-indicator">
                *<span className="visually-hidden">required</span>
              </span>
            </span>
            <select
              value={region}
              onChange={(event) => {
                const nextRegion = event.target.value;
                const options = getDistrictsByRegion(nextRegion);
                setRegion(nextRegion);
                setDistrict((current) =>
                  options.includes(current) ? current : "",
                );
              }}
              required
            >
              <option value="">Select region</option>
              {ugandaRegions.map((entry) => (
                <option key={entry.region} value={entry.region}>
                  {entry.region}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="portal-field-label">
              <span>District</span>
              <span className="portal-required-indicator">
                *<span className="visually-hidden">required</span>
              </span>
            </span>
            <select
              name="district"
              value={district}
              onChange={(event) => setDistrict(event.target.value)}
              required
            >
              <option value="">Select district</option>
              {districtOptions.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </select>
          </label>

          <label className="full-width">
            <span className="portal-field-label">Story title</span>
            <input
              name="storyTitle"
              required
              minLength={6}
              placeholder="e.g. Reading recovery in Dokolo cluster schools"
            />
          </label>

          <label className="full-width">
            <span className="portal-field-label">
              <span>Baseline challenge</span>
              <span className="portal-required-indicator">
                *<span className="visually-hidden">required</span>
              </span>
            </span>
            <textarea
              name="baselineChallenge"
              required
              minLength={20}
              rows={4}
              placeholder="What was the literacy challenge before support started?"
            />
          </label>

          <label className="full-width">
            <span className="portal-field-label">
              <span>What happened</span>
              <span className="portal-required-indicator">
                *<span className="visually-hidden">required</span>
              </span>
            </span>
            <textarea
              name="whatHappened"
              required
              minLength={20}
              rows={4}
              placeholder="What support actions were implemented in the school?"
            />
          </label>

          <label className="full-width">
            <span className="portal-field-label">
              <span>Measurable change observed</span>
              <span className="portal-required-indicator">
                *<span className="visually-hidden">required</span>
              </span>
            </span>
            <textarea
              name="measurableChange"
              required
              minLength={20}
              rows={4}
              placeholder="What changed for teaching and learners? Include measurable evidence."
            />
          </label>

          <label className="full-width">
            <span className="portal-field-label">Recommendation / next steps (optional)</span>
            <textarea
              name="nextSteps"
              rows={3}
              placeholder="What should happen next to sustain gains?"
            />
          </label>

          <label className="full-width">
            <span className="portal-field-label">
              <span>Additional narrative (optional)</span>
            </span>
            <textarea
              name="storyText"
              minLength={10}
              rows={5}
              placeholder="Optional free-form context for the full change story."
            />
            <small className="portal-field-help">
              This is optional. Structured sections above are used to render summaries and details.
            </small>
          </label>

          <label>
            <span className="portal-field-label">YouTube Video Title (optional)</span>
            <input
              name="youtubeVideoTitle"
              minLength={3}
              placeholder="Paste the exact YouTube title from your channel"
            />
            <small className="portal-field-help">
              Optional: if provided, the system links matching YouTube evidence.
            </small>
          </label>
          <label>
            <span className="portal-field-label">YouTube Channel ID (optional)</span>
            <input
              name="youtubeChannelId"
              placeholder="e.g. UCxxxxxxxxxxxxxxxx"
            />
            <small className="portal-field-help">
              Optional override. Leave blank to use the default configured channel.
            </small>
          </label>

          <label>
            <span className="portal-field-label">
              <span>Video File Name Match (optional)</span>
            </span>
            <input
              name="video"
              type="file"
              accept="video/*,.mp4,.mov,.webm,.m4v"
              onChange={(event) =>
                setSelectedVideo(event.currentTarget.files?.[0] ?? null)
              }
            />
            <small className="portal-field-help">
              Optional helper only. If added, the file name can help match the YouTube title.
            </small>
          </label>
          <label>
            <span className="portal-field-label">Story Photo (optional)</span>
            <input
              name="photo"
              type="file"
              accept="image/*,.jpg,.jpeg,.png,.webp,.avif"
              onChange={(event) =>
                setSelectedPhoto(event.currentTarget.files?.[0] ?? null)
              }
            />
            <small className="portal-field-help">
              Allowed images up to 20MB.
            </small>
          </label>

          <div className="full-width">
            <p className="portal-muted">
              {selectedVideo
                ? `Video filename selected for title matching: ${selectedVideo.name}`
                : "No video file selected for title matching."}
            </p>
            <p className="portal-muted">
              {selectedPhoto
                ? `Photo selected: ${selectedPhoto.name} (${Math.max(1, Math.round(selectedPhoto.size / 1024))} KB)`
                : "No photo selected."}
            </p>
          </div>

          <div className="full-width action-row portal-form-actions">
            <button className="button" type="submit" disabled={saving}>
              {saving ? "Uploading..." : "Publish change story"}
            </button>
            <button
              className="button button-ghost"
              type="button"
              disabled={saving}
              onClick={() => {
                setFormKey((prev) => prev + 1);
                setRegion(ugandaRegions[0]?.region ?? "");
                setDistrict("");
                setSelectedVideo(null);
                setSelectedPhoto(null);
                setPlayingVideoIds({});
                setFeedback({ kind: "idle", message: "" });
              }}
            >
              Reset form
            </button>
            <button
              className="button button-ghost"
              type="button"
              disabled={saving}
              onClick={() => setIsCreateOpen(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      </FloatingSurface>
    </div>
  );
}
