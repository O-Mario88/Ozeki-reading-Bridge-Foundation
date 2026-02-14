import { BlogIndex } from "@/components/BlogIndex";
import { PageHero } from "@/components/PageHero";
import { blogCategories, blogPosts } from "@/lib/content";

export const metadata = {
  title: "Blog",
  description:
    "Practical literacy guidance for phonics, fluency, comprehension, assessments, remedial strategies, and school systems.",
};

export default function BlogPage() {
  return (
    <>
      <PageHero
        kicker="Knowledge hub"
        title="Blog"
        description="Practical content for teachers and school leaders: phonics, fluency, assessments, coaching, and implementation tips."
      />

      <section className="section">
        <div className="container">
          <BlogIndex posts={blogPosts} categories={blogCategories} />
        </div>
      </section>
    </>
  );
}
