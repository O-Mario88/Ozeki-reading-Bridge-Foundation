import type { ReactNode } from "react";
import { MotionReveal } from "@/components/ui/MotionReveal";

interface PageHeroProps {
  kicker?: string;
  title: string;
  description: string;
  imageUrl?: string;
  children?: ReactNode;
}

export function PageHero({ kicker, title, description, imageUrl, children }: PageHeroProps) {
  return (
    <section
      className="w-full relative pt-32 pb-24 overflow-hidden"
      style={{
        backgroundColor: "#006b61",
        ...(imageUrl
          ? {
              backgroundImage: `url('${imageUrl}')`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }
          : {}),
      }}
    >
      {imageUrl && <div className="absolute inset-0 bg-black/60 pointer-events-none z-0" />}
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/10 to-transparent pointer-events-none z-0" />
      <div className="container mx-auto px-6 max-w-5xl flex flex-col items-center text-center relative z-10">
        <MotionReveal className="flex flex-col items-center gap-6">
          {kicker ? (
            <span className="text-charius-orange font-semibold tracking-wider text-sm uppercase">
              {kicker}
            </span>
          ) : null}
          <h1 className="text-[40px] md:text-[56px] text-white font-bold tracking-tight leading-[1.15] m-0">
            {title}
          </h1>
          <p className="m-0 text-[18px] md:text-[20px] text-white/90 leading-relaxed max-w-3xl font-light drop-shadow-sm">
            {description}
          </p>
          {children && <div className="mt-4">{children}</div>}
        </MotionReveal>
      </div>
    </section>
  );
}
