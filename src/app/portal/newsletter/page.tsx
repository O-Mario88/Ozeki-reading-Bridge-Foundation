import { PortalNewsletterManager } from "@/components/portal/PortalNewsletterManager";
import { PortalShell } from "@/components/portal/PortalShell";
import Link from "next/link";
import {
  getNewsletterDispatchSummary,
  listNewsletterIssues,
  listNewsletterSubscribers,
} from "@/lib/db";
import { requirePortalStaffUser } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Newsletter Manager",
  description:
    "Create newsletter issues, publish, and send grouped newsletter emails to website subscribers.",
};

export default async function PortalNewsletterPage() {
  const user = await requirePortalStaffUser();
  const initialIssues = listNewsletterIssues({ limit: 120 }).map((issue) => ({
    id: issue.id,
    slug: issue.slug,
    title: issue.title,
    preheader: issue.preheader,
    status: issue.status,
    autoSendEnabled: issue.autoSendEnabled,
    publishedAt: issue.publishedAt,
    autoSentAt: issue.autoSentAt,
    createdAt: issue.createdAt,
    dispatchSummary: getNewsletterDispatchSummary(issue.id),
  }));
  const subscribersCount = listNewsletterSubscribers(50000).length;

  return (
    <PortalShell
      user={user}
      activeHref="/portal/newsletter"
      title="Newsletter Manager"
      description="Collect subscribers, publish newsletter issues, and trigger grouped sends."
      actions={(
        <div className="action-row">
          <Link className="button button-ghost" href="/portal/newsletter/builder">
            Open Dedicated Builder Form
          </Link>
        </div>
      )}
    >
      <PortalNewsletterManager
        initialIssues={initialIssues}
        initialSubscribersCount={subscribersCount}
      />
    </PortalShell>
  );
}
