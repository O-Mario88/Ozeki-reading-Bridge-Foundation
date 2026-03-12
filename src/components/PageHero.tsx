import { MotionReveal } from "@/components/ui/MotionReveal";

interface PageHeroProps {
  kicker?: string;
  title: string;
  description: string;
}

export function PageHero({ kicker, title, description }: PageHeroProps) {
  return (
    <section
      className="section tpd-hero-section bg-[var(--md-sys-color-surface-container)] py-20 pb-12"
    >
      <div className="container flex flex-col items-center text-center">
        <MotionReveal className="flex max-w-[800px] flex-col items-center gap-4">
          {kicker ? <p className="kicker">{kicker}</p> : null}
          <h1 className="tpd-page-title m-0 text-[var(--md-sys-color-primary)]">{title}</h1>
          <p className="m-0 text-[1.15rem] text-[var(--md-sys-color-on-surface-variant)]">{description}</p>
        </MotionReveal>
      </div>
    </section>
  );
}
