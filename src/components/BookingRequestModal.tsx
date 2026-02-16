"use client";

import { BookingForm } from "@/components/BookingForm";
import { FloatingFormModal } from "@/components/FloatingFormModal";

export function BookingRequestModal() {
  return (
    <FloatingFormModal
      triggerLabel="Open booking form"
      title="Book a school visit"
      description="Complete this form and we will coordinate confirmation and scheduling."
    >
      {({ close }) => <BookingForm onSuccess={close} onCancel={close} />}
    </FloatingFormModal>
  );
}

