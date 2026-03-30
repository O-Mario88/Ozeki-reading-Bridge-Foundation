import { ReactNode } from "react";

interface PremiumCardProps {
  children: ReactNode;
  className?: string;
  withHover?: boolean;
  variant?: "default" | "charius";
}

export function PremiumCard({
  children,
  className = "",
  withHover = false,
  variant = "default",
}: PremiumCardProps) {
  const hasCustomBg = /(^|\s)bg-/.test(className);
  const hasCustomBorder = /(^|\s)border-/.test(className) && !className.includes("border-gray-100");
  
  const isCharius = variant === "charius";
  
  const baseStyles = isCharius 
    ? `${hasCustomBg ? "" : "bg-white"} rounded-3xl ${hasCustomBorder ? "" : "border-none"} shadow-sm overflow-hidden`
    : `${hasCustomBg ? "" : "bg-white"} rounded-2xl ${hasCustomBorder ? "" : "border border-gray-100"} shadow-[0_4px_20px_-2px_rgba(0,0,0,0.04)] overflow-hidden`;
  
  const hoverStyles = withHover
    ? isCharius
        ? "transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
        : "transition-all duration-300 hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)] hover:-translate-y-1"
    : "";

  return (
    <div className={`premium-card ${baseStyles} ${hoverStyles} ${className}`.replace(/\s+/g, ' ').trim()}>
      {children}
    </div>
  );
}
