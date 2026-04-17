import Link from "next/link";
import { getLatestPublishedNewsletterIssue, listNewsletterIssues } from "@/lib/content-db";

export const metadata = {
  title: "Newsletter",
  description:
    "Read the latest Ozeki Reading Bridge newsletter updates and download each issue as PDF.",
};

export const revalidate = 300;

export default async function NewsletterIndexPage() {
  let latest = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let issues: any[] = [];
  try {
    const results = await Promise.all([
      getLatestPublishedNewsletterIssue(),
      listNewsletterIssues({ status: "published", limit: 30 }),
    ]);
    latest = results[0];
    issues = results[1];
  } catch (error) {
    console.error("[NewsletterIndexPage] failed to fetch issues during build:", error);
  }

  return (
    <>
      <section className="page-hero" style={{ backgroundImage: "url('/photos/Amolatar%20District%20Literacy.jpg')" }}>
        <div className="container">
          <p className="kicker">Newsletter</p>
          <h1>Ozeki Reading Bridge Newsletter</h1>
          <p>
            Literacy updates, implementation insights, and evidence-based progress from
            schools and districts.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container flow">
          {latest ? (
            <article className="card">
              <h2>{latest.title}</h2>
              {latest.preheader ? <p>{latest.preheader}</p> : null}
              <p className="meta-line">
                Published {String((latest.publishedAt || latest.createdAt).slice(0, 10))}
              </p>
              <div
                className="newsletter-public-content"
                dangerouslySetInnerHTML={{ __html: latest.htmlContent }}
              />
              <div className="action-row">
                <Link className="button" href={`/newsletter/${encodeURIComponent(latest.slug)}`}>
                  Open full issue
                </Link>
                <Link className="button button-ghost" href={`/api/newsletter/${encodeURIComponent(latest.slug)}/pdf`}>
                  Download PDF
                </Link>
                <Link className="button button-ghost" href={`/api/newsletter/${encodeURIComponent(latest.slug)}/html`}>
                  View HTML
                </Link>
              </div>
            </article>
          ) : (
            <article className="card">
              <h2>No newsletter issue published yet</h2>
              <p>The first published newsletter issue will appear here.</p>
            </article>
          )}

          {issues.length > 1 ? (
            <article className="card">
              <h2>Previous issues</h2>
              <ul>
                {issues.slice(1).map((issue) => (
                  <li key={issue.id}>
                    <Link href={`/newsletter/${encodeURIComponent(issue.slug)}`}>{issue.title}</Link>{" "}
                    <small>({String((issue.publishedAt || issue.createdAt).slice(0, 10))})</small>
                  </li>
                ))}
              </ul>
            </article>
          ) : null}
        </div>
      </section>
    </>
  );
}
