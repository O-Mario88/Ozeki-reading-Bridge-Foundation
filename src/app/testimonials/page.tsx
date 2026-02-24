import Link from "next/link";
import { MediaTestimonialGrid } from "@/components/MediaTestimonialGrid";
import { PageHero } from "@/components/PageHero";
import { getMediaShowcase } from "@/lib/media-showcase";
import { testimonials } from "@/lib/content";

export const metadata = {
  title: "Testimonials",
  description: "Feedback from teachers, headteachers, and school leaders.",
};

export const dynamic = "force-dynamic";

export default async function TestimonialsPage() {
  const mediaShowcase = await getMediaShowcase();

  return (
    <>
      <PageHero
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
          <MediaTestimonialGrid items={mediaShowcase.featuredItems} />
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
          <Link className="button button-ghost" href="/portal/schools">
            Open school profiles
          </Link>
        </div>
      </section>
    </>
  );
}
