import Link from "next/link";
import Image from "next/image";
import { HomeSupportRequestModal } from "@/components/home/HomeSupportRequestModal";
import { listPublishedPortalTestimonials } from "@/lib/db";
import { organizationName, tagline } from "@/lib/content";
import {
  INTELLIGENCE_LOOP,
  INSIGHT_TILES,
  PARTNERSHIP_OPTIONS,
  TRUST_LINKS,
} from "@/lib/home-static-data";
import styles from "./homepage.module.css";

export const revalidate = 300;

const TESTIMONIAL_FIELDS = new Set([
  "how_training_changed_teaching",
  "what_you_will_do_to_improve_reading_levels",
]);

function clipQuote(text: string, maxChars: number) {
  const clean = text.trim();
  if (clean.length <= maxChars) {
    return clean;
  }
  return `${clean.slice(0, maxChars).trimEnd()}...`;
}

export default function HomePage() {
  const testimonialRows = listPublishedPortalTestimonials(90)
    .filter(
      (item) =>
        item.sourceType === "training_feedback" &&
        TESTIMONIAL_FIELDS.has(String(item.quoteField ?? "")),
    )
    .slice(0, 6);

  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "NonProfit",
    name: organizationName,
    description: tagline,
    url: "https://ozekireadingbridge.org",
    areaServed: "Uganda",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
      />

      <section className={`section ${styles.hero}`}>
        <div className={`container ${styles.heroInner}`}>
          <p className={styles.heroKicker}>National Literacy Intelligence Platform</p>
          <h1>Ozeki Reading Bridge Foundation</h1>
          <p className={styles.heroSubhead}>
            Practical Literacy. Strong Teachers. Confident Readers-measured and improved
            with real classroom data across Uganda.
          </p>
          <div className={styles.ctaRow}>
            <Link className={`button ${styles.primaryCta}`} href="/impact">
              View Live Impact Dashboard
            </Link>
            <Link className={`button ${styles.outlineCta}`} href="/programs">
              Explore Programs
            </Link>
          </div>
          <p className={styles.microline}>
            Aggregated, privacy-protected classroom data. Updated regularly.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className={styles.sectionHeading}>
            <h2>How Our National Literacy Intelligence Platform works</h2>
          </div>
          <div className={styles.loopGrid}>
            {INTELLIGENCE_LOOP.map((step, index) => (
              <article className={styles.loopCard} key={step.title}>
                <div className={styles.loopIcon}>{index + 1}</div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </article>
            ))}
          </div>
          <p className={styles.loopCtaWrap}>
            <Link className={styles.inlineLink} href="/impact">
              Explore the Impact Hub
            </Link>
          </p>
        </div>
      </section>

      <section className={`section ${styles.problemSection}`}>
        <div className="container">
          <aside className={styles.problemPhotoCard}>
            <Image
              src="/photos/PXL_20260218_134438769.jpg"
              alt="Teachers and learners in a literacy classroom session in Uganda."
              fill
              className={styles.problemPhotoImage}
              sizes="(max-width: 860px) 100vw, 1200px"
            />
            <div className={styles.problemPhotoOverlay} />
            <div className={styles.problemPhotoContent}>
              <p className={styles.problemPhotoKicker}>Impact Overview</p>
              <h2 className={styles.problemPhotoTitle}>
                Reading is the gateway skill: Uganda can&apos;t afford weak foundations.
              </h2>
              <p>
                Public dashboard data is aggregated from verified staff submissions and
                published with privacy controls.
              </p>
            </div>
          </aside>
          <div className={styles.problemNarrative}>
            <p>
              Across Uganda, reading is the single skill that determines whether children
              can access the rest of the curriculum. Yet national evidence shows that too
              many learners are still not mastering foundational literacy early enough.
              Uganda has made progress, but large numbers of children still move through
              school without fluent reading-slowing learning in every subject and widening
              inequality between regions, school types, and communities. This is why a
              national response must be practical, measurable, and focused on the
              classroom: when reading is weak, every other learning goal becomes harder.
            </p>
            <p>
              Northern Uganda shows what happens when education systems are disrupted for
              long periods. Years of conflict and displacement interrupted schooling,
              reduced consistent instructional time, and left many classrooms rebuilding
              with limited materials, large class sizes, and teacher shortages. Even after
              stability returns, the learning gap does not close automatically-early
              reading requires systematic instruction and repeated practice. The good news
              is that recovery is possible when support is structured, sustained, and
              measured.
            </p>
            <p>
              That is the purpose of a National Literacy Intelligence Platform: strengthen
              teachers through structured phonics and coaching, measure learner progress
              through simple, trusted reading outcomes, and turn data into targeted
              action-school by school, district by district. NLIP helps partners and
              schools move from &quot;support everywhere&quot; to &quot;support where it matters most,&quot;
              and it proves progress with credible evidence that government, donors, and
              communities can trust.
            </p>
          </div>
          <div className={styles.ctaRow}>
            <Link className={`button ${styles.primaryCta}`} href="/impact">
              Open the Impact Hub
            </Link>
            <Link className={`button ${styles.outlineCta}`} href="/programs">
              See Our Programs
            </Link>
          </div>
        </div>
      </section>

      <section className={`section ${styles.programOverviewSection}`}>
        <div className="container">
          <div className={styles.sectionHeading}>
            <h2>Programs powering national literacy improvement</h2>
          </div>
          <div className={styles.programOverview}>
            <p>
              The full Program Directory now lives on the Programs page as the canonical
              &quot;What We Do&quot; reference, with detailed implementation pathways,
              outcomes, and evidence lines for each service stream.
            </p>
            <p>
              On the homepage, we keep a concise national view. Use the Programs page to
              explore teacher professional development, coaching and mentorship, learner
              assessments, remedial support, instructional leadership, MER, and the 1001
              Story Project in depth.
            </p>
            <p>
              Each program page shows what is delivered, how performance is measured, and
              what data is generated for school, district, regional, and national
              decision-making.
            </p>
          </div>
          <div className={styles.ctaRow}>
            <Link className={`button ${styles.primaryCta}`} href="/programs">
              Open Program Directory
            </Link>
            <Link className={`button ${styles.outlineCta}`} href="/partner-with-us">
              Discuss Implementation Support
            </Link>
          </div>
        </div>
      </section>

      <section className={`section ${styles.insightSection}`}>
        <div className="container">
          <div className={styles.sectionHeading}>
            <h2>What NLIP reveals nationwide</h2>
          </div>
          <div className={styles.insightGrid}>
            {INSIGHT_TILES.map((tile) => (
              <article className={styles.insightTile} key={tile}>
                <h3>{tile}</h3>
              </article>
            ))}
          </div>
          <div className={styles.centeredCta}>
            <Link className={`button ${styles.primaryCta}`} href="/impact">
              View Live Impact Dashboard
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className={styles.sectionHeading}>
            <h2>Fund literacy by geography</h2>
          </div>
          <div className={styles.partnerGrid}>
            {PARTNERSHIP_OPTIONS.map((option) => (
              <article className={styles.partnerCard} key={option.title}>
                <h3>{option.title}</h3>
                <p>
                  <strong>What you fund:</strong> {option.fund}
                </p>
                <p>
                  <strong>What happens:</strong> {option.happens}
                </p>
                <p>
                  <strong>What evidence you receive:</strong> {option.evidence}
                </p>
              </article>
            ))}
          </div>
          <div className={styles.ctaRow}>
            <Link className={`button ${styles.primaryCta}`} href="/partner-with-us">
              Partner With Us
            </Link>
            <HomeSupportRequestModal
              triggerLabel="Request a concept note"
              title="Request a proposal concept note"
              description="Share your geography focus and we will route this to the partnership team."
              triggerClassName={`button ${styles.outlineCta}`}
              presetMessage="I would like to request a concept note for a literacy partnership."
            />
          </div>
        </div>
      </section>

      <section className={`section ${styles.testimonialSection}`}>
        <div className="container">
          <div className={styles.sectionHeading}>
            <h2>What teachers say after training</h2>
          </div>
          <div className={styles.testimonialGrid}>
            {testimonialRows.length > 0 ? (
              testimonialRows.map((quote) => (
                <article className={styles.testimonialCard} key={quote.id}>
                  <p className={styles.quote}>
                    &quot;{clipQuote(quote.storyText, 280)}&quot;
                  </p>
                  <div className={styles.metaRow}>
                    <span className={styles.roleChip}>{quote.storytellerRole}</span>
                    <span className={styles.geoMeta}>{quote.district}</span>
                  </div>
                </article>
              ))
            ) : (
              <article className={styles.testimonialCard}>
                <p className={styles.quote}>
                  Approved training-feedback testimonials will appear here after moderation.
                </p>
              </article>
            )}
          </div>
          <div className={styles.ctaRow}>
            <Link className={`button ${styles.outlineCta}`} href="/stories">
              Read more stories
            </Link>
          </div>
        </div>
      </section>

      <section className={`section ${styles.supportSection}`}>
        <div className="container">
          <div className={styles.supportCard}>
            <h2>Supporting your school&apos;s literacy journey</h2>
            <p>
              Need training, coaching, assessment support, or 1001 Story activation?
              Submit a request and our team will route it to the right support lead.
            </p>
            <HomeSupportRequestModal
              triggerLabel="Request Support"
              title="Request school literacy support"
              description="Tell us the support needed and the team will follow up."
              triggerClassName={`button ${styles.primaryCta}`}
            />
          </div>
        </div>
      </section>

      <section className={styles.trustStrip}>
        <div className="container">
          <ul className={styles.trustLinks}>
            {TRUST_LINKS.map((item) => (
              <li key={item.label}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
