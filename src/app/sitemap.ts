import { MetadataRoute } from "next";
import { listPublishedChangeStories } from "@/lib/change-stories";
import { listPublishedStoriesPostgres } from "@/lib/server/postgres/repositories/public-content";
import { getMergedPublishedBlogPostsAsync } from "@/lib/blog-data";

export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://www.ozekiread.org";
  const routes = [
    "",
    "/about",
    "/about/our-story",
    "/about/leadership-team",
    "/problem",
    "/faqs",
    "/programs",
    "/impact",
    "/impact/case-studies",
    "/impact/methodology",
    "/impact/gallery",
    "/impact/calculator",
    "/newsletter",
    "/partner/portal",
    "/donor-pack",
    "/partner-with-us",
    "/sponsor-a-school",
    "/sponsor-a-district",
    "/sponsor-a-sub-region",
    "/sponsor-a-region",
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
    "/testimonials",
    "/partners",
    "/media",
    "/gallery",
    "/transparency",
    "/transparency/financials",
    "/academy",
    "/pricing",
    "/for-teachers",
    "/for-schools",
    "/events",
    "/diagnostic-quiz",
    "/blog",
    "/privacy",
    "/terms",
    "/safeguarding",
    "/governance",
    "/story-library",
    "/anthologies",
    "/donate",
    "/insights",
  ].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : path === "/stories" ? 0.8 : 0.7,
  }));

  // Dynamic story entries
  let storyRoutes: MetadataRoute.Sitemap = [];
  try {
    const { stories } = await listPublishedStoriesPostgres({ limit: 100 });
    storyRoutes = stories.map((s) => ({
      url: `${base}/stories/${s.slug}`,
      lastModified: s.publishedAt ? new Date(s.publishedAt) : new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));
  } catch {
    // DB may not be ready during build
  }

  let changeStoryRoutes: MetadataRoute.Sitemap = [];
  try {
    const changeStories = await listPublishedChangeStories(200);
    changeStoryRoutes = changeStories.map((story) => ({
      url: `${base}/impact/case-studies/${story.slug}`,
      lastModified: story.createdAt ? new Date(story.createdAt) : new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));
  } catch {
    // DB may not be ready during build
  }

  let blogRoutes: MetadataRoute.Sitemap = [];
  try {
    const posts = await getMergedPublishedBlogPostsAsync();
    blogRoutes = posts.map((post) => ({
      url: `${base}/blog/${post.slug}`,
      lastModified: post.publishedAt ? new Date(post.publishedAt) : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  } catch {
    // DB may not be ready during build
  }

  return [...routes, ...storyRoutes, ...changeStoryRoutes, ...blogRoutes];
}
