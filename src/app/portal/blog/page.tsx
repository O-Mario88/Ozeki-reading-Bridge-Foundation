import Link from "next/link";
import { PortalBlogManager } from "@/components/portal/PortalBlogManager";
import { PortalShell } from "@/components/portal/PortalShell";
import { listPortalBlogPostsAsync } from "@/lib/blog-db";
import { requirePortalStaffUser } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Blog Manager",
  description: "Create, edit, and publish public blog posts.",
};

type SearchParams = Promise<{
  new?: string;
}>;

export default async function PortalBlogPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requirePortalStaffUser();
  const query = await searchParams;
  const posts = await listPortalBlogPostsAsync(true);
  const initialCompose = query.new === "1";

  return (
    <PortalShell
      user={user}
      activeHref="/portal/blog"
      title="Blog Manager"
      description="Draft and publish website blog posts from the portal."
      actions={(
        <div className="action-row">
          <Link className="button button-ghost" href="/blog" target="_blank" rel="noreferrer">
            Open Public Blog
          </Link>
        </div>
      )}
    >
      <PortalBlogManager initialPosts={posts} currentUser={user} initialCompose={initialCompose} />
    </PortalShell>
  );
}
