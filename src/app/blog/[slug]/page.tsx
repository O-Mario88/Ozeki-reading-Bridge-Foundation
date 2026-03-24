import { notFound } from "next/navigation";
import { EditorialArticleLayout } from "@/components/blog/EditorialArticleLayout";
import {
  getMergedPublishedBlogPostBySlugAsync,
  getMergedPublishedBlogPostsAsync,
} from "@/lib/blog-data";

type Params = Promise<{ slug: string }>;
export const revalidate = 300;

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const post = await getMergedPublishedBlogPostBySlugAsync(slug);

  if (!post) {
    return {
      title: "Article not found",
    };
  }

  return {
    title: post.seoTitle || post.title,
    description: post.metaDescription || post.excerpt,
    alternates: post.canonicalUrl
      ? {
        canonical: post.canonicalUrl,
      }
      : undefined,
    openGraph: {
      title: post.seoTitle || post.title,
      description: post.metaDescription || post.excerpt,
      type: "article",
      publishedTime: post.publishedAt,
      images: post.socialImageUrl || post.featuredImageUrl || post.mediaImageUrl
        ? [post.socialImageUrl || post.featuredImageUrl || post.mediaImageUrl || ""]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.seoTitle || post.title,
      description: post.metaDescription || post.excerpt,
      images: post.socialImageUrl || post.featuredImageUrl || post.mediaImageUrl
        ? [post.socialImageUrl || post.featuredImageUrl || post.mediaImageUrl || ""]
        : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: { params: Params }) {
  const { slug } = await params;
  const post = await getMergedPublishedBlogPostBySlugAsync(slug);
  const allPosts = await getMergedPublishedBlogPostsAsync();

  if (!post) {
    notFound();
  }

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.seoTitle || post.title,
    description: post.metaDescription || post.excerpt,
    author: {
      "@type": "Person",
      name: post.author,
    },
    publisher: {
      "@type": "Organization",
      name: "Ozeki Reading Bridge Foundation",
      url: "https://www.ozekiread.org",
    },
    datePublished: post.publishedAt,
    image: post.featuredImageUrl || post.socialImageUrl || post.mediaImageUrl,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <EditorialArticleLayout post={post} allPosts={allPosts} />
    </>
  );
}
