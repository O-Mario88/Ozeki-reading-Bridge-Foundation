import Link from "next/link";
import { PageHero } from "@/components/PageHero";
import styles from "./page.module.css";

export const metadata = {
  title: "FAQs",
  description:
    "Frequently asked questions about literacy support, partnerships, assessments, and reporting.",
};

const faqs = [
  {
    question: "What kind of schools do you support?",
    answer:
      "We support primary schools with literacy implementation needs, with focus on practical teacher support, coaching follow-through, and measurable reading outcomes.",
  },
  {
    question: "Do you provide one-off training only?",
    answer:
      "No. We use a cycle approach: train, coach, assess, improve, and sustain. The model is designed for measurable change over time.",
  },
  {
    question: "How do you measure improvement?",
    answer:
      "We track learner reading levels, assessment outcomes by domain, and teaching quality through structured lesson evaluation and follow-up records.",
  },
  {
    question: "Can a partner fund one school, a district, or a region?",
    answer:
      "Yes. Funding options include school-level, district-level, sub-region, region, and national support packages with a consistent 2-year model.",
  },
  {
    question: "What reports do partners receive?",
    answer:
      "Partners receive aggregated, privacy-protected reports including implementation coverage, teaching quality trends, assessment movement, and recommendations.",
  },
  {
    question: "Where can I access financial and annual reports?",
    answer:
      "Financial reports are published on our Financial Transparency page. Program and annual reports are available through the Impact Reports section.",
  },
] as const;

export default function FaqPage() {
  return (
    <>
      <PageHero
        kicker="Support"
        title="FAQs"
        description="Quick answers about school support requests, partnerships, reporting, and accountability."
      />

      <section className="section">
        <div className="container">
          <div className={styles.faqGrid}>
            {faqs.map((item) => (
              <article className="card" key={item.question}>
                <h3>{item.question}</h3>
                <p>{item.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <article className="card">
            <h2>Need a specific answer?</h2>
            <div className="action-row">
              <Link className="button button-compact" href="/contact">
                Contact Us
              </Link>
              <Link className="button button-ghost button-compact" href="/about">
                Back to About
              </Link>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
