import Link from "next/link";
import type { ReactNode } from "react";

interface CTAStripProps {
  heading: string | ReactNode;
  subheading?: string;
  primaryButtonText?: string;
  primaryButtonHref?: string;
  secondaryButtonText?: string;
  secondaryButtonHref?: string;
  theme?: "brand" | "dark" | "light" | "charius";
  primaryButtonColor?: string;
  primaryButtonHoverColor?: string;
}

export function CTAStrip({
  heading,
  subheading,
  primaryButtonText,
  primaryButtonHref,
  secondaryButtonText,
  secondaryButtonHref,
  theme = "brand",
  primaryButtonColor,
  primaryButtonHoverColor,
}: CTAStripProps) {
  const themes = {
    brand: "bg-[#006b61] text-white", // Deep Green for Charius
    dark: "bg-brand-primary text-white", // Changed from black to system brand
    light: "bg-charius-beige text-[#111]", // Charius beige
    charius: "bg-charius-beige text-[#111] border-t border-gray-200", // Refined from black to neutral tone
  };

  // Unified brand pair: primary is orange-to-green-on-hover, secondary is
  // green-to-orange-on-hover. Both are solid fills so they stay legible on
  // every theme (brand green, dark, beige, charius) — no more white ghosts.
  const primaryBtnTheme = "btn-orange shadow-lg hover:shadow-xl";
  const secondaryBtnTheme = "btn-green";

  // Legacy per-instance overrides are ignored so the brand palette stays
  // consistent; left in the prop signature for backwards compatibility.
  void primaryButtonColor;
  void primaryButtonHoverColor;

  return (
    <section className={`py-16 md:py-24 ${themes[theme]}`}>
      <div className="container mx-auto px-4 md:px-6 max-w-4xl text-center">
        <h2 className={`text-[32px] md:text-5xl font-bold mb-6 tracking-tight ${(theme === 'light' || theme === 'charius') ? 'text-brand-primary' : 'text-white'}`}>
          {heading}
        </h2>
        {subheading && (
          <p className={`text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed ${(theme === 'light' || theme === 'charius') ? 'text-gray-600' : 'text-white/80'}`}>
            {subheading}
          </p>
        )}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {primaryButtonText && primaryButtonHref && (
            <Link 
              href={primaryButtonHref}
              className={`px-8 py-4 rounded-full font-bold transition-all ${primaryBtnTheme}`}
            >
              {primaryButtonText}
            </Link>
          )}
          {secondaryButtonText && secondaryButtonHref && (
            <Link 
              href={secondaryButtonHref}
              className={`px-8 py-4 rounded-full font-bold transition-all ${secondaryBtnTheme}`}
            >
              {secondaryButtonText}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
