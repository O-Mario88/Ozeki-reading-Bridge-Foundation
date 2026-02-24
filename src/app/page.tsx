import Link from "next/link";
import Image from "next/image";
import heroImg1 from "../../assets/photos/PXL_20260218_124656123.jpg";
import heroImg2 from "../../assets/photos/PXL_20260218_133341852.jpg";
import { MediaTestimonialGrid } from "@/components/MediaTestimonialGrid";
import LiveImpactDashboard from "@/components/LiveImpactDashboard";
import { officialContact } from "@/lib/contact";
import { getMediaShowcase } from "@/lib/media-showcase";
import {
  organizationName,
  tagline,
} from "@/lib/content";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const mediaShowcase = await getMediaShowcase();
  const featuredChannelVideo = mediaShowcase.uniqueVideos[0] ?? null;
  const featuredVideoWatchUrl = featuredChannelVideo?.youtubeVideoId
    ? `https://www.youtube.com/watch?v=${featuredChannelVideo.youtubeVideoId}`
    : "https://www.youtube.com/@ozekiRead";
  const featuredVideoThumbnail =
    featuredChannelVideo?.youtubeThumbnailUrl ||
    (featuredChannelVideo?.youtubeVideoId
      ? `https://img.youtube.com/vi/${featuredChannelVideo.youtubeVideoId}/hqdefault.jpg`
      : "/images/ozeki-logo.jpg");
  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "NonProfit",
    name: organizationName,
    description: tagline,
    url: "https://ozekireadingbridge.org",
    areaServed: "Uganda",
    sameAs: ["https://www.linkedin.com"],
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer service",
        telephone: officialContact.phone,
        email: officialContact.email,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
      />

      <section className="hero section">
        <div className="container hero-grid-dribbble">
          <div className="hero-content flow">
            <p className="kicker">Northern Uganda literacy recovery</p>
            <h1>{organizationName}</h1>
            <p className="hero-description">
              Based in Gulu City, we work with schools across Northern Uganda where
              more than 20 years of conflict disrupted foundational learning and left
              many children behind in reading.
            </p>
            <div className="hero-actions">
              <Link className="button" href="/programs">
                Our Programs
              </Link>
              <Link className="button button-ghost hero-play-btn" href="/media">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 5V19L19 12L8 5Z" fill="currentColor" />
                </svg>
                Watch Video
              </Link>
            </div>

            <div className="hero-stats-row">
              <div className="stat-item">
                <span className="stat-num">20+</span>
                <span className="stat-label">Years of conflict recovery</span>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-item">
                <span className="stat-num">100%</span>
                <span className="stat-label">Classroom focused</span>
              </div>
            </div>
          </div>

          <div className="hero-image-composition">
            <div className="hero-image-main">
              <Image src={heroImg1} alt="Literacy Training in Loro" placeholder="blur" />
            </div>
            <div className="hero-image-secondary">
              <Image src={heroImg2} alt="Phonics training in Alebtong" placeholder="blur" />
            </div>
            <div className="hero-floating-badge">
              <span className="badge-number">10K+</span>
              <span className="badge-text">Children Reached</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section about-dribbble-section">
        <div className="container about-grid-dribbble">
          <div className="about-content flow">
            <p className="kicker">KNOW ABOUT US</p>
            <h2 className="tpd-page-title">The literacy story we are changing</h2>
            <p className="lead" style={{ fontSize: '1.2rem', color: 'var(--md-sys-color-on-surface)', marginBottom: '1.5rem' }}>
              Many learners in Northern Uganda are still rebuilding foundational
              reading skills.
            </p>
            <p>
              Ozeki Reading Bridge Foundation exists to help schools
              move from low reading confidence to structured, daily literacy success.
              We focus on practical classroom change: stronger teacher routines,
              school coaching, learner assessments, and sustained support for school
              leaders.
            </p>
            <div className="hero-actions" style={{ marginTop: '2rem' }}>
              <Link className="button" href="/about">
                Read More
              </Link>
            </div>
          </div>

          <div className="about-image-wrapper" style={{ overflow: "hidden", borderRadius: "24px" }}>
            <a
              className="media-showcase-thumbnail-button"
              href={featuredVideoWatchUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="Watch featured Ozeki video on YouTube"
            >
              <img
                src={featuredVideoThumbnail}
                alt={featuredChannelVideo?.alt ?? "Featured Ozeki video on YouTube"}
                className="about-img"
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
            </a>
          </div>
        </div>
      </section>

      <section className="section bg-surface-container" style={{ backgroundColor: 'var(--md-sys-color-surface-container)', padding: '5rem 0' }}>
        <div className="container">
          <div className="section-head" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '3rem' }}>
            <p className="kicker">OUR APPROACH</p>
            <h2 className="tpd-page-title">How we work</h2>
          </div>
          <div className="approach-grid-dribbble">
            <article className="card icon-card">
              <div className="card-icon" style={{ backgroundColor: 'white', borderRadius: '50%', width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', boxShadow: 'var(--elevation-1)', color: 'var(--md-sys-color-secondary)' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
              </div>
              <h3>Teacher Training</h3>
              <p>Train teachers using structured phonics and reading routines</p>
            </article>
            <article className="card icon-card">
              <div className="card-icon" style={{ backgroundColor: 'white', borderRadius: '50%', width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', boxShadow: 'var(--elevation-1)', color: 'var(--md-sys-color-secondary)' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              </div>
              <h3>School Coaching</h3>
              <p>Coach in real classrooms until routines are consistent</p>
            </article>
            <article className="card icon-card">
              <div className="card-icon" style={{ backgroundColor: 'white', borderRadius: '50%', width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', boxShadow: 'var(--elevation-1)', color: 'var(--md-sys-color-secondary)' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
              </div>
              <h3>Assessments</h3>
              <p>Assess learners and track progress term by term</p>
            </article>
            <article className="card icon-card">
              <div className="card-icon" style={{ backgroundColor: 'white', borderRadius: '50%', width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', boxShadow: 'var(--elevation-1)', color: 'var(--md-sys-color-secondary)' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
              </div>
              <h3>Leadership Support</h3>
              <p>Support school leaders to supervise literacy implementation</p>
            </article>
          </div>
        </div>
      </section>

      <section className="section bg-surface-container" style={{ backgroundColor: 'var(--md-sys-color-background)', padding: '5rem 0' }}>
        <div className="container">
          <LiveImpactDashboard />
        </div>
      </section>

      <section className="section home-evidence-section">
        <div className="container">
          <div className="section-head" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '3rem' }}>
            <p className="section-subtitle">STORIES OF IMPACT</p>
            <h2 className="tpd-page-title">Testimonial Evidence from the Field</h2>
            <p>
              Photo and video stories from real training and coaching sessions in
              Northern Uganda, showing implementation quality in action.
            </p>
          </div>
          <MediaTestimonialGrid items={mediaShowcase.featuredItems.slice(0, 3)} />
          <div className="action-row">
            <Link className="button" href="/testimonials">
              View all testimonials
            </Link>
            <Link className="button button-ghost" href="/media">
              Open photo and video gallery
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
