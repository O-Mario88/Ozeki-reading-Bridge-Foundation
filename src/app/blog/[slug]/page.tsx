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

  const SITE_URL = "https://www.ozekiread.org";
  const canonical = post.canonicalUrl || `${SITE_URL}/blog/${slug}`;
  const heroImage = post.socialImageUrl || post.featuredImageUrl || post.mediaImageUrl;

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
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/logo.png`,
      },
    },
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
    image: heroImage ? [heroImage] : [`${SITE_URL}/opengraph-image`],
    inLanguage: "en-UG",
    url: canonical,
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
      {
        "@type": "ListItem",
        position: 3,
        name: post.seoTitle || post.title,
        item: canonical,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <EditorialArticleLayout post={post} allPosts={allPosts} />
    </>
  );
}
