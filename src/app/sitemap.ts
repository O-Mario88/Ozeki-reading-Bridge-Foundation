import { MetadataRoute } from "next";
import { listPublishedStories } from "@/lib/db";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://ozekireadingbridge.org";
  const routes = [
    "",
    "/about",
    "/problem",
    "/programs",
    "/impact",
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
    "/stories",
    "/resources",

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
    priority: path === "" ? 1 : path === "/stories" ? 0.8 : 0.7,
  }));

  // Dynamic story entries
  let storyRoutes: MetadataRoute.Sitemap = [];
  try {
    const { stories } = listPublishedStories({ limit: 100 });
    storyRoutes = stories.map((s) => ({
      url: `${base}/stories/${s.slug}`,
      lastModified: s.publishedAt ? new Date(s.publishedAt) : new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));
  } catch {
    // DB may not be ready during build
  }

  return [...routes, ...storyRoutes];
}

