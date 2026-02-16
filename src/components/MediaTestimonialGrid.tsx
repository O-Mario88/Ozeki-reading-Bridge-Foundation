import { MediaShowcaseItem } from "@/lib/media-showcase";

interface MediaTestimonialGridProps {
  items: MediaShowcaseItem[];
}

export function MediaTestimonialGrid({ items }: MediaTestimonialGridProps) {
  if (items.length === 0) {
    return (
      <article className="card media-showcase-empty">
        <h3>No media uploaded yet</h3>
        <p>
          Add photos to <code>assets/photos</code> and videos to{" "}
          <code>assets/videos</code>. New files appear automatically in the media and
          testimonials walls.
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
            ) : (
              <video controls preload="metadata" playsInline>
                <source src={item.url} />
                Your browser does not support this video format.
              </video>
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
