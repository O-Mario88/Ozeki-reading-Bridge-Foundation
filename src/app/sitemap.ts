import { MetadataRoute } from "next";
import { blogPosts } from "@/lib/content";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://ozekireadingbridge.org";
  const routes = [
    "",
    "/about",
    "/problem",
    "/programs",
    "/impact",
    "/impact/dashboard",
    "/impact/reports",
    "/impact/case-studies",
    "/impact/methodology",
    "/impact/gallery",
    "/impact/calculator",
    "/partner/portal",
    "/donor-pack",
    "/donate",
    "/teacher-professional-development",
    "/in-school-coaching-mentorship",
    "/learner-reading-assessments-progress-tracking",
    "/teaching-aids-instructional-resources-teachers",
    "/school-systems-routines",
    "/instructional-leadership-support",
    "/monitoring-evaluation-reporting",
    "/literacy-content-creation-advocacy",
    "/remedial-catch-up-reading-interventions",
    "/reading-materials-development",
    "/phonics-training",
    "/story-project",
    "/resources",
    "/blog",
    "/book-visit",
    "/partner",
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
