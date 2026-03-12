import Link from "next/link";
import { PortalGalleryManager } from "@/components/portal/PortalGalleryManager";
import { PortalShell } from "@/components/portal/PortalShell";
import { listGalleryUploads } from "@/lib/gallery-store";
import { requirePortalStaffUser } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Portal Gallery",
  description: "Upload public gallery photos with short descriptions.",
};

export default async function PortalGalleryPage() {
  const user = await requirePortalStaffUser();
  const uploads = await listGalleryUploads(500);

  return (
    <PortalShell
      user={user}
      activeHref="/portal/gallery"
      title="Gallery Upload Manager"
      description="Upload photos with short descriptions. Newest uploads appear first on the public gallery page."
      actions={(
        <div className="action-row">
          <Link className="button button-ghost" href="/gallery" target="_blank" rel="noreferrer">
            Open Public Gallery
          </Link>
        </div>
      )}
    >
      <PortalGalleryManager initialItems={uploads} />
    </PortalShell>
  );
}
