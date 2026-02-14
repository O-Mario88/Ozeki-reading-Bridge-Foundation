import Link from "next/link";
import { PageHero } from "@/components/PageHero";

export const metadata = {
  title: "The 1001 Story Project",
  description:
    "School-based writing program where learners draft, revise, and publish stories to strengthen reading and writing.",
};

export default function StoryProjectPage() {
  return (
    <>
      <PageHero
        kicker="Learner authorship"
        title="The 1001 Story Project"
        description="A structured school writing program that reinforces reading fluency while building learner confidence and expression."
      />

      <section className="section">
        <div className="container split">
          <article className="card">
            <h2>How schools join</h2>
            <ol>
              <li>Teacher orientation and writing-routine training</li>
              <li>Learner prompt-based drafting sessions</li>
              <li>Revision, read-aloud, and editing cycles</li>
              <li>Story compilation and optional school showcase</li>
              <li>Anthology publishing (digital or print, funding dependent)</li>
            </ol>
          </article>
          <article className="card">
            <h2>Outcomes</h2>
            <ul>
              <li>Improved writing quality and sentence construction</li>
              <li>Stronger reading fluency through read-aloud practice</li>
              <li>Higher learner confidence and motivation</li>
              <li>Locally relevant reading materials created by learners</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container card">
          <h2>Sample implementation outputs</h2>
          <ul>
            <li>Teacher training log and writing routines</li>
            <li>Learner draft portfolio and edited anthology</li>
            <li>Progress notes on writing and fluency growth</li>
          </ul>
          <div className="action-row">
            <Link className="button" href="/book-visit">
              Start 1001 Story onboarding
            </Link>
            <Link className="button button-ghost" href="/partner-with-us">
              Sponsor anthology printing
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
