import { ReactNode } from "react";

interface SectionWrapperProps {
  children: ReactNode;
  className?: string;
  containerClassName?: string;
  theme?: "light" | "dark" | "brand" | "off-white" | "charius-beige" | "charius-dark";
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
    light: "bg-white text-[#111]",
    dark: "bg-brand-background text-white",
    brand: "bg-[#006b61] text-white",
    "off-white": "bg-charius-beige text-[#111]",
    "charius-beige": "bg-charius-beige text-[#111]",
    "charius-dark": "bg-charius-dark text-white",
  };

  return (
    <section id={id} className={`section-wrapper py-20 md:py-28 ${themeClasses[theme]} ${className}`.trim()}>
      <div className={`container mx-auto px-4 md:px-6 max-w-7xl ${containerClassName}`.trim()}>
        {children}
      </div>
    </section>
  );
}
