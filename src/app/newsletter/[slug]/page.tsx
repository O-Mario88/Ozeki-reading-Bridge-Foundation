import Link from "next/link";
import { notFound } from "next/navigation";
import { getNewsletterIssueBySlug } from "@/lib/db";

export const dynamic = "force-dynamic";

type NewsletterIssuePageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: NewsletterIssuePageProps) {
  const { slug } = await params;
  const issue = getNewsletterIssueBySlug(slug);
  if (!issue || issue.status !== "published") {
    return {
      title: "Newsletter issue",
    };
  }
  return {
    title: issue.title,
    description: issue.preheader || "Newsletter issue from Ozeki Reading Bridge Foundation.",
  };
}

export default async function NewsletterIssuePage({ params }: NewsletterIssuePageProps) {
  const { slug } = await params;
  const issue = getNewsletterIssueBySlug(slug);
  if (!issue || issue.status !== "published") {
    notFound();
  }

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <p className="kicker">Newsletter issue</p>
          <h1>{issue.title}</h1>
          {issue.preheader ? <p>{issue.preheader}</p> : null}
          <p className="meta-line">
            Published {String((issue.publishedAt || issue.createdAt).slice(0, 10))}
          </p>
          <div className="action-row">
            <Link className="button" href={`/api/newsletter/${encodeURIComponent(issue.slug)}/pdf`}>
              Download PDF
            </Link>
            <Link className="button button-ghost" href={`/api/newsletter/${encodeURIComponent(issue.slug)}/html`}>
              View HTML
            </Link>
            <Link className="button button-ghost" href="/newsletter">
              All newsletters
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <article className="card">
            <div
              className="newsletter-public-content"
              dangerouslySetInnerHTML={{ __html: issue.htmlContent }}
            />
          </article>
        </div>
      </section>
    </>
  );
}
