"use client";

import { useEffect } from "react";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function isVisible(element: HTMLElement) {
  const style = window.getComputedStyle(element);
  if (style.visibility === "hidden" || style.display === "none") {
    return false;
  }
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function isFocusable(element: HTMLElement) {
  if (!isVisible(element)) {
    return false;
  }
  const disabled = element.getAttribute("disabled");
  if (disabled !== null) {
    return false;
  }
  return true;
}

function getOpenDialogs() {
  return Array.from(
    document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]'),
  ).filter((dialog) => isVisible(dialog));
}

function getTopDialog() {
  const dialogs = getOpenDialogs();
  if (dialogs.length === 0) {
    return null;
  }
  return dialogs[dialogs.length - 1] ?? null;
}

function getFocusableItems(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelector)).filter((item) =>
    isFocusable(item),
  );
}

export function ModalAccessibilityManager() {
  useEffect(() => {
    const syncBodyClass = () => {
      const hasModal = getOpenDialogs().length > 0;
      document.body.classList.toggle("app-has-modal", hasModal);
    };

    const ensureFocusInDialog = () => {
      const dialog = getTopDialog();
      if (!dialog) {
        return;
      }
      const active = document.activeElement as HTMLElement | null;
      if (active && dialog.contains(active)) {
        return;
      }
      const focusables = getFocusableItems(dialog);
      const fallback = focusables[0] ?? dialog;
      fallback.focus();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) {
        return;
      }
      if (event.key === "Escape") {
        const dialog = getTopDialog();
        if (!dialog) {
          return;
        }
        const closeControl = dialog.querySelector<HTMLElement>(
          '[data-modal-close="true"], button[aria-label*="Close"], button[title*="Close"], .roster-modal__close',
        );
        if (closeControl) {
          event.preventDefault();
          closeControl.click();
          return;
        }
        if (
          dialog.classList.contains("floating-donor-overlay") ||
          dialog.classList.contains("roster-modal-overlay") ||
          dialog.classList.contains("impact-map-sheet-backdrop")
        ) {
          event.preventDefault();
          dialog.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        }
        return;
      }
      if (event.key !== "Tab") {
        return;
      }
      const dialog = getTopDialog();
      if (!dialog) {
        return;
      }
      const focusables = getFocusableItems(dialog);
      if (focusables.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (!active || active === first || !dialog.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (!active || active === last || !dialog.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };

    const onFocusIn = () => {
      ensureFocusInDialog();
    };

    const observer = new MutationObserver(() => {
      syncBodyClass();
      ensureFocusInDialog();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "class", "hidden", "aria-hidden"],
    });

    document.addEventListener("focusin", onFocusIn, true);
    window.addEventListener("keydown", onKeyDown);

    syncBodyClass();
    ensureFocusInDialog();

    return () => {
      observer.disconnect();
      document.removeEventListener("focusin", onFocusIn, true);
      window.removeEventListener("keydown", onKeyDown);
      document.body.classList.remove("app-has-modal");
    };
  }, []);

  return null;
}
