import Link from "next/link";
import { PortalAboutContentManager } from "@/components/portal/PortalAboutContentManager";
import { PortalShell } from "@/components/portal/PortalShell";
import { requirePortalStaffUser } from "@/lib/auth";
import {
  listPortalCoreValuesPostgres,
  listPortalLeadershipTeamMembersPostgres,
} from "@/lib/server/postgres/repositories/public-content";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "About Content",
  description: "Manage leadership team and core values shown on the public About pages.",
};

export default async function PortalAboutPage() {
  const user = await requirePortalStaffUser();
  const members = (await listPortalLeadershipTeamMembersPostgres({ includeUnpublished: true })).map(
    (member) => ({
      ...member,
      photoUrl: member.photoFileName
        ? `/api/about/team/${member.id}/photo?v=${encodeURIComponent(member.updatedAt)}`
        : null,
    }),
  );
  const values = await listPortalCoreValuesPostgres({ includeUnpublished: true });

  return (
    <PortalShell
      user={user}
      activeHref="/portal/about"
      title="About Content"
      description="Manage public leadership profiles and core values from the staff portal."
      actions={(
        <div className="action-row">
          <Link className="button button-ghost" href="/about" target="_blank" rel="noreferrer">
            Open About Page
          </Link>
          <Link
            className="button button-ghost"
            href="/about/leadership-team"
            target="_blank"
            rel="noreferrer"
          >
            Open Leadership Page
          </Link>
        </div>
      )}
    >
      <PortalAboutContentManager initialMembers={members} initialValues={values} />
    </PortalShell>
  );
}
