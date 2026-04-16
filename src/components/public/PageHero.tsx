import { ReactNode } from "react";

interface PageHeroProps {
  title: string | ReactNode;
  subtitle?: string | ReactNode;
  tagline?: string | ReactNode;
  imageSrc?: string;
  children?: ReactNode;
  alignment?: "left" | "center";
}

export function PageHero({
  title,
  subtitle,
  tagline,
  children,
  alignment = "center",
}: PageHeroProps) {
  const isLeft = alignment === "left";

  return (
    <section className="relative overflow-hidden bg-brand-background pt-32 pb-20 md:pt-40 md:pb-28 border-b border-gray-100">
      {/* Subtle decorative elements */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#FA7D15]/8 via-transparent to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-[#006b61]/5 rounded-full blur-3xl -translate-x-1/2 translate-y-1/3 pointer-events-none" />

      <div className={`container mx-auto px-4 md:px-6 max-w-5xl relative z-10 flex flex-col ${isLeft ? "items-start text-left" : "items-center text-center"}`}>
        {tagline && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FA7D15]/10 text-[#FA7D15] font-bold text-sm mb-8 shadow-sm border border-[#FA7D15]/20">
            <span className="w-2 h-2 rounded-full bg-[#FA7D15] animate-pulse" />
            {tagline}
          </div>
        )}

        <h1 className={`text-5xl md:text-7xl font-extrabold text-brand-primary tracking-tight ${isLeft ? "max-w-5xl" : "max-w-4xl"} leading-[1.1] mb-6`}>
          {title}
        </h1>

        {subtitle && (
          <p className={`text-xl md:text-2xl text-gray-500 ${isLeft ? "max-w-3xl" : "max-w-3xl mx-auto"} mb-10 leading-relaxed`}>
            {subtitle}
          </p>
        )}

        {children && (
          <div className={`flex flex-col sm:flex-row gap-4 items-center w-full sm:w-auto ${isLeft ? "" : "justify-center"}`}>
            {children}
          </div>
        )}
      </div>
    </section>
  );
}
