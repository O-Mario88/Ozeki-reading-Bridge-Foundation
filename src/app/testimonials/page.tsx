import Link from "next/link";
import { MediaTestimonialGrid } from "@/components/MediaTestimonialGrid";
import { PageHero } from "@/components/PageHero";
import { listImpactGalleryEntriesPostgres } from "@/lib/server/postgres/repositories/impact-gallery";
import { testimonials } from "@/lib/content";

export const metadata = {
  title: "Testimonials",
  description: "Feedback from teachers, headteachers, and school leaders.",
};

export const dynamic = "force-dynamic";

export default async function TestimonialsPage() {
  // Wrap the gallery query — without try/catch the page hard-500s when
  // the impact_gallery_entries table is empty / missing on a partially-
  // bootstrapped DB. Falls back to the static `testimonials` content
  // below so the page still renders something useful.
  const dbItems = await listImpactGalleryEntriesPostgres(12).catch(() => []);
  const items = dbItems.map((record) => {
    return {
      id: String(record.id),
      kind: "photo" as const,
      url: record.imageUrl,
      alt: record.personName,
      caption: `${record.district}, ${record.region} • ${record.recordedYear}`,
      quote: record.quoteText,
      person: record.personName,
      role: record.personRole,
      playback: "file" as const,
      youtubeVideoId: null,
      youtubeEmbedUrl: null,
      youtubeThumbnailUrl: null,
    };
  });

  return (
    <>
      <PageHero imageUrl="/photos/PXL_20260219_095934420.jpg"
        kicker="Trust builders"
        title="Testimonials"
        description="Voices from teachers and school leaders, now supported with photo and video evidence from implementation sites."
      />

      <section className="section">
        <div className="container">
          <div className="media-wall-head">
            <div className="section-head" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '3rem' }}>
              <p className="kicker">Media-backed stories</p>
              <h2 className="tpd-page-title">Testimonial wall with photos and videos</h2>
            </div>
          </div>
          {items.length > 0 ? (
            <MediaTestimonialGrid items={items} />
          ) : (
            <div style={{
              padding: "3rem 1.5rem",
              textAlign: "center",
              borderRadius: 16,
              background: "#F8FAFC",
              color: "#475467",
              fontSize: 14,
            }}>
              Photo + video testimonials will appear here as schools share their stories.
              Static teacher quotes below are sourced from previously published reports.
            </div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          {testimonials.map((testimonial) => (
            <article className="card" key={testimonial.name}>
              <p>"{testimonial.quote}"</p>
              <p className="meta-line">
                <strong>{testimonial.name}</strong> · {testimonial.role}
              </p>
            </article>
          ))}
        </div>
        <div className="container action-row">
          <Link className="button" href="/media">
            Browse full media wall
          </Link>
        </div>
      </section>
    </>
  );
}
