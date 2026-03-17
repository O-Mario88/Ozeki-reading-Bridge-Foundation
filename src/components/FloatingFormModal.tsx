"use client";

import { ReactNode, useState } from "react";
import { FormModal } from "@/components/forms";

type FloatingFormModalProps = {
  triggerLabel: string;
  title: string;
  description?: string;
  triggerClassName?: string;
  children: (controls: { close: () => void }) => ReactNode;
};

export function FloatingFormModal({
  triggerLabel,
  title,
  description,
  triggerClassName = "button",
  children,
}: FloatingFormModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button type="button" className={triggerClassName} onClick={() => setIsOpen(true)}>
        {triggerLabel}
      </button>

      <FormModal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title={title}
        description={description}
        closeLabel="Close form"
        maxWidth="860px"
        panelClassName="floating-form-modal-panel"
      >
        {children({ close: () => setIsOpen(false) })}
      </FormModal>
    </>
  );
}
