import Link from "next/link";
import { DiagnosticQuiz } from "@/components/DiagnosticQuiz";
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
          <DiagnosticQuiz />
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
