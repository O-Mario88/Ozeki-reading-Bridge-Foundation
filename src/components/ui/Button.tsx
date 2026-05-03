import { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * Variants map to the project's button color system:
 *   action     — neutral utility blue (#377FEF). Default for generic actions.
 *   brand      — official brand teal #066a67. Use for portal primary actions.
 *   accent     — official brand orange #ff7235. Use for public CTAs (donate, sponsor).
 *   warning    — destructive red #F2382F. Delete / wipe / reject.
 *   positive   — success green #2EAD55. Approve / save / complete.
 *   attention  — caution yellow #FFB31A. Pending / draft / review-needed.
 *   secondary  — outline (transparent bg, brand-blue border + text).
 *   ghost      — same as secondary; alias kept for older call sites.
 *
 * `primary` is kept as an alias for `brand` so old code keeps working.
 */
type ButtonVariant =
  | "action"
  | "brand"
  | "accent"
  | "warning"
  | "positive"
  | "attention"
  | "secondary"
  | "ghost"
  | "primary"; // legacy alias → brand

type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Render the rectangular reference style — uppercase, taller, bold, drop shadow. */
  rect?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  fullWidth?: boolean;
};

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

const VARIANT_CLASS: Record<ButtonVariant, string | undefined> = {
  action:    "button-action",
  brand:     "button-brand",
  primary:   "button-brand",       // legacy alias
  accent:    "button-brand-orange",
  warning:   "button-warning",
  positive:  "button-positive",
  attention: "button-attention",
  secondary: "button-ghost",
  ghost:     "button-ghost",
};

export function Button({
  variant = "action",
  size = "sm",
  rect = false,
  leadingIcon,
  trailingIcon,
  fullWidth = false,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={cx(
        "button",
        VARIANT_CLASS[variant],
        size === "md" && "button-md",
        size === "lg" && "button-md button-action-rect",
        rect && "button-action-rect",
        fullWidth && "w-full",
        className,
      )}
    >
      {leadingIcon}
      {children}
      {trailingIcon}
    </button>
  );
}
