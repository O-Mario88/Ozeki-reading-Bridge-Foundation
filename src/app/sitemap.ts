import { MetadataRoute } from "next";
import { blogPosts } from "@/lib/content";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://ozekireadingbridge.org";
  const routes = [
    "",
    "/about",
    "/programs",
    "/phonics-training",
    "/story-project",
    "/impact",
    "/resources",
    "/blog",
    "/book-visit",
    "/partner-with-us",
    "/contact",
    "/case-studies",
    "/testimonials",
    "/partners",
    "/media",
    "/transparency",
    "/academy",
    "/pricing",
    "/for-teachers",
    "/for-schools",
    "/events",
    "/diagnostic-quiz",
  ].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.7,
  }));

  const posts = blogPosts.map((post) => ({
    url: `${base}/blog/${post.slug}`,
    lastModified: new Date(post.publishedAt),
    changeFrequency: "monthly" as const,
    priority: 0.65,
  }));

  return [...routes, ...posts];
}
