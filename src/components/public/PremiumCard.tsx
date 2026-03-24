import { ReactNode } from "react";

interface PremiumCardProps {
  children: ReactNode;
  className?: string;
  withHover?: boolean;
}

export function PremiumCard({
  children,
  className = "",
  withHover = false,
}: PremiumCardProps) {
  const hasCustomBg = /(^|\s)bg-/.test(className);
  const hasCustomBorder = /(^|\s)border-/.test(className) && !className.includes("border-gray-100");
  
  const baseStyles = `${hasCustomBg ? "" : "bg-white"} rounded-2xl ${hasCustomBorder ? "" : "border border-gray-100"} shadow-[0_4px_20px_-2px_rgba(0,0,0,0.04)] overflow-hidden`;
  
  const hoverStyles = withHover
    ? "transition-all duration-300 hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)] hover:-translate-y-1"
    : "";

  return (
    <div className={`${baseStyles} ${hoverStyles} ${className}`.replace(/\s+/g, ' ').trim()}>
      {children}
    </div>
  );
}
