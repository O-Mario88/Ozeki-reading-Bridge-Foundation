"use client";

import { useState } from "react";
import { MediaShowcaseItem } from "@/lib/media-showcase";

interface MediaTestimonialGridProps {
  items: MediaShowcaseItem[];
}

export function MediaTestimonialGrid({ items }: MediaTestimonialGridProps) {
  const [playingIds, setPlayingIds] = useState<Record<string, boolean>>({});

  if (items.length === 0) {
    return (
      <article className="card media-showcase-empty">
        <h3>No media uploaded yet</h3>
        <p>
          Add photos to <code>assets/photos</code> and submit testimonials with
          matching YouTube video titles from the Ozeki channel. New items appear
          automatically in the media and testimonials walls.
        </p>
      </article>
    );
  }

  return (
    <div className="media-showcase-grid">
      {items.map((item, index) => (
        <article className={`card media-showcase-card ${item.kind}`} key={item.id}>
          <div className="media-showcase-asset">
            {item.kind === "photo" ? (
              <img
                src={item.url}
                alt={item.alt}
                loading={index < 9 ? "eager" : "lazy"}
                fetchPriority={index < 3 ? "high" : "auto"}
                decoding="sync"
              />
            ) : item.playback === "youtube" && item.youtubeEmbedUrl ? (
              playingIds[item.id] ? (
                <iframe
                  src={`${item.youtubeEmbedUrl}${item.youtubeEmbedUrl.includes("?") ? "&" : "?"}autoplay=1&rel=0&modestbranding=1`}
                  title={item.alt}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : (
                <button
                  type="button"
                  className="media-showcase-thumbnail-button"
                  onClick={() => setPlayingIds((prev) => ({ ...prev, [item.id]: true }))}
                  aria-label={`Play ${item.alt}`}
                >
                  <img
                    src={
                      item.youtubeThumbnailUrl ||
                      (item.youtubeVideoId
                        ? `https://img.youtube.com/vi/${item.youtubeVideoId}/hqdefault.jpg`
                        : "/images/ozeki-logo.jpg")
                    }
                    alt={item.alt}
                    loading={index < 9 ? "eager" : "lazy"}
                    fetchPriority={index < 3 ? "high" : "auto"}
                    decoding="sync"
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
              <a
                className="media-showcase-thumbnail-button"
                href="https://www.youtube.com/@ozekiRead"
                target="_blank"
                rel="noreferrer"
                aria-label="Open Ozeki Reading Bridge Foundation YouTube channel"
              >
                <img
                  src="/images/ozeki-logo.jpg"
                  alt="Ozeki YouTube channel"
                  loading={index < 9 ? "eager" : "lazy"}
                  fetchPriority={index < 3 ? "high" : "auto"}
                  decoding="sync"
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
              </a>
            )}
          </div>
          <div className="media-showcase-content">
            <p className="meta-pill">{item.kind === "photo" ? "Photo testimonial" : "Video testimonial"}</p>
            <p className="media-showcase-quote">"{item.quote}"</p>
            <p className="media-showcase-meta">
              <strong>{item.person}</strong> · {item.role}
            </p>
            <p className="media-showcase-caption">{item.caption}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
