"use client";

import type { CSSProperties, ReactNode } from "react";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import type { UseFormSubmitReturn } from "@/lib/forms/useFormSubmit";

type Props = {
  /** Hook return value from useFormSubmit. The generic T doesn't matter
   *  to the button; we only read status / message. Accept any T. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  state: UseFormSubmitReturn<any>;
  /** Label shown when idle. */
  idleLabel: ReactNode;
  /** Optional label shown while in-flight. Defaults to "Submitting…". */
  submittingLabel?: ReactNode;
  /** Optional label shown on success. Defaults to "Successful". */
  successLabel?: ReactNode;
  /** Optional label shown on failure. Defaults to "Failed". */
  failedLabel?: ReactNode;
  /** Optional icon shown when idle (left of label). */
  icon?: ReactNode;
  /** Form association — defaults to native submit type. */
  type?: "submit" | "button";
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
};

/**
 * Shared submit button that renders consistent state across the system.
 *
 *   idle      → idleLabel + optional icon
 *   submitting → spinner + "Submitting…"
 *   success   → checkmark + "Successful" (auto-reverts to idle ~2s)
 *   failed    → alert    + "Failed"     (auto-reverts to idle ~2s)
 *
 * Background color shifts to emerald on success and red on failure so
 * the state is also visible without reading the label.
 */
export function SubmitButton({
  state,
  idleLabel,
  submittingLabel = "Submitting…",
  successLabel = "Successful",
  failedLabel = "Failed",
  icon,
  type = "submit",
  onClick,
  disabled,
  className,
  style,
}: Props) {
  const { status } = state;
  const isSubmitting = status === "submitting";
  const isSuccess = status === "success";
  const isFailed = status === "failed";

  const stateBg =
    isSuccess ? "#16a34a" :
      isFailed ? "#dc2626" :
        undefined;

  const baseStyle: CSSProperties = {
    transition: "background-color 200ms ease, opacity 200ms ease",
    ...(stateBg ? { backgroundColor: stateBg, color: "#fff", borderColor: stateBg } : {}),
    ...style,
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isSubmitting}
      data-submit-state={status}
      aria-live="polite"
      className={className}
      style={baseStyle}
    >
      {isSubmitting ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          <span>{submittingLabel}</span>
        </>
      ) : isSuccess ? (
        <>
          <CheckCircle2 className="h-4 w-4" aria-hidden />
          <span>{successLabel}</span>
        </>
      ) : isFailed ? (
        <>
          <AlertCircle className="h-4 w-4" aria-hidden />
          <span>{failedLabel}</span>
        </>
      ) : (
        <>
          {icon}
          <span>{idleLabel}</span>
        </>
      )}
    </button>
  );
}
