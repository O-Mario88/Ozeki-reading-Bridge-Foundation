import Image from "next/image";
import Link from "next/link";
import teachingAidsPhoto from "../../../assets/photos/PXL_20260218_124653516.MP.jpg";

export const metadata = {
  title: "Teaching Aids & Instructional Resources (Teachers)",
  description:
    "Practical, high-impact teacher tools aligned to structured phonics routines, classroom implementation, and measurable learner progress.",
};

export default function TeachingAidsInstructionalResourcesTeachersPage() {
  return (
    <>
      <section
        className="section tpd-hero-section bg-surface-container"
        style={{ backgroundColor: "var(--md-sys-color-surface-container)" }}
      >
        <div className="container tpd-hero-grid">
          <article className="card tpd-hero-copy">
            <p className="kicker">Program Spotlight</p>
            <h1 className="tpd-page-title">
              Teaching Aids &amp; Instructional Resources (Teachers)
            </h1>
            <p className="tpd-subline">
              Practical tools that make structured phonics easier to deliver every day.
            </p>
            <h2>Overview</h2>
            <p>
              Teaching Aids &amp; Instructional Resources (Teachers) equips
              classrooms with practical, high-impact tools that make structured
              phonics easy to deliver consistently, especially in real-world
              conditions where teachers manage large classes, limited preparation
              time, and uneven access to materials.
            </p>
            <p>
              Strong literacy instruction depends on routines being repeated
              accurately every day. This program ensures teachers have the supports
              needed to teach clearly, maintain pace, and give learners enough
              practice to become fluent readers.
            </p>
            <p className="meta-line">
              <strong>Outcome we drive:</strong> a stronger instructional
              environment where teachers spend less time improvising and more time
              teaching reading effectively.
            </p>
          </article>

          <article className="card tpd-hero-media">
            <Image
              src={teachingAidsPhoto}
              alt="Teachers using structured literacy teaching aids in class"
              priority
              sizes="(max-width: 900px) 100vw, 45vw"
            />
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          <article className="card">
            <h3>Structured Teaching Aids Package</h3>
            <p>
              Ozeki provides a package of tools aligned to the same phonics
              sequence and lesson routines used in training and coaching. Core
              resources include:
            </p>
            <ul>
              <li>Sound charts for daily revision and quick checks</li>
              <li>Flashcards for rapid practice and retrieval</li>
              <li>Blending boards and phoneme frames for blending and segmenting</li>
              <li>Graded word lists aligned to taught sounds</li>
              <li>Ready-to-use lesson templates for routine consistency</li>
            </ul>
          </article>

          <article className="card">
            <h3>Teacher Guides for Accurate Delivery</h3>
            <p>
              Teacher guides provide step-by-step delivery notes, sample scripts,
              common error patterns, and correction routines so lessons remain
              accurate even when teachers are still building confidence.
            </p>
            <p>
              Where possible, resources are low-cost and reproducible so schools
              can sustain supply over time.
            </p>
          </article>

          <article className="card">
            <h3>Designed for Real Classroom Constraints</h3>
            <p>
              Resources are built for typical school realities: large class sizes,
              mixed learner ability, limited prep time, and uneven access to
              materials.
            </p>
            <p>
              The design goal is simple: make high-quality routines workable every
              day, not only under ideal conditions.
            </p>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          <article className="card">
            <h3>Materials Tracking and School-Level Accountability</h3>
            <p>
              Beyond availability, the platform makes resources measurable.
              Materials are recorded at school level: what was delivered, when,
              and for which grades.
            </p>
            <p>
              This gives leaders and coaches a shared view of resource readiness
              before implementation support starts.
            </p>
          </article>

          <article className="card">
            <h3>Usage Verification During Lesson Evaluation</h3>
            <p>
              Teachers and coaches can tag which tools are used during lesson
              evaluations, for example whether sound charts and blending boards are
              used effectively, not just present in the classroom.
            </p>
            <p>
              This shifts resource monitoring from inventory counting to classroom
              effectiveness.
            </p>
          </article>

          <article className="card">
            <h3>Resource-Instruction Feedback Loop</h3>
            <p>
              The platform creates a practical loop between resource use and
              outcomes. If teaching quality improves but decoding remains weak, the
              platform can highlight whether key tools are missing or used
              inconsistently.
            </p>
            <p>
              If catch-up learners are not moving, the system can recommend the
              specific resources needed to increase practice intensity and success.
            </p>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          <article className="card">
            <h3>Partner Transparency and Sustainability</h3>
            <p>
              For partners and funders, this program strengthens transparency and
              sustainability. Instead of materials distributed being treated as a
              one-time activity, we link instructional resources to implementation
              quality and learner outcomes.
            </p>
          </article>

          <article className="card">
            <h3>How Stakeholders Use the Evidence</h3>
            <ul>
              <li>Schools see what is available and what to prioritize next</li>
              <li>Coaches target support based on what is missing</li>
              <li>
                Partners receive evidence that resources are delivered and used in
                ways that improve teaching quality and reading progress
              </li>
            </ul>
          </article>

          <article className="card">
            <h3>Program Result</h3>
            <p>
              The result is a stronger, more consistent instructional environment
              where teachers spend less time improvising and more time teaching
              reading effectively, every day.
            </p>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid-two">
          <article className="card">
            <h3>Explore Related Evidence</h3>
            <p>
              <Link className="inline-download-link" href="/impact">
                Open Live Impact Dashboard
              </Link>
            </p>
            <p>
              <Link className="inline-download-link" href="/resources">
                Open Resources Library
              </Link>
            </p>
          </article>

          <article className="card">
            <h3>Support Classroom Resource Scale-Up</h3>
            <p>
              Partner to provide practical teacher tools with tracked usage and
              verified links to instructional quality and learner reading progress.
            </p>
            <div className="action-row">
              <Link className="button" href="/portal/schools">
                Open school profiles
              </Link>
              <Link className="button button-ghost" href="/partner-with-us">
                Partner With Us
              </Link>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
