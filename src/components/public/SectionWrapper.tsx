import { ReactNode } from "react";

interface SectionWrapperProps {
  children: ReactNode;
  className?: string;
  containerClassName?: string;
  theme?: "light" | "dark" | "brand" | "off-white";
  id?: string;
}

export function SectionWrapper({
  children,
  className = "",
  containerClassName = "",
  theme = "light",
  id,
}: SectionWrapperProps) {
  const themeClasses = {
    light: "bg-white text-brand-text",
    dark: "bg-brand-background text-brand-text",
    brand: "bg-brand-primary text-white",
    "off-white": "bg-[#F9FAFB] text-brand-text",
  };

  return (
    <section id={id} className={`py-20 md:py-28 ${themeClasses[theme]} ${className}`.trim()}>
      <div className={`container mx-auto px-4 md:px-6 max-w-7xl ${containerClassName}`.trim()}>
        {children}
      </div>
    </section>
  );
}
