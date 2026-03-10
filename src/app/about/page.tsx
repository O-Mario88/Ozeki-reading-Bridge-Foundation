import Link from "next/link";
import {
  BarChart3,
  GraduationCap,
  Repeat2,
  ShieldCheck,
  Target,
} from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { mission, organizationName, vision } from "@/lib/content";
import styles from "./page.module.css";

export const metadata = {
  title: "About",
  description:
    "Learn about Ozeki Reading Bridge Foundation's vision, mission, and practical literacy implementation model.",
};

const coreValues = [
  {
    id: "evidence-before-assumptions",
    title: "Evidence Before Assumptions",
    icon: BarChart3,
    belief:
      "At Ozeki, we believe literacy improvement must be guided by real evidence, not guesswork. Too often, education programs are judged by how many trainings were held or how many materials were distributed, without clearly showing whether children are actually reading better. We take a different approach. We measure learner outcomes, teaching quality, implementation progress, and school readiness using structured tools and clear benchmarks. This allows us to see what is working, what is not working, and where support should go next. Evidence helps us move beyond opinion and act with confidence, fairness, and accountability. It also helps schools, partners, and funders trust the work because progress is visible, credible, and measurable.",
  },
  {
    id: "teachers-first-learners-win",
    title: "Teachers First, Learners Win",
    icon: GraduationCap,
    belief:
      "We believe that when teachers are equipped, supported, and coached well, learners are the ones who benefit most. Reading improvement does not happen because of tools alone; it happens because a teacher stands in front of learners every day with the skill and confidence to teach reading effectively. That is why our work invests deeply in teacher professional development, coaching, mentorship, and leadership support. We do not treat teachers as passive recipients of training, but as the most important drivers of change in the classroom. When teachers understand structured phonics, use it consistently, receive practical follow-up, and are supported by school leaders, children begin to decode, read fluently, and understand what they read. Putting teachers first is not a slogan for us - it is a practical strategy for improving reading outcomes at scale.",
  },
  {
    id: "implementation-over-events",
    title: "Implementation Over Events",
    icon: Repeat2,
    belief:
      "We value what happens after the training just as much as the training itself. In many systems, workshops are held, attendance is counted, and the work is considered done. We know that is not enough. Real improvement happens when new methods are applied in classrooms, repeated daily, observed, refined, and sustained over time. That is why Ozeki prioritizes implementation over one-off events. We focus on lesson delivery, classroom routines, school support visits, coaching conversations, demonstration lessons, follow-up plans, and verification of progress. We want every school to move from exposure to mastery, from intention to practice, and from isolated activities to systems that continue producing results. For us, success is not that training happened - it is that teaching changed and learners improved.",
  },
  {
    id: "equity-where-it-hurts-most",
    title: "Equity Where It Hurts Most",
    icon: Target,
    belief:
      "We believe literacy support should go where the need is greatest, not only where delivery is easiest. Across Uganda, some schools and communities carry deeper literacy gaps because of poverty, conflict history, weak instructional support, limited materials, or long-standing system disruption. We are committed to identifying those gaps honestly and responding intentionally. That means supporting non-readers, strengthening low-performing schools, prioritizing hard-hit sub-regions, and ensuring that the weakest learners are not invisible in the data. Equity, for us, means more than equal distribution - it means fair, targeted support based on need. We use evidence to identify who is falling behind and then structure interventions that help them catch up. A child's geography, school type, or background should not determine whether they learn to read.",
  },
  {
    id: "integrity-safety-and-transparency",
    title: "Integrity, Safety, and Transparency",
    icon: ShieldCheck,
    belief:
      "We believe trust is earned through honesty, responsible stewardship, and the protection of the people we serve. Ozeki exists to improve literacy outcomes, but we know that impact without integrity is fragile. That is why we are committed to safeguarding children, handling data responsibly, using resources transparently, and reporting results truthfully. We do not inflate numbers, hide challenges, or make claims we cannot support. We build systems that leave an audit trail, respect privacy, and allow partners, schools, and communities to see what was done, what changed, and what still needs attention. Integrity also means staying faithful to our mission, even when shortcuts are tempting. We want every school, donor, parent, and partner to know that Ozeki can be trusted - not only for what we say, but for how we work.",
  },
] as const;

export default function AboutPage() {
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

            <div className={styles.valuesLayout}>
              <aside className={`card ${styles.valuesMiniNav}`} aria-label="Core values links">
                <p className="kicker">Core Values</p>
                <ul>
                  {coreValues.map((value) => (
                    <li key={value.id}>
                      <a href={`#${value.id}`}>{value.title}</a>
                    </li>
                  ))}
                </ul>
              </aside>

              <div className={styles.valuesContent}>
                {coreValues.map((value) => {
                  const Icon = value.icon;
                  return (
                    <article className={`card ${styles.valueCard}`} id={value.id} key={value.id}>
                      <div className={styles.valueHeader}>
                        <span className={styles.valueIconWrap} aria-hidden>
                          <Icon size={18} />
                        </span>
                        <h3 className={styles.valueTitle}>{value.title}</h3>
                      </div>
                      <p className={styles.valueBody}>{value.belief}</p>
                    </article>
                  );
                })}
              </div>
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
