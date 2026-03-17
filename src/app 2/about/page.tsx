import { PageHero } from "@/components/PageHero";
import { mission, organizationName, vision } from "@/lib/content";

export const metadata = {
  title: "About",
  description:
    "Learn about Ozeki Reading Bridge Foundation's vision, mission, and practical literacy implementation model.",
};

export default function AboutPage() {
  return (
    <>
      <PageHero
        kicker="Who we are"
        title={organizationName}
        description="A literacy-focused organization based in Gulu City, Northern Uganda, strengthening how reading is taught in primary schools through practical classroom support."
      />

      <section className="section bg-surface-container" style={{ backgroundColor: 'var(--md-sys-color-surface-container)' }}>
        <div className="container">
          <div className="about-grid-dribbble">
            <div className="about-content flow">
              <p className="kicker">VISION AND MISSION</p>
              <h2 className="tpd-page-title">Our Foundation</h2>
              <div className="card" style={{ marginTop: '2rem' }}>
                <h3 style={{ color: 'var(--md-sys-color-secondary)' }}>Vision</h3>
                <p>{vision}</p>
              </div>
              <div className="card" style={{ marginTop: '1rem' }}>
                <h3 style={{ color: 'var(--md-sys-color-secondary)' }}>Mission</h3>
                <p>{mission}</p>
              </div>
            </div>

            <div className="about-content flow">
              <p className="kicker">STRATEGIC FOCUS</p>
              <h2 className="tpd-page-title">Northern Uganda</h2>
              <p className="lead" style={{ fontSize: '1.15rem', color: 'var(--md-sys-color-on-surface-variant)', lineHeight: '1.6' }}>
                Northern Uganda experienced more than two decades of conflict that
                disrupted school systems, teacher support, and early grade literacy
                development.
              </p>
              <p>
                Today, many schools are still rebuilding. We are based in Gulu so we can
                stay close to classrooms, teachers, and school leaders who need sustained
                literacy recovery support.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '3rem' }}>
            <p className="kicker">HOW WE DELIVER CHANGE</p>
            <h2 className="tpd-page-title">Our Methods</h2>
          </div>

          <div className="approach-grid-dribbble">
            <article className="card icon-card">
              <div className="card-icon" style={{ backgroundColor: 'var(--md-sys-color-surface-container)', borderRadius: '50%', width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', color: 'var(--md-sys-color-primary)' }}>
                <strong style={{ fontSize: '1.5rem' }}>1</strong>
              </div>
              <h3>Teacher Training</h3>
              <p>Practical demonstration-based teacher training</p>
            </article>
            <article className="card icon-card">
              <div className="card-icon" style={{ backgroundColor: 'var(--md-sys-color-surface-container)', borderRadius: '50%', width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', color: 'var(--md-sys-color-primary)' }}>
                <strong style={{ fontSize: '1.5rem' }}>2</strong>
              </div>
              <h3>School Coaching</h3>
              <p>School-based coaching for implementation fidelity</p>
            </article>
            <article className="card icon-card">
              <div className="card-icon" style={{ backgroundColor: 'var(--md-sys-color-surface-container)', borderRadius: '50%', width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', color: 'var(--md-sys-color-primary)' }}>
                <strong style={{ fontSize: '1.5rem' }}>3</strong>
              </div>
              <h3>Assessments</h3>
              <p>Learner assessments that guide instruction</p>
            </article>
            <article className="card icon-card">
              <div className="card-icon" style={{ backgroundColor: 'var(--md-sys-color-surface-container)', borderRadius: '50%', width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', color: 'var(--md-sys-color-primary)' }}>
                <strong style={{ fontSize: '1.5rem' }}>4</strong>
              </div>
              <h3>Data & Reporting</h3>
              <p>Data-driven program improvement and partner reporting</p>
            </article>
          </div>
        </div>
      </section>
    </>
  );
}
