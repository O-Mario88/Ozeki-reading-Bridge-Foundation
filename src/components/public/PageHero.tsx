import { ReactNode } from "react";
import Image from "next/image";

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
  imageSrc = "/photos/PXL_20260218_124653516.MP.jpg", // Default high-quality photo
  children,
  alignment = "center",
}: PageHeroProps) {
  const isLeft = alignment === "left";

  return (
    <section className="relative overflow-hidden bg-charius-dark bg-cover bg-center pt-24 pb-32 md:pt-32 md:pb-40 lg:py-48 xl:py-56">
      {/* Background Image with Fallback Pattern */}
      <div className="absolute inset-0 z-0">
        <Image 
          src={imageSrc} 
          alt="Hero Background" 
          fill 
          priority 
          className="object-cover"
        />
        {/* Dark Overlay for Charius aesthetic */}
        <div className="absolute inset-0 bg-black/60 pointer-events-none" />
      </div>

      <div className={`container mx-auto px-4 md:px-6 max-w-7xl relative z-10 flex flex-col ${isLeft ? "items-start text-left" : "items-center text-center"}`}>
        {tagline && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FA7D15]/20 text-[#FA7D15] font-semibold text-sm mb-6 lg:mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-[#FA7D15] animate-pulse" />
            {tagline}
          </div>
        )}
        
        <h1 className={`text-5xl md:text-7xl ${isLeft ? "lg:text-[4.8rem] xl:text-[5.5rem]" : ""} font-extrabold text-white tracking-tight ${isLeft ? "max-w-5xl lg:max-w-4xl" : "max-w-4xl"} leading-[1.1] mb-6 lg:mb-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-150`}>
          {title}
        </h1>
        
        {subtitle && (
          <p className={`text-xl md:text-2xl text-gray-200 ${isLeft ? "max-w-3xl lg:max-w-2xl" : "max-w-3xl mx-auto"} mb-10 lg:mb-12 leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300`}>
            {subtitle}
          </p>
        )}
        
        {(children) && (
          <div className={`flex flex-col sm:flex-row gap-4 lg:gap-8 items-center animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500 w-full sm:w-auto ${isLeft ? "" : "justify-center"}`}>
            {children}
          </div>
        )}
      </div>
    </section>
  );
}
