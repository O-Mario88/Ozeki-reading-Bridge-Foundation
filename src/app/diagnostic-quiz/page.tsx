import Link from "next/link";
import { DiagnosticQuizModal } from "@/components/DiagnosticQuizModal";
import { PageHero } from "@/components/PageHero";

export const metadata = {
  title: "Free Phonics Diagnostic Quiz",
  description:
    "A quick school self-assessment with instant recommendations for reading instruction improvement.",
};

export default function DiagnosticQuizPage() {
  return (
    <>
      <PageHero
        kicker="School self-check"
        title="Free Phonics Diagnostic Quiz"
        description="Assess current reading instruction systems in seven quick questions and get immediate recommendations."
      />

      <section className="section">
        <div className="container">
          <article className="card">
            <h2>Start diagnostic quiz</h2>
            <p>
              Open the quiz form, complete seven questions, and get immediate
              recommendations.
            </p>
            <div className="action-row">
              <DiagnosticQuizModal />
            </div>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container card">
          <h2>Need implementation support after your score?</h2>
          <div className="action-row">
            <Link className="button" href="/book-visit">
              Book a school diagnostic visit
            </Link>
            <Link className="button button-ghost" href="/contact">
              Talk to our team
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
