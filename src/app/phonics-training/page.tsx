import Image from "next/image";
import Link from "next/link";
import trainingPhoto from "../../../assets/photos/PXL_20260218_124648833.MP.jpg";
import { signatureProgram } from "@/lib/content";

export const metadata = {
  title: "Signature Program: Phonics Training & School Support",
  description:
    "Flagship NLIP implementation pathway combining training, coaching, assessment, and evidence-backed progress at scale.",
};

const faq = [
  {
    question: "How long does implementation take?",
    answer:
      "Typical implementation runs in phased cycles: baseline, training, coaching support, and progress reviews over one or more school terms.",
  },
  {
    question: "Do you support school leaders too?",
    answer:
      "Yes. We train headteachers and directors of studies to supervise reading instruction and use classroom data for decisions.",
  },
  {
    question: "Can this work for struggling readers?",
    answer:
      "Yes. We include remedial and catch-up routines focused on missing foundational skills.",
  },
];

export default function PhonicsTrainingPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <section className="section tpd-hero-section bg-surface-container" style={{ backgroundColor: 'var(--md-sys-color-surface-container)' }}>
        <div className="container tpd-hero-grid">
          <article className="card tpd-hero-copy">
            <p className="kicker">Program Spotlight</p>
            <h1 className="tpd-page-title">Signature Program: Phonics Training &amp; School Support</h1>
            <p className="tpd-subline">
              Flagship NLIP implementation pathway for stronger classroom teaching and measurable reading gains.
            </p>
            <h2>Overview</h2>
            <p>
              Signature Program: Phonics Training &amp; School Support is our flagship
              implementation pathway for turning national literacy data into
              stronger classroom teaching and measurable gains in how children read.
              It is built for scale: the program equips teachers with practical,
              step-by-step structured phonics routines, then reinforces those
              routines through ongoing in-school coaching so the approach becomes
              consistent daily practice, not just workshop knowledge.
            </p>
            <p>
              For partners and funders, this is a complete delivery model:
              training, implementation support, measurement, and verified progress,
              organized around clear standards and evidence.
            </p>
            <p className="meta-line">
              <strong>Outcome we drive:</strong> Stronger teacher practice, measurable
              learner progress, and sustained literacy routines at school level.
            </p>
          </article>

          <article className="card tpd-hero-media">
            <Image
              src={trainingPhoto}
              alt="Teachers participating in structured phonics training"
              priority
              sizes="(max-width: 900px) 100vw, 45vw"
            />
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          <article className="card">
            <h3>Cycle Start: Diagnostics + Practical Teacher Training</h3>
            <p>
              At the start of each cycle, we conduct school diagnostics to understand
              what learners can and cannot do across core reading outcomes
              (letter-sound knowledge, decoding, fluency, comprehension) and to
              assess whether school systems protect reading time.
            </p>
            <p>
              Teachers then receive demonstration-based professional development
              focused on the practical "how" of reading instruction:
            </p>
            <ul>
              <li>Pure sound modeling and sound-symbol mapping</li>
              <li>Blending and segmenting routines</li>
              <li>Decoding and spelling (encoding)</li>
              <li>Tricky-word instruction and fluency-building practice</li>
              <li>Comprehension routines aligned to grade expectations</li>
            </ul>
            <p>
              Training is designed for real classrooms, including large classes,
              using lesson structures, teacher guides, practice routines, and
              materials aligned to the phonics sequence.
            </p>
          </article>
          <article className="card">
            <h3>In-School Coaching: The Improvement Loop</h3>
            <p>
              The differentiator is what happens next: in-school coaching and
              follow-up. Ozeki coaches observe live reading lessons using a
              standard lesson evaluation tool, provide immediate feedback, and model
              effective routines through demonstration lessons and co-teaching.
            </p>
            <p>
              This creates a practical loop: <strong>observe -&gt; coach -&gt; practice -&gt; revisit</strong>.
            </p>
            <p>
              Coaching emphasizes the highest-impact levers:
            </p>
            <ul>
              <li>Clear sound instruction</li>
              <li>Structured decoding practice</li>
              <li>Rapid corrective feedback</li>
              <li>Time-on-task</li>
              <li>Daily routines that move learners from non-reader to fluent</li>
            </ul>
          </article>
          <article className="card">
            <h3>Expected Outcomes</h3>
            <ul>
              {signatureProgram.outcomes.map((outcome) => (
                <li key={outcome}>{outcome}</li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          <article className="card">
            <h3>NLIP Data-to-Action</h3>
            <p>
              NLIP ensures improvement is measured, transparent, and actionable.
              Each cycle includes learner assessments and progress tracking that
              automatically translate results into clear reading levels and domain
              profiles, helping schools identify where learners are stuck and
              target support appropriately.
            </p>
            <p>
              Where results show high proportions of non-readers or weak decoding,
              the platform triggers Remedial &amp; Catch-Up Reading Interventions:
              structured small-group routines that rebuild foundations and
              accelerate progress.
            </p>
            <p>
              Where results show steady improvement, NLIP recommends next actions
              to sustain growth and move schools toward graduation readiness:
              strong learner outcomes, fluent reading levels, consistent teaching
              quality, and a culture of reading and writing reinforced through the
              1001 Story Project.
            </p>
          </article>
          <article className="card">
            <h3>Partner Evidence Chain</h3>
            <p>
              For potential partners, this program provides what most education
              investments lack: a complete evidence chain.
            </p>
            <p>
              Every training, coaching visit, lesson evaluation, and assessment
              generates partner-ready data:
            </p>
            <ul>
              <li>Teaching quality scores</li>
              <li>Assessment coverage</li>
              <li>Reading level movement</li>
              <li>Improvement trends over time</li>
            </ul>
            <p>
              Results are reported at school, district, region, and national
              levels, making funding decisions clearer and progress easier to
              verify term by term.
            </p>
          </article>
          <article className="card">
            <h3>Implementation Promise</h3>
            <p>
              We do not stop at workshop delivery. Partners fund a full system that
              produces sustained classroom change, supports targeted remediation
              where needed, and demonstrates verified progress until schools can
              sustain strong literacy instruction independently.
            </p>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container split">
          {faq.map((item) => (
            <article key={item.question} className="card">
              <h3>{item.question}</h3>
              <p>{item.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          <article className="card">
            <h3>Partner this Program</h3>
            <p>
              Discuss a country, region, district, or school implementation package
              for this Signature Program with clear evidence deliverables.
            </p>
            <div className="action-row">
              <Link className="button" href="/partner-with-us">
                Partner With Us
              </Link>
            </div>
          </article>
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
        </div>
      </section>
    </>
  );
}
