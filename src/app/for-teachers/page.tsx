import { PageHero } from "@/components/PageHero";

export const metadata = {
  title: "For Teachers",
  description:
    "Teacher Pro membership features including courses, certificates, resources, and coaching support.",
};

export default function ForTeachersPage() {
  return (
    <>
      <PageHero
        kicker="Teacher pathway"
        title="For Teachers"
        description="Build practical reading instruction skills through structured courses, coaching, and resource packs."
      />

      <section className="section">
        <div className="container cards-grid">
          <article className="card">
            <h2>Course pathways</h2>
            <ul>
              <li>Phonics foundations</li>
              <li>Fluency builder</li>
              <li>Comprehension and vocabulary</li>
              <li>Reading assessments and remedial support</li>
            </ul>
          </article>
          <article className="card">
            <h2>Teacher Pro includes</h2>
            <ul>
              <li>Self-paced modules and quizzes</li>
              <li>Verified certificates and badges</li>
              <li>Monthly live masterclass and recordings</li>
              <li>Premium resource vault access</li>
            </ul>
          </article>
        </div>
      </section>
    </>
  );
}
