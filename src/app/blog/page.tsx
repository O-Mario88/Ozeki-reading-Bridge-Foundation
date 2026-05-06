import { EditorialBlogIndex } from "@/components/blog/EditorialBlogIndex";
import { getMergedBlogCategoriesAsync, getMergedPublishedBlogPostsAsync } from "@/lib/blog-data";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Blog",
  description:
    "Practical literacy guidance for phonics, fluency, comprehension, assessments, remedial strategies, and school systems.",
};

export default async function BlogPage() {
  const posts = await getMergedPublishedBlogPostsAsync();
  const categories = await getMergedBlogCategoriesAsync();

  return (
    <EditorialBlogIndex posts={posts} categories={categories} />
  );
}
