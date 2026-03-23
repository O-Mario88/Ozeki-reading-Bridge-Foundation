import Link from "next/link";

interface CTAStripProps {
  heading: string;
  subheading?: string;
  primaryButtonText?: string;
  primaryButtonHref?: string;
  secondaryButtonText?: string;
  secondaryButtonHref?: string;
  theme?: "brand" | "dark" | "light";
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
    brand: "bg-orange-600 text-white",
    dark: "bg-gray-900 text-white",
    light: "bg-brand-surface text-brand-text border-y border-gray-100",
  };

  const primaryBtnTheme = primaryButtonColor
    ? `${primaryButtonColor} text-white ${primaryButtonHoverColor || ""}`
    : theme === "light" 
      ? "bg-brand-primary text-white hover:bg-brand-primary/90" 
      : "bg-white text-gray-900 hover:bg-gray-50";

  const secondaryBtnTheme = theme === "light"
    ? "border-2 border-gray-200 text-gray-600 hover:border-gray-300"
    : "border-2 border-white text-white hover:bg-white/10";

  return (
    <section className={`py-16 md:py-24 ${themes[theme]}`}>
      <div className="container mx-auto px-4 md:px-6 max-w-4xl text-center">
        <h2 className={`text-3xl md:text-5xl font-bold mb-6 tracking-tight ${theme === 'light' ? 'text-brand-text' : 'text-white'}`}>
          {heading}
        </h2>
        {subheading && (
          <p className={`text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed ${theme === 'light' ? 'text-brand-text/80' : 'text-white/90'}`}>
            {subheading}
          </p>
        )}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {primaryButtonText && primaryButtonHref && (
            <Link 
              href={primaryButtonHref}
              className={`px-8 py-3.5 rounded-full font-semibold transition-all shadow-sm ${primaryBtnTheme}`}
            >
              {primaryButtonText}
            </Link>
          )}
          {secondaryButtonText && secondaryButtonHref && (
            <Link 
              href={secondaryButtonHref}
              className={`px-8 py-3.5 rounded-full font-semibold transition-all ${secondaryBtnTheme}`}
            >
              {secondaryButtonText}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
