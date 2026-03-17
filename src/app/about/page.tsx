import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import { mission, organizationName, vision } from "@/lib/content";
import { listPortalCoreValuesPostgres } from "@/lib/server/postgres/repositories/public-content";
import styles from "./page.module.css";

export const metadata = {
  title: "About",
  description:
    "Learn about Ozeki Reading Bridge Foundation's vision, mission, and practical literacy implementation model.",
};

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const coreValues = await listPortalCoreValuesPostgres();

  return (
    <>
      <PageHero
        kicker="Who we are"
        title={organizationName}
        description="A literacy-focused organization based in Gulu City, Northern Uganda, strengthening how reading is taught in primary schools through practical classroom support."
      />

      <section className="section">
        <div className="container">
          <nav className={`card ${styles.quickNav}`} aria-label="About page links">
            <p className="kicker">About Navigation</p>
            <ul>
              <li><a href="#mission-vision">Mission &amp; Vision</a></li>
              <li><Link href="/about/leadership-team">Leadership Team</Link></li>
              <li><a href="#financial-annual-report">Financials/Annual Report</a></li>
              <li><Link href="/about/our-story">Our Story</Link></li>
              <li><a href="#core-values">Core Values &amp; Beliefs</a></li>
              <li><Link href="/faqs">FAQs</Link></li>
              <li><Link href="/contact">Contact</Link></li>
            </ul>
          </nav>
        </div>
      </section>

      <section className="section bg-surface-container" id="mission-vision" style={{ backgroundColor: "var(--md-sys-color-surface-container)" }}>
        <div className="container">
          <div className={styles.stackSection}>
            <div className="section-head">
              <p className="kicker">Section 1</p>
              <h2>Mission &amp; Vision</h2>
            </div>
            <div className={styles.twoCol}>
              <article className="card">
                <h3 className={styles.cardTitle}>Vision</h3>
                <p>{vision}</p>
              </article>
              <article className="card">
                <h3 className={styles.cardTitle}>Mission</h3>
                <p>{mission}</p>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="core-values">
        <div className="container">
          <div className={styles.stackSection}>
            <div className={`section-head ${styles.valuesSectionHead}`}>
              <p className="kicker">Section 2</p>
              <h2>Our Core Values</h2>
              <p className={styles.valuesIntro}>
                These values shape how we measure progress, support schools, work with
                partners, and serve children across Uganda.
              </p>
            </div>

            <div className={styles.valuesContent}>
              {coreValues.length === 0 ? (
                <article className={`card ${styles.valueCard}`}>
                  <h3 className={styles.valueTitle}>Core values will appear here</h3>
                  <p className={styles.valueBody}>
                    Publish the organization&apos;s core values from the staff portal to show them on
                    this page.
                  </p>
                </article>
              ) : (
                coreValues.map((value) => (
                  <article className={`card ${styles.valueCard}`} key={value.id}>
                    <h3 className={styles.valueTitle}>{value.title}</h3>
                    <p className={styles.valueBody}>{value.description}</p>
                  </article>
                ))
              )}
            </div>

            <article className={`card ${styles.valuesCtaBand}`}>
              <div>
                <h3 className={styles.cardTitle}>Evidence-led values in practice</h3>
                <p>
                  See how these values translate into classroom support, measurable
                  learning outcomes, and partner accountability.
                </p>
              </div>
              <Link className="button button-compact" href="/impact">
                Explore the Impact Hub
              </Link>
            </article>

            <div className={styles.bottomUtilityRow}>
              <p>
                Need our full approach by program, district, or national scope? Visit the
                programs and reports sections.
              </p>
              <div className="action-row">
                <Link className="button button-ghost button-compact" href="/programs">
                  Learn more about our work
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="financial-annual-report">
        <div className="container">
          <div className={styles.stackSection}>
            <div className="section-head">
              <p className="kicker">Section 3</p>
              <h2>Financials / Annual Report</h2>
            </div>
            <article className="card">
              <p>
                Open published financial transparency documents and annual/program report pages.
              </p>
              <div className={`action-row ${styles.reportActions}`}>
                <Link className="button button-compact" href="/transparency/financials">
                  Financial Reports
                </Link>
                <Link className="button button-ghost button-compact" href="/impact#reports">
                  Annual &amp; Program Reports
                </Link>
              </div>
            </article>
          </div>
        </div>
      </section>
    </>
  );
}
