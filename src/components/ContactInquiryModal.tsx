"use client";

import { ContactForm } from "@/components/ContactForm";
import { FloatingFormModal } from "@/components/FloatingFormModal";

export function ContactInquiryModal() {
  return (
    <FloatingFormModal
      triggerLabel="Open inquiry form"
      title="Send an inquiry"
      description="Share your school, partner, or general request and our team will respond."
    >
      {({ close }) => <ContactForm onSuccess={close} onCancel={close} />}
    </FloatingFormModal>
  );
}

