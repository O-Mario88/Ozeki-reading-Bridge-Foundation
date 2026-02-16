import { PortalBlogPostsManager } from "@/components/portal/PortalBlogPostsManager";
import { PortalShell } from "@/components/portal/PortalShell";
import { listPortalBlogPosts } from "@/lib/db";
import { requirePortalStaffUser } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Portal Blog",
  description: "Write and publish blog posts with image/video media from the staff dashboard.",
};

export default async function PortalBlogPage() {
  const user = await requirePortalStaffUser();
  const posts = listPortalBlogPosts(user, 180).map((post) => ({
    ...post,
    imageUrl: post.imageFileName ? `/api/blog/${post.id}/image` : null,
    videoUrl: post.videoFileName ? `/api/blog/${post.id}/video` : null,
  }));

  return (
    <PortalShell
      user={user}
      activeHref="/portal/blog"
      title="Blog Publishing"
      description="Write, upload media, and publish practical literacy articles. Author and date are captured automatically."
    >
      <PortalBlogPostsManager initialPosts={posts} currentUserName={user.fullName} />
    </PortalShell>
  );
}
