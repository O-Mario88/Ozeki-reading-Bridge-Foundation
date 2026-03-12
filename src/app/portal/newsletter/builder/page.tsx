import Link from "next/link";
import { PortalNewsletterManager } from "@/components/portal/PortalNewsletterManager";
import { PortalShell } from "@/components/portal/PortalShell";
import {
  getNewsletterDispatchSummary,
  listNewsletterIssues,
  listNewsletterSubscribers,
} from "@/lib/content-db";
import { requirePortalStaffUser } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Newsletter Builder",
  description: "Build newsletter issues with structured text and image slots.",
};

export default async function PortalNewsletterBuilderPage() {
  const user = await requirePortalStaffUser();
  const issues = await listNewsletterIssues({ limit: 120 });
  const initialIssues = await Promise.all(issues.map(async (issue) => ({
    id: issue.id,
    slug: issue.slug,
    title: issue.title,
    preheader: issue.preheader,
    status: issue.status,
    autoSendEnabled: issue.autoSendEnabled,
    publishedAt: issue.publishedAt,
    autoSentAt: issue.autoSentAt,
    createdAt: issue.createdAt,
    dispatchSummary: await getNewsletterDispatchSummary(issue.id),
  })));
  const subscribersCount = (await listNewsletterSubscribers(50000)).length;

  return (
    <PortalShell
      user={user}
      activeHref="/portal/newsletter/builder"
      title="Newsletter Builder"
      description="Upload content and images into the fixed newsletter template layout."
      actions={
        <div className="action-row">
          <Link className="button button-ghost" href="/portal/newsletter">
            Open Newsletter Manager
          </Link>
        </div>
      }
    >
      <PortalNewsletterManager
        initialIssues={initialIssues}
        initialSubscribersCount={subscribersCount}
        showIssueList={false}
      />
    </PortalShell>
  );
}
