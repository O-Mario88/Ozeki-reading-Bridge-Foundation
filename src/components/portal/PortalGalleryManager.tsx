"use client";

import Image from "next/image";
import { FormEvent, useMemo, useState } from "react";

type GalleryUploadItem = {
  id: string;
  imageUrl: string;
  description: string;
  altText: string;
  fileName: string;
  sizeBytes: number;
  mimeType: string;
  createdAt: string;
  createdByUserId: number;
  createdByName: string;
};

type FeedbackState = {
  kind: "idle" | "success" | "error";
  message: string;
};

type PortalGalleryManagerProps = {
  initialItems: GalleryUploadItem[];
};

function toNewestFirst(items: GalleryUploadItem[]) {
  return items
    .slice()
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

function formatDateTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(parsed);
}

function formatSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PortalGalleryManager({ initialItems }: PortalGalleryManagerProps) {
  const [items, setItems] = useState(() => toNewestFirst(initialItems));
  const [saving, setSaving] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [feedback, setFeedback] = useState<FeedbackState>({
    kind: "idle",
    message: "",
  });

  const summary = useMemo(() => {
    const sorted = toNewestFirst(items);
    const latest = sorted[0];
    const now = new Date();
    const month = now.getUTCMonth();
    const year = now.getUTCFullYear();
    const postedThisMonth = sorted.filter((item) => {
      const posted = new Date(item.createdAt);
      return posted.getUTCMonth() === month && posted.getUTCFullYear() === year;
    }).length;

    return {
      total: sorted.length,
      postedThisMonth,
      latestPostDate: latest ? formatDateTime(latest.createdAt) : "No uploads yet",
    };
  }, [items]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFeedback({ kind: "success", message: "Uploading photo..." });

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/portal/gallery", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        item?: GalleryUploadItem;
      };

      if (!response.ok || !data.ok || !data.item) {
        throw new Error(data.error ?? "Could not upload gallery image.");
      }

      setItems((previous) => toNewestFirst([data.item as GalleryUploadItem, ...previous]));
      event.currentTarget.reset();
      setSelectedFileName("");
      setFeedback({
        kind: "success",
        message: "Photo uploaded successfully. It is now available on the public gallery.",
      });
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Could not upload gallery image.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="portal-grid">
      <section className="portal-kpis">
        <article className="portal-kpi-card">
          <p>Total uploads</p>
          <strong>{summary.total.toLocaleString()}</strong>
        </article>
        <article className="portal-kpi-card">
          <p>Posted this month</p>
          <strong>{summary.postedThisMonth.toLocaleString()}</strong>
        </article>
        <article className="portal-kpi-card">
          <p>Latest post</p>
          <strong>{summary.latestPostDate}</strong>
        </article>
      </section>

      <section className="card">
        <h2>Upload Photo</h2>
        <p>Every photo requires a short description. New photos show first on the public gallery.</p>
        <form className="form-grid portal-form-grid" onSubmit={handleSubmit}>
          <label className="full-width">
            <span className="portal-field-label">Photo</span>
            <input
              name="file"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              required
              onChange={(event) => setSelectedFileName(event.currentTarget.files?.[0]?.name ?? "")}
            />
            <small className="portal-field-help">Allowed: JPG, PNG, WEBP, GIF, AVIF (max 12MB).</small>
            {selectedFileName ? <small className="portal-field-help">Selected: {selectedFileName}</small> : null}
          </label>

          <label className="full-width">
            <span className="portal-field-label">Short Description</span>
            <textarea
              name="description"
              required
              minLength={4}
              maxLength={280}
              rows={3}
              placeholder="Brief description shown under the photo on the public gallery."
            />
          </label>

          <label className="full-width">
            <span className="portal-field-label">Alt Text (optional)</span>
            <input
              name="altText"
              maxLength={220}
              placeholder="Accessible image text. Defaults to the short description."
            />
          </label>

          <div className="full-width action-row portal-form-actions">
            <button className="button" type="submit" disabled={saving}>
              {saving ? "Uploading..." : "Upload photo"}
            </button>
            <button
              className="button button-ghost"
              type="reset"
              disabled={saving}
              onClick={() => {
                setSelectedFileName("");
                setFeedback({ kind: "idle", message: "" });
              }}
            >
              Reset
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
        <h2>Uploaded Photos</h2>
        {items.length === 0 ? (
          <p>No photos uploaded yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Photo</th>
                  <th>Description</th>
                  <th>Details</th>
                  <th>Posted</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <a href={item.imageUrl} target="_blank" rel="noreferrer" className="portal-gallery-preview-link">
                        <Image
                          src={item.imageUrl}
                          alt={item.altText || item.description}
                          width={220}
                          height={140}
                          className="portal-gallery-preview-image"
                        />
                      </a>
                    </td>
                    <td>{item.description}</td>
                    <td>
                      {item.fileName}
                      <br />
                      <small>{formatSize(item.sizeBytes)}</small>
                    </td>
                    <td>
                      {item.createdByName}
                      <br />
                      <small>{formatDateTime(item.createdAt)}</small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
