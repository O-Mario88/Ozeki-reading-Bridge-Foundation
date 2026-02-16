import Image from "next/image";
import Link from "next/link";
import trainingPhoto from "../../../assets/photos/Phonics training in Alebtong.jpg";
import { signatureProgram } from "@/lib/content";

export const metadata = {
  title: "Signature Program: Phonics Training & School Support",
  description:
    "Structured phonics teacher training plus in-school coaching and reading assessments for measurable gains.",
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

      <section className="section tpd-hero-section">
        <div className="container tpd-hero-grid">
          <article className="card tpd-hero-copy">
            <p className="kicker">Program Spotlight</p>
            <h1 className="tpd-page-title">{signatureProgram.title}</h1>
            <p className="tpd-subline">
              Practical school support model for structured reading recovery.
            </p>
            <h2>Overview</h2>
            <p>
              Our signature program combines practical teacher training, in-school
              coaching, learner assessment, and leadership support so phonics
              routines are implemented consistently in real classrooms.
            </p>
            <p>
              The model is built for low-resource school systems and designed to
              improve instructional quality, learner reading outcomes, and school
              accountability at the same time.
            </p>
            <p className="meta-line">
              <strong>Outcome we drive:</strong> Stronger teacher practice,
              measurable learner progress, and sustained literacy routines across
              schools.
            </p>
          </article>

          <article className="card tpd-hero-media">
            <Image
              src={trainingPhoto}
              alt="Teachers participating in structured phonics training"
              priority
            />
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          <article className="card">
            <h3>Program Model</h3>
            <ol>
              <li>School diagnostics and baseline reading data</li>
              <li>Teacher training on structured phonics routines</li>
              <li>Classroom coaching and observation cycles</li>
              <li>Learner progress tracking and school feedback loops</li>
              <li>Leadership mentoring for sustainability</li>
            </ol>
          </article>
          <article className="card">
            <h3>Expected Outcomes</h3>
            <ul>
              {signatureProgram.outcomes.map((outcome) => (
                <li key={outcome}>{outcome}</li>
              ))}
            </ul>
          </article>
          <article className="card">
            <h3>Implementation Promise</h3>
            <p>
              We do not stop at workshop delivery. Every cycle includes
              follow-through in schools until classroom routines are adopted and
              school leaders can supervise delivery with confidence.
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
            <h3>Book Program Support</h3>
            <p>
              Schedule a diagnostic discussion for your school, district, or
              partner-funded implementation cycle.
            </p>
            <div className="action-row">
              <Link className="button" href="/portal/schools">
                Open school profiles
              </Link>
            </div>
          </article>
          <article className="card">
            <h3>Related Download Links</h3>
            <p>
              <a className="inline-download-link" href="/resources">
                Download Starter Toolkit
              </a>
            </p>
            <p>
              <a className="inline-download-link" href="/resources">
                Download Reading Assessment Pack
              </a>
            </p>
          </article>
        </div>
      </section>
    </>
  );
}
