"use client";

import { FloatingFormModal } from "@/components/FloatingFormModal";
import { PartnerActionForm } from "@/components/PartnerActionForm";

export function PartnerPortalAccessModal() {
  return (
    <FloatingFormModal
      triggerLabel="Open access request form"
      title="Request partner portal access"
      description="Submit your organization details and preferred scope."
    >
      {({ close }) => (
        <PartnerActionForm
          type="Partner Portal Access"
          actionLabel="Request access"
          includeCountry
          onSuccess={close}
          onCancel={close}
        />
      )}
    </FloatingFormModal>
  );
}

