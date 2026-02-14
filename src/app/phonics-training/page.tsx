import Link from "next/link";
import { PageHero } from "@/components/PageHero";
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
      <PageHero
        kicker="Signature program"
        title={signatureProgram.title}
        description={signatureProgram.summary}
      />

      <section className="section">
        <div className="container split">
          <article className="card">
            <h2>Program model</h2>
            <ol>
              <li>School diagnostics and baseline reading data</li>
              <li>Teacher training on structured phonics routines</li>
              <li>Classroom coaching and observation cycles</li>
              <li>Learner progress tracking and school feedback loops</li>
              <li>Leadership mentoring for sustainability</li>
            </ol>
          </article>
          <article className="card">
            <h2>Expected outcomes</h2>
            <ul>
              {signatureProgram.outcomes.map((outcome) => (
                <li key={outcome}>{outcome}</li>
              ))}
            </ul>
            <p className="note-box">
              This page targets discovery terms such as "phonics teacher training in
              Uganda" and "school reading support program".
            </p>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          {faq.map((item) => (
            <article key={item.question} className="card">
              <h3>{item.question}</h3>
              <p>{item.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="container action-row">
          <Link className="button" href="/book-visit">
            Book phonics training consult
          </Link>
          <Link className="button button-ghost" href="/resources">
            Download starter toolkit
          </Link>
        </div>
      </section>
    </>
  );
}
