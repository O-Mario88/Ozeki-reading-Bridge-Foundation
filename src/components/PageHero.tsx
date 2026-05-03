import type { ReactNode } from "react";

interface PageHeroProps {
  kicker?: string;
  title: string;
  description: string;
  imageUrl?: string;
  children?: ReactNode;
}

export function PageHero({ kicker, title, description, children }: PageHeroProps) {
  return (
    <section className="relative overflow-hidden bg-brand-background pt-32 pb-20 md:pt-40 md:pb-28 border-b border-gray-100">
      {/* Subtle decorative elements */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#ff7235]/8 via-transparent to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-[#006b61]/5 rounded-full blur-3xl -translate-x-1/2 translate-y-1/3 pointer-events-none" />

      <div className="container mx-auto px-4 md:px-6 max-w-5xl relative z-10 flex flex-col items-center text-center">
        {kicker ? (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#ff7235]/10 text-[#ff7235] font-bold text-sm mb-8 shadow-sm border border-[#ff7235]/20">
            <span className="w-2 h-2 rounded-full bg-[#ff7235] animate-pulse" />
            {kicker}
          </div>
        ) : null}

        <h1 className="text-5xl md:text-7xl font-extrabold text-brand-primary tracking-tight leading-[1.1] max-w-4xl mb-6">
          {title}
        </h1>

        <p className="text-xl md:text-2xl text-gray-500 max-w-3xl mx-auto mb-10 leading-relaxed">
          {description}
        </p>

        {children && <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">{children}</div>}
      </div>
    </section>
  );
}
