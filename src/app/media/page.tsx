import Link from "next/link";
import { MediaTestimonialGrid } from "@/components/MediaTestimonialGrid";
import { PageHero } from "@/components/PageHero";
import { getMediaShowcase } from "@/lib/media-showcase";

export const metadata = {
  title: "Media & Press",
  description: "Training highlights, event notes, and media updates.",
};

export const dynamic = "force-dynamic";

export default async function MediaPage() {
  const mediaShowcase = await getMediaShowcase();

  return (
    <>
      <PageHero
        kicker="Media"
        title="Media & Press"
        description="A high-volume photo and video evidence hub from trainings, school visits, assessments, and 1001 Story activities."
      />

      <section className="section">
        <div className="container">
          <div className="media-wall-head">
            <div className="section-head" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '3rem' }}>
              <p className="kicker">Live evidence gallery</p>
              <h2 className="tpd-page-title">Photos + videos mapped to testimonials</h2>
              <p>
                This page is configured to display as many uploaded photos and videos as
                available and pair them with implementation testimonials automatically.
              </p>
            </div>
          </div>

          <MediaTestimonialGrid items={mediaShowcase.featuredItems} />

          <div className="action-row">
            <Link className="button" href="/testimonials">
              View testimonial quotes
            </Link>
            <Link className="button button-ghost" href="/portal/login">
              Staff portal uploads
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid media-intake-grid">
          <article className="card media-intake-card">
            <h2>Capture moments every session</h2>
            <ul>
              <li>Opening briefing + participant attendance</li>
              <li>Live demonstration moments and co-teaching</li>
              <li>Teacher practice groups and coaching feedback</li>
              <li>Learner reading practice and story read-aloud</li>
              <li>Closing reflections and agreed follow-up actions</li>
            </ul>
          </article>

          <article className="card media-intake-card">
            <h2>Capture short testimonial videos</h2>
            <ul>
              <li>Teacher reflection (30–60 seconds)</li>
              <li>Headteacher implementation update</li>
              <li>Before/after learner reading sample clips</li>
              <li>1001 Story drafting and presentation highlights</li>
              <li>Partner and district supervision feedback</li>
            </ul>
          </article>

          <article className="card media-intake-card">
            <h2>Metadata for every upload</h2>
            <ul>
              <li>District, school, grade, and date</li>
              <li>Program type and module covered</li>
              <li>Facilitator name and participant role</li>
              <li>Short impact note linked to the media</li>
              <li>Consent and safeguarding check confirmed</li>
            </ul>
          </article>
        </div>
      </section>
    </>
  );
}
