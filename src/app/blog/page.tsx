import { EditorialBlogIndex } from "@/components/blog/EditorialBlogIndex";
import { blogPoppins } from "@/components/blog/blog-font";
import { getMergedBlogCategoriesAsync, getMergedPublishedBlogPostsAsync } from "@/lib/blog-data";

export const revalidate = 300;

export const metadata = {
  title: "Blog",
  description:
    "Practical literacy guidance for phonics, fluency, comprehension, assessments, remedial strategies, and school systems.",
};

export default async function BlogPage() {
  const posts = await getMergedPublishedBlogPostsAsync();
  const categories = await getMergedBlogCategoriesAsync();

  return (
    <div className={`${blogPoppins.className} ${blogPoppins.variable}`}>
      <EditorialBlogIndex posts={posts} categories={categories} />
    </div>
  );
}
