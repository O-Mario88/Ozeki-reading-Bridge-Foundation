import Link from "next/link";
import { notFound } from "next/navigation";
import { caseStudies } from "@/lib/content";

export async function generateStaticParams() {
  return caseStudies.map((study) => ({ slug: study.slug }));
}

export default async function ImpactCaseStudyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const study = caseStudies.find((item) => item.slug === slug);

  if (!study) {
    notFound();
  }

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <p className="kicker">Case study</p>
          <h1>{study.school}</h1>
          <p>{study.district}</p>
        </div>
      </section>

      <section className="section">
        <div className="container split">
          <article className="card">
            <h2>Baseline challenge</h2>
            <p>{study.challenge}</p>
          </article>
          <article className="card">
            <h2>What we implemented</h2>
            <ul>
              {study.intervention.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container cards-grid">
          <article className="card">
            <h2>What changed</h2>
            <ul>
              {study.results.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
          <article className="card">
            <h2>What we learned</h2>
            <ul>
              <li>Structured coaching strengthens daily reading lesson consistency.</li>
              <li>Data reviews help schools prioritize the highest-leverage support actions.</li>
            </ul>
          </article>
          <article className="card">
            <h2>Next steps</h2>
            <ul>
              <li>Continue coaching cycles for routine fidelity in target classes.</li>
              <li>Expand remedial grouping for the lowest-performing learners.</li>
              <li>Run periodic progress checks to guide adjustments.</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container card">
          <h2>Recommended downloads</h2>
          <div className="action-row">
            <Link className="button" href="/resources">
              Open resource library
            </Link>
            <Link className="button button-ghost" href="/portal/schools">
              Open school profiles
            </Link>
            <Link className="button button-ghost" href="/impact/case-studies">
              Back to case studies
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
