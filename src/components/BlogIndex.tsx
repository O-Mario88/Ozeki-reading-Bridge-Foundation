import type { BlogPost } from "@/lib/types";
import { EditorialBlogIndex } from "@/components/blog/EditorialBlogIndex";

type BlogIndexProps = {
  posts: BlogPost[];
  categories: string[];
};

export function BlogIndex({ posts, categories }: BlogIndexProps) {
  return <EditorialBlogIndex posts={posts} categories={categories} />;
}
