"use client";

import { CSSProperties, ReactNode, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

type FloatingVariant = "modal" | "drawer";

export type FloatingSurfaceProps = {
  open: boolean;
  title: string;
  description?: string;
  variant?: FloatingVariant;
  statusChip?: string;
  footer?: ReactNode;
  children: ReactNode;
  onClose: () => void;
  closeLabel?: string;
  closeOnOverlay?: boolean;
  unsavedChanges?: boolean;
  confirmCloseMessage?: string;
  maxWidth?: string;
  className?: string;
  panelClassName?: string;
  headerIcon?: ReactNode;
};

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function cx(...values: Array<string | undefined | false>) {
  return values.filter(Boolean).join(" ");
}

export function FloatingSurface({
  open,
  title,
  description,
  variant = "modal",
  statusChip,
  footer,
  children,
  onClose,
  closeLabel = "Close",
  closeOnOverlay = true,
  unsavedChanges = false,
  confirmCloseMessage = "You have unsaved changes. Close this form?",
  maxWidth,
  className,
  panelClassName,
  headerIcon = <span aria-hidden="true">⚡</span>,
}: FloatingSurfaceProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const requestClose = () => {
    if (unsavedChanges && typeof window !== "undefined") {
      const ok = window.confirm(confirmCloseMessage);
      if (!ok) {
        return;
      }
    }
    onClose();
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousActive = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const focusables = panelRef.current?.querySelectorAll<HTMLElement>(focusableSelector);
    const firstFocusable = focusables?.[0] ?? null;
    const fallback = panelRef.current;
    (firstFocusable ?? fallback)?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        requestClose();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) {
        return;
      }

      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(focusableSelector));
      if (items.length === 0) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      previousActive?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setExpanded(false);
    }
  }, [open]);

  if (!open || !mounted) {
    return null;
  }

  return createPortal(
    <div
      className={cx("floating-surface-overlay", `floating-surface-overlay--${variant}`, className)}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onMouseDown={(event) => {
        if (!closeOnOverlay) {
          return;
        }
        if (event.target === event.currentTarget) {
          requestClose();
        }
      }}
    >
      <div
        ref={panelRef}
        className={cx("floating-surface-panel", `floating-surface-panel--${variant}`, panelClassName)}
        data-expanded={expanded ? "true" : "false"}
        style={
          !expanded && maxWidth
            ? ({ "--floating-surface-max-width": maxWidth } as CSSProperties)
            : undefined
        }
        tabIndex={-1}
      >
        <header className="floating-surface-header">
          <div className="floating-surface-title-wrap">
            <div className="floating-surface-title-row">
              <span className="floating-surface-title-icon">{headerIcon}</span>
              <h2 id={titleId}>{title}</h2>
            </div>
            {description ? (
              <p id={descriptionId} className="floating-surface-description">
                {description}
              </p>
            ) : null}
          </div>
          <div className="floating-surface-header-actions">
            {statusChip ? <span className="floating-surface-status-chip">{statusChip}</span> : null}
            <button
              type="button"
              className="floating-surface-window-btn"
              onClick={requestClose}
              aria-label="Minimize"
              title="Minimize"
            >
              <span aria-hidden="true">−</span>
            </button>
            <button
              type="button"
              className="floating-surface-window-btn"
              onClick={() => setExpanded((prev) => !prev)}
              aria-label={expanded ? "Restore" : "Expand"}
              title={expanded ? "Restore" : "Expand"}
            >
              <span aria-hidden="true">{expanded ? "❐" : "□"}</span>
            </button>
            <button
              type="button"
              className="floating-surface-window-btn"
              onClick={requestClose}
              aria-label={closeLabel}
              title={closeLabel}
            >
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
        </header>

        <div className="floating-surface-body">{children}</div>

        {footer ? <footer className="floating-surface-footer">{footer}</footer> : null}
      </div>
    </div>,
    document.body,
  );
}
