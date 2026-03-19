import Link from "next/link";
import Image from "next/image";
import { HomeSupportRequestModal } from "@/components/home/HomeSupportRequestModal";
import { organizationName, tagline } from "@/lib/content";
import {
  INTELLIGENCE_LOOP,
  INSIGHT_TILES,
  PARTNERSHIP_OPTIONS,
  TRUST_LINKS,
} from "@/lib/home-static-data";
import { isPostgresConfigured } from "@/lib/server/postgres/client";
import { listPublishedPortalTestimonialsPostgres } from "@/lib/server/postgres/repositories/public-content";
import type { PortalTestimonialRecord } from "@/lib/types";
import styles from "./homepage.module.css";

export const dynamic = "force-dynamic";

const TESTIMONIAL_FIELDS = new Set([
  "how_training_changed_teaching",
  "what_you_will_do_to_improve_reading_levels",
]);

const WORKING_PARTNERS = [
  {
    name: "Edify",
    href: "https://edify.org/uganda/",
    logoSrc: "/partners/edify-logo.svg?v=edify-uganda",
    width: 220,
    height: 72,
  },
];

function clipQuote(text: string, maxChars: number) {
  const clean = text.trim();
  if (clean.length <= maxChars) {
    return clean;
  }
  return `${clean.slice(0, maxChars).trimEnd()}...`;
}

export default async function HomePage() {
  let testimonialRows: PortalTestimonialRecord[] = [];
  if (isPostgresConfigured()) {
    try {
      testimonialRows = (await listPublishedPortalTestimonialsPostgres(90))
        .filter(
          (item) =>
            item.sourceType === "training_feedback" &&
            TESTIMONIAL_FIELDS.has(String(item.quoteField ?? "")),
        )
        .slice(0, 6);
    } catch (error) {
      console.error("Failed to load homepage testimonials.", error);
    }
  }

  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "NonProfit",
    name: organizationName,
    description: tagline,
    url: "https://www.ozekiread.org",
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

      <section className={`section ${styles.problemSection}`}>
        <div className="container">
          <div className={styles.sectionHeading}>
            <h2 className={styles.problemSectionTitle}>
              Reading is the gateway skill: Uganda can&apos;t afford weak foundations.
            </h2>
          </div>
          <div className={styles.problemPhotoWrap}>
            <aside className={styles.problemPhotoCard}>
              <Image
                src="/photos/Reading Session in Dokolo Greater Bata Cluster.jpeg"
                alt="Reading session in Dokolo Greater Bata Cluster."
                fill
                className={styles.problemPhotoImage}
                sizes="(max-width: 1024px) 100vw, 1200px"
                loading="lazy"
              />
            </aside>
          </div>
          <div className={styles.problemNarrative}>
            <p className={styles.problemLead}>
              Public dashboard data is aggregated from verified staff submissions and
              published with privacy controls.
            </p>
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

      <section className="section">
        <div className="container">
          <div className={`${styles.sectionHeading} ${styles.loopSectionHeading}`}>
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

      <section className={`section ${styles.insightSection}`}>
        <div className="container">
          <div className={styles.sectionHeading}>
            <h2>What NLIP reveals nationwide</h2>
          </div>
          <p className={styles.insightLead}>
            Public dashboard data is aggregated from verified staff submissions and
            published with privacy controls.
          </p>
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

      <section className="section" id="funding-packages">
        <div className="container">
          <div className={styles.sectionHeading}>
            <h2>Fund literacy by geography</h2>
          </div>
          <div className={styles.partnerGrid}>
            {PARTNERSHIP_OPTIONS.map((option) => (
              <article
                className={`${styles.partnerCard}${option.fullRow ? ` ${styles.partnerCardFullRow}` : ""}`}
                key={option.title}
              >
                <h3>{option.title}</h3>
                {option.href ? (
                  <p>
                    <Link className="button button-ghost" href={option.href}>
                      Open package details
                    </Link>
                  </p>
                ) : null}
              </article>
            ))}
          </div>
          <div className={styles.ctaRow}>
            <Link className={`button ${styles.outlineCta}`} href="/impact/calculator">
              Open Funding Calculator
            </Link>
            <HomeSupportRequestModal
              triggerLabel="Partner With Us"
              title="Partnership request form"
              description="Share your partnership interest and geography focus, and our team will follow up."
              triggerClassName={`button ${styles.primaryCta}`}
              presetMessage="I would like to partner with Ozeki Reading Bridge Foundation."
            />
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
            <article className={styles.liveSessionCard}>
              <h3>Live training sessions</h3>
              <p>
                Join scheduled virtual sessions on phonics instruction, coaching practice,
                learner assessment routines, and literacy leadership.
              </p>
            </article>
            <div className={styles.supportActionRow}>
              <HomeSupportRequestModal
                triggerLabel="Request Support"
                title="Request school literacy support"
                description="Tell us the support needed and the team will follow up."
                triggerClassName={`button ${styles.primaryCta} ${styles.supportCompactButton}`}
              />
              <Link
                className={`button ${styles.supportCompactButton} ${styles.supportSecondaryButton}`}
                href="/events"
              >
                Signup for Live Training Sessions
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.partnerLogoStrip} aria-label="Partners we work with">
        <div className={`container ${styles.partnerLogoContainer}`}>
          <ul className={styles.partnerLogoList}>
            {WORKING_PARTNERS.map((partner) => (
              <li key={partner.name} className={styles.partnerLogoItem}>
                <a
                  href={partner.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={`Visit ${partner.name}`}
                  className={styles.partnerLogoLink}
                >
                  <img
                    src={partner.logoSrc}
                    alt={`${partner.name} logo`}
                    width={partner.width}
                    height={partner.height}
                    className={styles.partnerLogoImage}
                    loading="lazy"
                    decoding="async"
                  />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
