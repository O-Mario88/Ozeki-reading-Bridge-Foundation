import { notFound } from "next/navigation";
import { getMergedPublishedBlogPostBySlug, getMergedPublishedBlogPosts } from "@/lib/blog-data";

type Params = {
  slug: string;
};

export function generateStaticParams() {
  return getMergedPublishedBlogPosts().map((post) => ({ slug: post.slug }));
}

export function generateMetadata({ params }: { params: Params }) {
  const post = getMergedPublishedBlogPostBySlug(params.slug);

  if (!post) {
    return {
      title: "Article not found",
    };
  }

  return {
    title: post.title,
    description: post.excerpt,
  };
}

export default function BlogPostPage({ params }: { params: Params }) {
  const post = getMergedPublishedBlogPostBySlug(params.slug);

  if (!post) {
    notFound();
  }

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <p className="kicker">{post.category}</p>
          <h1>{post.title}</h1>
          <p>{post.excerpt}</p>
          <p className="meta-line">
            {post.author} ({post.role}) · {new Date(post.publishedAt).toLocaleDateString()} ·
            {" "}
            {post.readTime}
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container split">
          <article className="card">
            <h2>Table of contents</h2>
            <ol>
              {post.sections.map((section) => {
                const id = section.heading.toLowerCase().replace(/[^a-z0-9]+/g, "-");
                return (
                  <li key={section.heading}>
                    <a href={`#${id}`}>{section.heading}</a>
                  </li>
                );
              })}
            </ol>
          </article>
          <article className="card">
            <h2>Author profile</h2>
            <p>
              <strong>{post.author}</strong>
            </p>
            <p>{post.role}</p>
            <p>
              Ozeki Reading Bridge Foundation literacy team member focused on practical
              classroom implementation.
            </p>
          </article>
        </div>
      </section>

      <section className="section">
        <div className="container card">
          {post.sections.map((section) => {
            const id = section.heading.toLowerCase().replace(/[^a-z0-9]+/g, "-");
            return (
              <section key={section.heading} id={id}>
                <h2>{section.heading}</h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </section>
            );
          })}
        </div>
      </section>
    </>
  );
}
