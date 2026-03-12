"use client";

import { ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";

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

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      <button type="button" className={triggerClassName} onClick={() => setIsOpen(true)}>
        {triggerLabel}
      </button>

      {isOpen
        ? createPortal(
          <div
            className="floating-donor-overlay"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onClick={() => setIsOpen(false)}
          >
            <div className="card floating-donor-dialog" onClick={(event) => event.stopPropagation()}>
              <div className="floating-donor-header">
                <div>
                  <p className="kicker">Form</p>
                  <h3>{title}</h3>
                  {description ? <p>{description}</p> : null}
                </div>
                <button className="button button-ghost" type="button" onClick={() => setIsOpen(false)}>
                  Cancel
                </button>
              </div>
              {children({ close: () => setIsOpen(false) })}
            </div>
          </div>,
          document.body,
        )
        : null}
    </>
  );
}

