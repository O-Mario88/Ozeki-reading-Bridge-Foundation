import Link from "next/link";
import { ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "icon";
type Size = "sm" | "md" | "lg";

interface BaseProps {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
}

const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-4 text-[13px]",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-[15px]",
};

const iconSizeClasses: Record<Size, string> = {
  sm: "h-9 w-9",
  md: "h-11 w-11",
  lg: "h-12 w-12",
};

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-[#111111] text-white shadow-[0_14px_34px_rgba(10,10,10,0.22)] hover:bg-black focus-visible:ring-2 focus-visible:ring-[#111] focus-visible:ring-offset-2",
  secondary:
    "border border-white/70 bg-white/70 text-[#111111] shadow-[0_10px_28px_rgba(10,10,10,0.08)] backdrop-blur-xl hover:bg-white",
  ghost:
    "text-[#222] hover:bg-white/55",
  icon:
    "border border-white/70 bg-white/70 text-[#111111] shadow-[0_10px_24px_rgba(10,10,10,0.08)] backdrop-blur-xl hover:bg-white",
};

export function GlassButton({
  children,
  variant = "primary",
  size = "md",
  className = "",
  href,
  type = "button",
  ...rest
}: BaseProps & {
  href?: string;
  type?: "button" | "submit" | "reset";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const cls = [
    "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition",
    variant === "icon" ? "" : sizeClasses[size],
    variant === "icon" ? "grid place-items-center " + iconSizeClasses[size] : "",
    variantClasses[variant],
    className,
  ].join(" ");

  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={cls} {...rest}>
      {children}
    </button>
  );
}
