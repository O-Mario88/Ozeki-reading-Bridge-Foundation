import Link from "next/link";
import { caseStudies } from "@/lib/content";

export const metadata = {
  title: "Impact Case Studies",
  description:
    "Explore real school stories with before-and-after data, implementation actions, and learning outcomes.",
};

export default function ImpactCaseStudiesPage() {
  return (
    <>
      <section className="page-hero">
        <div className="container">
          <p className="kicker">Impact</p>
          <h1>Stories of measurable change</h1>
          <p>Real schools. Clear actions. Verified results.</p>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          {caseStudies.map((study) => (
            <article className="card" key={study.slug}>
              <p className="meta-pill">{study.district}</p>
              <h2>{study.school}</h2>
              <p>
                <strong>Baseline challenge:</strong> {study.challenge}
              </p>
              <ul>
                <li>Grade band: Early primary</li>
                <li>Teachers trained: Data tracked in implementation cycle</li>
                <li>Coaching visits: Included in support package</li>
                <li>Learners assessed: Included in cycle reporting</li>
              </ul>
              <p className="meta-line">Headline improvement</p>
              <p className="note-box">{study.results[0]}</p>
              <div className="action-row">
                <Link className="button" href={`/impact/case-studies/${study.slug}`}>
                  Read case study
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
