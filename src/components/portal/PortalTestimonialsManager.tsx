"use client";

import { FormEvent, useState } from "react";
import {
  getDistrictsByRegion,
  ugandaRegions,
} from "@/lib/uganda-locations";
import { PortalTestimonialRecord } from "@/lib/types";

type PortalTestimonialView = PortalTestimonialRecord & {
  videoUrl: string;
  photoUrl: string | null;
};

interface PortalTestimonialsManagerProps {
  initialTestimonials: PortalTestimonialView[];
}

type FeedbackState = {
  kind: "idle" | "success" | "error";
  message: string;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function PortalTestimonialsManager({
  initialTestimonials,
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
  const districtOptions = region ? getDistrictsByRegion(region) : [];
  const [formKey, setFormKey] = useState(0);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFeedback({ kind: "success", message: "Uploading testimonial..." });

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
        throw new Error(data.error ?? "Could not submit testimonial.");
      }

      setTestimonials((prev) => [data.testimonial as PortalTestimonialView, ...prev]);
      event.currentTarget.reset();
      setFormKey((prev) => prev + 1);
      setRegion(ugandaRegions[0]?.region ?? "");
      setDistrict("");
      setSelectedVideo(null);
      setSelectedPhoto(null);
      setFeedback({
        kind: "success",
        message: "Testimonial submitted and published successfully.",
      });
    } catch (error) {
      const fallback = "Could not submit testimonial.";
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
        <h2>Submit Testimonial Story</h2>
        <p>
          Staff and volunteers can capture the story text and upload a testimonial
          video. New submissions appear on the public testimonials page automatically.
        </p>

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
            <span className="portal-field-label">
              <span>Story Text</span>
              <span className="portal-required-indicator">
                *<span className="visually-hidden">required</span>
              </span>
            </span>
            <textarea
              name="storyText"
              required
              minLength={30}
              rows={6}
              placeholder="Capture the challenge, intervention, and change observed in the school."
            />
            <small className="portal-field-help">
              Include context, what was done, and measurable change observed.
            </small>
          </label>

          <label>
            <span className="portal-field-label">
              <span>Testimonial Video</span>
              <span className="portal-required-indicator">
                *<span className="visually-hidden">required</span>
              </span>
            </span>
            <input
              name="video"
              type="file"
              accept="video/*,.mp4,.mov,.webm,.m4v"
              required
              onChange={(event) =>
                setSelectedVideo(event.currentTarget.files?.[0] ?? null)
              }
            />
            <small className="portal-field-help">
              Allowed: MP4, MOV, WEBM, M4V. Max size: 150MB.
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
                ? `Video selected: ${selectedVideo.name} (${Math.max(1, Math.round(selectedVideo.size / 1024))} KB)`
                : "No video selected yet."}
            </p>
            <p className="portal-muted">
              {selectedPhoto
                ? `Photo selected: ${selectedPhoto.name} (${Math.max(1, Math.round(selectedPhoto.size / 1024))} KB)`
                : "No photo selected."}
            </p>
          </div>

          <div className="full-width action-row portal-form-actions">
            <button className="button" type="submit" disabled={saving}>
              {saving ? "Uploading..." : "Publish testimonial"}
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
                setFeedback({ kind: "idle", message: "" });
              }}
            >
              Reset form
            </button>
          </div>
        </form>
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
        <h2>Recent Testimonial Submissions</h2>
        {testimonials.length === 0 ? (
          <p>No testimonial submissions yet.</p>
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
                  ) : (
                    <video controls preload="metadata" playsInline>
                      <source
                        src={item.videoUrl}
                        type={
                          item.videoMimeType.toLowerCase().startsWith("video/")
                            ? item.videoMimeType
                            : undefined
                        }
                      />
                    </video>
                  )}
                </div>
                <div className="media-showcase-content">
                  <p className="meta-pill">Portal testimonial</p>
                  <p className="media-showcase-quote">"{item.storyText}"</p>
                  <p className="media-showcase-meta">
                    <strong>{item.storytellerName}</strong> · {item.storytellerRole}
                  </p>
                  <p className="media-showcase-caption">
                    {item.schoolName}, {item.district} · {formatDate(item.createdAt)}
                  </p>
                  <a className="button button-ghost" href={item.videoUrl}>
                    Open video
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
